import { ConversationRepository, CreateConversationData, UpdateConversationData, ConversationWithMessages } from '../database/repositories/conversation-repository';
import { MessageRepository } from '../database/repositories/message-repository';
import { prisma } from '../database/prisma';
import { EvolutionApiService } from './evolution-api';
import { SocketService } from './socket-service';

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

export interface ConversationSummary {
  id: string;
  remoteJid: string;
  contactName?: string | null | undefined;
  contactPicture?: string;
  isGroup: boolean;
  lastMessage?: string | null | undefined;
  lastMessageAt?: Date | null | undefined;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  lastMessagePreview?: {
    content: string;
    fromMe: boolean;
    timestamp: Date;
    messageType: string;
  } | undefined;
}

export class ConversationService {
  private conversationRepository: ConversationRepository;
  private messageRepository: MessageRepository;
  private evolutionApiService: EvolutionApiService;
  private socketService: SocketService;
  private lidToRealNumberCache: Map<string, string> = new Map(); // @lid → real number
  private keyIdToLidCache: Map<string, string> = new Map(); // keyId → @lid  
  private keyIdToRealCache: Map<string, string> = new Map(); // keyId → real number

  constructor() {
    this.conversationRepository = new ConversationRepository(prisma);
    this.messageRepository = new MessageRepository(prisma);
    this.evolutionApiService = new EvolutionApiService();
    this.socketService = SocketService.getInstance();
  }

  /**
   * Normalize WhatsApp number to ensure consistent conversation matching
   * Removes @s.whatsapp.net, @g.us, @c.us, @lid suffixes and :device_id
   * Examples:
   * - 5541998773200@s.whatsapp.net → 5541998773200
   * - 554198773200:98@s.whatsapp.net → 554198773200 (remove device ID)
   * - 79512746377469@lid → 79512746377469
   * - 554198773200 → 554198773200
   */
  private normalizeRemoteJid(remoteJid: string): string {
    // Remove device IDs (e.g., :98, :4) before suffix
    let normalized = remoteJid.replace(/:\d+@/, '@');
    
    // Remove WhatsApp suffixes temporarily for cleaning
    const isGroup = normalized.includes('@g.us');
    let cleanNumber = normalized
      .replace('@s.whatsapp.net', '')
      .replace('@g.us', '')
      .replace('@c.us', '')
      .replace('@lid', '');
    
    // 🇧🇷 NORMALIZAÇÃO BRASIL: Adicionar 9º dígito se faltar
    // Números BR: 55 (país) + 2 dígitos (DDD) + 9 dígitos (número com 9 na frente)
    // Exemplo: 5541991188909 (13 dígitos) ✅
    // Exemplo: 554191188909 (12 dígitos) ❌ falta o 9
    if (cleanNumber.startsWith('55') && !isGroup) {
      const withoutCountryCode = cleanNumber.substring(2); // Remove "55"
      
      // Se tem 10 dígitos (DDD + 8 dígitos), adicionar o 9
      if (withoutCountryCode.length === 10) {
        const ddd = withoutCountryCode.substring(0, 2);
        const numero = withoutCountryCode.substring(2);
        cleanNumber = `55${ddd}9${numero}`; // Adiciona o 9 antes do número
        console.log(`🇧🇷 [normalizeRemoteJid] Número BR antigo detectado! Adicionando 9: ${remoteJid} → ${cleanNumber}`);
      }
    }
    
    // Add back the correct suffix (ALWAYS use @s.whatsapp.net or @g.us)
    if (isGroup) {
      normalized = cleanNumber + '@g.us';
    } else {
      normalized = cleanNumber + '@s.whatsapp.net';
    }
    
    // Log for debugging duplicate conversations
    console.log(`📞 [normalizeRemoteJid] Input: ${remoteJid} → Output: ${normalized}`);
    
    return normalized;
  }

  /**
   * Format number with @s.whatsapp.net suffix for Evolution API
   * NEVER use @lid - always convert to @s.whatsapp.net
   */
  private formatRemoteJid(number: string): string {
    // If already has @, check if it's @lid and replace
    if (number.includes('@')) {
      // If it's @lid, remove it and format as normal number
      if (number.includes('@lid')) {
        const cleanNumber = number.replace('@lid', '');
        console.log(`🔄 [formatRemoteJid] Converting @lid to @s.whatsapp.net: ${number} → ${cleanNumber}@s.whatsapp.net`);
        return `${cleanNumber}@s.whatsapp.net`;
      }
      return number; // Already formatted correctly
    }
    
    // Check if it's a group
    if (number.includes('-')) {
      return `${number}@g.us`;
    }
    
    return `${number}@s.whatsapp.net`;
  }

  async getConversationsByInstance(instanceId: string): Promise<ConversationSummary[]> {
    const conversations = await this.conversationRepository.findByInstanceId(instanceId);
    
    // 📸 Buscar fotos em background para conversas sem foto
    const conversationsWithoutPicture = conversations.filter(c => !c.contactPicture);
    if (conversationsWithoutPicture.length > 0) {
      console.log(`📸 Buscando fotos para ${conversationsWithoutPicture.length} conversas sem foto...`);
      
      // Buscar todas em paralelo (não esperar)
      Promise.all(
        conversationsWithoutPicture.map(conv => 
          this.fetchContactInfoInBackground(conv.id, instanceId, conv.remoteJid)
        )
      ).catch(err => console.log('⚠️  Erro ao buscar fotos:', err.message));
    }
    
    return conversations.map(conversation => {
      // Obter a última mensagem do relacionamento messages (primeira posição, ordenada por timestamp desc)
      const lastMessage = (conversation as any).messages?.[0];
      
      return {
        id: conversation.id,
        remoteJid: conversation.remoteJid,
        contactName: conversation.contactName,
        contactPicture: conversation.contactPicture || '',
        isGroup: conversation.isGroup,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: conversation.unreadCount,
        isPinned: conversation.isPinned,
        isArchived: conversation.isArchived,
        lastMessagePreview: lastMessage ? {
          content: lastMessage.content,
          timestamp: lastMessage.timestamp,
          fromMe: lastMessage.fromMe,
          messageType: lastMessage.messageType
        } : undefined
      };
    });
  }

  async getConversationById(conversationId: string): Promise<Conversation | null> {
    return await this.conversationRepository.findById(conversationId);
  }

  async getConversationMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<ConversationWithMessages | null> {
    const conversation = await this.conversationRepository.findByIdWithMessages(conversationId, limit, offset);
    
    if (conversation) {
      // Mark conversation as read when accessing messages
      await this.conversationRepository.markAsRead(conversationId);
      
      // Notify frontend about read status change
      this.socketService.emitToInstance((conversation as any).instanceId, 'conversation:read', {
        conversationId,
        unreadCount: 0
      });
    }
    
    return conversation;
  }

  async createOrUpdateConversation(instanceId: string, remoteJid: string, data: Partial<CreateConversationData> = {}): Promise<Conversation> {
    const conversation = await this.conversationRepository.upsert(instanceId, remoteJid, {
      ...data,
      instanceId,
      remoteJid
    });

    // 📸 Buscar foto de perfil em background se ainda não tiver
    if (!conversation.contactPicture) {
      this.fetchContactInfoInBackground(conversation.id, instanceId, remoteJid).catch(err => {
        console.log(`⚠️  Erro ao buscar foto em background:`, err.message);
      });
    }

    // Emit conversation update to frontend
    console.log(`📡 [WebSocket] Emitindo conversation:updated para instância ${instanceId}:`, {
      conversationId: conversation.id,
      remoteJid: conversation.remoteJid,
      contactName: conversation.contactName
    });
    
    // Buscar a última mensagem para incluir no preview
    const lastMessage = await prisma.message.findFirst({
      where: { conversationId: conversation.id },
      orderBy: { timestamp: 'desc' }
    });
    
    const conversationWithPreview = {
      ...conversation,
      lastMessagePreview: lastMessage ? {
        content: lastMessage.content,
        timestamp: lastMessage.timestamp,
        fromMe: lastMessage.fromMe,
        messageType: lastMessage.messageType
      } : undefined
    };
    
    this.socketService.emitToInstance(instanceId, 'conversation:updated', conversationWithPreview);

    return conversation;
  }

