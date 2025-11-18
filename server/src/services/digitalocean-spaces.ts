import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

export interface SpacesConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint: string;
}

export interface UploadResult {
  key: string;
  url: string;
  signedUrl: string;
  bucket: string;
  size: number;
  contentType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class DigitalOceanSpacesService {
  private s3Client: S3Client;
  private config: SpacesConfig;

  constructor(config: SpacesConfig) {
    this.config = config;
    this.s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: false, // Important for DigitalOcean Spaces
    });
  }

  /**
   * Sanitiza metadados para serem compatíveis com headers HTTP S3
   * Remove caracteres inválidos que causam erro em headers
   */
  private sanitizeMetadata(metadata?: Record<string, string>): Record<string, string> {
    if (!metadata) return {};
    
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Remove caracteres não-ASCII e controle
      // S3 headers só aceitam ASCII imprimível (32-126)
      const cleanValue = value
        .replace(/[^\x20-\x7E]/g, '') // Remove não-ASCII
        .replace(/[\r\n\t]/g, ' ')    // Remove quebras de linha
        .trim();
      
      if (cleanValue) {
        sanitized[key] = cleanValue;
      }
    }
    
    return sanitized;
  }

  /**
   * Upload file to DigitalOcean Spaces
   */
  async uploadFile(
    fileBuffer: Buffer | Uint8Array | Readable,
    key: string,
    contentType: string,
    options: {
      onProgress?: (progress: UploadProgress) => void;
      metadata?: Record<string, string>;
      acl?: 'private' | 'public-read';
    } = {}
  ): Promise<UploadResult> {
    try {
      console.log(`📤 [Spaces] Uploading ${key} (${contentType})`);

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.config.bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
          ACL: options.acl || 'public-read', // Make files publicly accessible
          Metadata: this.sanitizeMetadata(options.metadata), // Sanitiza metadados
          // CDN optimization headers
          CacheControl: 'max-age=31536000', // 1 year cache
          ContentDisposition: 'inline', // Display in browser instead of download
        },
      });

      // Progress tracking
      if (options.onProgress) {
        upload.on('httpUploadProgress', (progress) => {
          if (progress.loaded && progress.total) {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            options.onProgress!({
              loaded: progress.loaded,
              total: progress.total,
              percentage,
            });
          }
        });
      }

      const result = await upload.done();

      if (!result.Location) {
        throw new Error('Upload completed but no location returned');
      }

      // Generate signed URL for private access (if needed)
      const signedUrl = await this.getSignedUrl(key, 3600); // 1 hour expiry

      const uploadResult: UploadResult = {
        key,
        url: result.Location,
        signedUrl,
        bucket: this.config.bucket,
        size: Buffer.isBuffer(fileBuffer) ? fileBuffer.length : 0, // Calculate size from buffer
        contentType,
      };

      return uploadResult;

    } catch (error) {
      console.error(`❌ [Spaces] Upload failed for ${key}:`, error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate signed URL for private file access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      console.error(`❌ [Spaces] Failed to generate signed URL for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete file from Spaces
   */
  async deleteFile(key: string): Promise<void> {
    try {

      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

    } catch (error) {
      console.error(`❌ [Spaces] Failed to delete ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Download file from Spaces (returns Buffer)
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No file content returned');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error(`❌ [Spaces] Failed to download ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get file info (size, last modified, etc)
   */
  async getFileInfo(key: string): Promise<{ size: number; modified: Date } | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      return {
        size: response.ContentLength || 0,
        modified: response.LastModified || new Date()
      };
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      console.error(`❌ [Spaces] Failed to get file info for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Generate unique file key
   */
  static generateFileKey(
    conversationId: string,
    fileName: string,
    mediaType: string,
    timestamp: Date = new Date()
  ): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const timestampStr = timestamp.getTime();
    const randomId = Math.random().toString(36).substring(2, 15);

    return `conversations/${conversationId}/${mediaType}/${timestampStr}_${randomId}.${extension}`;
  }

  /**
   * Get CDN URL for the file
   */
  getCdnUrl(key: string): string {
    // DigitalOcean Spaces CDN URL format
    return `https://${this.config.bucket}.${this.config.region}.cdn.digitaloceanspaces.com/${key}`;
  }

  /**
   * Get direct Spaces URL (without CDN) - useful when CDN cache causes issues
   * This URL directly hits the Spaces origin and respects CORS configuration immediately
   */
  getDirectUrl(key: string): string {
    // Direct DigitalOcean Spaces URL (bypasses CDN)
    return `https://${this.config.bucket}.${this.config.region}.digitaloceanspaces.com/${key}`;
  }
}