/**
 * Webhook Schemas - Evolution API
 * 
 * Schemas Zod robustos para validação de eventos da Evolution API.
 * 
 * Benefícios:
 * - Valida estrutura de dados antes do processamento
 * - Previne erros de runtime por dados mal formatados
 * - Documenta exatamente o que cada evento contém
 * - Type-safety automático com TypeScript
 * - Rejeita webhooks maliciosos ou corrompidos
 * 
 * Eventos suportados:
 * - messages.upsert (mensagens recebidas)
 * - messages.update (status de mensagens)
 * - send.message (mensagens enviadas pelo usuário)
 * - contacts.update (atualização de contatos)
 * - chats.upsert (atualização de chats)
 * - presence.update (status online/digitando)
 * - connection.update (status da conexão)
 * - qrcode.updated (novo QR code)
 */

import { z } from 'zod';

// ========================================
// BASE SCHEMAS
// ========================================

/**
 * Schema flexível para fileLength (pode vir como string, number ou objeto Long)
 * Baileys às vezes retorna Long { low: number, high: number, unsigned: boolean }
 */
const fileLengthSchema = z.union([
  z.string(),
  z.number(),
  z.object({
    low: z.number(),
    high: z.number(),
    unsigned: z.boolean().optional()
  })
]).optional();

/**
 * Schema flexível para timestamps (pode vir como string, number ou objeto Long)
 * Baileys usa Long objects para timestamps maiores que Number.MAX_SAFE_INTEGER
 */
const timestampSchema = z.union([
  z.string(),
  z.number(),
  z.object({
    low: z.number(),
    high: z.number(),
    unsigned: z.boolean().optional()
  })
]).optional();

/**
 * Schema flexível para thumbnails e buffers binários
 * Baileys às vezes retorna Buffer como objeto com índices numéricos { "0": 255, "1": 216, ... }
 */
const bufferSchema = z.union([
  z.string(), // base64
  z.record(z.number()) // Buffer como objeto indexado
]).optional();

/**
 * Schema para chave de mensagem (message key)
 * Identifica unicamente uma mensagem no WhatsApp
 */
export const messageKeySchema = z.object({
  /** JID do destinatário/remetente (ex: 5511999999999@s.whatsapp.net) */
  remoteJid: z.string().min(1),
  
  /** Se a mensagem foi enviada por mim (true) ou recebida (false) */
  fromMe: z.boolean(),
  
  /** ID único da mensagem */
  id: z.string().min(1),
  
  /** JID do participante em grupos (opcional) */
  participant: z.string().optional(),
  
  /** JID alternativo para resolver @lid → número real (Baileys v7+) */
  participantAlt: z.string().optional(),
  
  /** JID remoto alternativo para resolver @lid → número real (Baileys v7+) */
  remoteJidAlt: z.string().optional()
});

/**
 * Schema para diferentes tipos de mensagem do WhatsApp
 */
