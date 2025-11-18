/**
 * Instance Warm-up Service
 * 
 * Manages the warm-up state of WhatsApp instances to prevent bans.
 * Tracks message counts and transitions instances through states:
 * nova → aquecendo → ativa
 */

import { prisma } from '../database/prisma';
import {
  InstanceWarmupState,
  InstanceWarmupConfig,
  DelayConfig,
  DEFAULT_DELAY_CONFIG
} from '../types/queue-types';

export class InstanceWarmupService {
  private delayConfig: DelayConfig;
  private warmupCache: Map<string, InstanceWarmupConfig> = new Map();

  constructor(delayConfig: DelayConfig = DEFAULT_DELAY_CONFIG) {
    this.delayConfig = delayConfig;
    this.loadWarmupStates();
  }

  /**
   * Load warm-up states from database on startup
   */
  private async loadWarmupStates(): Promise<void> {
    try {
      const instances = await prisma.whatsAppInstance.findMany({
        select: {
          id: true,
          warmupState: true,
          messagesCount: true,
          firstMessageAt: true,
          lastMessageAt: true,
          updatedAt: true
        }
      });

      instances.forEach(instance => {
        this.warmupCache.set(instance.id, {
          state: (instance.warmupState as InstanceWarmupState) || 'nova',
          messagesCount: instance.messagesCount || 0,
          firstMessageAt: instance.firstMessageAt || undefined,
          lastMessageAt: instance.lastMessageAt || undefined,
          updatedAt: instance.updatedAt
        });
      });

      console.log(`✅ [WarmupService] Loaded ${instances.length} instance warm-up states`);
    } catch (error) {
      console.error('❌ [WarmupService] Failed to load warm-up states:', error);
    }
  }

