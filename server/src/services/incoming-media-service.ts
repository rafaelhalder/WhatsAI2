import { prisma } from '../database/prisma';
import { MediaStorageService } from './media-storage';
import { SpacesConfig } from './digitalocean-spaces';
import { EvolutionApiService } from './evolution-api';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { mediaLogger } from '../utils/media-logger';
import sharp from 'sharp';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { imageOptimizer } from './image-optimizer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
// file-type é ESM puro, importado dinamicamente quando necessário

// Configure ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
} else {
  console.warn('ffmpeg-static not found, audio conversion may not work');
}

export interface IncomingMediaOptions {
  messageId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'sticker' | 'document';
  fileName?: string;
  caption?: string;
  mimeType?: string;
  instanceName?: string; // Nome da instância Evolution API
  messageData?: any; // Dados completos da mensagem do webhook (necessário para descriptografar)
}

export class IncomingMediaService {
  private mediaStorageService: MediaStorageService;
  private evolutionApiService: EvolutionApiService;

  constructor(spacesConfig?: SpacesConfig) {
    // Usar configuração fornecida ou ler das variáveis de ambiente
    const config = spacesConfig || {
      accessKeyId: process.env['DO_SPACES_ACCESS_KEY'] || '',
      secretAccessKey: process.env['DO_SPACES_SECRET_KEY'] || '',
      region: process.env['DO_SPACES_REGION'] || 'sfo3',
      bucket: process.env['DO_SPACES_BUCKET'] || 'whatsais3',
      endpoint: process.env['DO_SPACES_ENDPOINT'] || 'https://sfo3.digitaloceanspaces.com'
    };

    console.log('🔧 [IncomingMediaService] Spaces config:', {
      hasAccessKey: !!config.accessKeyId,
      hasSecretKey: !!config.secretAccessKey,
      region: config.region,
      bucket: config.bucket,
      endpoint: config.endpoint
    });

    this.mediaStorageService = new MediaStorageService(config);
    this.evolutionApiService = new EvolutionApiService();
  }