export const whatsappMessageContentSchema = z.object({
  /** Mensagem de texto simples */
  conversation: z.string().optional(),
  
  /** Mensagem de texto estendida (com preview de link, etc) */
  extendedTextMessage: z.object({
    text: z.string().optional(),
    contextInfo: z.record(z.any()).optional()
  }).optional(),
  
  /** Mensagem de imagem */
  imageMessage: z.object({
    url: z.string().optional(),
    mimetype: z.string().optional(),
    caption: z.string().optional(),
    fileLength: fileLengthSchema,
    height: z.number().optional(),
    width: z.number().optional(),
    mediaKey: z.record(z.any()).optional(),
    fileEncSha256: z.record(z.any()).optional(),
    fileSha256: z.record(z.any()).optional(),
    jpegThumbnail: bufferSchema
  }).optional(),
  
  /** Mensagem de vídeo */
  videoMessage: z.object({
    url: z.string().optional(),
    mimetype: z.string().optional(),
    caption: z.string().optional(),
    fileLength: fileLengthSchema,
    seconds: z.number().optional(),
    mediaKey: z.record(z.any()).optional(),
    fileEncSha256: z.record(z.any()).optional(),
    fileSha256: z.record(z.any()).optional()
  }).optional(),
  
  /** Mensagem de áudio */
  audioMessage: z.object({
    url: z.string().optional(),
    mimetype: z.string().optional(),
    fileLength: fileLengthSchema,
    seconds: z.number().optional(),
    ptt: z.boolean().optional(),
    mediaKey: z.record(z.any()).optional(),
    fileEncSha256: z.record(z.any()).optional(),
    fileSha256: z.record(z.any()).optional()
  }).optional(),
  
  /** Mensagem de documento */
  documentMessage: z.object({
    url: z.string().optional(),
    mimetype: z.string().optional(),
    title: z.string().optional(),
    fileName: z.string().optional(),
    fileLength: fileLengthSchema,
    pageCount: z.number().optional(),
    mediaKey: z.record(z.any()).optional(),
    fileEncSha256: z.record(z.any()).optional(),
    fileSha256: z.record(z.any()).optional()
  }).optional(),
  
  /** Sticker */
  stickerMessage: z.object({
    url: z.string().optional(),
    mimetype: z.string().optional(),
    fileLength: fileLengthSchema,
    height: z.number().optional(),
    width: z.number().optional(),
    mediaKey: z.record(z.any()).optional(),
    fileEncSha256: z.record(z.any()).optional(),
    fileSha256: z.record(z.any()).optional()
  }).optional(),
  
  /** Mensagem de contato */
  contactMessage: z.object({
    displayName: z.string().optional(),
    vcard: z.string().optional()
  }).optional(),
  
  /** Mensagem de localização */
  locationMessage: z.object({
    degreesLatitude: z.number().optional(),
    degreesLongitude: z.number().optional(),
    name: z.string().optional(),
    address: z.string().optional()
  }).optional(),
  
  /** Reação a mensagem */
  reactionMessage: z.object({
    key: messageKeySchema.optional(),
    text: z.string().optional(),
    senderTimestampMs: timestampSchema
  }).optional()
}).passthrough(); // Permitir outros tipos de mensagem não mapeados

/**
 * Schema base para qualquer webhook da Evolution API
 */
export const baseWebhookSchema = z.object({
  /** Tipo do evento (ex: messages.upsert, connection.update) */
  event: z.string(),
  
  /** Nome da instância Evolution API */
  instanceName: z.string().optional(),
  
  /** Chave da instância */
  instanceKey: z.string().optional(),
  
  /** URL do servidor Evolution */
  serverUrl: z.string().optional(),
  
  /** Timestamp ISO 8601 do evento */
  datetime: z.string().optional(),
  
  /** Remetente do webhook */
  sender: z.string().optional()
});

// ========================================
// EVENT-SPECIFIC SCHEMAS
// ========================================

/**
 * MESSAGES.UPSERT - Mensagens recebidas ou enviadas
 * Este é o evento mais importante: toda nova mensagem gera este webhook
 */
export const messagesUpsertDataSchema = z.object({
  /** Chave da mensagem (identificador único) */
  key: messageKeySchema,
  
  /** Timestamp Unix da mensagem (segundos) */
  messageTimestamp: timestampSchema,
  
  /** Nome do remetente (pushName do WhatsApp) */
  pushName: z.string().optional(),
  
  /** Conteúdo da mensagem */
  message: whatsappMessageContentSchema.optional(),
  
  /** Tipo da mensagem (apenas para referência) */
  messageType: z.string().optional(),
  
  /** ID da instância */
  instanceId: z.string().optional(),
  
  /** Origem da mensagem (ios, android, web) */
  source: z.string().optional(),
  
  /** Status da mensagem (SENT, DELIVERED, READ) */
  status: z.string().optional()
}).passthrough();

export const messagesUpsertSchema = baseWebhookSchema.extend({
  event: z.literal('messages.upsert'),
  data: messagesUpsertDataSchema
});

