import { ConversationRepository, CreateConversationData, UpdateConversationData, ConversationWithMessages } from '../database/repositories/conversation-repository';
import { MessageRepository } from '../database/repositories/message-repository';
import { prisma } from '../database/prisma';
import { EvolutionApiService } from './evolution-api';
import { SocketService } from './socket-service';
import { MediaMessageService } from './messages';
import { IncomingMediaService } from './incoming-media-service';
import { mediaLogger } from '../utils/media-logger';
import {
  compareJids,
  normalizeJid,
  isLidJid
} from '../utils/baileys-helpers';
import { normalizeWhatsAppJid, isGroupJid } from '../utils/phone-helper';


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
    senderName?: string;
    status?: 'PENDING' | 'SERVER_ACK' | 'DELIVERY_ACK' | 'READ' | 'PLAYED';
  } | undefined;
}

export class ConversationService {
  private conversationRepository: ConversationRepository;
  private messageRepository: MessageRepository;
  private evolutionApiService: EvolutionApiService;
  private socketService: SocketService;
  private incomingMediaService: IncomingMediaService;
  private lidToRealNumberCache: Map<string, string> = new Map(); // @lid → real number
  private keyIdToLidCache: Map<string, string> = new Map(); // keyId → @lid  
  private keyIdToRealCache: Map<string, string> = new Map(); // keyId → real number

  constructor() {
    this.conversationRepository = new ConversationRepository(prisma);
    this.messageRepository = new MessageRepository(prisma);
    this.evolutionApiService = new EvolutionApiService();
    this.socketService = SocketService.getInstance();
    this.incomingMediaService = new IncomingMediaService();
  }