  /**
   * Processa mídia recebida via webhook
   */
  async processIncomingMedia(options: IncomingMediaOptions): Promise<string | null> {
    const { messageId, mediaUrl, mediaType, fileName, caption, mimeType: originalMimeType, instanceName, messageData } = options;

    let mimeType = originalMimeType; // Make it mutable

    

    mediaLogger.log('🚀 [INCOMING_MEDIA_START] Iniciando processamento de mídia:', {
      messageId,
      mediaType,
      mediaUrl: mediaUrl.substring(0, 100) + '...',
      fileName,
      caption,
      mimeType
    });

    try {

      // 1. Baixar a mídia - usa Evolution API se for URL criptografada do WhatsApp
      const downloadedBuffer = await this.downloadMedia(mediaUrl, instanceName, messageData);

      // 1.4 VALIDAR TIPO DE ARQUIVO REAL (Fase 1 - Mudança 4)
      
      // file-type é ESM puro, precisa importação dinâmica
      const { fileTypeFromBuffer } = await import('file-type');
      const detectedFileType = await fileTypeFromBuffer(downloadedBuffer);
      
      if (detectedFileType) {
        console.log(`🔍 [FILE_TYPE_VALIDATION] Tipo detectado: ${detectedFileType.mime} (ext: ${detectedFileType.ext})`);
        
        mediaLogger.log('🔐 [FILE_TYPE_VALIDATION] Tipo de arquivo detectado', {
          detectedMime: detectedFileType.mime,
          detectedExt: detectedFileType.ext,
          declaredMime: mimeType,
          declaredMediaType: mediaType,
          bufferSize: downloadedBuffer.length
        });

        // Validar se o tipo real corresponde ao declarado
        if (mimeType && !this.isFileTypeCompatible(detectedFileType.mime, mimeType)) {
          console.error(`❌ [FILE_TYPE_VALIDATION] TIPO INCOMPATÍVEL!`);
          console.error(`   Declarado: ${mimeType}`);
          console.error(`   Real: ${detectedFileType.mime}`);
          
          mediaLogger.error('❌ [FILE_TYPE_VALIDATION] Arquivo com tipo incompatível detectado', {
            detectedMime: detectedFileType.mime,
            declaredMime: mimeType,
            messageId,
            instanceName
          });

          throw new Error(
            `Arquivo malicioso detectado: tipo declarado (${mimeType}) não corresponde ao tipo real (${detectedFileType.mime})`
          );
        }

        // Validar se o mediaType está correto
        const expectedMediaType = this.getMediaTypeFromMime(detectedFileType.mime);
        if (expectedMediaType && expectedMediaType !== mediaType) {
          console.warn(`⚠️ [FILE_TYPE_VALIDATION] mediaType incorreto: esperado '${expectedMediaType}', recebido '${mediaType}'`);
          mediaLogger.log('⚠️ [FILE_TYPE_VALIDATION] mediaType corrigido automaticamente', {
            original: mediaType,
            corrected: expectedMediaType
          });
        }

      } else {
        console.warn(`⚠️ [FILE_TYPE_VALIDATION] Não foi possível detectar tipo do arquivo (pode ser formato desconhecido)`);
        mediaLogger.log('⚠️ [FILE_TYPE_VALIDATION] Tipo não detectado', {
          declaredMime: mimeType,
          bufferSize: downloadedBuffer.length,
          bufferStart: downloadedBuffer.subarray(0, 16).toString('hex')
        });
      }

      // 1.5 Validar se a imagem não está corrompida (usando sharp)
      let processedBuffer = downloadedBuffer; // Buffer que será enviado ao Spaces
      let wasOptimized = false;

      // Processar stickers e imagens
      if (mediaType === 'sticker' || mediaType === 'image' || mimeType?.includes('image')) {
        try {
          const metadata = await sharp(downloadedBuffer).metadata();
          
          // Detectar se é WebP animado (sticker animado)
          const isAnimatedWebp = metadata.format === 'webp' && metadata.pages && metadata.pages > 1;
          
          mediaLogger.log('✅ [IMAGE_VALIDATION] Validação sharp bem-sucedida', {
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
            size: metadata.size,
            hasAlpha: metadata.hasAlpha,
            pages: metadata.pages,
            isAnimated: isAnimatedWebp
          });

          // IMPORTANTE: Não otimizar stickers animados (WebP com múltiplos frames)
          // A otimização remove a animação e mantém apenas o primeiro frame
          if (isAnimatedWebp) {
            console.log('🎬 [ANIMATED_STICKER] WebP animado detectado - PULANDO otimização para preservar animação');
            mediaLogger.log('🎬 [ANIMATED_STICKER] Sticker animado preservado', {
              format: metadata.format,
              pages: metadata.pages,
              originalSize: downloadedBuffer.length,
              dimensions: `${metadata.width}x${metadata.height}`
            });
            // Usar buffer original sem otimizar
            processedBuffer = downloadedBuffer;
            wasOptimized = false;
          } else {
            // 1.6 OTIMIZAR IMAGEM (apenas se não for animado)
            const optimizationResult = await imageOptimizer.optimizeImage(downloadedBuffer, {
              maxWidth: 1920,
              maxHeight: 1920,
              jpegQuality: 85,
              webpQuality: 80,
              convertPngToJpeg: true,
              convertToWebp: false,
              stripMetadata: true
            });

            processedBuffer = optimizationResult.buffer;
            wasOptimized = true;

            mediaLogger.log('🎨 [IMAGE_OPTIMIZATION] Imagem otimizada com sucesso', {
              originalSize: optimizationResult.originalSize,
              optimizedSize: optimizationResult.optimizedSize,
              reductionPercent: optimizationResult.reductionPercent,
              format: `${optimizationResult.metadata.originalFormat} → ${optimizationResult.format}`,
              dimensions: `${optimizationResult.width}x${optimizationResult.height}`,
              wasResized: optimizationResult.metadata.wasResized,
              wasConverted: optimizationResult.metadata.wasConverted
            });
          }

        } catch (sharpError: any) {
          console.error(`❌ [IMAGE_VALIDATION] IMAGEM CORROMPIDA! sharp falhou:`, sharpError.message);
          mediaLogger.error('❌ [IMAGE_VALIDATION] Imagem corrompida detectada', {
            error: sharpError.message,
            bufferSize: downloadedBuffer.length,
            bufferStart: downloadedBuffer.subarray(0, 16).toString('hex')
          });
          throw new Error(`Imagem corrompida detectada: ${sharpError.message}`);
        }
      }

      // Processar áudio - converter OGG Opus para MP3 para melhor compatibilidade
      if (mediaType === 'audio' && processedBuffer.length > 0) {
        // 🔧 GARANTIR que o mimeType seja definido para áudio (mesmo que não especificado)
        if (!mimeType || mimeType === 'application/octet-stream') {
          mimeType = 'audio/ogg'; // Default para áudio se não especificado
          console.log('🔧 [AUDIO_MIMETYPE] mimeType não definido, usando audio/ogg como padrão');
        }
        
        try {
          console.log('🎵 [AUDIO_CONVERSION] Iniciando conversão de áudio OGG → MP3');
          const convertedBuffer = await this.convertAudioToMp3(processedBuffer);
          if (convertedBuffer) {
            processedBuffer = convertedBuffer;
            // Atualizar mimeType para MP3
            mimeType = 'audio/mpeg';
            console.log('✅ [AUDIO_CONVERSION] Áudio convertido com sucesso');
            mediaLogger.log('🎵 [AUDIO_CONVERSION] Conversão OGG→MP3 bem-sucedida', {
              originalSize: downloadedBuffer.length,
              convertedSize: convertedBuffer.length
            });
          } else {
            console.warn('⚠️ [AUDIO_CONVERSION] Conversão falhou, mantendo formato original');
            // 🔧 Manter mimeType original do áudio (já definido acima como audio/ogg)
          }
        } catch (audioError: any) {
          console.error('❌ [AUDIO_CONVERSION] Erro na conversão:', audioError.message);
          mediaLogger.error('❌ [AUDIO_CONVERSION] Falha na conversão de áudio', {
            error: audioError.message,
            originalSize: downloadedBuffer.length
          });
          // 🔧 Continuar com o buffer original e mimeType audio/ogg (já definido)
        }
      }

      // 2. Determinar nome do arquivo
      const finalFileName = this.generateFileName(messageId, mediaType, fileName, mimeType);

      // 3. Upload para DigitalOcean Spaces (usando buffer otimizado se disponível)
      const uploadResult = await this.uploadToSpaces(processedBuffer, finalFileName, mediaType, caption);
      mediaLogger.log('✅ [INCOMING_MEDIA] Mídia enviada para Spaces', { 
        key: uploadResult.key,
        wasOptimized 
      });

      // 4. Retornar a URL CDN para armazenamento no banco
      const cdnUrl = this.mediaStorageService['spacesService'].getCdnUrl(uploadResult.key);
      mediaLogger.log('🎉 [INCOMING_MEDIA] URL CDN gerada', { 
        cdnUrl,
        mediaType,
        messageId
      });

      console.log(`✅ [INCOMING_MEDIA_SUCCESS] ${mediaType.toUpperCase()} processado com sucesso:`, cdnUrl);

      return cdnUrl;

    } catch (error: any) {
      mediaLogger.error('❌ [INCOMING_MEDIA] Erro ao processar mídia', {
        messageId,
        error: error.message,
        stack: error.stack
      });
      // Em caso de erro, retornar null para manter a URL original
      return null;
    }
  }