/**
 * MESSAGES.UPDATE - Atualização de status de mensagens
 * Eventos: SENT → DELIVERED → READ
 * Também contém mapeamento @lid → número real
 */
export const messagesUpdateDataSchema = z.object({
  /** JID do destinatário */
  remoteJid: z.string().optional(),
  
  /** ID da mensagem (key.id) */
  keyId: z.string().optional(),
  
  /** Chave completa da mensagem */
  key: z.object({
    id: z.string(),
    remoteJid: z.string().optional(),
    fromMe: z.boolean().optional(),
    participant: z.string().optional()
  }).optional(),
  
  /** Novo status (SENT, DELIVERED, READ, PLAYED, DELETED) */
  status: z.string(),
  
  /** Timestamp da atualização */
  timestamp: timestampSchema
}).passthrough();

export const messagesUpdateSchema = baseWebhookSchema.extend({
  event: z.literal('messages.update'),
  data: z.union([
    messagesUpdateDataSchema,
    z.array(messagesUpdateDataSchema)
  ])
});

/**
 * SEND.MESSAGE - Mensagens enviadas pelo usuário via Evolution API
 * Mesmo formato que messages.upsert, mas com fromMe: true
 */
export const sendMessageSchema = baseWebhookSchema.extend({
  event: z.literal('send.message'),
  data: messagesUpsertDataSchema
});

/**
 * CONTACTS.UPDATE - Atualização de contatos
 * Foto de perfil e nome são atualizados automaticamente
 */
export const contactsUpdateDataSchema = z.object({
  /** JID do contato */
  remoteJid: z.string(),
  
  /** Nome do contato (pushName) - pode ser null */
  pushName: z.string().nullable().optional(),
  
  /** URL da foto de perfil (pode ser null se o contato não tem foto) */
  profilePicUrl: z.string().nullable().optional(),
  
  /** Timestamp da última atualização */
  timestamp: timestampSchema.optional(),

  /** Instance ID (Evolution API v2) */
  instanceId: z.string().optional()
}).passthrough();

export const contactsUpdateSchema = baseWebhookSchema.extend({
  event: z.literal('contacts.update'),
  data: z.union([
    contactsUpdateDataSchema,
    z.array(contactsUpdateDataSchema)
  ])
});

/**
 * CHATS.UPSERT - Atualização de chats
 * Contador de mensagens não lidas
 */
export const chatsUpsertDataSchema = z.object({
  /** JID do chat */
  remoteJid: z.string(),
  
  /** Número de mensagens não lidas */
  unreadMessages: z.number().optional(),
  
  /** Timestamp da última mensagem */
  conversationTimestamp: timestampSchema,
  
  /** Se o chat está arquivado */
  archived: z.boolean().optional(),
  
  /** Se o chat está silenciado */
  muted: z.boolean().optional(),
  
  /** Se o chat está fixado */
  pinned: z.boolean().optional()
}).passthrough();

export const chatsUpsertSchema = baseWebhookSchema.extend({
  event: z.literal('chats.upsert'),
  data: z.union([
    chatsUpsertDataSchema,
    z.array(chatsUpsertDataSchema)
  ])
});

/**
 * PRESENCE.UPDATE - Status de presença (online, digitando, offline)
 */
export const presenceUpdateDataSchema = z.object({
  /** JID do contato */
  id: z.string(),
  
  /** Mapa de presenças por JID */
  presences: z.record(z.object({
    /** Última presença conhecida (available, unavailable, composing) */
    lastKnownPresence: z.string(),
    
    /** Timestamp da última atividade */
    lastSeen: z.union([z.number(), z.string()]).optional()
  })).optional()
}).passthrough();

export const presenceUpdateSchema = baseWebhookSchema.extend({
  event: z.literal('presence.update'),
  data: presenceUpdateDataSchema
});

