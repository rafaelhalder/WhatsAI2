/**
 * Message Queue Service
 * 
 * Manages the BullMQ queue for message sending with anti-ban features:
 * - Random delays between messages
 * - Instance warm-up logic
 * - Rate limiting
 * - Job retry logic
 */

import { Queue, QueueOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { MessageQueueJob } from '../types/queue-types';
import { env } from '../config/env';

export class MessageQueueService {
  private static instance: MessageQueueService;
  private messageQueue: Queue<MessageQueueJob>;
  private redisConnection: Redis;

  private constructor() {
    // Initialize Redis connection
    this.redisConnection = new Redis({
      host: env.REDIS_HOST || 'localhost',
      port: env.REDIS_PORT || 6379,
      password: env.REDIS_PASSWORD,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false
    });

    // Configure BullMQ queue options
    const queueOptions: QueueOptions = {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000 // Start with 5 second delay, then exponential backoff
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000 // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 86400 // Keep failed jobs for 24 hours
        }
      }
    };

    // Create the message queue
    this.messageQueue = new Queue<MessageQueueJob>('message-sending', queueOptions);

    console.log('✅ [MessageQueue] Message queue initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MessageQueueService {
    if (!MessageQueueService.instance) {
      MessageQueueService.instance = new MessageQueueService();
    }
    return MessageQueueService.instance;
  }

  /**
   * Add a message to the queue
   */
  async addMessage(job: MessageQueueJob): Promise<void> {
    try {
      const priority = job.metadata?.priority || 'normal';
      const priorityValue = priority === 'high' ? 1 : priority === 'normal' ? 5 : 10;

      await this.messageQueue.add(
        'send-message',
        job,
        {
          priority: priorityValue,
          jobId: `${job.instanceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      );

      console.log(`📨 [MessageQueue] Message added to queue for instance ${job.instanceId}`);
    } catch (error) {
      console.error('❌ [MessageQueue] Failed to add message to queue:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.messageQueue.getWaitingCount(),
      this.messageQueue.getActiveCount(),
      this.messageQueue.getCompletedCount(),
      this.messageQueue.getFailedCount()
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Get queue for worker access
   */
  getQueue(): Queue<MessageQueueJob> {
    return this.messageQueue;
  }

  /**
   * Close queue and connections
   */
  async close(): Promise<void> {
    await this.messageQueue.close();
    await this.redisConnection.quit();
    console.log('🔌 [MessageQueue] Queue and Redis connection closed');
  }
}