  /**
   * Baixa mídia da URL fornecida
   * Para URLs do WhatsApp criptografadas, usa Evolution API para descriptografar
   */
  private async downloadMedia(mediaUrl: string, instanceName?: string, messageData?: any): Promise<Buffer> {
    mediaLogger.log('🔄 [DOWNLOAD_START] Iniciando download da mídia', {
      url: mediaUrl.substring(0, 100) + '...'
    });

    try {

      // Para URLs do WhatsApp (mmg.whatsapp.net), a mídia está CRIPTOGRAFADA
      // Usamos o Baileys para baixar e descriptografar automaticamente
      const isWhatsAppUrl = mediaUrl.includes('mmg.whatsapp.net');

      if (isWhatsAppUrl) {
        
        if (!messageData) {
          console.error(`⚠️ [DOWNLOAD_ERROR] messageData não fornecido para descriptografar mídia!`);
          throw new Error('Cannot download encrypted WhatsApp media without messageData');
        }

        
        // O webhook envia os campos de criptografia como objetos numéricos {"0": 63, "1": 7, ...}
        // Precisamos converter para Buffer antes de passar para o Baileys
        const message = messageData.message;
        const mediaMessage = message.imageMessage || message.videoMessage || message.audioMessage || message.documentMessage || message.stickerMessage;
        
        if (mediaMessage) {
          // Converter arrays numéricos para Buffers
          if (mediaMessage.mediaKey && typeof mediaMessage.mediaKey === 'object' && !Buffer.isBuffer(mediaMessage.mediaKey)) {
            mediaMessage.mediaKey = Buffer.from(Object.values(mediaMessage.mediaKey));
          }
          
          if (mediaMessage.fileEncSha256 && typeof mediaMessage.fileEncSha256 === 'object' && !Buffer.isBuffer(mediaMessage.fileEncSha256)) {
            mediaMessage.fileEncSha256 = Buffer.from(Object.values(mediaMessage.fileEncSha256));
          }
          
          if (mediaMessage.fileSha256 && typeof mediaMessage.fileSha256 === 'object' && !Buffer.isBuffer(mediaMessage.fileSha256)) {
            mediaMessage.fileSha256 = Buffer.from(Object.values(mediaMessage.fileSha256));
          }
          
          if (mediaMessage.jpegThumbnail && typeof mediaMessage.jpegThumbnail === 'object' && !Buffer.isBuffer(mediaMessage.jpegThumbnail)) {
            mediaMessage.jpegThumbnail = Buffer.from(Object.values(mediaMessage.jpegThumbnail));
          }
        }

        
        // downloadMediaMessage do Baileys baixa e descriptografa automaticamente
        const buffer = await downloadMediaMessage(
          { key: messageData.key, message: messageData.message },
          'buffer',
          {},
          {
            logger: {
              fatal: () => {},
              error: (msg: string) => console.error(`[Baileys Error] ${msg}`),
              warn: (msg: string) => console.warn(`[Baileys Warn] ${msg}`),
              info: () => {},
              debug: () => {},
              trace: () => {}
            } as any,
            reuploadRequest: async () => {
              throw new Error('Media reupload not supported');
            }
          }
        );

        if (!buffer) {
          throw new Error('downloadMediaMessage returned null or undefined');
        }

        return buffer;
      }

      // Para URLs normais (CDN, etc), baixar direto
      const headers: any = {
        'User-Agent': 'WhatsAI/1.0'
      };

      const response = await axios.get(mediaUrl, {
        responseType: 'arraybuffer', // Axios retorna ArrayBuffer, não Buffer diretamente
        timeout: 30000, // 30 segundos timeout
        headers,
        maxContentLength: 50 * 1024 * 1024, // 50MB max
        maxBodyLength: 50 * 1024 * 1024,
        validateStatus: (status) => status < 400 // Aceitar redirects
        // IMPORTANTE: NÃO usar transformResponse com arraybuffer - deixe o Axios processar
        // IMPORTANTE: NÃO usar decompress: false - isso pode corromper dados binários
      });

      mediaLogger.log('✅ [DOWNLOAD_SUCCESS] Download concluído', {
        status: response.status,
        contentType: response.headers['content-type'],
        size: response.data.byteLength || response.data.length,
        isWhatsApp: isWhatsAppUrl
      });

      console.log(`🔍 [DOWNLOAD_DEBUG] Response data isBuffer: ${Buffer.isBuffer(response.data)}`);

      // Converter ArrayBuffer para Buffer de forma segura
      // Se já for Buffer, use direto; senão converta do ArrayBuffer
      let buffer: Buffer;
      if (Buffer.isBuffer(response.data)) {
        buffer = response.data;
      } else if (response.data instanceof ArrayBuffer) {
        buffer = Buffer.from(response.data);
      } else {
        // Fallback: assume que é Uint8Array ou similar
        buffer = Buffer.from(response.data);
      }
      

      // Validação básica para imagens
      if (buffer.length === 0) {
        throw new Error('Buffer vazio recebido');
      }


      // SEMPRE verificar assinatura para URLs do WhatsApp (elas são sempre mídia)
      if (isWhatsAppUrl && buffer.length > 4) {
        const signature = buffer.subarray(0, 4).toString('hex');

        // Verificar assinaturas comuns de imagem/vídeo
        const validImageSignatures = ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', '89504e47', '47494638'];
        const validVideoSignatures = ['00000018', '00000020']; // MP4 signatures
        const allValidSignatures = [...validImageSignatures, ...validVideoSignatures];

        if (!allValidSignatures.some(sig => signature.startsWith(sig))) {
          console.warn(`⚠️ [DOWNLOAD_SIGNATURE] Assinatura inválida detectada: ${signature}`);
          console.warn(`⚠️ [DOWNLOAD_SIGNATURE] Buffer corrompido? Verificando primeiros 16 bytes:`, buffer.subarray(0, 16).toString('hex'));
          // Não falhar por enquanto, mas logar para investigar
        } else {
        }
      }

      // Para imagens, verificar se começa com assinatura válida (fallback para outros casos)
      if (response.headers['content-type']?.includes('image/')) {
        const signature = buffer.subarray(0, 4).toString('hex');
        console.log(`🖼️ [DOWNLOAD_SIGNATURE] Assinatura da imagem (header): ${signature}`);

        // Verificar assinaturas comuns de imagem
        const validSignatures = ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', '89504e47', '47494638'];
        if (!validSignatures.some(sig => signature.startsWith(sig))) {
          console.warn(`⚠️ [DOWNLOAD_SIGNATURE] Assinatura inválida detectada: ${signature}`);
          // Não falhar, apenas logar - pode ser um formato não padrão
        }
      }

      return buffer;
    } catch (error: any) {
      mediaLogger.error('❌ [DOWNLOAD_ERROR] Falha no download', {
        error: error.message,
        status: error.response?.status,
        response: error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : 'N/A',
        url: mediaUrl.substring(0, 100) + '...'
      });
      throw new Error(`Falha ao baixar mídia: ${error.message}`);
    }
  }