  /**
   * Busca informações do contato em background (não bloqueia)
   */
  private async fetchContactInfoInBackground(conversationId: string, instanceId: string, remoteJid: string): Promise<void> {
    try {
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: instanceId }
      });

      if (!instance) return;

      const evolutionService = new EvolutionApiService(instance.evolutionApiUrl, instance.evolutionApiKey);
      const number = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      
      // Buscar foto
      const profilePicture = await evolutionService.fetchProfilePictureUrl(
        instance.evolutionInstanceName,
        number
      );

      if (profilePicture.profilePictureUrl) {
        await this.conversationRepository.update(conversationId, {
          contactPicture: profilePicture.profilePictureUrl
        });

        console.log(`📸 Foto de perfil atualizada em background para ${number}`);

        // Notificar frontend
        const updatedConv = await this.conversationRepository.findById(conversationId);
        if (updatedConv) {
          this.socketService.emitToInstance(instanceId, 'conversation:updated', updatedConv);
        }
      }
    } catch (error) {
      // Não fazer nada, apenas log silencioso
      console.log(`⚠️  Não foi possível buscar foto para conversa ${conversationId}`);
    }
  }

  /**
   * Record mapping between @lid and real number from messages.update events
   */
  async recordLidMapping(keyId: string, lidNumber: string | null, realNumber: string | null): Promise<void> {
    if (lidNumber && lidNumber.includes('@lid')) {
      this.keyIdToLidCache.set(keyId, lidNumber);
    }
    
    if (realNumber && realNumber.includes('@s.whatsapp.net')) {
      this.keyIdToRealCache.set(keyId, realNumber);
    }
    
    // If we have both for this keyId, create the mapping
    const lid = this.keyIdToLidCache.get(keyId);
    const real = this.keyIdToRealCache.get(keyId);
    
    if (lid && real) {
      this.lidToRealNumberCache.set(lid, real);
      console.log(`✅ Mapped: ${lid} → ${real}`);
    }
  }

  /**
   * Resolve @lid to real number if available in cache
   */
  private resolveLidToRealNumber(remoteJid: string): string {
    if (remoteJid.includes('@lid')) {
      const realNumber = this.lidToRealNumberCache.get(remoteJid);
      if (realNumber) {
        console.log(`🔄 Resolved @lid: ${remoteJid} → ${realNumber}`);
        return realNumber;
      }
    }
    return remoteJid;
  }

  /**
   * Update contact info from webhook (contacts.update event)
   * Avoids unnecessary API calls for profile pictures and names
   */
  async updateContactFromWebhook(instanceId: string, remoteJid: string, data: { contactName?: string; contactPicture?: string }): Promise<void> {
    try {
      const normalizedJid = this.normalizeRemoteJid(remoteJid);
      const formattedJid = this.formatRemoteJid(normalizedJid);
      
      // Find conversation by remoteJid
      const conversations = await this.conversationRepository.findByInstanceId(instanceId);
      const conversation = conversations.find(c => c.remoteJid === formattedJid);
      
      if (conversation) {
        const updateData: any = {};
        if (data.contactName) updateData.contactName = data.contactName;
        if (data.contactPicture) updateData.contactPicture = data.contactPicture;
        
        if (Object.keys(updateData).length > 0) {
          await this.conversationRepository.update(conversation.id, updateData);
        }
        
        console.log(`✅ Updated contact from webhook: ${data.contactName || remoteJid}`);
        
        // Notify frontend
        const updated = await this.conversationRepository.findById(conversation.id);
        if (updated) {
          this.socketService.emitToInstance(instanceId, 'conversation:updated', updated);
        }
      }
    } catch (error) {
      console.log(`⚠️ Failed to update contact from webhook:`, error);
    }
  }

  /**
   * Update unread count from webhook (chats.upsert event)
   */
  async updateUnreadCount(instanceId: string, remoteJid: string, unreadCount: number): Promise<void> {
    try {
      const normalizedJid = this.normalizeRemoteJid(remoteJid);
      const formattedJid = this.formatRemoteJid(normalizedJid);
      
      // Find conversation by remoteJid
      const conversations = await this.conversationRepository.findByInstanceId(instanceId);
      const conversation = conversations.find(c => c.remoteJid === formattedJid);
      
      if (conversation) {
        await this.conversationRepository.update(conversation.id, { unreadCount });
        
        console.log(`✅ Updated unread count from webhook: ${formattedJid} = ${unreadCount}`);
        
        // Notify frontend
        this.socketService.emitToInstance(instanceId, 'conversation:unread', {
          conversationId: conversation.id,
          unreadCount
        });
      }
    } catch (error) {
      console.log(`⚠️ Failed to update unread count from webhook:`, error);
    }
  }

  async handleIncomingMessage(instanceId: string, messageData: any): Promise<void> {
    try {
      console.log(`📨 [handleIncomingMessage] instanceId recebido do webhook: ${instanceId}`);
      console.log(`📨 [handleIncomingMessage] RAW messageData.key:`, JSON.stringify(messageData.key, null, 2));
      
      // 🔍 Verificar se a instância existe no banco (buscar por evolutionInstanceName)
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { evolutionInstanceName: instanceId }
      });
      
      if (!instance) {
        console.error(`❌ [handleIncomingMessage] Instância ${instanceId} NÃO EXISTE no banco!`);
        return;
      }
      
      console.log(`✅ [handleIncomingMessage] Instância encontrada: ${instance.name} (DB ID: ${instance.id})`);
      
      let remoteJid = messageData.key.remoteJid;
      
      // � PRIORIDADE: Se tiver remoteJidAlt com número real, usar ele
      if (messageData.key.remoteJidAlt && !messageData.key.remoteJidAlt.includes('@lid')) {
        // remoteJidAlt é um número real, usar ele ao invés do @lid
        console.log(`🔄 [handleIncomingMessage] Usando remoteJidAlt: ${remoteJid} → ${messageData.key.remoteJidAlt}`);
        remoteJid = messageData.key.remoteJidAlt;
        
        // Adicionar @s.whatsapp.net se não tiver domínio
        if (!remoteJid.includes('@')) {
          remoteJid = `${remoteJid}@s.whatsapp.net`;
        }
      } else if (messageData.key.remoteJidAlt && messageData.key.remoteJidAlt.includes('@lid')) {
        // Salvar mapeamento @lid → número real para uso futuro
        if (remoteJid.includes('@s.whatsapp.net')) {
          this.lidToRealNumberCache.set(messageData.key.remoteJidAlt, remoteJid);
          console.log(`✅ [handleIncomingMessage] Mapeado @lid: ${messageData.key.remoteJidAlt} → ${remoteJid}`);
        }
      }
      
      // �🇧🇷 NORMALIZAR NÚMERO BRASILEIRO PRIMEIRO (antes de qualquer processamento)
      if (remoteJid.includes('@s.whatsapp.net')) {
        const cleanNumber = remoteJid.replace('@s.whatsapp.net', '');
        if (cleanNumber.startsWith('55') && cleanNumber.length === 12) {
          // Número brasileiro sem o 9 (formato antigo)
          const ddd = cleanNumber.substring(2, 4);
          const phoneNumber = cleanNumber.substring(4);
          
          if (phoneNumber.length === 8 && !phoneNumber.startsWith('9')) {
            remoteJid = `55${ddd}9${phoneNumber}@s.whatsapp.net`;
            console.log(`🇧🇷 [handleIncomingMessage] Número brasileiro corrigido: ${messageData.key.remoteJid} → ${remoteJid}`);
          }
        }
      }
      
      // 🔄 Try to resolve @lid to real number (fallback se não tiver remoteJidAlt)
      remoteJid = this.resolveLidToRealNumber(remoteJid);

      
      // Normalize remoteJid to avoid duplicate conversations
      const normalizedRemoteJid = this.normalizeRemoteJid(remoteJid);
      const formattedRemoteJid = this.formatRemoteJid(normalizedRemoteJid);
      
      console.log(`📨 [handleIncomingMessage] Normalized: ${messageData.key.remoteJid} → ${formattedRemoteJid}`);
      
      // Create or update conversation first (usar o DB ID da instância)
      // 🚨 IMPORTANTE: Só atualizar contactName quando a mensagem NÃO for sua (fromMe: false)
      const conversationData: any = {
        isGroup: messageData.key.remoteJid.includes('@g.us')
      };
      
      // Se a mensagem foi RECEBIDA (não enviada por você), atualizar o nome do contato
      if (!messageData.key.fromMe && messageData.pushName) {
        conversationData.contactName = messageData.pushName;
        console.log(`👤 [handleIncomingMessage] Atualizando contactName: ${messageData.pushName}`);
      } else if (messageData.key.fromMe) {
        console.log(`⏩ [handleIncomingMessage] Mensagem enviada por você - mantendo contactName existente`);
      }
      
      const conversation = await this.createOrUpdateConversation(instance.id, formattedRemoteJid, conversationData);

      // Now save the message with conversation link
      const messageCreateData = {
        instanceId: instance.id, // Usar DB ID
        remoteJid: formattedRemoteJid, // Use normalized version
        fromMe: messageData.key.fromMe || false,
        messageType: this.getMessageType(messageData),
        content: this.extractMessageContent(messageData),
        messageId: messageData.key.id,
        timestamp: new Date(messageData.messageTimestamp * 1000),
        status: messageData.key.fromMe ? 'SENT' : 'DELIVERED', // Status inicial: SENT se foi você, DELIVERED se recebeu
        mediaUrl: messageData.message?.imageMessage?.url || messageData.message?.videoMessage?.url || messageData.message?.audioMessage?.url,
        fileName: messageData.message?.documentMessage?.fileName,
        caption: messageData.message?.imageMessage?.caption || messageData.message?.videoMessage?.caption,
        conversationId: conversation.id // Link to conversation
      };
      
      // 🛡️ Try to create message, but ignore if messageId already exists (duplicate webhook)
      let message;
      try {
        message = await this.messageRepository.create(messageCreateData);
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('messageId')) {
          console.log(`⚠️ Message ${messageData.key.id} already exists, skipping...`);
          // Get existing message
          const existingMessage = await prisma.message.findFirst({
            where: { messageId: messageData.key.id }
          });
          if (existingMessage) {
            message = existingMessage;
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      // Update conversation with last message info
      // Smart unread logic: only increment if conversation is NOT currently active
      const isConversationActive = this.socketService.isConversationActive(conversation.id);
      const shouldMarkAsRead = messageData.key.fromMe || isConversationActive;
      
      console.log(`📱 Smart read logic for conversation ${conversation.id}:`);
      console.log(`   - fromMe: ${messageData.key.fromMe}`);
      console.log(`   - isActive: ${isConversationActive}`);
      console.log(`   - shouldMarkAsRead: ${shouldMarkAsRead}`);

      await this.conversationRepository.update(conversation.id, {
        lastMessage: this.extractMessageContent(messageData),
        lastMessageAt: new Date(messageData.messageTimestamp * 1000),
        unreadCount: shouldMarkAsRead ? 0 : conversation.unreadCount + 1
      });

      // If conversation is active and message was received, auto-mark as read in Evolution API
      if (isConversationActive && !messageData.key.fromMe) {
        console.log(`🤖 Auto-marking message as read in Evolution API (conversation is active)`);
        try {
          const evolutionApi = new EvolutionApiService();
          
          if (instance.evolutionInstanceName) {
            await evolutionApi.markMessageAsRead(instance.evolutionInstanceName, [{
              remoteJid: formattedRemoteJid, // Use normalized version
              fromMe: messageData.key.fromMe || false,
              id: messageData.key.id
            }]);
          }
        } catch (error) {
          console.error('❌ Error auto-marking message as read:', error);
        }
      }

      // Emit real-time update to frontend
      this.socketService.emitToInstance(instance.id, 'message:received', {
        conversationId: conversation.id,
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

      // Update conversation list in frontend (usar DB ID)
      const updatedConversation = await this.conversationRepository.findByInstanceAndRemoteJid(instance.id, formattedRemoteJid);
      if (updatedConversation) {
        console.log(`📡 [handleIncomingMessage] Emitindo conversation:updated para instância ${instance.id}:`, {
          conversationId: updatedConversation.id,
          remoteJid: updatedConversation.remoteJid,
          lastMessage: updatedConversation.lastMessage
        });
        
        // Incluir lastMessagePreview para exibir na lista
        const conversationWithPreview = {
          ...updatedConversation,
          lastMessagePreview: message ? {
            content: message.content,
            timestamp: message.timestamp,
            fromMe: message.fromMe,
            messageType: message.messageType
          } : undefined
        };
        
        this.socketService.emitToInstance(instance.id, 'conversation:updated', conversationWithPreview);
      } else {
        console.error(`❌ [handleIncomingMessage] Não foi possível buscar conversa atualizada para ${formattedRemoteJid}`);
      }

    } catch (error) {
      console.error('Error handling incoming message:', error);
      throw error;
    }
  }

  async sendMessage(instanceId: string, remoteJid: string, content: string): Promise<Message> {
    try {
      // Normalize remoteJid to avoid duplicate conversations
      const normalizedRemoteJid = this.normalizeRemoteJid(remoteJid);
      const formattedRemoteJid = this.formatRemoteJid(normalizedRemoteJid);
      
      console.log(`📤 [sendMessage] Normalized: ${remoteJid} → ${formattedRemoteJid}`);
      console.log(`🔍 [sendMessage] Procurando instância ${instanceId} para obter evolutionInstanceName`);
      
      // Get the instance to find the evolutionInstanceName
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: instanceId },
        select: { id: true, evolutionInstanceName: true } // ⚡ Apenas campos necessários
      });

      if (!instance) {
        console.error(`❌ [sendMessage] Instância não encontrada: ${instanceId}`);
        throw new Error(`Instância não encontrada: ${instanceId}`);
      }

      console.log(`✅ [sendMessage] Instância encontrada: ${instance.evolutionInstanceName}`);

      // ⚡ Criar/atualizar conversa em paralelo com envio da mensagem
      const [evolutionResponse, conversation] = await Promise.all([
        this.evolutionApiService.sendTextMessage(
          instance.evolutionInstanceName, 
          formattedRemoteJid,
          content
        ),
        this.createOrUpdateConversation(instanceId, formattedRemoteJid)
      ]);

      console.log(`✅ [sendMessage] Mensagem enviada via Evolution API:`, evolutionResponse);

      // Save message to database
      const message = await this.messageRepository.create({
        instanceId,
        remoteJid: formattedRemoteJid,
        fromMe: true,
        messageType: 'TEXT',
        content,
        messageId: evolutionResponse.key?.id || `msg_${Date.now()}`,
        timestamp: new Date(),
        status: 'SENT',
        conversationId: conversation.id
      });

      // ⚡ Executar atualizações e emissões em paralelo (não esperar)
      Promise.all([
        this.conversationRepository.update(conversation.id, {
          lastMessage: content,
          lastMessageAt: new Date()
        }),
        // Emitir eventos em paralelo
        (async () => {
          this.socketService.emitToInstance(instanceId, 'message:sent', {
            conversationId: conversation.id,
            message: {
              id: message.id,
              content: message.content,
              fromMe: message.fromMe,
              timestamp: message.timestamp,
              messageType: message.messageType
            }
          });

          // ✅ Buscar conversa atualizada do banco para emitir com dados corretos
          const updatedConversation = await this.conversationRepository.findById(conversation.id);
          if (updatedConversation) {
            this.socketService.emitToInstance(instanceId, 'conversation:updated', {
              ...updatedConversation,
              lastMessagePreview: {
                content: content,
                fromMe: true,
                timestamp: new Date(),
                messageType: 'TEXT'
              }
            });
          }
        })()
      ]).catch(error => {
        console.error('⚠️ Erro em operações pós-envio (não crítico):', error);
      });

      console.log(`✅ [sendMessage] Mensagem salva no banco de dados:`, message.id);
      return message;
    } catch (error: any) {
      console.error('❌ [sendMessage] Error sending message:', error);
      
      // Se o erro for sobre número não ter WhatsApp, criar um erro mais específico
      if (error.message && error.message.includes('não possui WhatsApp')) {
        throw new Error(`Não foi possível enviar a mensagem: ${error.message}`);
      }
      
      throw error;
    }
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      // Buscar a conversa e suas mensagens não lidas
      const conversation = await this.conversationRepository.findByIdWithMessages(conversationId, 50, 0);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Buscar a instância para obter os dados da Evolution API
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: conversation.instanceId }
      });

      if (!instance) {
        throw new Error('Instance not found');
      }

      // Filtrar mensagens não lidas (que não são minhas)
      const unreadMessages = conversation.messages
        .filter(msg => !msg.fromMe)
        .map(msg => ({
          remoteJid: msg.remoteJid,
          fromMe: msg.fromMe,
          id: msg.messageId
        }));

      if (unreadMessages.length > 0) {
        // Criar service específico para esta instância
        const evolutionService = new EvolutionApiService(instance.evolutionApiUrl, instance.evolutionApiKey);
        
        // Marcar mensagens como lidas na Evolution API
        await evolutionService.markMessageAsRead(instance.evolutionInstanceName, unreadMessages);
      }

      // Atualizar contador local
      await this.conversationRepository.update(conversationId, {
        unreadCount: 0
      });

      console.log(`✅ Conversation ${conversationId} marked as read`);

      // Notificar via WebSocket
      this.socketService.emitToInstance(conversation.instanceId, 'conversation:read', {
        conversationId,
        unreadCount: 0
      });

    } catch (error) {
      console.error('❌ Error marking conversation as read:', error);
      throw error;
    }
  }

  async pinConversation(conversationId: string): Promise<void> {
    const conversation = await this.conversationRepository.pin(conversationId);
    
    // Emit update to frontend
    this.socketService.emitToInstance(conversation.instanceId, 'conversation:pinned', {
      conversationId,
      isPinned: true
    });
  }

  async unpinConversation(conversationId: string): Promise<void> {
    const conversation = await this.conversationRepository.unpin(conversationId);
    
    // Emit update to frontend
    this.socketService.emitToInstance(conversation.instanceId, 'conversation:unpinned', {
      conversationId,
      isPinned: false
    });
  }

  async archiveConversation(conversationId: string): Promise<void> {
    const conversation = await this.conversationRepository.archive(conversationId);
    
    // Emit update to frontend
    this.socketService.emitToInstance(conversation.instanceId, 'conversation:archived', {
      conversationId,
      isArchived: true
    });
  }

  async getArchivedConversations(instanceId: string): Promise<ConversationSummary[]> {
    const conversations = await this.conversationRepository.getArchivedConversations(instanceId);
    
    return conversations.map(conversation => ({
      id: conversation.id,
      remoteJid: conversation.remoteJid,
      contactName: conversation.contactName,
      contactPicture: conversation.contactPicture || '',
      isGroup: conversation.isGroup,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount: conversation.unreadCount,
      isPinned: conversation.isPinned,
      isArchived: conversation.isArchived
    }));
  }

  private formatPhoneNumber(remoteJid: string): string {
    // Extract phone number from WhatsApp JID format
    const phone = remoteJid.split('@')[0];
    
    if (!phone) return remoteJid;
    
    // Format Brazilian phone numbers
    if (phone.startsWith('55') && phone.length === 13) {
      return `+55 (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    
    return phone;
  }

  private getMessageType(messageData: any): string {
    if (messageData.message?.conversation) return 'TEXT';
    if (messageData.message?.extendedTextMessage) return 'TEXT';
    if (messageData.message?.imageMessage) return 'IMAGE';
    if (messageData.message?.videoMessage) return 'VIDEO';
    if (messageData.message?.audioMessage) return 'AUDIO';
    if (messageData.message?.documentMessage) return 'DOCUMENT';
    if (messageData.message?.stickerMessage) return 'STICKER';
    if (messageData.message?.locationMessage) return 'LOCATION';
    if (messageData.message?.contactMessage) return 'CONTACT';
    
    return 'UNKNOWN';
  }

  private extractMessageContent(messageData: any): string {
    if (messageData.message?.conversation) {
      return messageData.message.conversation;
    }
    
    if (messageData.message?.extendedTextMessage?.text) {
      return messageData.message.extendedTextMessage.text;
    }
    
    if (messageData.message?.imageMessage?.caption) {
      return messageData.message.imageMessage.caption || '[Imagem]';
    }
    
    if (messageData.message?.videoMessage?.caption) {
      return messageData.message.videoMessage.caption || '[Vídeo]';
    }
    
    if (messageData.message?.audioMessage) {
      return '[Áudio]';
    }
    
    if (messageData.message?.documentMessage) {
      return `[Documento: ${messageData.message.documentMessage.fileName || 'arquivo'}]`;
    }
    
    if (messageData.message?.stickerMessage) {
      return '[Sticker]';
    }
    
    if (messageData.message?.locationMessage) {
      return '[Localização]';
    }
    
    if (messageData.message?.contactMessage) {
      return '[Contato]';
    }
    
    return '[Mensagem não suportada]';
  }

  async markConversationAsUnread(conversationId: string): Promise<void> {
    try {
      // Buscar a conversa e sua última mensagem
      const conversation = await this.conversationRepository.findByIdWithMessages(conversationId, 1, 0);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (conversation.messages.length === 0) {
        throw new Error('No messages found to mark as unread');
      }

      // Buscar a instância para obter os dados da Evolution API
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: conversation.instanceId }
      });

      if (!instance) {
        throw new Error('Instance not found');
      }

      const lastMessage = conversation.messages[0];
      if (!lastMessage) {
        throw new Error('Last message not found');
      }

      // Criar service específico para esta instância
      const evolutionService = new EvolutionApiService(instance.evolutionApiUrl, instance.evolutionApiKey);
      
      // Marcar chat como não lido na Evolution API
      await evolutionService.markChatAsUnread(
        instance.evolutionInstanceName,
        conversation.remoteJid,
        {
          remoteJid: lastMessage.remoteJid,
          fromMe: lastMessage.fromMe,
          id: lastMessage.messageId
        }
      );

      // Atualizar contador local (incrementar se era 0)
      const newUnreadCount = conversation.unreadCount > 0 ? conversation.unreadCount : 1;
      await this.conversationRepository.update(conversationId, {
        unreadCount: newUnreadCount
      });

      console.log(`✅ Conversation ${conversationId} marked as unread`);

      // Notificar via WebSocket
      this.socketService.emitToInstance(conversation.instanceId, 'conversation:unread', {
        conversationId,
        instanceId: conversation.instanceId,
        unreadCount: newUnreadCount
      });

    } catch (error) {
      console.error('❌ Error marking conversation as unread:', error);
      throw error;
    }
  }

  /**
   * Update contact information (name and profile picture)
   * @param conversationId - ID da conversa
   * @returns Updated conversation
   */
  async updateContactInfo(conversationId: string): Promise<Conversation | null> {
    try {
      const conversation = await this.conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: conversation.instanceId }
      });

      if (!instance) {
        throw new Error('Instance not found');
      }

      const evolutionService = new EvolutionApiService(instance.evolutionApiUrl, instance.evolutionApiKey);
      
      // Extrair número do remoteJid
      const number = conversation.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      
      // Buscar informações do contato
      const contacts = await evolutionService.fetchContacts(instance.evolutionInstanceName, [number]);
      
      if (contacts.length > 0) {
        const contact = contacts[0];
        if (contact) {
          const displayName = evolutionService.getContactDisplayName(contact, number);
          
          // Buscar foto de perfil separadamente
          const profilePicture = await evolutionService.fetchProfilePictureUrl(
            instance.evolutionInstanceName,
            number
          );

          // Atualizar conversa com novas informações
          const updateData: UpdateConversationData = {
            contactName: displayName
          };
          
          if (profilePicture.profilePictureUrl) {
            updateData.contactPicture = profilePicture.profilePictureUrl;
          }

          const updatedConversation = await this.conversationRepository.update(conversationId, updateData);

          console.log(`✅ Contact info updated for conversation ${conversationId}: ${displayName}`);

          // Notificar via WebSocket
          this.socketService.emitToInstance(conversation.instanceId, 'conversation:updated', updatedConversation);

          return updatedConversation;
        }
      }

      return conversation;
    } catch (error) {
      console.error('❌ Error updating contact info:', error);
      throw error;
    }
  }

  /**
   * Batch update contact info for multiple conversations
   * @param instanceId - ID da instância
   */
  async updateAllContactsInfo(instanceId: string): Promise<void> {
    try {
      console.log(`🔄 Updating contact info for all conversations in instance ${instanceId}`);
      
      const conversations = await this.conversationRepository.findByInstanceId(instanceId);
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: instanceId }
      });

      if (!instance) {
        throw new Error('Instance not found');
      }

      const evolutionService = new EvolutionApiService(instance.evolutionApiUrl, instance.evolutionApiKey);
      
      // Buscar todos os contatos de uma vez
      const numbers = conversations.map(c => 
        c.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')
      );
      
      const contacts = await evolutionService.fetchContacts(instance.evolutionInstanceName, numbers);
      
      // Criar mapa de contatos por número
      const contactMap = new Map(
        contacts.map(c => [c.id.replace('@s.whatsapp.net', '').replace('@g.us', ''), c])
      );

      // Atualizar cada conversa
      for (const conversation of conversations) {
        const number = conversation.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
        const contact = contactMap.get(number);
        
        if (contact) {
          const displayName = evolutionService.getContactDisplayName(contact, number);
          
          // Buscar foto (pode ser lento, considerar fazer em background)
          const profilePicture = await evolutionService.fetchProfilePictureUrl(
            instance.evolutionInstanceName,
            number
          );

          const updateData: UpdateConversationData = {
            contactName: displayName
          };
          
          if (profilePicture.profilePictureUrl) {
            updateData.contactPicture = profilePicture.profilePictureUrl;
          }

          await this.conversationRepository.update(conversation.id, updateData);

          console.log(`✅ Updated contact: ${displayName}`);
        }
      }

      console.log(`✅ All contacts updated for instance ${instanceId}`);
    } catch (error) {
      console.error('❌ Error updating all contacts info:', error);
      throw error;
    }
  }

  /**
   * Handle message status updates from Evolution API webhook
   * Updates message status (SENT  DELIVERED  READ  PLAYED)
   */
  async handleMessageStatusUpdate(instanceId: string, data: {
    messageId: string;
    status: string;
    remoteJid?: string;
  }): Promise<void> {
    try {
      console.log(' [handleMessageStatusUpdate] Updating message ' + data.messageId + ' to status: ' + data.status);
      
      const message = await prisma.message.findUnique({
        where: { messageId: data.messageId }
      });

      if (!message) {
        console.log(' Message ' + data.messageId + ' not found in database');
        return;
      }

      const validStatuses = ['PENDING', 'SENT', 'DELIVERED', 'READ', 'PLAYED', 'FAILED'];
      const normalizedStatus = data.status.toUpperCase();
      
      if (!validStatuses.includes(normalizedStatus)) {
        console.log(' Invalid status: ' + data.status);
        return;
      }

      await prisma.message.update({
        where: { id: message.id },
        data: { status: normalizedStatus }
      });

      console.log(' Message ' + data.messageId + ' status updated to: ' + normalizedStatus);

      this.socketService.emitToInstance(instanceId, 'message:status', {
        messageId: message.id,
        whatsappMessageId: data.messageId,
        status: normalizedStatus,
        conversationId: message.conversationId
      });

    } catch (error) {
      console.error(' Error updating message status:', error);
      throw error;
    }
  }
}
