/**
 * Messaging Service Wrapper
 * 
 * This service provides a unified interface for sending messages with anti-ban features.
 * It wraps both the legacy direct sending (for backward compatibility) and the new
 * queue-based sending system.
 * 
 * Usage:
 * - Set USE_MESSAGE_QUEUE=true in .env to enable queue-based sending
 * - Set USE_MESSAGE_QUEUE=false or omit it to use legacy direct sending
 */

import { MessageQueueService } from './message-queue-service';
import { EvolutionApiService } from './evolution-api';
import { prisma } from '../database/prisma';
import { env } from '../config/env';

export interface SendMessageOptions {
  instanceId: string;
  remoteJid: string;
  content: string;
  priority?: 'low' | 'normal' | 'high';
  metadata?: {
    conversationId?: string;
    userId?: string;
  };
}

export interface SendMediaOptions {
  instanceId: string;
  remoteJid: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  caption?: string;
  fileName?: string;
  priority?: 'low' | 'normal' | 'high';
  metadata?: {
    conversationId?: string;
    userId?: string;
  };
}

export class MessagingService {
  private static instance: MessagingService;
  private queueService: MessageQueueService;
  private evolutionApiService: EvolutionApiService;
  private useQueue: boolean;

  private constructor() {
    this.queueService = MessageQueueService.getInstance();
    this.evolutionApiService = new EvolutionApiService();
    
    // Check if queue-based sending is enabled via environment variable
    this.useQueue = env.USE_MESSAGE_QUEUE === 'true' || env.USE_MESSAGE_QUEUE === true;
    
    console.log(`📨 [MessagingService] Initialized with ${this.useQueue ? 'QUEUE-BASED' : 'DIRECT'} sending mode`);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService();
    }
    return MessagingService.instance;
  }

  /**
   * Send a text message (uses queue if enabled, direct if not)
   */
  async sendTextMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string }> {
    if (this.useQueue) {
      return await this.sendViaQueue(options);
    } else {
      return await this.sendDirect(options);
    }
  }

  /**
   * Send a media message (uses queue if enabled, direct if not)
   */
  async sendMediaMessage(options: SendMediaOptions): Promise<{ success: boolean; messageId?: string }> {
    if (this.useQueue) {
      return await this.sendMediaViaQueue(options);
    } else {
      return await this.sendMediaDirect(options);
    }
  }

  /**
   * Send message via queue (anti-ban system)
   */
  private async sendViaQueue(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string }> {
    try {
      // Get instance details
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: options.instanceId },
        select: { id: true, evolutionInstanceName: true }
      });

      if (!instance) {
        throw new Error(`Instance ${options.instanceId} not found`);
      }

      // Add to queue
      const metadata: any = {
        priority: options.priority || 'normal'
      };
      if (options.metadata?.conversationId !== undefined) {
        metadata.conversationId = options.metadata.conversationId;
      }
      if (options.metadata?.userId !== undefined) {
        metadata.userId = options.metadata.userId;
      }

      await this.queueService.addMessage({
        instanceId: options.instanceId,
        instanceName: instance.evolutionInstanceName,
        remoteJid: options.remoteJid,
        messageType: 'text',
        content: options.content,
        metadata
      });

      console.log(`✅ [MessagingService] Message added to queue for instance ${options.instanceId}`);

      return { success: true };
    } catch (error) {
      console.error('❌ [MessagingService] Failed to add message to queue:', error);
      throw error;
    }
  }

  /**
   * Send media via queue (anti-ban system)
   */
  private async sendMediaViaQueue(options: SendMediaOptions): Promise<{ success: boolean; messageId?: string }> {
    try {
      // Get instance details
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: options.instanceId },
        select: { id: true, evolutionInstanceName: true }
      });

      if (!instance) {
        throw new Error(`Instance ${options.instanceId} not found`);
      }

      // Add to queue
      const metadata: any = {
        priority: options.priority || 'normal'
      };
      if (options.metadata?.conversationId !== undefined) {
        metadata.conversationId = options.metadata.conversationId;
      }
      if (options.metadata?.userId !== undefined) {
        metadata.userId = options.metadata.userId;
      }

      const queueJob: any = {
        instanceId: options.instanceId,
        instanceName: instance.evolutionInstanceName,
        remoteJid: options.remoteJid,
        messageType: 'media',
        mediaUrl: options.mediaUrl,
        mediaType: options.mediaType,
        metadata
      };
      
      // Only add optional properties if they have values
      if (options.caption !== undefined) queueJob.caption = options.caption;
      if (options.fileName !== undefined) queueJob.fileName = options.fileName;

      await this.queueService.addMessage(queueJob);

      console.log(`✅ [MessagingService] Media message added to queue for instance ${options.instanceId}`);

      return { success: true };
    } catch (error) {
      console.error('❌ [MessagingService] Failed to add media message to queue:', error);
      throw error;
    }
  }

  /**
   * Send message directly (legacy mode - no anti-ban)
   */
  private async sendDirect(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string }> {
    try {
      // Get instance details
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: options.instanceId },
        select: { 
          evolutionInstanceName: true,
          evolutionApiUrl: true,
          evolutionApiKey: true
        }
      });

      if (!instance) {
        throw new Error(`Instance ${options.instanceId} not found`);
      }

      // Create Evolution API service with instance credentials
      const evolutionApi = new EvolutionApiService(instance.evolutionApiUrl, instance.evolutionApiKey);

      // Send directly
      const result = await evolutionApi.sendTextMessage(
        instance.evolutionInstanceName,
        options.remoteJid,
        options.content
      );

      console.log(`✅ [MessagingService] Message sent directly for instance ${options.instanceId}`);

      return {
        success: true,
        messageId: result?.key?.id
      };
    } catch (error) {
      console.error('❌ [MessagingService] Failed to send message directly:', error);
      throw error;
    }
  }

  /**
   * Send media directly (legacy mode - no anti-ban)
   */
  private async sendMediaDirect(options: SendMediaOptions): Promise<{ success: boolean; messageId?: string }> {
    try {
      // Get instance details
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: options.instanceId },
        select: { 
          evolutionInstanceName: true,
          evolutionApiUrl: true,
          evolutionApiKey: true
        }
      });

      if (!instance) {
        throw new Error(`Instance ${options.instanceId} not found`);
      }

      // Create Evolution API service with instance credentials
      const evolutionApi = new EvolutionApiService(instance.evolutionApiUrl, instance.evolutionApiKey);

      // Send directly
      const result = await evolutionApi.sendMediaMessage(
        instance.evolutionInstanceName,
        options.remoteJid,
        options.mediaUrl,
        options.caption,
        options.mediaType
      );

      console.log(`✅ [MessagingService] Media sent directly for instance ${options.instanceId}`);

      return {
        success: true,
        messageId: result?.key?.id
      };
    } catch (error) {
      console.error('❌ [MessagingService] Failed to send media directly:', error);
      throw error;
    }
  }

  /**
   * Check if queue mode is enabled
   */
  isQueueEnabled(): boolean {
    return this.useQueue;
  }

  /**
   * Enable queue mode at runtime (useful for testing)
   */
  enableQueue(): void {
    this.useQueue = true;
    console.log('✅ [MessagingService] Queue mode ENABLED');
  }

  /**
   * Disable queue mode at runtime (useful for testing)
   */
  disableQueue(): void {
    this.useQueue = false;
    console.log('⚠️ [MessagingService] Queue mode DISABLED - using direct sending');
  }
}