/**
 * CONNECTION.UPDATE - Status da conexão com WhatsApp
 * CRÍTICO: determina se a instância está conectada ou não
 */
export const connectionUpdateDataSchema = z.object({
  /** Estado da conexão (open, close, connecting) */
  state: z.enum(['open', 'close', 'connecting']),
  
  /** Código de status (200 = sucesso) */
  statusCode: z.number().optional(),
  
  /** Razão da mudança de estado */
  reason: z.string().optional(),
  
  /** Se a conexão está ativa */
  isOnline: z.boolean().optional(),
  
  /** Se houve desconexão inesperada */
  isNewLogin: z.boolean().optional()
}).passthrough();

export const connectionUpdateSchema = baseWebhookSchema.extend({
  event: z.literal('connection.update'),
  data: connectionUpdateDataSchema
});

/**
 * QRCODE.UPDATED - Novo QR Code disponível
 * CRÍTICO: necessário para conectar nova instância
 */
export const qrcodeUpdatedDataSchema = z.object({
  /** QR Code em formato base64 */
  qrcode: z.string(),
  
  /** Timestamp da geração */
  timestamp: timestampSchema
}).passthrough();

export const qrcodeUpdatedSchema = baseWebhookSchema.extend({
  event: z.literal('qrcode.updated'),
  data: qrcodeUpdatedDataSchema
});

// ========================================
// UNION TYPE - VALIDADOR GENÉRICO
// ========================================

/**
 * Schema discriminado por tipo de evento
 * Valida automaticamente o schema correto baseado no campo 'event'
 */
export const evolutionWebhookSchema = z.discriminatedUnion('event', [
  messagesUpsertSchema,
  messagesUpdateSchema,
  sendMessageSchema,
  contactsUpdateSchema,
  chatsUpsertSchema,
  presenceUpdateSchema,
  connectionUpdateSchema,
  qrcodeUpdatedSchema
]);

/**
 * Schema genérico com passthrough (fallback para eventos não mapeados)
 * Usa este quando quiser permitir eventos desconhecidos
 */
export const genericWebhookSchema = baseWebhookSchema.extend({
  data: z.record(z.any()).optional()
}).passthrough();

// ========================================
// TYPE EXPORTS
// ========================================

export type MessageKey = z.infer<typeof messageKeySchema>;
export type WhatsAppMessageContent = z.infer<typeof whatsappMessageContentSchema>;
export type BaseWebhook = z.infer<typeof baseWebhookSchema>;

export type MessagesUpsertData = z.infer<typeof messagesUpsertDataSchema>;
export type MessagesUpsertWebhook = z.infer<typeof messagesUpsertSchema>;

export type MessagesUpdateData = z.infer<typeof messagesUpdateDataSchema>;
export type MessagesUpdateWebhook = z.infer<typeof messagesUpdateSchema>;

export type SendMessageWebhook = z.infer<typeof sendMessageSchema>;

export type ContactsUpdateData = z.infer<typeof contactsUpdateDataSchema>;
export type ContactsUpdateWebhook = z.infer<typeof contactsUpdateSchema>;

export type ChatsUpsertData = z.infer<typeof chatsUpsertDataSchema>;
export type ChatsUpsertWebhook = z.infer<typeof chatsUpsertSchema>;

export type PresenceUpdateData = z.infer<typeof presenceUpdateDataSchema>;
export type PresenceUpdateWebhook = z.infer<typeof presenceUpdateSchema>;

export type ConnectionUpdateData = z.infer<typeof connectionUpdateDataSchema>;
export type ConnectionUpdateWebhook = z.infer<typeof connectionUpdateSchema>;

export type QrcodeUpdatedData = z.infer<typeof qrcodeUpdatedDataSchema>;
export type QrcodeUpdatedWebhook = z.infer<typeof qrcodeUpdatedSchema>;

export type EvolutionWebhook = z.infer<typeof evolutionWebhookSchema>;
export type GenericWebhook = z.infer<typeof genericWebhookSchema>;
