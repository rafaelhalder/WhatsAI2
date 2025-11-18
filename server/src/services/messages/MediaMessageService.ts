import { prisma } from '../../database/prisma';
import { SocketService } from '../socket-service';
import { MessagingService } from '../messaging-service';
import { MessageType } from './MessageTypeService';
import { Message } from '@prisma/client';

export interface SendMediaOptions {
  instanceId: string;
  remoteJid: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  caption?: string | undefined;
  fileName?: string | undefined;
}

export interface SendMediaOptions {
  instanceId: string;
  remoteJid: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  caption?: string;
  fileName?: string;
}

export class MediaMessageService {
  private messagingService: MessagingService;
  private socketService: SocketService;

  constructor() {
    this.messagingService = MessagingService.getInstance();
    this.socketService = SocketService.getInstance();
  }

  /**
   * Envia mensagem de mídia (imagem, vídeo, áudio, documento, sticker)
   */
  async sendMediaMessage(options: SendMediaOptions): Promise<Message> {
    const { instanceId, remoteJid, mediaUrl, mediaType, caption, fileName } = options;

    try {
      // Normalizar número
      const normalizedRemoteJid = this.normalizeRemoteJid(remoteJid);

      // Buscar instância
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: instanceId },
        select: { id: true, evolutionInstanceName: true }
      });

      if (!instance) {
        throw new Error(`Instância não encontrada: ${instanceId}`);
      }


      // Enviar via Messaging Service (anti-ban queue system)
      const sendOptions: any = {
        instanceId,
        remoteJid: normalizedRemoteJid,
        mediaUrl,
        mediaType,
        priority: 'normal'
      };
      
      // Only add optional properties if they have values
      if (caption !== undefined) sendOptions.caption = caption;
      if (fileName !== undefined) sendOptions.fileName = fileName;
      
      const result = await this.messagingService.sendMediaMessage(sendOptions);


      // Criar/atualizar conversa
      const conversation = await this.createOrUpdateConversation(instanceId, normalizedRemoteJid);

      // Salvar mensagem no banco
      const message = await this.saveMessage({
        instanceId,
        remoteJid: normalizedRemoteJid,
        fromMe: true,
        messageType: this.mapMediaTypeToMessageType(mediaType),
        content: caption || this.getDefaultContent(mediaType, fileName),
        messageId: result.messageId || `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        status: 'SENT',
        conversationId: conversation.id,
        mediaUrl,
        fileName,
        caption
      });

      // Emitir eventos em tempo real
      await this.emitRealTimeEvents(instanceId, conversation.id, message);

      return message;
    } catch (error: any) {
      console.error('❌ [sendMediaMessage] Error:', error);
      throw error;
    }
  }

  /**
   * Envia mensagem de áudio
   */
  async sendAudioMessage(instanceId: string, remoteJid: string, audioUrl: string): Promise<Message> {
    return this.sendMediaMessage({
      instanceId,
      remoteJid,
      mediaUrl: audioUrl,
      mediaType: 'audio'
    });
  }

  /**
   * Envia sticker
   */
  async sendStickerMessage(instanceId: string, remoteJid: string, stickerUrl: string): Promise<Message> {
    return this.sendMediaMessage({
      instanceId,
      remoteJid,
      mediaUrl: stickerUrl,
      mediaType: 'sticker'
    });
  }

  /**
   * Envia imagem
   */
  async sendImageMessage(instanceId: string, remoteJid: string, imageUrl: string, caption?: string): Promise<Message> {
    return this.sendMediaMessage({
      instanceId,
      remoteJid,
      mediaUrl: imageUrl,
      mediaType: 'image',
      caption
    });
  }

  private normalizeRemoteJid(remoteJid: string): string {
    // Implementar normalização similar ao conversation service
    if (remoteJid.includes('@')) {
      return remoteJid;
    }
    return `${remoteJid}@s.whatsapp.net`;
  }

  private async createOrUpdateConversation(instanceId: string, remoteJid: string) {
    // Lógica simplificada - em produção, usar o conversation service
    const conversation = await prisma.conversation.upsert({
      where: {
        instanceId_remoteJid: {
          instanceId,
          remoteJid
        }
      },
      update: {
        lastMessageAt: new Date()
      },
      create: {
        instanceId,
        remoteJid,
        isGroup: false,
        unreadCount: 0,
        isArchived: false,
        isPinned: false
      }
    });

    return conversation;
  }

  private async saveMessage(messageData: any): Promise<Message> {
    return await prisma.message.create({
      data: messageData
    });
  }

  private mapMediaTypeToMessageType(mediaType: string): MessageType {
    switch (mediaType) {
      case 'image': return MessageType.IMAGE;
      case 'video': return MessageType.VIDEO;
      case 'audio': return MessageType.AUDIO;
      case 'document': return MessageType.DOCUMENT;
      case 'sticker': return MessageType.STICKER;
      default: return MessageType.UNKNOWN;
    }
  }

  private getDefaultContent(mediaType: string, fileName?: string): string {
    switch (mediaType) {
      case 'image': return '[Imagem]';
      case 'video': return '[Vídeo]';
      case 'audio': return '[Áudio]';
      case 'document': return `[Documento: ${fileName || 'arquivo'}]`;
      case 'sticker': return '[Sticker]';
      default: return '[Mídia]';
    }
  }

  private async emitRealTimeEvents(instanceId: string, conversationId: string, message: Message) {
    // Emitir evento de mensagem enviada
    this.socketService.emitToInstance(instanceId, 'message:sent', {
      conversationId,
      message: {
        id: message.id,
        content: message.content,
        fromMe: message.fromMe,
        timestamp: message.timestamp,
        messageType: message.messageType,
        mediaUrl: message.mediaUrl,
        fileName: message.fileName,
        caption: message.caption
      }
    });

    // Atualizar conversa na lista
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });
    if (updatedConversation) {
      this.socketService.emitToInstance(instanceId, 'conversation:updated', {
        ...updatedConversation,
        lastMessagePreview: {
          content: message.content,
          fromMe: true,
          timestamp: message.timestamp,
          messageType: message.messageType
        }
      });
    }
  }
}