  /**
   * Get current warm-up state for an instance
   */
  async getWarmupState(instanceId: string): Promise<InstanceWarmupState> {
    let config = this.warmupCache.get(instanceId);

    if (!config) {
      // Load from database if not in cache
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: instanceId },
        select: {
          warmupState: true,
          messagesCount: true,
          firstMessageAt: true,
          lastMessageAt: true,
          updatedAt: true
        }
      });

      if (instance) {
        config = {
          state: (instance.warmupState as InstanceWarmupState) || 'nova',
          messagesCount: instance.messagesCount || 0,
          firstMessageAt: instance.firstMessageAt || undefined,
          lastMessageAt: instance.lastMessageAt || undefined,
          updatedAt: instance.updatedAt
        };
        this.warmupCache.set(instanceId, config);
      } else {
        // Default to 'nova' if instance not found
        return 'nova';
      }
    }

    return config.state;
  }

  /**
   * Get appropriate delay for instance based on warm-up state
   * Returns delay in milliseconds with random variation
   */
  async getDelayForInstance(instanceId: string): Promise<number> {
    const state = await this.getWarmupState(instanceId);
    const config = this.warmupCache.get(instanceId);
    const messagesCount = config?.messagesCount || 0;

    let minDelay: number;
    let maxDelay: number;

    switch (state) {
      case 'nova':
        minDelay = this.delayConfig.nova.min;
        maxDelay = this.delayConfig.nova.max;
        console.log(`⏱️ [WarmupDelay] Instance ${instanceId} is NOVA (${messagesCount} msgs) - delay: ${minDelay}-${maxDelay}ms`);
        break;

      case 'aquecendo':
        minDelay = this.delayConfig.aquecendo.min;
        maxDelay = this.delayConfig.aquecendo.max;
        console.log(`⏱️ [WarmupDelay] Instance ${instanceId} is AQUECENDO (${messagesCount} msgs) - delay: ${minDelay}-${maxDelay}ms`);
        break;

      case 'ativa':
        minDelay = this.delayConfig.ativa.min;
        maxDelay = this.delayConfig.ativa.max;
        console.log(`⏱️ [WarmupDelay] Instance ${instanceId} is ATIVA (${messagesCount} msgs) - delay: ${minDelay}-${maxDelay}ms`);
        break;

      default:
        // Fallback to 'nova' delays
        minDelay = this.delayConfig.nova.min;
        maxDelay = this.delayConfig.nova.max;
    }

    // Return random delay within range
    return this.randomDelay(minDelay, maxDelay);
  }

  /**
   * Generate random delay within range
   */
  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Increment message count and update warm-up state if needed
   */
  async recordMessageSent(instanceId: string): Promise<void> {
    try {
      const now = new Date();
      let config = this.warmupCache.get(instanceId);

      if (!config) {
        // Initialize if not exists
        config = {
          state: 'nova',
          messagesCount: 0,
          firstMessageAt: now,
          lastMessageAt: now,
          updatedAt: now
        };
      }

      // Increment message count
      config.messagesCount++;
      config.lastMessageAt = now;
      config.updatedAt = now;

      if (!config.firstMessageAt) {
        config.firstMessageAt = now;
      }

      // Check if state transition is needed
      const newState = this.calculateNewState(config);
      if (newState !== config.state) {
        console.log(`🔄 [WarmupTransition] Instance ${instanceId}: ${config.state} → ${newState} (${config.messagesCount} messages)`);
        config.state = newState;
      }

      // Update cache
      this.warmupCache.set(instanceId, config);

      // Persist to database
      await prisma.whatsAppInstance.update({
        where: { id: instanceId },
        data: {
          warmupState: config.state,
          messagesCount: config.messagesCount,
          firstMessageAt: config.firstMessageAt,
          lastMessageAt: config.lastMessageAt
        }
      });

    } catch (error) {
      console.error(`❌ [WarmupService] Failed to record message for ${instanceId}:`, error);
    }
  }

  /**
   * Calculate new state based on message count
   */
  private calculateNewState(config: InstanceWarmupConfig): InstanceWarmupState {
    const count = config.messagesCount;

    if (config.state === 'nova') {
      if (count >= this.delayConfig.nova.messagesUntilTransition) {
        return 'aquecendo';
      }
    } else if (config.state === 'aquecendo') {
      if (count >= this.delayConfig.aquecendo.messagesUntilTransition) {
        return 'ativa';
      }
    }

    return config.state;
  }

  /**
   * Reset warm-up state for an instance (e.g., after reconnection)
   */
  async resetWarmupState(instanceId: string): Promise<void> {
    try {
      const config: InstanceWarmupConfig = {
        state: 'nova',
        messagesCount: 0,
        firstMessageAt: undefined,
        lastMessageAt: undefined,
        updatedAt: new Date()
      };

      this.warmupCache.set(instanceId, config);

      await prisma.whatsAppInstance.update({
        where: { id: instanceId },
        data: {
          warmupState: 'nova',
          messagesCount: 0,
          firstMessageAt: null,
          lastMessageAt: null
        }
      });

      console.log(`🔄 [WarmupReset] Instance ${instanceId} reset to NOVA state`);
    } catch (error) {
      console.error(`❌ [WarmupService] Failed to reset state for ${instanceId}:`, error);
    }
  }

  /**
   * Get warm-up statistics for an instance
   */
  async getWarmupStats(instanceId: string): Promise<InstanceWarmupConfig | null> {
    const config = this.warmupCache.get(instanceId);
    if (config) {
      return { ...config };
    }

    // Try loading from database
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: instanceId },
      select: {
        warmupState: true,
        messagesCount: true,
        firstMessageAt: true,
        lastMessageAt: true,
        updatedAt: true
      }
    });

    if (instance) {
      return {
        state: (instance.warmupState as InstanceWarmupState) || 'nova',
        messagesCount: instance.messagesCount || 0,
        firstMessageAt: instance.firstMessageAt || undefined,
        lastMessageAt: instance.lastMessageAt || undefined,
        updatedAt: instance.updatedAt
      };
    }

    return null;
  }
}
