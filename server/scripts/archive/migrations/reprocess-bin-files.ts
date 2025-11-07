import { PrismaClient } from '@prisma/client';
import { IncomingMediaService } from '../src/services/incoming-media-service';

const prisma = new PrismaClient();
const incomingMediaService = new IncomingMediaService();

async function reprocessBinFiles() {
  console.log('🔄 Reprocessing .bin files in database...');

  try {
    // Find all messages with .bin extension in mediaUrl
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
        messageId: true,
        instanceId: true
      }
    });

    console.log(`📋 Found ${binMessages.length} messages with .bin files`);

    if (binMessages.length === 0) {
      console.log('✅ No .bin files to reprocess');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const message of binMessages) {
      try {
        console.log(`🔄 Reprocessing message ${message.id} (${message.messageType})`);

        // Extract original media URL from Evolution API
        // For now, we'll try to re-download from the current mediaUrl
        // In a real scenario, we'd need to get the original WhatsApp media URL

        const mediaType = message.messageType.toLowerCase() as 'image' | 'video' | 'audio' | 'sticker' | 'document';

        // For reprocessing, we need the original Evolution API media URL
        // Since we don't have it stored, we'll skip for now and just log
        console.log(`⚠️ Skipping ${message.id} - need original Evolution API media URL for reprocessing`);

        // If we had the original URL, we would do:
        // const newMediaUrl = await incomingMediaService.processIncomingMedia({
        //   messageId: message.messageId,
        //   mediaUrl: originalEvolutionApiUrl, // This is what we need
        //   mediaType,
        //   fileName: message.fileName,
        //   mimeType: 'image/jpeg' // We'd need to detect this
        // });

      } catch (error) {
        console.error(`❌ Error reprocessing message ${message.id}:`, error);
        errorCount++;
      }
    }

    console.log(`📊 Reprocessing complete: ${successCount} success, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ Error in reprocessing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// For now, just identify the files
async function identifyBinFiles() {
  console.log('🔍 Identifying .bin files that need reprocessing...');

  try {
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
        messageId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📋 Found ${binMessages.length} messages with .bin files:`);
    console.log('─'.repeat(100));

    for (const msg of binMessages) {
      console.log(`${msg.createdAt.toISOString()} - ${msg.messageType} - ${msg.id}`);
      console.log(`   URL: ${msg.mediaUrl}`);
      console.log('');
    }

    console.log('💡 To fix these, we need to:');
    console.log('1. Get the original Evolution API media URLs');
    console.log('2. Reprocess with proper MIME type detection');
    console.log('3. Update the database with new CDN URLs');

  } catch (error) {
    console.error('❌ Error identifying files:', error);
  } finally {
    await prisma.$disconnect();
  }
}

identifyBinFiles();