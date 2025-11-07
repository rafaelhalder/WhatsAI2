import { PrismaClient } from '@prisma/client';
import { DigitalOceanSpacesService } from '../src/services/digitalocean-spaces';
import { fileTypeFromBuffer } from 'file-type';
import axios from 'axios';

const prisma = new PrismaClient();

async function fixBinFiles() {
  console.log('🔧 Fixing .bin files by detecting correct MIME types...');

  // Initialize Spaces service
  const spacesService = new DigitalOceanSpacesService({
    accessKeyId: 'DO002UXFZ74XBDVPVJJC',
    secretAccessKey: 'GnqIjCjypNgL9ozPKe/TNwGBPtFkPTt0qq1EzJ/ttcM',
    bucket: 'whatsais3',
    region: 'sfo3',
    endpoint: 'https://sfo3.digitaloceanspaces.com'
  });

  try {
    // Find all messages with .bin extension
    const binMessages = await prisma.message.findMany({
      where: {
        mediaUrl: {
          contains: '.bin'
        }
      },
      select: {
        id: true,
        mediaUrl: true,
        messageType: true,
        fileName: true,
        messageId: true
      }
    });

    console.log(`📋 Found ${binMessages.length} messages with .bin files`);

    let successCount = 0;
    let errorCount = 0;

    for (const message of binMessages) {
      try {
        console.log(`🔄 Processing message ${message.id} (${message.messageType})`);

        // Download the .bin file
        if (!message.mediaUrl) {
          console.log(`⚠️ No mediaUrl for message ${message.id}, skipping`);
          errorCount++;
          continue;
        }

        console.log(`📥 Downloading: ${message.mediaUrl}`);
        const response = await axios.get(message.mediaUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        const buffer = Buffer.from(response.data);
        console.log(`✅ Downloaded ${buffer.length} bytes`);

        // Detect file type
        let fileType = await fileTypeFromBuffer(buffer);

        // If file-type can't detect, assume JPEG for images and MP4 for videos
        if (!fileType) {
          console.log(`⚠️ Could not detect file type, assuming based on messageType: ${message.messageType}`);
          if (message.messageType === 'IMAGE') {
            fileType = { mime: 'image/jpeg', ext: 'jpg' };
          } else if (message.messageType === 'VIDEO') {
            fileType = { mime: 'video/mp4', ext: 'mp4' };
          } else if (message.messageType === 'AUDIO') {
            fileType = { mime: 'audio/mp3', ext: 'mp3' };
          } else {
            console.log(`⚠️ Unknown messageType ${message.messageType} for ${message.id}, skipping`);
            errorCount++;
            continue;
          }
        }

        console.log(`🔍 Using MIME type: ${fileType.mime}, extension: .${fileType.ext}`);

        // Generate new filename with correct extension
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const mediaType = message.messageType.toLowerCase();
        const baseName = message.fileName ? message.fileName.split('.')[0] : `${mediaType}_${message.messageId}_${randomId}`;
        const newFileName = `${baseName}_${timestamp}.${fileType.ext}`;

        // Upload with correct extension
        const newKey = `incoming/${mediaType}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${newFileName}`;

        console.log(`📤 Re-uploading as: ${newKey}`);
        const uploadResult = await spacesService.uploadFile(
          buffer,
          newKey,
          fileType.mime,
          {
            acl: 'public-read',
            metadata: {
              mediaType,
              originalName: newFileName,
              correctedFrom: message.mediaUrl.split('/').pop() || 'unknown',
              uploadedAt: new Date().toISOString(),
              source: 'bin-file-correction'
            }
          }
        );

        const newCdnUrl = spacesService.getCdnUrl(uploadResult.key);
        console.log(`✅ New CDN URL: ${newCdnUrl}`);

        // Update database
        await prisma.message.update({
          where: { id: message.id },
          data: { mediaUrl: newCdnUrl }
        });

        // Delete old .bin file
        const oldKey = message.mediaUrl.split('whatsais3.sfo3.cdn.digitaloceanspaces.com/')[1];
        if (oldKey) {
          console.log(`🗑️ Deleting old file: ${oldKey}`);
          await spacesService.deleteFile(oldKey);
        }

        console.log(`✅ Successfully fixed message ${message.id}`);
        successCount++;

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error processing message ${message.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📊 Fix complete: ${successCount} success, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ Error in fix process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBinFiles();