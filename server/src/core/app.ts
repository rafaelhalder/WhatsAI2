import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import { createServer } from 'http';
import { env } from '../config/env';
import { apiRoutes } from '../api/routes';
import { SocketService } from '../services/socket-service';
import { cacheService } from '../services/cache-service';
import { logger, LogContext } from '../services/logger-service';
import { campaignService } from '../services/campaign-service';
import { campaignLogger } from '../utils/campaign-logger';
import { campaignScheduler } from '../jobs/campaign-scheduler';
import { prisma } from '../database/prisma';

export class App {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private socketService: SocketService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.socketService = SocketService.getInstance();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupCampaignEvents();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow frontend on port 3000
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Logging - Custom format with colors and request details
    morgan.token('body', (req: any) => {
      // Don't log passwords or sensitive data
      const body = { ...req.body };
      if (body.password) body.password = '***';
      if (body.token) body.token = '***';
      return JSON.stringify(body);
    });

    const morganFormat = env.NODE_ENV === 'development'
      ? ':method :url :status :response-time ms - :body'
      : 'combined';

    this.app.use(morgan(morganFormat, {
      skip: (req) => req.url === '/health', // Skip health check logs
      stream: {
        write: (message: string) => {
          // Color code by status
          const statusMatch = message.match(/\s(\d{3})\s/);
          if (statusMatch && statusMatch[1]) {
            const status = parseInt(statusMatch[1]);
            if (status >= 500) console.error(`[ERROR] ${message.trim()}`);
            else if (status >= 400) console.warn(`[WARN] ${message.trim()}`);
            else console.log(`[INFO] ${message.trim()}`);
          } else {
            console.log(message.trim());
          }
        }
      }
    }));

    // Stripe webhook needs RAW body for signature verification
    // This MUST come BEFORE express.json() middleware
    this.app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

    // Body parsing - Increased limits for webhooks with large media
    this.app.use(express.json({ limit: '100mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '100mb' }));

    // Special body parser for webhook routes that may contain large payloads
    // This handles both JSON and raw data for webhooks
    this.app.use('/api/webhooks', (req, res, next) => {
      const contentType = req.headers['content-type'];

      if (contentType && contentType.includes('application/json')) {
        // For JSON webhooks, use JSON parser with high limit
        express.json({ limit: '100mb' })(req, res, next);
      } else {
        // For other content types (raw data, form data, etc.), use raw parser
        express.raw({ limit: '100mb', type: '*/*' })(req, res, next);
      }
    });
  }

  private setupRoutes(): void {
    // Serve static files (for test client)
    this.app.use('/static', express.static('public'));
    this.app.get('/test', (req, res) => {
      res.sendFile('test-client.html', { root: '.' });
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'WhatsAI Multi-Instance Manager',
        version: '1.0.0'
      });
    });

    // API routes
    this.app.use('/api', apiRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });
  }

  private setupWebSocket(): void {
    this.socketService.initialize(this.server);
  }

  private setupCampaignEvents(): void {
    campaignLogger.log('🎯 [APP] Configurando listeners de eventos de campanha...');
    
    // Listen to campaign events and emit via WebSocket
    campaignService.on('message:sent', async ({ messageId, campaignId }: any) => {
      campaignLogger.log(`📨 [APP] Evento message:sent recebido`, { messageId, campaignId });
      try {
        // Get updated progress
        const message = await prisma.campaignMessage.findUnique({
          where: { id: messageId },
          include: { campaign: { include: { instance: true } } }
        });

        if (message?.campaign) {
          const userId = message.campaign.userId;
          const progress = await campaignService.getCampaignProgress(campaignId, userId);
          
          campaignLogger.log(`📊 [APP] Emitindo progresso via WebSocket`, { 
            instanceId: message.campaign.instanceId,
            progress 
          });
          
          // Emit to user's instance room
          this.socketService.emitToInstance(message.campaign.instanceId, 'campaign:progress', progress);
        }
      } catch (error) {
        campaignLogger.error('[APP] Erro ao emitir progresso', error);
      }
    });

    campaignService.on('message:failed', async ({ messageId, campaignId }: any) => {
      campaignLogger.log(`❌ [APP] Evento message:failed recebido`, { messageId, campaignId });
      try {
        // Get updated progress
        const message = await prisma.campaignMessage.findUnique({
          where: { id: messageId },
          include: { campaign: { include: { instance: true } } }
        });

        if (message?.campaign) {
          const userId = message.campaign.userId;
          const progress = await campaignService.getCampaignProgress(campaignId, userId);
          
          // Emit to user's instance room
          this.socketService.emitToInstance(message.campaign.instanceId, 'campaign:progress', progress);
        }
      } catch (error) {
        campaignLogger.error('[APP] Erro ao emitir progresso (falha)', error);
      }
    });

    campaignService.on('campaign:completed', async ({ campaignId }: any) => {
      campaignLogger.log(`✅ [APP] Evento campaign:completed recebido`, { campaignId });
      try {
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
          include: { instance: true }
        });

        if (campaign) {
          const progress = await campaignService.getCampaignProgress(campaignId, campaign.userId);
          
          campaignLogger.log(`🎉 [APP] Campanha concluída - emitindo evento final`, {
            campaignId,
            instanceId: campaign.instanceId
          });
          
          // Emit to user's instance room
          this.socketService.emitToInstance(campaign.instanceId, 'campaign:completed', progress);
        }
      } catch (error) {
        campaignLogger.error('[APP] Erro ao emitir conclusão', error);
      }
    });
  }

  private setupErrorHandling(): void {
    // Sentry error handler - captures all errors automatically
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Capture error in Sentry with context
      const user = (req as any).user;
      Sentry.captureException(err, {
        contexts: {
          request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
          }
        },
        tags: {
          endpoint: req.path,
          method: req.method,
        },
        user: user ? {
          id: user.id,
          email: user.email,
        } : undefined
      } as any);
      
      next(err);
    });

    // Global error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Unhandled error:', {
        message: err.message,
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.url,
        method: req.method,
      });
      
      if (res.headersSent) {
        return next(err);
      }

      res.status(err.status || 500).json({
        success: false,
        error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        ...(env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });
  }

  public async start(): Promise<void> {
    try {
      console.log('🚀 [APP] Iniciando cache service...');
      // Initialize cache service
      await cacheService.initialize();
      logger.info(LogContext.CACHE, 'Cache service initialized successfully');
      console.log('✅ [APP] Cache inicializado');

      // Start campaign scheduler
      console.log('🚀 [APP] Iniciando campaign scheduler...');
      campaignScheduler.start();
      console.log('✅ [APP] Campaign scheduler iniciado');

      const port = env.PORT;
      console.log(`🚀 [APP] Iniciando servidor na porta ${port}...`);

      return new Promise((resolve) => {
        this.server.listen(port, '127.0.0.1', () => {
          console.log(`✅ [APP] Servidor rodando em http://127.0.0.1:${port}`);
          resolve();
        });
      });
    } catch (error) {
      logger.error(LogContext.CACHE, 'Failed to start application', error as Error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    console.log('⏹️ [APP] Parando campaign scheduler...');
    campaignScheduler.stop();
    
    return new Promise((resolve) => {
      this.server.close(() => {
        resolve();
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getServer(): any {
    return this.server;
  }
}