  /**
   * Gera nome único para o arquivo
   */
  private generateFileName(messageId: string, mediaType: string, originalFileName?: string, mimeType?: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);

    // Extrair extensão do mimeType ou usar padrão baseado no mediaType
    let extension = '.bin'; // fallback final
    
    if (mimeType) {
      const mimeLower = mimeType.toLowerCase();
      if (mimeLower.includes('jpeg') || mimeLower.includes('jpg')) extension = '.jpg';
      else if (mimeLower.includes('png')) extension = '.png';
      else if (mimeLower.includes('gif')) extension = '.gif';
      else if (mimeLower.includes('mp4')) extension = '.mp4';
      else if (mimeLower.includes('webm')) extension = '.webm';
      else if (mimeLower.includes('mp3') || mimeLower.includes('mpeg')) extension = '.mp3';
      else if (mimeLower.includes('ogg')) extension = '.ogg';
      else if (mimeLower.includes('webp')) extension = '.webp';
      else if (mimeLower.includes('aac')) extension = '.aac';
      else if (mimeLower.includes('wav')) extension = '.wav';
    }
    
    // 🔧 FALLBACK INTELIGENTE: Se ainda for .bin, usar extensão baseada no mediaType
    if (extension === '.bin') {
      console.warn(`⚠️ [GENERATE_FILENAME] mimeType não reconhecido (${mimeType}), usando fallback baseado em mediaType: ${mediaType}`);
      
      const mediaTypeExtensions: { [key: string]: string } = {
        'audio': '.ogg',     // Padrão para áudio (WhatsApp usa OGG Opus)
        'image': '.jpg',     // Padrão para imagem
        'video': '.mp4',     // Padrão para vídeo
        'sticker': '.webp',  // Padrão para sticker
        'document': '.pdf'   // Padrão para documento
      };
      
      extension = mediaTypeExtensions[mediaType] || '.bin';
    }

