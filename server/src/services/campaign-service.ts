import { prisma } from '../database/prisma';
import { 
  Campaign, 
  CampaignMessage, 
  CampaignProgress, 
  CampaignStats,
  Recipient 
} from '../types';
import { 
  CreateCampaignInput, 
  UpdateCampaignInput, 
  ListCampaignsQuery 
} from '../schemas/campaign-schemas';
import { templateService } from './template-service';
import { EvolutionApiService } from './evolution-api';
import { EventEmitter } from 'events';
import { campaignLogger } from '../utils/campaign-logger';

export class CampaignService extends EventEmitter {
  private runningCampaigns: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new campaign
   */
  async createCampaign(userId: string, data: CreateCampaignInput): Promise<Campaign> {
    // Verify instance belongs to user
    const instance = await prisma.whatsAppInstance.findFirst({
      where: {
        id: data.instanceId,
        userId
      }
    });

    if (!instance) {
      throw new Error('Instância não encontrada');
    }

    // If using template, verify it exists
    if (data.templateId) {
      const template = await templateService.getTemplateById(data.templateId, userId);
      if (!template) {
        throw new Error('Template não encontrado');
      }
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name: data.name,
        instanceId: data.instanceId,
        templateId: data.templateId || null,
        message: data.message,
        mediaUrl: data.mediaUrl || null,
        mediaType: data.mediaType || null,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        rateLimit: data.rateLimit || 10,
        totalRecipients: data.recipients.length,
        pendingCount: data.recipients.length,
        recipientsData: JSON.stringify(data.recipients),
        status: data.scheduledFor ? 'SCHEDULED' : 'DRAFT'
      }
    });

    // Create campaign messages
    await this.createCampaignMessages(campaign.id, data.recipients, data.message);

    return this.formatCampaign(campaign);
  }

  /**
   * Create campaign messages for all recipients
   */
  private async createCampaignMessages(
    campaignId: string,
    recipients: Recipient[],
    baseMessage: string
  ): Promise<void> {
    const messages = recipients.map(recipient => ({
      campaignId,
      recipient: recipient.phone,
      message: baseMessage,
      variables: recipient.variables ? JSON.stringify(recipient.variables) : null,
      status: 'PENDING'
    }));

    // Batch insert (500 at a time to avoid timeouts)
    const batchSize = 500;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      await prisma.campaignMessage.createMany({
        data: batch
      });
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: string, userId: string): Promise<Campaign | null> {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId
      }
    });

    if (!campaign) {
      return null;
    }

    return this.formatCampaign(campaign);
  }

  /**
   * List campaigns with filters
   */
  async listCampaigns(userId: string, query: Partial<ListCampaignsQuery> = {}): Promise<{
    campaigns: Campaign[];
    total: number;
  }> {
    const {
      status,
      instanceId,
      search,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    // Build where clause
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (instanceId) {
      where.instanceId = instanceId;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Get total count
    const total = await prisma.campaign.count({ where });

    // Get campaigns
    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset
    });

    return {
      campaigns: campaigns.map(c => this.formatCampaign(c)),
      total
    };
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    userId: string,
    data: UpdateCampaignInput
  ): Promise<Campaign | null> {
    // Check if campaign exists and belongs to user
    const existing = await this.getCampaignById(campaignId, userId);
    if (!existing) {
      return null;
    }

    // Can only update DRAFT or SCHEDULED campaigns
    if (!['DRAFT', 'SCHEDULED'].includes(existing.status)) {
      throw new Error('Apenas campanhas em rascunho ou agendadas podem ser editadas');
    }

    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.message) updateData.message = data.message;
    if (data.mediaUrl !== undefined) updateData.mediaUrl = data.mediaUrl || null;
    if (data.mediaType !== undefined) updateData.mediaType = data.mediaType || null;
    if (data.rateLimit) updateData.rateLimit = data.rateLimit;
    if (data.scheduledFor !== undefined) {
      updateData.scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : null;
      updateData.status = data.scheduledFor ? 'SCHEDULED' : 'DRAFT';
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData
    });

    return this.formatCampaign(updated);
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string, userId: string): Promise<boolean> {
    const existing = await this.getCampaignById(campaignId, userId);
    if (!existing) {
      return false;
    }

    // Can only delete DRAFT, COMPLETED, or FAILED campaigns
    if (!['DRAFT', 'COMPLETED', 'FAILED'].includes(existing.status)) {
      throw new Error('Apenas campanhas em rascunho, completadas ou falhas podem ser excluídas');
    }

    await prisma.campaign.delete({
      where: { id: campaignId }
    });

    return true;
  }

  /**
   * Start campaign
   */
  async startCampaign(campaignId: string, userId: string): Promise<Campaign> {
    const campaign = await this.getCampaignById(campaignId, userId);
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    if (!['DRAFT', 'SCHEDULED', 'PAUSED'].includes(campaign.status)) {
      throw new Error('Campanha não pode ser iniciada');
    }

    // Update status
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'RUNNING',
        startedAt: new Date()
      }
    });

    // Start sending messages
    this.processCampaign(campaignId);

    return this.formatCampaign(updated);
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string, userId: string): Promise<Campaign> {
    const campaign = await this.getCampaignById(campaignId, userId);
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    if (campaign.status !== 'RUNNING') {
      throw new Error('Apenas campanhas em execução podem ser pausadas');
    }

    // Stop processing
    const timer = this.runningCampaigns.get(campaignId);
    if (timer) {
      clearInterval(timer);
      this.runningCampaigns.delete(campaignId);
    }

    // Update status
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' }
    });

    return this.formatCampaign(updated);
  }

  /**
   * Resume paused campaign
   */
  async resumeCampaign(campaignId: string, userId: string): Promise<Campaign> {
    const campaign = await this.getCampaignById(campaignId, userId);
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    if (campaign.status !== 'PAUSED') {
      throw new Error('Apenas campanhas pausadas podem ser retomadas');
    }

    // Update status to RUNNING
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING' }
    });

    // Resume processing
    await this.processCampaign(campaignId);

    return this.formatCampaign(updated);
  }

  /**
   * Cancel campaign
   */
  async cancelCampaign(campaignId: string, userId: string): Promise<Campaign> {
    const campaign = await this.getCampaignById(campaignId, userId);
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    // Stop processing
    const timer = this.runningCampaigns.get(campaignId);
    if (timer) {
      clearInterval(timer);
      this.runningCampaigns.delete(campaignId);
    }

    // Update status
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'FAILED',
        completedAt: new Date()
      }
    });

    return this.formatCampaign(updated);
  }

  /**
   * Get campaign progress
   */
  async getCampaignProgress(campaignId: string, userId: string): Promise<CampaignProgress> {
    const campaign = await this.getCampaignById(campaignId, userId);
    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    const progress = campaign.totalRecipients > 0
      ? ((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) * 100
      : 0;

    // Estimate time remaining
    let estimatedTimeRemaining: number | undefined;
    let currentRate: number | undefined;

    if (campaign.status === 'RUNNING' && campaign.sentCount > 0 && campaign.startedAt) {
      const elapsedSeconds = (Date.now() - campaign.startedAt.getTime()) / 1000;
      currentRate = (campaign.sentCount / elapsedSeconds) * 60; // messages per minute
      
      if (currentRate > 0) {
        estimatedTimeRemaining = (campaign.pendingCount / currentRate) * 60; // seconds
      }
    }

    return {
      campaignId: campaign.id,
      status: campaign.status,
      progress: Math.round(progress * 100) / 100,
      totalRecipients: campaign.totalRecipients,
      sentCount: campaign.sentCount,
      deliveredCount: campaign.deliveredCount,
      failedCount: campaign.failedCount,
      pendingCount: campaign.pendingCount,
      estimatedTimeRemaining: estimatedTimeRemaining || 0,
      currentRate: currentRate || 0
    };
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(userId: string): Promise<CampaignStats> {
    const [
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalMessages,
      deliveredMessages,
      recentCampaigns
    ] = await Promise.all([
      prisma.campaign.count({ where: { userId } }),
      prisma.campaign.count({ 
        where: { 
          userId, 
          status: { in: ['RUNNING', 'SCHEDULED', 'PAUSED'] } 
        } 
      }),
      prisma.campaign.count({ 
        where: { userId, status: 'COMPLETED' } 
      }),
      prisma.campaign.aggregate({
        where: { userId },
        _sum: { sentCount: true }
      }),
      prisma.campaign.aggregate({
        where: { userId },
        _sum: { deliveredCount: true }
      }),
      prisma.campaign.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    const totalMessagesSent = totalMessages._sum.sentCount || 0;
    const totalDelivered = deliveredMessages._sum.deliveredCount || 0;
    const averageDeliveryRate = totalMessagesSent > 0
      ? (totalDelivered / totalMessagesSent) * 100
      : 0;

    return {
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalMessagesSent,
      averageDeliveryRate: Math.round(averageDeliveryRate * 100) / 100,
      recentCampaigns: recentCampaigns.map(c => this.formatCampaign(c))
    };
  }

  /**
   * Process campaign (send messages)
   */
  private async processCampaign(campaignId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { instance: true }
    });

    if (!campaign || campaign.status !== 'RUNNING') {
      return;
    }

    const messagesPerMinute = campaign.rateLimit;
    const intervalMs = (60 * 1000) / messagesPerMinute; // milliseconds between messages

    campaignLogger.log(`🚀 [CAMPAIGN] Iniciando processamento da campanha ${campaign.name}`, {
      campaignId,
      messagesPerMinute,
      intervalMs
    });

    const timer = setInterval(async () => {
      try {
        // Get next pending message
        const message = await prisma.campaignMessage.findFirst({
          where: {
            campaignId,
            status: 'PENDING'
          },
          orderBy: { createdAt: 'asc' }
        });

        if (!message) {
          // No more pending messages, campaign completed
          clearInterval(timer);
          this.runningCampaigns.delete(campaignId);

          await prisma.campaign.update({
            where: { id: campaignId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date()
            }
          });

          campaignLogger.log(`✅ [CAMPAIGN] Campanha concluída: ${campaign.name}`, { campaignId });
          this.emit('campaign:completed', { campaignId });
          return;
        }

        // Send message
        await this.sendCampaignMessage(message.id, campaign);

      } catch (error) {
        campaignLogger.error(`Erro processando campanha ${campaignId}`, error);
      }
    }, intervalMs);

    this.runningCampaigns.set(campaignId, timer);
  }

  /**
   * Send a single campaign message
   */
  private async sendCampaignMessage(messageId: string, campaign: any): Promise<void> {
    const message = await prisma.campaignMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) return;

    campaignLogger.log(`📤 [CAMPAIGN] Enviando mensagem para ${message.recipient}`, { messageId });

    try {
      // Render message with variables
      let finalMessage = message.message;
      if (message.variables) {
        const vars = JSON.parse(message.variables);
        finalMessage = templateService.renderTemplate(message.message, vars);
        campaignLogger.log(`📝 [CAMPAIGN] Variáveis aplicadas`, { 
          recipient: message.recipient,
          variables: vars 
        });
      } else {
        // Se não tem variáveis, renderiza com objeto vazio para remover placeholders
        finalMessage = templateService.renderTemplate(message.message, {});
      }

      // Send via Evolution API
      const evolutionService = new EvolutionApiService(
        campaign.instance.evolutionApiUrl,
        campaign.instance.evolutionApiKey
      );

      const whatsappNumber = message.recipient.includes('@') 
        ? message.recipient 
        : `${message.recipient}@s.whatsapp.net`;

      await evolutionService.sendTextMessage(
        campaign.instance.evolutionInstanceName,
        whatsappNumber,
        finalMessage
      );

      campaignLogger.log(`✅ [CAMPAIGN] Mensagem enviada com sucesso`, { 
        recipient: message.recipient,
        messageId 
      });

      // Update message status
      await prisma.campaignMessage.update({
        where: { id: messageId },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      });

      // Update campaign counters
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          sentCount: { increment: 1 },
          pendingCount: { decrement: 1 }
        }
      });

      this.emit('message:sent', { messageId, campaignId: campaign.id });

    } catch (error) {
      campaignLogger.error(`Erro ao enviar mensagem ${messageId}`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Determine if error is temporary or permanent
      const isPermanentError = this.isPermanentError(errorMessage);
      const currentMessage = await prisma.campaignMessage.findUnique({
        where: { id: messageId },
        select: { retryCount: true, maxRetries: true }
      });

      const shouldRetry = !isPermanentError && 
                         currentMessage && 
                         currentMessage.retryCount < currentMessage.maxRetries;

      if (shouldRetry) {
        // Calculate backoff delay (exponential: 2^retryCount minutes)
        const backoffMinutes = Math.pow(2, currentMessage.retryCount);
        const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

        campaignLogger.log(`🔄 [CAMPAIGN] Agendando retry para mensagem ${messageId}`, {
          retryCount: currentMessage.retryCount + 1,
          maxRetries: currentMessage.maxRetries,
          nextRetryAt: nextRetryAt.toISOString(),
          backoffMinutes
        });

        // Update message status to pending with retry info
        await prisma.campaignMessage.update({
          where: { id: messageId },
          data: {
            status: 'PENDING', // Keep as pending for retry
            error: errorMessage,
            retryCount: { increment: 1 },
            lastRetryAt: new Date()
          }
        });

        // Don't increment failed count, it will be retried
        
      } else {
        // Permanent failure or max retries exceeded
        const failReason = isPermanentError 
          ? `Erro permanente: ${errorMessage}`
          : `Máximo de tentativas excedido (${currentMessage?.maxRetries}): ${errorMessage}`;

        campaignLogger.error(`❌ [CAMPAIGN] Falha permanente para mensagem ${messageId}`, {
          reason: failReason,
          isPermanentError,
          retryCount: currentMessage?.retryCount
        });

        await prisma.campaignMessage.update({
          where: { id: messageId },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            error: failReason,
            retryCount: { increment: 1 }
          }
        });

        // Update campaign counters
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            failedCount: { increment: 1 },
            pendingCount: { decrement: 1 }
          }
        });

        this.emit('message:failed', { messageId, campaignId: campaign.id, error });
      }
    }
  }

  /**
   * Determine if an error is permanent (non-retryable)
   */
  private isPermanentError(errorMessage: string): boolean {
    const permanentErrorPatterns = [
      /invalid number/i,
      /número inválido/i,
      /not registered/i,
      /não registrado/i,
      /blocked/i,
      /bloqueado/i,
      /banned/i,
      /banido/i,
      /número não existe/i,
      /number does not exist/i,
      /invalid format/i,
      /formato inválido/i
    ];

    return permanentErrorPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Get detailed campaign report
   */
  async getCampaignReport(campaignId: string, userId: string): Promise<{
    campaign: Campaign;
    statistics: {
      totalRecipients: number;
      sent: number;
      delivered: number;
      failed: number;
      pending: number;
      successRate: number;
      failureRate: number;
      avgDeliveryTime?: number;
    };
    timeline: Array<{
      timestamp: Date;
      event: string;
      count: number;
    }>;
    failureReasons: Array<{
      error: string;
      count: number;
    }>;
    messages: Array<{
      id: string;
      recipient: string;
      status: string;
      message: string;
      variables?: any;
      error?: string;
      retryCount: number;
      sentAt?: Date;
      deliveredAt?: Date;
      failedAt?: Date;
    }>;
  }> {
    // Get campaign
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId }
    });

    if (!campaign) {
      throw new Error('Campanha não encontrada');
    }

    // Get all messages
    const messages = await prisma.campaignMessage.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' }
    });

    // Calculate statistics
    const totalRecipients = campaign.totalRecipients;
    const sent = campaign.sentCount;
    const delivered = campaign.deliveredCount;
    const failed = campaign.failedCount;
    const pending = campaign.pendingCount;
    const successRate = totalRecipients > 0 ? (delivered / totalRecipients) * 100 : 0;
    const failureRate = totalRecipients > 0 ? (failed / totalRecipients) * 100 : 0;

    // Calculate average delivery time
    const deliveredMessages = messages.filter(m => m.sentAt && m.deliveredAt);
    const avgDeliveryTime = deliveredMessages.length > 0
      ? deliveredMessages.reduce((sum, m) => {
          const deliveryTime = m.deliveredAt!.getTime() - m.sentAt!.getTime();
          return sum + deliveryTime;
        }, 0) / deliveredMessages.length
      : undefined;

    // Build timeline (hourly events)
    const timeline: Array<{ timestamp: Date; event: string; count: number }> = [];
    const sentByHour = new Map<string, number>();
    const deliveredByHour = new Map<string, number>();
    const failedByHour = new Map<string, number>();

    messages.forEach(m => {
      if (m.sentAt) {
        const hour = new Date(m.sentAt).setMinutes(0, 0, 0);
        const key = new Date(hour).toISOString();
        sentByHour.set(key, (sentByHour.get(key) || 0) + 1);
      }
      if (m.deliveredAt) {
        const hour = new Date(m.deliveredAt).setMinutes(0, 0, 0);
        const key = new Date(hour).toISOString();
        deliveredByHour.set(key, (deliveredByHour.get(key) || 0) + 1);
      }
      if (m.failedAt) {
        const hour = new Date(m.failedAt).setMinutes(0, 0, 0);
        const key = new Date(hour).toISOString();
        failedByHour.set(key, (failedByHour.get(key) || 0) + 1);
      }
    });

    // Combine timeline events
    const allTimestamps = new Set([
      ...sentByHour.keys(),
      ...deliveredByHour.keys(),
      ...failedByHour.keys()
    ]);

    allTimestamps.forEach(timestamp => {
      if (sentByHour.has(timestamp)) {
        timeline.push({
          timestamp: new Date(timestamp),
          event: 'sent',
          count: sentByHour.get(timestamp)!
        });
      }
      if (deliveredByHour.has(timestamp)) {
        timeline.push({
          timestamp: new Date(timestamp),
          event: 'delivered',
          count: deliveredByHour.get(timestamp)!
        });
      }
      if (failedByHour.has(timestamp)) {
        timeline.push({
          timestamp: new Date(timestamp),
          event: 'failed',
          count: failedByHour.get(timestamp)!
        });
      }
    });

    // Sort timeline by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Aggregate failure reasons
    const failureReasons = new Map<string, number>();
    messages.filter(m => m.error).forEach(m => {
      const error = m.error || 'Unknown error';
      failureReasons.set(error, (failureReasons.get(error) || 0) + 1);
    });

    const failureReasonsArray = Array.from(failureReasons.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count);

    // Format messages for response
    const formattedMessages = messages.map(m => ({
      id: m.id,
      recipient: m.recipient,
      status: m.status,
      message: m.message,
      ...(m.variables && { variables: JSON.parse(m.variables) }),
      ...(m.error && { error: m.error }),
      retryCount: m.retryCount,
      ...(m.sentAt && { sentAt: m.sentAt }),
      ...(m.deliveredAt && { deliveredAt: m.deliveredAt }),
      ...(m.failedAt && { failedAt: m.failedAt })
    }));

    return {
      campaign: this.formatCampaign(campaign),
      statistics: {
        totalRecipients,
        sent,
        delivered,
        failed,
        pending,
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        ...(avgDeliveryTime !== undefined && { avgDeliveryTime: Math.round(avgDeliveryTime / 1000) })
      },
      timeline,
      failureReasons: failureReasonsArray,
      messages: formattedMessages
    };
  }

  /**
   * Export campaign results to CSV
   */
  async exportCampaignToCSV(campaignId: string, userId: string): Promise<string> {
    // Get campaign report (reuse existing method)
    const report = await this.getCampaignReport(campaignId, userId);

    // Build CSV header
    const headers = [
      'Destinatário',
      'Status',
      'Tentativas',
      'Enviado em',
      'Entregue em',
      'Falha em',
      'Erro'
    ];

    // Build CSV rows
    const rows = report.messages.map(m => [
      m.recipient,
      m.status,
      m.retryCount.toString(),
      m.sentAt ? m.sentAt.toISOString() : '',
      m.deliveredAt ? m.deliveredAt.toISOString() : '',
      m.failedAt ? m.failedAt.toISOString() : '',
      m.error || ''
    ]);

    // Add statistics header
    const csvParts = [
      `Campanha: ${report.campaign.name}`,
      `Status: ${report.campaign.status}`,
      `Total de Destinatários: ${report.statistics.totalRecipients}`,
      `Enviados: ${report.statistics.sent}`,
      `Entregues: ${report.statistics.delivered}`,
      `Falhas: ${report.statistics.failed}`,
      `Pendentes: ${report.statistics.pending}`,
      `Taxa de Sucesso: ${report.statistics.successRate}%`,
      `Taxa de Falha: ${report.statistics.failureRate}%`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ];

    return csvParts.join('\n');
  }

  /**
   * Format campaign from database to API format
   */
  private formatCampaign(campaign: any): Campaign {
    return {
      id: campaign.id,
      userId: campaign.userId,
      name: campaign.name,
      status: campaign.status,
      instanceId: campaign.instanceId,
      templateId: campaign.templateId || undefined,
      message: campaign.message,
      mediaUrl: campaign.mediaUrl || undefined,
      mediaType: campaign.mediaType || undefined,
      scheduledFor: campaign.scheduledFor || undefined,
      startedAt: campaign.startedAt || undefined,
      completedAt: campaign.completedAt || undefined,
      totalRecipients: campaign.totalRecipients,
      sentCount: campaign.sentCount,
      deliveredCount: campaign.deliveredCount,
      failedCount: campaign.failedCount,
      pendingCount: campaign.pendingCount,
      rateLimit: campaign.rateLimit,
      recipientsData: campaign.recipientsData ? JSON.parse(campaign.recipientsData) : undefined,
      // Add stats object for frontend compatibility
      stats: {
        totalRecipients: campaign.totalRecipients || 0,
        sent: campaign.sentCount || 0,
        delivered: campaign.deliveredCount || 0,
        read: 0, // Not tracked yet
        failed: campaign.failedCount || 0,
        pending: campaign.pendingCount || 0
      },
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt
    };
  }
}

export const campaignService = new CampaignService();
