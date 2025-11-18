export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  STICKER = 'STICKER',
  LOCATION = 'LOCATION',
  CONTACT = 'CONTACT',
  UNKNOWN = 'UNKNOWN'
}

export class MessageTypeService {
  /**
   * Determina o tipo de mensagem baseado nos dados do webhook
   */
  static getMessageType(messageData: any): MessageType {
    if (messageData.message?.conversation) return MessageType.TEXT;
    if (messageData.message?.extendedTextMessage) return MessageType.TEXT;
    if (messageData.message?.imageMessage) return MessageType.IMAGE;
    if (messageData.message?.videoMessage) return MessageType.VIDEO;
    if (messageData.message?.audioMessage) return MessageType.AUDIO;
    if (messageData.message?.documentMessage) return MessageType.DOCUMENT;
    if (messageData.message?.stickerMessage) return MessageType.STICKER;
    if (messageData.message?.locationMessage) return MessageType.LOCATION;
    if (messageData.message?.contactMessage) return MessageType.CONTACT;

    return MessageType.UNKNOWN;
  }

  /**
   * Extrai o conteúdo da mensagem baseado no tipo
   */
  static extractMessageContent(messageData: any): string {
    const messageType = this.getMessageType(messageData);

    switch (messageType) {
      case MessageType.TEXT:
        if (messageData.message?.conversation) {
          return messageData.message.conversation;
        }
        if (messageData.message?.extendedTextMessage?.text) {
          return messageData.message.extendedTextMessage.text;
        }
        return '';

      case MessageType.IMAGE:
        return messageData.message.imageMessage.caption || '[Imagem]';

      case MessageType.VIDEO:
        return messageData.message.videoMessage.caption || '[Vídeo]';

      case MessageType.AUDIO:
        return '[Áudio]';

      case MessageType.DOCUMENT:
        return `[Documento: ${messageData.message.documentMessage.fileName || 'arquivo'}]`;

      case MessageType.STICKER:
        return '[Sticker]';

      case MessageType.LOCATION:
        return '[Localização]';

      case MessageType.CONTACT:
        return '[Contato]';

      default:
        return '[Mensagem não suportada]';
    }
  }

  /**
   * Extrai URLs de mídia da mensagem
   */
  static extractMediaUrl(messageData: any): string | null {
    const messageType = this.getMessageType(messageData);

    switch (messageType) {
      case MessageType.IMAGE:
        return messageData.message?.imageMessage?.url || null;
      case MessageType.VIDEO:
        return messageData.message?.videoMessage?.url || null;
      case MessageType.AUDIO:
        return messageData.message?.audioMessage?.url || null;
      case MessageType.DOCUMENT:
        return messageData.message?.documentMessage?.url || null;
      case MessageType.STICKER:
        return messageData.message?.stickerMessage?.url || null;
      default:
        return null;
    }
  }

  /**
   * Extrai nome do arquivo para documentos
   */
  static extractFileName(messageData: any): string | null {
    const messageType = this.getMessageType(messageData);

    switch (messageType) {
      case MessageType.DOCUMENT:
        return messageData.message?.documentMessage?.fileName || null;
      default:
        return null;
    }
  }

  /**
   * Extrai legenda para mídia
   */
  static extractCaption(messageData: any): string | null {
    const messageType = this.getMessageType(messageData);

    switch (messageType) {
      case MessageType.IMAGE:
        return messageData.message?.imageMessage?.caption || null;
      case MessageType.VIDEO:
        return messageData.message?.videoMessage?.caption || null;
      default:
        return null;
    }
  }

  /**
   * Verifica se a mensagem contém mídia
   */
  static hasMedia(messageType: MessageType): boolean {
    return [
      MessageType.IMAGE,
      MessageType.VIDEO,
      MessageType.AUDIO,
      MessageType.DOCUMENT,
      MessageType.STICKER
    ].includes(messageType);
  }

  /**
   * Verifica se a mensagem é reproduzível (áudio/vídeo)
   */
  static isPlayable(messageType: MessageType): boolean {
    return [MessageType.AUDIO, MessageType.VIDEO].includes(messageType);
  }
}