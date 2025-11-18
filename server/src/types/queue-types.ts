/**
 * Queue Types for Anti-Ban Message Sending System
 * 
 * This file defines the types and interfaces for the BullMQ-based
 * message queue system that implements warm-up, rate limiting, and
 * random delays to prevent WhatsApp bans.
 */

export interface MessageQueueJob {
  instanceId: string;
  instanceName: string;
  remoteJid: string;
  messageType: 'text' | 'media';
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  caption?: string;
  fileName?: string;
  metadata?: {
    conversationId?: string;
    userId?: string;
    priority?: 'low' | 'normal' | 'high';
  };
}

/**
 * Instance Warm-up States
 * - nova: Instância recém-criada, precisa de aquecimento lento (delays maiores)
 * - aquecendo: Instância em processo de aquecimento (delays médios)
 * - ativa: Instância aquecida e estável (delays normais)
 */
export type InstanceWarmupState = 'nova' | 'aquecendo' | 'ativa';

export interface InstanceWarmupConfig {
  state: InstanceWarmupState;
  messagesCount: number;
  firstMessageAt?: Date;
  lastMessageAt?: Date;
  updatedAt: Date;
}

/**
 * Rate Limiting Configuration per Instance
 */
export interface RateLimitConfig {
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;
  maxMessagesPerDay: number;
}

/**
 * Delay Configuration based on Warm-up State
 */
export interface DelayConfig {
  nova: {
    min: number; // milliseconds
    max: number; // milliseconds
    messagesUntilTransition: number;
  };
  aquecendo: {
    min: number;
    max: number;
    messagesUntilTransition: number;
  };
  ativa: {
    min: number;
    max: number;
  };
}

/**
 * Default delay configuration (in milliseconds)
 */
export const DEFAULT_DELAY_CONFIG: DelayConfig = {
  nova: {
    min: 90000,  // 90 seconds
    max: 150000, // 150 seconds (2.5 minutes)
    messagesUntilTransition: 10 // Após 10 mensagens, passa para 'aquecendo'
  },
  aquecendo: {
    min: 30000,  // 30 seconds
    max: 60000,  // 60 seconds
    messagesUntilTransition: 50 // Após 50 mensagens totais, passa para 'ativa'
  },
  ativa: {
    min: 1000,   // 1 second
    max: 3000    // 3 seconds
  }
};

/**
 * Default rate limiting configuration
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxMessagesPerMinute: 10,
  maxMessagesPerHour: 200,
  maxMessagesPerDay: 2000
};