    // Usar nome original se disponível, senão gerar
    const baseName = originalFileName ?
      path.parse(originalFileName).name :
      `${mediaType}_${messageId}_${randomId}`;

    return `${baseName}_${timestamp}${extension}`;
  }

  /**
   * Upload para DigitalOcean Spaces
   */
  private async uploadToSpaces(
    buffer: Buffer,
    fileName: string,
    mediaType: string,
    caption?: string
  ): Promise<any> {
    mediaLogger.log('🔄 [UPLOAD_START] Iniciando upload para Spaces', {
      fileName,
      mediaType,
      bufferSize: buffer.length,
      caption
    });

    try {
      const fileKey = `incoming/${mediaType}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${fileName}`;
      mediaLogger.log('🔑 [UPLOAD_KEY] Chave gerada', { fileKey });

      // Determinar MIME type baseado no buffer e nome do arquivo
      const mimeType = this.getMimeTypeFromBuffer(buffer, fileName);
      mediaLogger.log('🏷️ [UPLOAD_MIME] MIME type determinado', { mimeType });

      // Validação adicional para imagens
      if (mediaType === 'image' && buffer.length > 0) {
        const firstBytes = buffer.subarray(0, 8).toString('hex');

        // Verificar se parece uma imagem válida
        if (buffer.length < 100) {
          console.warn(`⚠️ [UPLOAD_VALIDATION] Buffer muito pequeno para imagem: ${buffer.length} bytes`);
        }
      }

      mediaLogger.log('📤 [UPLOAD_REQUEST] Fazendo upload para Spaces...');

      // Upload usando o serviço DigitalOcean Spaces diretamente
      const uploadResult = await this.mediaStorageService['spacesService'].uploadFile(
        buffer,
        fileKey,
        mimeType,
        {
          acl: 'public-read',
          metadata: {
            mediaType,
            originalName: fileName,
            caption: caption || '',
            uploadedAt: new Date().toISOString(),
            source: 'incoming_webhook',
            bufferSize: buffer.length.toString()
          }
        }
      );

      mediaLogger.log('✅ [UPLOAD_SUCCESS] Upload concluído', {
        key: uploadResult.key,
        size: buffer.length
      });

      return uploadResult;
    } catch (error: any) {
      console.error(`❌ [UPLOAD_ERROR] Falha no upload:`);
      console.error(`   💥 Erro: ${error.message}`);
      console.error(`   📊 Status: ${error.statusCode || 'N/A'}`);
      console.error(`   📏 Buffer size: ${buffer.length}`);
      throw error;
    }
  }

  /**
   * Determina o tipo MIME baseado no buffer e nome do arquivo
   */
  private getMimeTypeFromBuffer(buffer: Buffer, fileName: string): string {
    const extension = path.extname(fileName).toLowerCase();

    // Primeiro tentar detectar pelo conteúdo do buffer (magic numbers)
    if (buffer.length >= 4) {
      const signature = buffer.subarray(0, 4).toString('hex');

      // JPEG
      if (signature.startsWith('ffd8')) {
        return 'image/jpeg';
      }
      // PNG
      if (signature === '89504e47') {
        return 'image/png';
      }
      // GIF
      if (signature.startsWith('474946')) {
        return 'image/gif';
      }
      // WebP
      if (signature === '52494646' && buffer.length >= 12) {
        const webpSignature = buffer.subarray(8, 12).toString('ascii');
        if (webpSignature === 'WEBP') {
          return 'image/webp';
        }
      }
      // 🔧 OGG Audio (OggS)
      if (signature === '4f676753') {
        return 'audio/ogg';
      }
      // 🔧 MP3 Audio (ID3 tag ou MPEG frame sync)
      if (signature.startsWith('4944') || signature.startsWith('fff') || signature.startsWith('fffb')) {
        return 'audio/mpeg';
      }
    }

    // Fallback para extensão do arquivo
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.aac': 'audio/aac',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4'
    };

    const mimeFromExtension = mimeTypes[extension];
    if (mimeFromExtension) {
      return mimeFromExtension;
    }
    
    // 🔧 ÚLTIMO FALLBACK: Se o nome do arquivo contém 'audio' no nome, retornar audio/ogg
    if (fileName.toLowerCase().includes('audio') || fileName.toLowerCase().includes('_ac')) {
      console.warn(`⚠️ [MIME_DETECTION] Arquivo parece ser áudio mas não detectado, usando audio/ogg: ${fileName}`);
      return 'audio/ogg';
    }

    return 'application/octet-stream';
  }

  /**
   * Verifica se uma URL é válida e acessível
   */
  async validateMediaUrl(mediaUrl: string): Promise<boolean> {
    try {
      const response = await axios.head(mediaUrl, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Verifica se o tipo de arquivo detectado é compatível com o declarado.
   * Permite pequenas variações (ex: image/jpg vs image/jpeg).
   * 
   * @param detectedMime - Tipo MIME detectado pelo file-type
   * @param declaredMime - Tipo MIME declarado no webhook
   * @returns true se compatível, false se incompatível (possível arquivo malicioso)
   */
  private isFileTypeCompatible(detectedMime: string, declaredMime: string): boolean {
    // Normalizar para lowercase
    const detected = detectedMime.toLowerCase().trim();
    const declared = declaredMime.toLowerCase().trim();

    // Match exato
    if (detected === declared) {
      return true;
    }

    // Aliases conhecidos (formatos equivalentes)
    const aliases: { [key: string]: string[] } = {
      'image/jpeg': ['image/jpg', 'image/pjpeg'],
      'image/jpg': ['image/jpeg', 'image/pjpeg'],
      'video/quicktime': ['video/mov'],
      'audio/mpeg': ['audio/mp3', 'audio/mpeg3'],
      'audio/mp3': ['audio/mpeg', 'audio/mpeg3'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['application/msword'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['application/vnd.ms-excel']
    };

    // Verificar aliases
    if (aliases[detected]?.includes(declared) || aliases[declared]?.includes(detected)) {
      return true;
    }

    // Verificar se pelo menos a categoria é a mesma (image/*, video/*, audio/*)
    const detectedCategory = detected.split('/')[0];
    const declaredCategory = declared.split('/')[0];
    
    if (detectedCategory === declaredCategory) {
      console.warn(`⚠️ [FILE_TYPE_VALIDATION] Categoria compatível mas tipo específico diferente: ${detected} vs ${declared}`);
      return true; // Permite com warning (mesma categoria)
    }

    // Incompatível
    return false;
  }

  /**
   * Mapeia MIME type para mediaType usado no sistema.
   * 
   * @param mime - Tipo MIME (ex: image/jpeg, video/mp4)
   * @returns Media type (image, video, audio, sticker, document) ou null
   */
  private getMediaTypeFromMime(mime: string): string | null {
    const normalized = mime.toLowerCase();

    if (normalized.startsWith('image/')) {
      // Stickers geralmente são WebP
      if (normalized === 'image/webp') {
        return 'sticker'; // Pode ser sticker ou image, assumir sticker
      }
      return 'image';
    }

    if (normalized.startsWith('video/')) {
      return 'video';
    }

    if (normalized.startsWith('audio/')) {
      return 'audio';
    }

    if (
      normalized.startsWith('application/') &&
      (normalized.includes('pdf') || 
       normalized.includes('document') || 
       normalized.includes('sheet') ||
       normalized.includes('msword') ||
       normalized.includes('excel'))
    ) {
      return 'document';
    }

    return null;
  }

  /**
   * Converte áudio OGG Opus para MP3 para melhor compatibilidade com navegadores
   */
  private async convertAudioToMp3(inputBuffer: Buffer): Promise<Buffer | null> {
    return new Promise((resolve, reject) => {
      try {
        // Criar arquivos temporários
        const inputFile = path.join(process.cwd(), 'temp_audio_input.ogg');
        const outputFile = path.join(process.cwd(), 'temp_audio_output.mp3');

        // Escrever buffer de entrada para arquivo temporário
        fs.writeFileSync(inputFile, inputBuffer);

        // Converter usando ffmpeg
        ffmpeg(inputFile)
          .toFormat('mp3')
          .audioCodec('libmp3lame')
          .audioBitrate(128) // 128kbps para boa qualidade e tamanho razoável
          .audioFrequency(44100) // 44.1kHz
          .audioChannels(1) // Mono para mensagens de voz
          .on('end', () => {
            try {
              // Ler arquivo convertido
              const outputBuffer = fs.readFileSync(outputFile);
              
              // Limpar arquivos temporários
              try { fs.unlinkSync(inputFile); } catch {}
              try { fs.unlinkSync(outputFile); } catch {}
              
              console.log(`🎵 [AUDIO_CONVERSION] Conversão concluída: ${inputBuffer.length} → ${outputBuffer.length} bytes`);
              resolve(outputBuffer);
            } catch (readError) {
              reject(readError);
            }
          })
          .on('error', (err) => {
            // Limpar arquivos temporários em caso de erro
            try { fs.unlinkSync(inputFile); } catch {}
            try { fs.unlinkSync(outputFile); } catch {}
            
            console.error('❌ [AUDIO_CONVERSION] Erro no ffmpeg:', err.message);
            reject(err);
          })
          .save(outputFile);

      } catch (error) {
        reject(error);
      }
    });
  }
}