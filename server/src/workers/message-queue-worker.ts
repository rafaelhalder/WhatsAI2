/**
 * Message Queue Worker
 * 
 * BullMQ Worker that processes messages from the queue with anti-ban features:
 * - Random delays (1-3 seconds for active instances)
 * - Warm-up delays (90-150s for new, 30-60s for warming, 1-3s for active)
 * - Rate limiting enforcement
 * - Actual message sending via Evolution API
 */

import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { MessageQueueJob } from '../types/queue-types';
import { EvolutionApiService } from '../services/evolution-api';
import { InstanceWarmupService } from '../services/instance-warmup-service';
import { env } from '../config/env';
import { prisma } from '../database/prisma';

export class MessageQueueWorker {
  private worker: Worker<MessageQueueJob>;
  private redisConnection: Redis;
  private evolutionApiService: EvolutionApiService;
  private warmupService: InstanceWarmupService;

  constructor() {
    // Initialize services
    this.evolutionApiService = new EvolutionApiService();
    this.warmupService = new InstanceWarmupService();

    // Initialize Redis connection for worker
    this.redisConnection = new Redis({
      host: env.REDIS_HOST || 'localhost',
      port: env.REDIS_PORT || 6379,
      password: env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    // Create BullMQ worker
    this.worker = new Worker<MessageQueueJob>(
      'message-sending',
      async (job: Job<MessageQueueJob>) => {
        return await this.processMessage(job);
      },
      {
        connection: this.redisConnection,
        concurrency: 5, // Process up to 5 jobs concurrently
        limiter: {
          max: 10, // Max 10 jobs
          duration: 60000 // per 60 seconds (per minute)
        }
      }
    );

    // Event listeners
    this.worker.on('completed', (job) => {
      console.log(`✅ [Worker] Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ [Worker] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('❌ [Worker] Worker error:', err);
    });

    console.log('✅ [Worker] Message queue worker started');
  }

  /**
   * Process a message job from the queue
   */
  private async processMessage(job: Job<MessageQueueJob>): Promise<{ success: boolean; messageId?: string }> {
    const { instanceId, instanceName, remoteJid, messageType, content, mediaUrl, mediaType, caption, fileName } = job.data;

    console.log(`📤 [Worker] Processing message for instance ${instanceId} (${instanceName})`);

    try {
      // 1. Get instance details from database
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: instanceId },
        select: {
          id: true,
          evolutionInstanceName: true,
          evolutionApiUrl: true,
          evolutionApiKey: true,
          status: true
        }
      });

      if (!instance) {
        throw new Error(`Instance ${instanceId} not found in database`);
      }

      if (instance.status !== 'CONNECTED') {
        throw new Error(`Instance ${instanceId} is not connected (status: ${instance.status})`);
      }

      // 2. Calculate delay based on warm-up state
      const delay = await this.warmupService.getDelayForInstance(instanceId);
      console.log(`⏱️ [Worker] Applying delay of ${delay}ms for instance ${instanceId}`);

      // 3. Wait for the calculated delay
      await this.sleep(delay);

      // 4. Create Evolution API service with instance-specific credentials
      const evolutionApi = new EvolutionApiService(instance.evolutionApiUrl, instance.evolutionApiKey);

      // 5. Send the message via Evolution API
      let result;
      if (messageType === 'text' && content) {
        console.log(`📝 [Worker] Sending text message to ${remoteJid}`);
        result = await evolutionApi.sendTextMessage(instance.evolutionInstanceName, remoteJid, content);
      } else if (messageType === 'media' && mediaUrl && mediaType) {
        console.log(`🖼️ [Worker] Sending ${mediaType} message to ${remoteJid}`);
        result = await evolutionApi.sendMediaMessage(
          instance.evolutionInstanceName,
          remoteJid,
          mediaUrl,
          caption,
          mediaType
        );
      } else {
        throw new Error(`Invalid message type or missing required fields: ${messageType}`);
      }

      // 6. Record message sent for warm-up tracking
      await this.warmupService.recordMessageSent(instanceId);

      console.log(`✅ [Worker] Message sent successfully for instance ${instanceId}`);

      return {
        success: true,
        messageId: result?.key?.id
      };

    } catch (error: any) {
      console.error(`❌ [Worker] Failed to send message for instance ${instanceId}:`, error.message);
      
      // Re-throw error so BullMQ can retry the job
      throw error;
    }
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gracefully shutdown the worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.redisConnection.quit();
    console.log('🔌 [Worker] Worker and Redis connection closed');
  }

  /**
   * Get worker instance for external monitoring
   */
  getWorker(): Worker<MessageQueueJob> {
    return this.worker;
  }
}
