import { PrismaClient } from '@prisma/client';
import { cacheService } from '../../services/cache-service';
import { logger, LogContext } from '../../services/logger-service';

type Conversation = {
  id: string;
  instanceId: string;
  remoteJid: string;
  contactName?: string | null;
  contactPicture?: string | null;
  isGroup: boolean;
  lastMessage?: string | null;
  lastMessageAt?: Date | null;
  unreadCount: number;
  isArchived: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Message = {
  id: string;
  instanceId: string;
  remoteJid: string;
  fromMe: boolean;
  messageType: string;
  content: string;
  mediaUrl?: string | null;
  fileName?: string | null;
  caption?: string | null;
  messageId: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  conversationId?: string | null;
};

export interface ConversationWithMessages {
  id: string;
  instanceId: string;
  remoteJid: string;
  contactName?: string | null;
  contactPicture?: string | null;
  isGroup: boolean;
  lastMessage?: string | null;
  lastMessageAt?: Date | null;
  unreadCount: number;
  isArchived: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

export interface CreateConversationData {
  instanceId: string;
  remoteJid: string;
  contactName?: string;
  contactPicture?: string;
  isGroup?: boolean;
}

export interface UpdateConversationData {
  contactName?: string;
  contactPicture?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount?: number;
  isArchived?: boolean;
  isPinned?: boolean;
}

export class ConversationRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(conversationId: string): Promise<Conversation | null> {
    const startTime = Date.now();
    
    // Tentar buscar do cache primeiro
    const cached = await cacheService.getConversation<Conversation>(conversationId);
    if (cached) {
      const duration = Date.now() - startTime;
      logger.debug(LogContext.CACHE, `findById CACHE HIT: ${conversationId} (${duration}ms)`);
      return cached;
    }
    
    // Cache miss - buscar do banco
    const conversation = await (this.prisma as any).conversation.findUnique({
      where: { id: conversationId }
    });
    
    if (conversation) {
      // Armazenar no cache
      await cacheService.setConversation(conversationId, conversation);
    }
    
    const duration = Date.now() - startTime;
    logger.debug(LogContext.CACHE, `findById CACHE MISS: ${conversationId} (${duration}ms)`);
    
    return conversation;
  }

  async findByInstanceId(instanceId: string): Promise<Conversation[]> {

    const result = await (this.prisma as any).conversation.findMany({
      where: {
        instanceId,
        isArchived: false
      },
      orderBy: [
        { isPinned: 'desc' },
        { lastMessageAt: 'desc' }
      ],
      include: {
        messages: {
          take: 1,
          orderBy: { timestamp: 'desc' },
          select: {
            content: true,
            fromMe: true,
            timestamp: true,
            messageType: true
          }
        }
      }
    });

    console.log('🔍 [ConversationRepository] Conversas encontradas (não arquivadas):', result.length);

    // Também verificar quantas conversas arquivadas existem
    const archivedCount = await (this.prisma as any).conversation.count({
      where: {
        instanceId,
        isArchived: true
      }
    });

    return result;
  }

  async findAllByInstanceId(instanceId: string): Promise<Conversation[]> {
    const startTime = Date.now();
    
    // Tentar buscar do cache primeiro
    const cached = await cacheService.getConversations<Conversation[]>(instanceId);
    if (cached) {
      const duration = Date.now() - startTime;
      logger.debug(LogContext.CACHE, `findAllByInstanceId CACHE HIT: ${instanceId} (${duration}ms, ${cached.length} conversations)`);
      return cached;
    }
    
    // Cache miss - buscar do banco
    const result = await (this.prisma as any).conversation.findMany({
      where: {
        instanceId
      },
      orderBy: [
        { isPinned: 'desc' },
        { lastMessageAt: 'desc' }
      ]
    });

    // Armazenar no cache
    await cacheService.setConversations(instanceId, result);
    
    const duration = Date.now() - startTime;
    logger.debug(LogContext.CACHE, `findAllByInstanceId CACHE MISS: ${instanceId} (${duration}ms, ${result.length} conversations)`);

    return result;
  }

  async findByIdWithMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<ConversationWithMessages | null> {
    return (this.prisma as any).conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          take: limit,
          skip: offset,
          orderBy: { timestamp: 'desc' },
          select: {
            id: true,
            content: true,
            fromMe: true,
            messageType: true,
            timestamp: true,
            messageId: true,
            status: true,
            mediaUrl: true,
            fileName: true,
            caption: true,
            senderName: true,
            senderNumber: true
          }
        }
      }
    });
  }

  async create(data: CreateConversationData): Promise<Conversation> {
    const conversation = await (this.prisma as any).conversation.create({
      data: {
        ...data,
        lastMessageAt: new Date()
      }
    });
    
    // Invalidar cache da lista de conversas da instância
    await cacheService.invalidateConversations(data.instanceId);
    logger.debug(LogContext.CACHE, `Cache invalidated after create: instance ${data.instanceId}`);
    
    return conversation;
  }

  async update(id: string, data: UpdateConversationData): Promise<Conversation> {
    const conversation = await (this.prisma as any).conversation.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
    
    // Invalidar cache desta conversa E da lista de conversas
    await cacheService.invalidateConversationCaches(id, conversation.instanceId);
    logger.debug(LogContext.CACHE, `Cache invalidated after update: conversation ${id}`);
    
    return conversation;
  }

  async upsert(instanceId: string, remoteJid: string, data: Partial<CreateConversationData>): Promise<Conversation> {
    // Prepare update data - only include fields that have values
    const updateData: any = {
      lastMessageAt: new Date(),
      updatedAt: new Date()
    };
    
    // Only update contactName if provided and not null
    if (data.contactName) {
      updateData.contactName = data.contactName;
    }
    
    // Only update contactPicture if provided and not null
    if (data.contactPicture) {
      updateData.contactPicture = data.contactPicture;
    }
    
    const conversation = await (this.prisma as any).conversation.upsert({
      where: {
        instanceId_remoteJid: {
          instanceId,
          remoteJid
        }
      },
      create: {
        instanceId,
        remoteJid,
        contactName: data.contactName || null,
        contactPicture: data.contactPicture || null,
        isGroup: data.isGroup || false,
        lastMessageAt: new Date()
      },
      update: updateData
    });
    
    // Invalidar cache
    await cacheService.invalidateConversations(instanceId);
    logger.debug(LogContext.CACHE, `Cache invalidated after upsert: instance ${instanceId}`);
    
    return conversation;
  }

  async markAsRead(id: string): Promise<Conversation> {
    const conversation = await (this.prisma as any).conversation.update({
      where: { id },
      data: {
        unreadCount: 0,
        updatedAt: new Date()
      }
    });
    
    // Invalidar cache
    await cacheService.invalidateConversationCaches(id, conversation.instanceId);
    logger.debug(LogContext.CACHE, `Cache invalidated after markAsRead: conversation ${id}`);
    
    return conversation;
  }

  async incrementUnreadCount(id: string): Promise<Conversation> {
    const conversation = await (this.prisma as any).conversation.update({
      where: { id },
      data: {
        unreadCount: {
          increment: 1
        },
        updatedAt: new Date()
      }
    });
    
    // Invalidar cache
    await cacheService.invalidateConversationCaches(id, conversation.instanceId);
    logger.debug(LogContext.CACHE, `Cache invalidated after incrementUnreadCount: conversation ${id}`);
    
    return conversation;
  }

  async archive(id: string): Promise<Conversation> {
    const conversation = await (this.prisma as any).conversation.update({
      where: { id },
      data: {
        isArchived: true,
        updatedAt: new Date()
      }
    });
    
    // Invalidar cache
    await cacheService.invalidateConversationCaches(id, conversation.instanceId);
    logger.debug(LogContext.CACHE, `Cache invalidated after archive: conversation ${id}`);
    
    return conversation;
  }

  async unarchive(id: string): Promise<Conversation> {
    const conversation = await (this.prisma as any).conversation.update({
      where: { id },
      data: {
        isArchived: false,
        updatedAt: new Date()
      }
    });
    
    // Invalidar cache
    await cacheService.invalidateConversationCaches(id, conversation.instanceId);
    logger.debug(LogContext.CACHE, `Cache invalidated after unarchive: conversation ${id}`);
    
    return conversation;
  }

  async pin(id: string): Promise<Conversation> {
    const conversation = await (this.prisma as any).conversation.update({
      where: { id },
      data: {
        isPinned: true,
        updatedAt: new Date()
      }
    });
    
    // Invalidar cache
    await cacheService.invalidateConversationCaches(id, conversation.instanceId);
    logger.debug(LogContext.CACHE, `Cache invalidated after pin: conversation ${id}`);
    
    return conversation;
  }

  async unpin(id: string): Promise<Conversation> {
    const conversation = await (this.prisma as any).conversation.update({
      where: { id },
      data: {
        isPinned: false,
        updatedAt: new Date()
      }
    });
    
    // Invalidar cache
    await cacheService.invalidateConversationCaches(id, conversation.instanceId);
    logger.debug(LogContext.CACHE, `Cache invalidated after unpin: conversation ${id}`);
    
    return conversation;
  }

  async clearMessages(id: string): Promise<number> {
    // Delete all messages from this conversation
    const result = await (this.prisma as any).message.deleteMany({
      where: { conversationId: id }
    });
    
    // Update conversation to reset lastMessage
    await (this.prisma as any).conversation.update({
      where: { id },
      data: {
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
        updatedAt: new Date()
      }
    });
    
    // Get instanceId for cache invalidation
    const conversation = await (this.prisma as any).conversation.findUnique({
      where: { id },
      select: { instanceId: true }
    });
    
    if (conversation) {
      // Invalidar cache
      await cacheService.invalidateConversationCaches(id, conversation.instanceId);
      logger.debug(LogContext.CACHE, `Cache invalidated after clear messages: conversation ${id}`);
    }
    
    return result.count;
  }

  async delete(id: string): Promise<void> {
    const conversation = await (this.prisma as any).conversation.findUnique({
      where: { id }
    });
    
    await (this.prisma as any).conversation.delete({
      where: { id }
    });
    
    if (conversation) {
      // Invalidar cache
      await cacheService.invalidateConversationCaches(id, conversation.instanceId);
      logger.debug(LogContext.CACHE, `Cache invalidated after delete: conversation ${id}`);
    }
  }

  async getArchivedConversations(instanceId: string): Promise<Conversation[]> {
    return (this.prisma as any).conversation.findMany({
      where: {
        instanceId,
        isArchived: true
      },
      orderBy: { updatedAt: 'desc' }
    });
  }
}