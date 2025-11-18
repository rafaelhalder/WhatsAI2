import { DigitalOceanSpacesService, SpacesConfig, UploadResult } from './digitalocean-spaces';
import { MediaMessageService } from './messages';
import { Message } from '@prisma/client';

export interface MediaUploadOptions {
  file: Buffer;
  fileName: string;
  contentType: string;
  conversationId: string;
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  caption?: string;
}

export interface MediaUploadResult {
  upload: UploadResult;
  message: Message;
}

export class MediaStorageService {
  private spacesService: DigitalOceanSpacesService;
  private mediaService: MediaMessageService;

  constructor(spacesConfig: SpacesConfig) {
    this.spacesService = new DigitalOceanSpacesService(spacesConfig);
    this.mediaService = new MediaMessageService();
  }

  /**
   * Upload file to DigitalOcean Spaces and send as WhatsApp message
   */
  async uploadAndSendMedia(
    options: MediaUploadOptions & { instanceId: string; remoteJid: string }
  ): Promise<MediaUploadResult> {
    const { file, fileName, contentType, conversationId, mediaType, caption, instanceId, remoteJid } = options;

    // Validate required parameters
    if (!file || !fileName || !contentType || !conversationId || !mediaType || !instanceId || !remoteJid) {
      throw new Error(`Missing required parameters: file=${!!file}, fileName=${!!fileName}, contentType=${!!contentType}, conversationId=${!!conversationId}, mediaType=${!!mediaType}, instanceId=${!!instanceId}, remoteJid=${!!remoteJid}`);
    }

    let uploadResult: any = null;

    try {

      // 1. Generate unique key for the file
      const fileKey = DigitalOceanSpacesService.generateFileKey(
        conversationId,
        fileName,
        mediaType
      );

      // 2. Upload to DigitalOcean Spaces
      uploadResult = await this.spacesService.uploadFile(
        file,
        fileKey,
        contentType,
        {
          acl: 'public-read', // Make file publicly accessible
          metadata: {
            conversationId,
            mediaType,
            originalName: fileName,
            uploadedAt: new Date().toISOString(),
          },
        }
      );

      // 3. Get CDN URL for faster access
      const cdnUrl = this.spacesService.getCdnUrl(uploadResult.key);


      // 4. Send as WhatsApp message
      const message = await this.mediaService.sendMediaMessage({
        instanceId,
        remoteJid,
        mediaUrl: cdnUrl, // Use CDN URL instead of direct Spaces URL
        mediaType,
        caption,
        fileName,
      });


      return {
        upload: uploadResult,
        message,
      };

    } catch (error) {
      console.error(`❌ [MediaStorage] Process failed:`, error);

      // If upload succeeded but message failed, cleanup the uploaded file
      if (uploadResult) {
        try {
          await this.spacesService.deleteFile(uploadResult.key);
        } catch (rollbackError) {
          console.error(`❌ [MediaStorage] Rollback failed:`, rollbackError);
          // Don't throw rollback error, original error is more important
        }
      }

      throw error;
    }
  }

  /**
   * Upload file to Spaces only (without sending message)
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    conversationId: string,
    mediaType: string
  ): Promise<UploadResult> {
    const fileKey = DigitalOceanSpacesService.generateFileKey(
      conversationId,
      fileName,
      mediaType
    );

    return this.spacesService.uploadFile(file, fileKey, contentType, {
      acl: 'public-read',
      metadata: {
        conversationId,
        mediaType,
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Delete file from Spaces
   */
  async deleteFile(fileKey: string): Promise<void> {
    return this.spacesService.deleteFile(fileKey);
  }

  /**
   * Get signed URL for private access
   */
  async getSignedUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    return this.spacesService.getSignedUrl(fileKey, expiresIn);
  }

  /**
   * Get CDN URL for public access
   */
  getCdnUrl(fileKey: string): string {
    return this.spacesService.getCdnUrl(fileKey);
  }

  /**
   * Get direct Spaces URL (without CDN)
   * Use this for media types that need immediate CORS compliance (e.g., audio files)
   */
  getDirectUrl(fileKey: string): string {
    return this.spacesService.getDirectUrl(fileKey);
  }
}