  /**
   * Get instance by evolution instance name
   */
  async getInstanceByEvolutionName(evolutionInstanceName: string): Promise<any> {
    return await prisma.whatsAppInstance.findUnique({
      where: { evolutionInstanceName }
    });
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
      }
    }
    
    // Add back the correct suffix (ALWAYS use @s.whatsapp.net or @g.us)
    if (isGroup) {
      normalized = cleanNumber + '@g.us';
    } else {
      normalized = cleanNumber + '@s.whatsapp.net';
    }
    
    // Log for debugging duplicate conversations
    
    return normalized;
  }

  /**
   * REFATORADO: Normaliza número usando helpers do Baileys
   * 
   * Mantém cache de @lid e usa normalização oficial do Baileys
   * 
   * Order of operations:
   * 1. Use remoteJidAlt if it's a real number (not @lid)
   * 2. Resolve @lid if possible (cache or remoteJidAlt)
   * 3. Use Baileys normalization (includes Brazilian logic)
   */
  /**
   * Normaliza número de WhatsApp usando libphonenumber-js para validação internacional
   * Mantém lógica de resolução de @lid (LID-based numbers) via remoteJidAlt ou cache
   * 
   * @param remoteJid - JID principal (pode ser @lid, @s.whatsapp.net, @g.us)
   * @param remoteJidAlt - JID alternativo para resolver @lid
   * @param isGroup - Se true, preserva @g.us sem normalização
   * @returns JID normalizado
   */
  private normalizeWhatsAppNumber(
    remoteJid: string,
    remoteJidAlt?: string | null,
    isGroup: boolean = false
  ): string {

    // 1. PRIORITY: Use remoteJidAlt if it's a real number (not @lid)
    let number = remoteJid;
    if (remoteJidAlt && !isLidJid(remoteJidAlt)) {
      number = remoteJidAlt;
    }

    // 2. Resolve @lid if possible (cache or remoteJidAlt)
    if (isLidJid(number)) {
      if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
        number = remoteJidAlt;
      } else {
        const cached = this.lidToRealNumberCache.get(number);
        if (cached) {
          number = cached;
        } else {
          console.warn(`⚠️ [normalizeWhatsAppNumber] Could not resolve @lid: ${number} - using as-is`);
          // Se não conseguiu resolver @lid, mantém como está
          return number;
        }
      }
    }

    // 3. Se for grupo, não normaliza (mantém @g.us)
    if (isGroup || isGroupJid(number)) {
      return number;
    }

    // 4. Usa phone-helper para normalização robusta (suporta internacional)
    const result = normalizeWhatsAppJid(number);

    return result;
  }

  /**
   * REFATORADO: Format number using Baileys helper
   * NEVER use @lid - always convert to @s.whatsapp.net
   */
  private formatRemoteJid(number: string): string {
    // If already has @, normalize via Baileys
    if (number.includes('@')) {
      // If it's @lid, Baileys will normalize it
      if (isLidJid(number)) {
        const normalized = normalizeJid(number);
        return normalized;
      }
      return normalizeJid(number); // Normalize via Baileys
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
          messageType: lastMessage.messageType,
          senderName: (lastMessage as any).senderName,
          status: (lastMessage as any).status
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
        messageType: lastMessage.messageType,
        senderName: (lastMessage as any).senderName,
        status: (lastMessage as any).status
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
      
      // Buscar informações do contato (pushName + foto)
      const contacts = await evolutionService.fetchContacts(instance.evolutionInstanceName, [number]);
      const contactInfo = contacts.find(c => c.id === remoteJid || c.id === number);

      let updateData: any = {};

      // Atualizar pushName se encontrado
      if (contactInfo?.pushName) {
        updateData.contactName = contactInfo.pushName;
      }

      // Buscar foto de perfil
      const profilePicture = await evolutionService.fetchProfilePictureUrl(
        instance.evolutionInstanceName,
        number
      );

      if (profilePicture.profilePictureUrl) {
        updateData.contactPicture = profilePicture.profilePictureUrl;
      }

      // Atualizar conversa se houver dados novos
      if (Object.keys(updateData).length > 0) {
        await this.conversationRepository.update(conversationId, updateData);

        // Notificar frontend
        const updatedConv = await this.conversationRepository.findById(conversationId);
        if (updatedConv) {
          this.socketService.emitToInstance(instanceId, 'conversation:updated', updatedConv);
        }
      }
    } catch (error) {
      // Não fazer nada, apenas log silencioso
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
    }
  }

  /**
   * Resolve @lid to real number if available in cache
   */
  private resolveLidToRealNumber(remoteJid: string): string {
    if (remoteJid.includes('@lid')) {
      const realNumber = this.lidToRealNumberCache.get(remoteJid);
      if (realNumber) {
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

      // Estratégia 1: Tentar normalização padrão (detectar automaticamente se é grupo)
      const isGroupContact = remoteJid.includes('@g.us');
      const normalizedJid = this.normalizeWhatsAppNumber(remoteJid, null, isGroupContact);
      console.log(`👤 [CONTACT_UPDATE] Normalized JID: ${normalizedJid} (isGroup: ${isGroupContact})`);

      // Buscar todas as conversas da instância para matching (incluindo arquivadas)
      const allConversations = await this.conversationRepository.findAllByInstanceId(instanceId);
      console.log(`👤 [CONTACT_UPDATE] Found ${allConversations.length} conversations in database (including archived)`);

      let conversation = allConversations.find(c => c.remoteJid === normalizedJid);

      // Estratégia 2: Se não encontrou e é @lid, tentar múltiplas abordagens
      if (!conversation && remoteJid.includes('@lid')) {
        const lidNumber = remoteJid.replace('@lid', '');

        // Estratégia 2a: Procurar por conversas que contenham o número @lid
        conversation = allConversations.find(c => {
          const convNumber = c.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
          return convNumber === lidNumber || c.remoteJid.includes(lidNumber);
        });

        if (conversation) {
        } else {
          // Estratégia 2b: Tentar buscar no banco por padrões similares

          // Procurar por conversas que terminem com o número (ignorando domínio)
          conversation = allConversations.find(c => {
            const convBase = c.remoteJid.split('@')[0];
            return convBase === lidNumber;
          });

          if (conversation) {
          } else {
            // Estratégia 2c: Tentar consultar Evolution API para resolver @lid
            try {
              // Aqui poderíamos adicionar uma chamada para a Evolution API
              // para resolver o @lid para @s.whatsapp.net
              // Por enquanto, vamos logar que não conseguimos resolver
            } catch (apiError) {
              console.log(`❌ [CONTACT_UPDATE] Evolution API resolution failed:`, apiError instanceof Error ? apiError.message : String(apiError));
            }
          }
        }
      }

      // Estratégia 3: Se ainda não encontrou, tentar variações do número
      if (!conversation && !remoteJid.includes('@g.us')) {

        const baseNumber = remoteJid.split('@')[0];
        if (baseNumber) {
          conversation = allConversations.find(c => {
            const convBase = c.remoteJid.split('@')[0];
            // Tentar sem o 55 do Brasil se existir
            return convBase === baseNumber || convBase === baseNumber.replace(/^55/, '');
          });

          if (conversation) {
          }
        }
      }

      if (conversation) {
        const updateData: any = {};
        
        // ⚠️ IMPORTANTE: Para grupos, NÃO atualizar contactName com pushName do webhook!
        // O pushName vem do remetente da mensagem, não do grupo
        // O nome do grupo será buscado via Evolution API quando necessário
        if (!isGroupContact && data.contactName) {
          updateData.contactName = data.contactName;
        }
        
        // Para foto de perfil, podemos atualizar normalmente (tanto individual quanto grupo)
        if (data.contactPicture) {
          updateData.contactPicture = data.contactPicture;
        }

        if (Object.keys(updateData).length > 0) {
          await this.conversationRepository.update(conversation.id, updateData);

          // Notify frontend
          const updated = await this.conversationRepository.findById(conversation.id);
          if (updated) {
            console.log(`📡 [CONTACT_UPDATE] Emitindo conversation:updated via WebSocket:`, {
              id: updated.id,
              remoteJid: updated.remoteJid,
              contactName: updated.contactName,
              contactPicture: updated.contactPicture ? '✅ TEM FOTO' : '❌ SEM FOTO',
              isGroup: isGroupContact ? '✅ GROUP' : '❌ INDIVIDUAL'
            });
            this.socketService.emitToInstance(instanceId, 'conversation:updated', updated);
          }

        } else {
          console.log(`⏭️ [CONTACT_UPDATE] No updates needed for ${isGroupContact ? 'GROUP' : 'CONTACT'}: ${remoteJid}`);
        }
      } else {
        console.log(`❌ [CONTACT_UPDATE] Conversation not found for remoteJid: ${remoteJid} (normalized: ${normalizedJid})`);
        console.log(`📊 [CONTACT_UPDATE] Available conversations sample:`, allConversations.slice(0, 3).map(c => c.remoteJid));
      }
    } catch (error) {
      console.log(`❌ [CONTACT_UPDATE] Failed to update contact from webhook:`, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Update unread count from webhook (chats.upsert event)
   */
  async updateUnreadCount(instanceId: string, remoteJid: string, unreadCount: number): Promise<void> {
    try {
      const normalizedJid = this.normalizeWhatsAppNumber(remoteJid, null, remoteJid.includes('@g.us'));

      // Find conversation by remoteJid
      const conversations = await this.conversationRepository.findByInstanceId(instanceId);
      const conversation = conversations.find(c => c.remoteJid === normalizedJid);

      if (conversation) {
        await this.conversationRepository.update(conversation.id, { unreadCount });


        // Notify frontend
        this.socketService.emitToInstance(instanceId, 'conversation:unread', {
          conversationId: conversation.id,
          unreadCount
        });
      } else {
      }
    } catch (error) {
      throw error; // Re-throw to show the error
    }
  }

  async handleIncomingMessage(instanceId: string, messageData: any): Promise<void> {
    try {
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
      
      // 🔄 UNIFIED NORMALIZATION: Aplicar todas as regras em ordem correta
      const normalizedRemoteJid = this.normalizeWhatsAppNumber(
        remoteJid,
        messageData.key.remoteJidAlt,
        false // Not a group for incoming messages
      );
      
      // Format for Evolution API (ensure @s.whatsapp.net)
      const formattedRemoteJid = this.formatRemoteJid(normalizedRemoteJid);
      
      
      // Create or update conversation first (usar o DB ID da instância)
      // 🚨 IMPORTANTE: Só atualizar contactName quando a mensagem NÃO for sua (fromMe: false)
      const conversationData: any = {
        isGroup: messageData.key.remoteJid.includes('@g.us')
      };
      
      // Se a mensagem foi RECEBIDA (não enviada por você), atualizar o nome do contato
      if (!messageData.key.fromMe && messageData.pushName) {
        conversationData.contactName = messageData.pushName;
      } else if (messageData.key.fromMe) {
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
      
      // 🛡️ Create or update message using upsert to handle duplicates
      let message;
      try {
        message = await prisma.message.upsert({
          where: { messageId: messageData.key.id },
          update: messageCreateData, // If exists, update with latest data
          create: messageCreateData
        });
        console.log(`💬 [handleIncomingMessage] Message ${message.id.startsWith('cmh') ? 'CREATED' : 'UPDATED'}: ${message.id}`);
      } catch (error: any) {
        try {
          message = await prisma.message.findFirst({
            where: { messageId: messageData.key.id }
          });
          if (!message) {
            console.error(`❌ Message ${messageData.key.id} not found after upsert failure`);
            throw error;
          }
        } catch (findError) {
          console.error(`❌ Failed to find message ${messageData.key.id}:`, findError);
          throw error;
        }
      }

      // Update conversation with last message info
      // Smart unread logic: only increment if conversation is NOT currently active
      const isConversationActive = this.socketService.isConversationActive(conversation.id);
      const shouldMarkAsRead = messageData.key.fromMe || isConversationActive;
      

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

      // 🖼️ Process incoming media if present (NOW SYNCHRONOUS to avoid URL expiration)
      if (message.mediaUrl) {
        mediaLogger.log('🖼️ [MEDIA_PROCESS_START] Iniciando processamento SÍNCRONO de mídia', {
          messageId: message.id,
          mediaUrl: message.mediaUrl.substring(0, 100) + '...',
          messageType: message.messageType,
          fromMe: message.fromMe
        });

        try {
          // Process media SYNCHRONOUSLY to avoid URL expiration
          const mediaOptions: any = {
            messageId: message.id,
            mediaUrl: message.mediaUrl,
            mediaType: this.getMediaType(messageData),
            instanceName: instanceId, // Evolution instance name for decryption
            messageData: messageData // Complete message data with encryption keys
          };

          if (message.fileName) mediaOptions.fileName = message.fileName;
          if (message.caption) mediaOptions.caption = message.caption;
          const mimeType = this.getMimeType(messageData);
          if (mimeType) mediaOptions.mimeType = mimeType;

          mediaLogger.log('📋 [MEDIA_OPTIONS] Opções preparadas para processamento síncrono', {
            mediaType: mediaOptions.mediaType,
            fileName: mediaOptions.fileName,
            caption: mediaOptions.caption,
            mimeType: mediaOptions.mimeType
          });

          const processedMediaUrl = await this.incomingMediaService.processIncomingMedia(mediaOptions);

          mediaLogger.log('✅ [MEDIA_PROCESS_SUCCESS] Mídia processada com sucesso', {
            messageId: message.id,
            processedUrl: processedMediaUrl
          });

          // Update message with processed media URL immediately
          await prisma.message.update({
            where: { id: message.id },
            data: { mediaUrl: processedMediaUrl }
          });

          // Update the message object for socket emission
          message.mediaUrl = processedMediaUrl;

        } catch (mediaError: any) {
          console.error(`❌ [MEDIA_PROCESS_ERROR] Erro ao processar mídia:`, mediaError.message);
          mediaLogger.error('❌ [MEDIA_PROCESS_ERROR] Falha no processamento síncrono', {
            messageId: message.id,
            error: mediaError.message,
            stack: mediaError.stack
          });
          // Continue with original mediaUrl if processing fails
        }
      } else {
        console.log(`⏭️ [MEDIA_PROCESS_SKIP] Nenhuma mídia para processar (mediaUrl vazia)`);
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
          caption: message.caption,
          senderName: !message.fromMe && messageData.pushName ? messageData.pushName : undefined
        }
      });

      // Update conversation list in frontend (usar DB ID)
      const allConversations = await this.conversationRepository.findAllByInstanceId(instance.id);
      const updatedConversation = allConversations.find(c => c.remoteJid === formattedRemoteJid);
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
            messageType: message.messageType,
            senderName: (message as any).senderName,
            status: (message as any).status
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
      // Use unified normalization
      const normalizedRemoteJid = this.normalizeWhatsAppNumber(remoteJid, null, false);
      
      
      // Get the instance to find the evolutionInstanceName
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: instanceId },
        select: { id: true, evolutionInstanceName: true } // ⚡ Apenas campos necessários
      });

      if (!instance) {
        console.error(`❌ [sendMessage] Instância não encontrada: ${instanceId}`);
        throw new Error(`Instância não encontrada: ${instanceId}`);
      }


      // ⚡ Criar/atualizar conversa em paralelo com envio da mensagem
      const [evolutionResponse, conversation] = await Promise.all([
        this.evolutionApiService.sendTextMessage(
          instance.evolutionInstanceName, 
          normalizedRemoteJid,
          content
        ),
        this.createOrUpdateConversation(instanceId, normalizedRemoteJid)
      ]);


      // Save message to database
      const message = await this.messageRepository.create({
        instanceId,
        remoteJid: normalizedRemoteJid,
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
          remoteJid: conversation.remoteJid, // ✅ Usar remoteJid da CONVERSA, não da mensagem individual
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

  async unarchiveConversation(conversationId: string): Promise<void> {
    const conversation = await this.conversationRepository.unarchive(conversationId);
    
    // Emit update to frontend
    this.socketService.emitToInstance(conversation.instanceId, 'conversation:updated', {
      conversationId,
      isArchived: false
    });
  }

  async clearConversationMessages(conversationId: string): Promise<number> {
    // Get conversation before clearing to emit event with instanceId
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    const deletedCount = await this.conversationRepository.clearMessages(conversationId);
    
    // Emit update to frontend
    this.socketService.emitToInstance(conversation.instanceId, 'conversation:cleared', {
      conversationId,
      deletedCount
    });

    return deletedCount;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    // Get conversation before deleting to emit event with instanceId
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    await this.conversationRepository.delete(conversationId);
    
    // Emit delete event to frontend
    this.socketService.emitToInstance(conversation.instanceId, 'conversation:deleted', {
      conversationId
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
    
    if (messageData.message?.imageMessage) {
      return messageData.message.imageMessage.caption || '';
    }
    
    if (messageData.message?.videoMessage) {
      return messageData.message.videoMessage.caption || '';
    }
    
    if (messageData.message?.audioMessage) {
      return '';
    }
    
    if (messageData.message?.documentMessage) {
      return messageData.message.documentMessage.fileName || '';
    }
    
    if (messageData.message?.stickerMessage) {
      return '';
    }
    
    if (messageData.message?.locationMessage) {
      return '';
    }
    
    if (messageData.message?.contactMessage) {
      return '';
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

        }
      }

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
      
      // ✅ Usar repository em vez de Prisma direto
      const message = await this.messageRepository.findByMessageId(data.messageId);

      if (!message) {
        return;
      }

      const validStatuses = ['PENDING', 'SENT', 'DELIVERED', 'READ', 'PLAYED', 'FAILED'];
      const normalizedStatus = data.status.toUpperCase();
      
      if (!validStatuses.includes(normalizedStatus)) {
        return;
      }

      // ✅ Usar repository para atualizar
      await this.messageRepository.update(message.id, {
        status: normalizedStatus
      });


      this.socketService.emitToInstance(instanceId, 'message:status', {
        messageId: message.id,
        whatsappMessageId: data.messageId,
        status: normalizedStatus,
        conversationId: message.conversationId
      });

    } catch (error) {
      console.error('❌ Error updating message status:', error);
      throw error;
    }
  }

  /**
   * 🚨 ATOMIC VERSION: handleIncomingMessage with database transactions
   * Ensures all database operations are atomic - either all succeed or all rollback
   */
  async handleIncomingMessageAtomic(instanceId: string, messageData: any): Promise<void> {
    try {
      console.log(`📝 [ATOMIC_DATA] MessageType: ${messageData.message ? Object.keys(messageData.message)[0] : 'N/A'}`);
      console.log(`🖼️ [ATOMIC_MEDIA] Has media: ${!!(messageData.message?.imageMessage || messageData.message?.videoMessage || messageData.message?.audioMessage)}`);

      console.log(`📨 [handleIncomingMessageAtomic] RAW messageData.key:`, JSON.stringify(messageData.key, null, 2));

      // 🔍 Verificar se a instância existe
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { evolutionInstanceName: instanceId }
      });

      if (!instance) {
        console.error(`❌ [handleIncomingMessageAtomic] Instância ${instanceId} NÃO EXISTE!`);
        return;
      }

      console.log(`✅ [handleIncomingMessageAtomic] Instância: ${instance.name} (DB ID: ${instance.id})`);

      // �️ CAPTURE @lid MAPPING: Se vier participantAlt ou remoteJidAlt, salvar mapeamento
      if (messageData.key.participant && messageData.key.participant.includes('@lid')) {
        if (messageData.key.participantAlt && messageData.key.participantAlt.includes('@s.whatsapp.net')) {
          console.log(`🗺️ [LID_MAPPING] Capturando mapeamento participant: ${messageData.key.participant} → ${messageData.key.participantAlt}`);
          this.lidToRealNumberCache.set(messageData.key.participant, messageData.key.participantAlt);
        }
      }
      
      if (messageData.key.remoteJid.includes('@lid')) {
        if (messageData.key.remoteJidAlt && messageData.key.remoteJidAlt.includes('@s.whatsapp.net')) {
          console.log(`🗺️ [LID_MAPPING] Capturando mapeamento remoteJid: ${messageData.key.remoteJid} → ${messageData.key.remoteJidAlt}`);
          this.lidToRealNumberCache.set(messageData.key.remoteJid, messageData.key.remoteJidAlt);
        }
      }

      // �🔄 Unified normalization
      const normalizedRemoteJid = this.normalizeWhatsAppNumber(
        messageData.key.remoteJid,
        messageData.key.remoteJidAlt,
        false
      );

      const formattedRemoteJid = this.formatRemoteJid(normalizedRemoteJid);

      // Variable to track processed media URL across transaction boundary
      let processedMediaUrl: string | null | undefined = null;

      // � Se for GRUPO, buscar informações do grupo na Evolution API ANTES da transação
      const isGroupConversation = messageData.key.remoteJid.includes('@g.us');
      let groupInfo: { subject?: string; pictureUrl?: string } | null = null;
      
      if (isGroupConversation && instance.evolutionInstanceName) {
        try {
          console.log(`👥 [GROUP_INFO] Buscando informações do grupo ${formattedRemoteJid}...`);
          const evolutionService = new EvolutionApiService();
          groupInfo = await evolutionService.findGroupByJid(instance.evolutionInstanceName, formattedRemoteJid);
          if (groupInfo?.subject) {
            console.log(`✅ [GROUP_INFO] Nome do grupo encontrado: "${groupInfo.subject}"`);
          } else {
            console.warn(`⚠️ [GROUP_INFO] Nome do grupo não encontrado na API`);
          }
        } catch (error) {
          console.error(`❌ [GROUP_INFO] Erro ao buscar informações do grupo:`, error);
          // Não falhar a transação se não conseguir buscar info do grupo
        }
      }

      // �🚨 ATOMIC TRANSACTION: All critical database operations in one transaction
      const transactionResult = await prisma.$transaction(async (tx) => {
        // Prepare conversation data
        const conversationData: any = {
          isGroup: isGroupConversation
        };

        // ⚠️ IMPORTANTE: Usar nome do GRUPO se foi buscado da API
        // Caso contrário, para contatos individuais, usar pushName
        if (isGroupConversation && groupInfo?.subject) {
          conversationData.contactName = groupInfo.subject;
          conversationData.contactPicture = groupInfo.pictureUrl || null;
        } else if (!messageData.key.fromMe && messageData.pushName && !isGroupConversation) {
          conversationData.contactName = messageData.pushName;
        }

        // 1. Create or update conversation within transaction
        let conversation = await tx.conversation.findFirst({
          where: {
            instanceId: instance.id,
            remoteJid: formattedRemoteJid
          }
        });

        if (!conversation) {
          conversation = await tx.conversation.create({
            data: {
              instanceId: instance.id,
              remoteJid: formattedRemoteJid,
              ...conversationData
            }
          });
          console.log(`✅ [CONVERSATION_CREATED] ${isGroupConversation ? 'Grupo' : 'Contato'}: ${conversation.remoteJid}`);
        } else {
          // Se for grupo E já tiver nome, NÃO sobrescrever
          const updateData = { ...conversationData };
          if (isGroupConversation && conversation.contactName) {
            delete updateData.contactName;
          }
          
          // Só atualizar se houver dados para atualizar
          if (Object.keys(updateData).length > 0) {
            conversation = await tx.conversation.update({
              where: { id: conversation.id },
              data: updateData
            });
          }
        }

        // Prepare message data
        // Para grupos: senderName é o pushName de quem mandou (participant)
        // Para individuais: senderName não é necessário (já está no contactName da conversa)
        let senderName: string | undefined = undefined;
        if (!messageData.key.fromMe) {
          if (isGroupConversation && messageData.pushName) {
            // Em grupos, usar pushName do participante que mandou a mensagem
            senderName = messageData.pushName;
          }
          // Para conversas individuais, não precisamos de senderName
        }

        const messageCreateData = {
          instanceId: instance.id,
          remoteJid: formattedRemoteJid,
          fromMe: messageData.key.fromMe || false,
          messageType: this.getMessageType(messageData),
          content: this.extractMessageContent(messageData),
          messageId: messageData.key.id,
          timestamp: new Date(messageData.messageTimestamp * 1000),
          status: messageData.key.fromMe ? 'SENT' : 'DELIVERED',
          mediaUrl: messageData.message?.imageMessage?.url || 
                   messageData.message?.videoMessage?.url || 
                   messageData.message?.audioMessage?.url || 
                   messageData.message?.stickerMessage?.url || 
                   messageData.message?.documentMessage?.url,
          fileName: messageData.message?.documentMessage?.fileName,
          caption: messageData.message?.imageMessage?.caption || messageData.message?.videoMessage?.caption,
          senderName: senderName || null,
          conversationId: conversation.id
        };

        // 2. Create message within transaction - use upsert to handle duplicates
        let message;
        try {
          message = await tx.message.upsert({
            where: { messageId: messageData.key.id },
            update: messageCreateData, // If exists, update with latest data
            create: messageCreateData
          });
          console.log(`💬 [handleIncomingMessageAtomic] Message ${message.id.startsWith('cmh') ? 'CREATED' : 'UPDATED'}: ${message.id}`);
        } catch (error: any) {
          // If upsert fails for any reason, try to find existing message
          try {
            message = await tx.message.findFirst({
              where: { messageId: messageData.key.id }
            });
            if (!message) {
              console.error(`❌ Message ${messageData.key.id} not found after upsert failure`);
              throw error;
            }
          } catch (findError) {
            console.error(`❌ Failed to find message ${messageData.key.id}:`, findError);
            throw error;
          }
        }

        // 2.5. Process incoming media (download and store locally) - OUTSIDE transaction for performance
        processedMediaUrl = messageCreateData.mediaUrl;
        // Só processar se for URL do WhatsApp (não CDN)
        const isWhatsAppMediaUrl = messageCreateData.mediaUrl?.includes('mmg.whatsapp.net');
        
        if (messageCreateData.mediaUrl && isWhatsAppMediaUrl) {

          try {
            const mediaType = this.getMessageType(messageData).toLowerCase() as 'image' | 'video' | 'audio' | 'sticker' | 'document';
            
            // 🔧 USAR getMimeType() que tem o fallback para audio/ogg
            let mimeType = this.getMimeType(messageData);
            
            // 🔧 Garantir mimeType com base no mediaType se ainda estiver undefined
            if (!mimeType) {
              if (mediaType === 'audio') mimeType = 'audio/ogg';
              else if (mediaType === 'image') mimeType = 'image/jpeg';
              else if (mediaType === 'video') mimeType = 'video/mp4';
              else if (mediaType === 'sticker') mimeType = 'image/webp';
              else if (mediaType === 'document') mimeType = 'application/octet-stream';
              else mimeType = 'application/octet-stream';
              
              console.log(`🔧 [MEDIA_PROCESSING] mimeType undefined, usando fallback baseado em mediaType: ${mimeType}`);
            }

            console.log(`🔍 [MEDIA_PROCESSING] mediaType: ${mediaType}, mimeType: ${mimeType}`);

            const downloadedUrl = await this.incomingMediaService.processIncomingMedia({
              messageId: messageData.key.id,
              mediaUrl: messageCreateData.mediaUrl,
              mediaType,
              fileName: messageCreateData.fileName,
              caption: messageCreateData.caption,
              mimeType,
              instanceName: instanceId, // Evolution instance name for decryption
              messageData: messageData // Complete message data with encryption keys
            });

            if (downloadedUrl) {
              processedMediaUrl = downloadedUrl;

              console.log(`✅ [MEDIA_PROCESSED] ${mediaType.toUpperCase()} URL atualizada: ${downloadedUrl.substring(0, 80)}...`);

              // Update message with processed media URL
              await tx.message.update({
                where: { id: message.id },
                data: { mediaUrl: processedMediaUrl }
              });
            } else {
              console.warn(`⚠️ [MEDIA_PROCESSED] ${mediaType.toUpperCase()} retornou URL null - usando URL original`);
            }
          } catch (mediaError) {
            console.error(`⚠️ [ATOMIC_MEDIA_ERROR] Falha no processamento de mídia:`);
            console.error(`   📝 Message ID: ${messageData.key.id}`);
            console.error(`   💥 Erro: ${mediaError instanceof Error ? mediaError.message : String(mediaError)}`);
            // Continue with original URL if processing fails
          }
        } else {
          console.log(`⏭️ [ATOMIC_MEDIA_SKIP] Nenhuma mídia para processar (mediaUrl vazia)`);
        }

        // Smart unread logic
        const isConversationActive = this.socketService.isConversationActive(conversation.id);
        const shouldMarkAsRead = messageData.key.fromMe || isConversationActive;


        // 3. Update conversation with lastMessage within transaction
        const updatedConversation = await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessage: this.extractMessageContent(messageData),
            lastMessageAt: new Date(messageData.messageTimestamp * 1000),
            unreadCount: shouldMarkAsRead ? 0 : conversation.unreadCount + 1
          }
        });

        return { conversation: updatedConversation, message };
      });

      // 📤 Post-transaction operations (non-critical, execute even if they fail)

      // Auto-mark as read in Evolution API if conversation is active
      if (this.socketService.isConversationActive(transactionResult.conversation.id) && !messageData.key.fromMe) {
        try {
          const evolutionApi = new EvolutionApiService();
          if (instance.evolutionInstanceName) {
            await evolutionApi.markMessageAsRead(instance.evolutionInstanceName, [{
              remoteJid: formattedRemoteJid,
              fromMe: messageData.key.fromMe || false,
              id: messageData.key.id
            }]);
          }
        } catch (error) {
          console.error('❌ Error auto-marking as read:', error);
          // Not critical - data is already saved consistently
        }
      }

      // Emit real-time updates
      this.socketService.emitToInstance(instance.id, 'message:received', {
        conversationId: transactionResult.conversation.id,
        message: {
          id: transactionResult.message.id,
          content: transactionResult.message.content,
          fromMe: transactionResult.message.fromMe,
          timestamp: transactionResult.message.timestamp,
          messageType: transactionResult.message.messageType,
          mediaUrl: processedMediaUrl || transactionResult.message.mediaUrl, // Use processed URL if available
          fileName: transactionResult.message.fileName,
          caption: transactionResult.message.caption
        }
      });

      // SEMPRE emitir conversation:updated com dados atualizados
      // Buscar a conversa atualizada com todas as relações
      const freshConversation = await this.conversationRepository.findById(transactionResult.conversation.id);
      if (freshConversation) {
        console.log(`📡 [EMIT_WEBSOCKET] Emitindo conversation:updated para conversa ${freshConversation.id}`);
        this.socketService.emitToInstance(instance.id, 'conversation:updated', freshConversation);
      } else {
        console.warn(`⚠️ [EMIT_WEBSOCKET] Conversa ${transactionResult.conversation.id} não encontrada após transação!`);
        // Fallback: emitir com dados da transação
        this.socketService.emitToInstance(instance.id, 'conversation:updated', transactionResult.conversation);
      }

    } catch (error) {
      console.error('❌ [handleIncomingMessageAtomic] Transaction failed:', error);
      throw error;
    }
  }

  /**
   * 🚨 ATOMIC VERSION: sendMessage with database transactions
   * Ensures message sending is atomic - either all database operations succeed or all rollback
   */
  async sendMessageAtomic(instanceId: string, remoteJid: string, content: string): Promise<Message> {
    try {
      // Use unified normalization
      let normalizedRemoteJid = this.normalizeWhatsAppNumber(remoteJid, null, false);

      // Get instance
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: instanceId },
        select: { id: true, evolutionInstanceName: true }
      });

      if (!instance) {
        throw new Error(`Instance not found: ${instanceId}`);
      }


      // 🚨 Send to Evolution API FIRST (before transaction)
      // If this fails, we don't want to save anything to database
      const evolutionResponse = await this.evolutionApiService.sendTextMessage(
        instance.evolutionInstanceName,
        normalizedRemoteJid,
        content
      );


      // 🚨 ATOMIC TRANSACTION: All database operations in one transaction
      const transactionResult = await prisma.$transaction(async (tx) => {
        // 1. Create or update conversation within transaction
        // PROACTIVE DUPLICATE DETECTION: Always check for existing conversations with either Brazilian format
        let conversation = null;
        // normalizedRemoteJid is already defined above, we'll update it if we find an existing format

        if (normalizedRemoteJid.includes('@s.whatsapp.net')) {
          const numberPart = normalizedRemoteJid.replace('@s.whatsapp.net', '');

          if (numberPart.startsWith('55')) {
            // For Brazilian numbers, check BOTH formats proactively
            const formatsToCheck = [];

            if (numberPart.length === 12) {
              // Current format has 9th digit, check both with and without
              formatsToCheck.push(normalizedRemoteJid); // With 9th digit
              const without9th = numberPart.substring(0, 4) + numberPart.substring(5);
              formatsToCheck.push(`${without9th}@s.whatsapp.net`); // Without 9th digit
            } else if (numberPart.length === 11) {
              // Current format doesn't have 9th digit, check both with and without
              formatsToCheck.push(normalizedRemoteJid); // Without 9th digit
              const ddd = numberPart.substring(2, 4);
              const phone = numberPart.substring(4);
              const with9th = `55${ddd}9${phone}`;
              formatsToCheck.push(`${with9th}@s.whatsapp.net`); // With 9th digit
            } else {
              // Not a standard Brazilian format, just check the normalized one
              formatsToCheck.push(normalizedRemoteJid);
            }

            // Check all possible formats for existing conversations
            for (const format of formatsToCheck) {
              conversation = await tx.conversation.findFirst({
                where: {
                  instanceId: instance.id,
                  remoteJid: format
                }
              });

              if (conversation) {
                normalizedRemoteJid = format; // Use the existing format
                break;
              }
            }
          } else {
            // Not Brazilian, just check the normalized format
            conversation = await tx.conversation.findFirst({
              where: {
                instanceId: instance.id,
                remoteJid: normalizedRemoteJid
              }
            });
          }
        } else {
          // Not a WhatsApp individual number, just check normally
          conversation = await tx.conversation.findFirst({
            where: {
              instanceId: instance.id,
              remoteJid: normalizedRemoteJid
            }
          });
        }

        if (!conversation) {
          conversation = await tx.conversation.create({
            data: {
              instanceId: instance.id,
              remoteJid: normalizedRemoteJid,
              isGroup: false,
              unreadCount: 0,
              isArchived: false,
              isPinned: false
            }
          });
        }

        // 2. Create message within transaction
        // Generate unique messageId to avoid duplicates
        let messageId = evolutionResponse.key?.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if messageId already exists and generate a new one if needed
        let existingMessage = await tx.message.findUnique({
          where: { messageId }
        });
        
        let attempts = 0;
        while (existingMessage && attempts < 10) {
          messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${attempts}`;
          existingMessage = await tx.message.findUnique({
            where: { messageId }
          });
          attempts++;
        }
        
        if (existingMessage) {
          throw new Error(`Unable to generate unique messageId after ${attempts} attempts`);
        }

        const message = await tx.message.create({
          data: {
            instanceId: instance.id,
            remoteJid: normalizedRemoteJid,
            fromMe: true,
            messageType: 'TEXT',
            content,
            messageId: messageId,
            timestamp: new Date(),
            status: 'SENT',
            conversationId: conversation.id
          }
        });


        // 3. Update conversation within transaction
        const updatedConversation = await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessage: content,
            lastMessageAt: new Date()
          }
        });

        return { conversation: updatedConversation, message };
      });

      // 📤 Post-transaction operations (emit events)
      this.socketService.emitToInstance(instanceId, 'message:sent', {
        conversationId: transactionResult.conversation.id,
        message: {
          id: transactionResult.message.id,
          content: transactionResult.message.content,
          fromMe: transactionResult.message.fromMe,
          timestamp: transactionResult.message.timestamp,
          messageType: transactionResult.message.messageType
        }
      });

      // Emit conversation update with fresh data
      const freshConversation = await this.conversationRepository.findById(transactionResult.conversation.id);
      if (freshConversation) {
        this.socketService.emitToInstance(instanceId, 'conversation:updated', {
          ...freshConversation,
          lastMessagePreview: {
            content: content,
            fromMe: true,
            timestamp: new Date(),
            messageType: 'TEXT'
          }
        });
      }

      return transactionResult.message;

    } catch (error) {
      console.error('❌ [sendMessageAtomic] Transaction failed:', error);
      throw error;
    }
  }

  /**
   * 🚨 ATOMIC VERSION: sendMediaMessage with database transactions
   * Ensures media message sending is atomic - either all database operations succeed or all rollback
   */
  async sendMediaMessageAtomic(
    instanceId: string,
    remoteJid: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'audio' | 'document' | 'sticker',
    caption?: string,
    fileName?: string
  ): Promise<Message> {
    try {
      // Use unified normalization
      let normalizedRemoteJid = this.normalizeWhatsAppNumber(remoteJid, null, false);

      // Get instance
      const instance = await prisma.whatsAppInstance.findUnique({
        where: { id: instanceId },
        select: { id: true, evolutionInstanceName: true }
      });

      if (!instance) {
        throw new Error(`Instance not found: ${instanceId}`);
      }


      // Use MediaMessageService to send media
      const mediaService = new MediaMessageService();
      const message = await mediaService.sendMediaMessage({
        instanceId: instance.id,
        remoteJid: normalizedRemoteJid,
        mediaUrl,
        mediaType,
        caption,
        fileName
      });


      // 🚨 ATOMIC TRANSACTION: Update conversation in transaction
      const transactionResult = await prisma.$transaction(async (tx) => {
        // 1. Create or update conversation within transaction
        // PROACTIVE DUPLICATE DETECTION: Always check for existing conversations with either Brazilian format
        let conversation = null;

        if (normalizedRemoteJid.includes('@s.whatsapp.net')) {
          const numberPart = normalizedRemoteJid.replace('@s.whatsapp.net', '');

          if (numberPart.startsWith('55')) {
            // For Brazilian numbers, check BOTH formats proactively
            const formatsToCheck = [];

            if (numberPart.length === 12) {
              // Current format has 9th digit, check both with and without
              formatsToCheck.push(normalizedRemoteJid); // With 9th digit
              const without9th = numberPart.substring(0, 4) + numberPart.substring(5);
              formatsToCheck.push(`${without9th}@s.whatsapp.net`); // Without 9th digit
            } else if (numberPart.length === 11) {
              // Current format doesn't have 9th digit, check both with and without
              formatsToCheck.push(normalizedRemoteJid); // Without 9th digit
              const ddd = numberPart.substring(2, 4);
              const phone = numberPart.substring(4);
              const with9th = `55${ddd}9${phone}`;
              formatsToCheck.push(`${with9th}@s.whatsapp.net`); // With 9th digit
            } else {
              // Not a standard Brazilian format, just check the normalized one
              formatsToCheck.push(normalizedRemoteJid);
            }

            // Check all possible formats for existing conversations
            for (const format of formatsToCheck) {
              conversation = await tx.conversation.findFirst({
                where: {
                  instanceId: instance.id,
                  remoteJid: format
                }
              });

              if (conversation) {
                normalizedRemoteJid = format; // Use the existing format
                break;
              }
            }
          } else {
            // Not Brazilian, just check the normalized format
            conversation = await tx.conversation.findFirst({
              where: {
                instanceId: instance.id,
                remoteJid: normalizedRemoteJid
              }
            });
          }
        } else {
          // Not a WhatsApp individual number, just check normally
          conversation = await tx.conversation.findFirst({
            where: {
              instanceId: instance.id,
              remoteJid: normalizedRemoteJid
            }
          });
        }

        if (!conversation) {
          conversation = await tx.conversation.create({
            data: {
              instanceId: instance.id,
              remoteJid: normalizedRemoteJid,
              isGroup: false,
              unreadCount: 0,
              isArchived: false,
              isPinned: false
            }
          });
        }

        // 2. Update the message with conversationId within transaction
        const updatedMessage = await tx.message.update({
          where: { id: message.id },
          data: { conversationId: conversation.id }
        });

        // 3. Update conversation within transaction
        const lastMessageContent = caption || `[${mediaType.toUpperCase()}]`;
        const updatedConversation = await tx.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessage: lastMessageContent,
            lastMessageAt: new Date()
          }
        });

        return { conversation: updatedConversation, message: updatedMessage };
      });

      // 📤 Post-transaction operations (emit events)
      this.socketService.emitToInstance(instanceId, 'message:sent', {
        conversationId: transactionResult.conversation.id,
        message: {
          id: transactionResult.message.id,
          content: transactionResult.message.content,
          fromMe: transactionResult.message.fromMe,
          timestamp: transactionResult.message.timestamp,
          messageType: transactionResult.message.messageType,
          mediaUrl: transactionResult.message.mediaUrl,
          caption: transactionResult.message.caption,
          fileName: transactionResult.message.fileName
        }
      });

      // Emit conversation update with fresh data
      const freshConversation = await this.conversationRepository.findById(transactionResult.conversation.id);
      if (freshConversation) {
        this.socketService.emitToInstance(instanceId, 'conversation:updated', {
          ...freshConversation,
          lastMessagePreview: {
            content: caption || `[${mediaType.toUpperCase()}]`,
            fromMe: true,
            timestamp: new Date(),
            messageType: mediaType.toUpperCase()
          }
        });
      }

      return transactionResult.message;

    } catch (error) {
      console.error('❌ [sendMediaMessageAtomic] Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Get media type from message data
   */
  private getMediaType(messageData: any): 'image' | 'video' | 'audio' | 'sticker' | 'document' {
    if (messageData.message?.imageMessage) return 'image';
    if (messageData.message?.videoMessage) return 'video';
    if (messageData.message?.audioMessage) return 'audio';
    if (messageData.message?.stickerMessage) return 'sticker';
    if (messageData.message?.documentMessage) return 'document';
    return 'image'; // fallback
  }

  /**
   * Get MIME type from message data
   */
  private getMimeType(messageData: any): string | undefined {
    if (messageData.message?.imageMessage?.mimetype) return messageData.message.imageMessage.mimetype;
    if (messageData.message?.videoMessage?.mimetype) return messageData.message.videoMessage.mimetype;
    if (messageData.message?.audioMessage?.mimetype) return messageData.message.audioMessage.mimetype;
    if (messageData.message?.stickerMessage?.mimetype) return messageData.message.stickerMessage.mimetype;
    if (messageData.message?.documentMessage?.mimetype) return messageData.message.documentMessage.mimetype;
    
    // 🔧 FALLBACK: Se não tiver mimetype mas tiver a mensagem de tipo específico, usar padrão
    if (messageData.message?.audioMessage) {
      console.log('🔧 [MIMETYPE_FALLBACK] audioMessage sem mimetype, usando audio/ogg como padrão');
      return 'audio/ogg'; // WhatsApp geralmente usa OGG Opus para áudio
    }
    if (messageData.message?.imageMessage) return 'image/jpeg';
    if (messageData.message?.videoMessage) return 'video/mp4';
    if (messageData.message?.stickerMessage) return 'image/webp';
    
    return undefined;
  }
}
