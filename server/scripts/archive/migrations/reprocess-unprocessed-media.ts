import { PrismaClient } from '@prisma/client';
import { IncomingMediaService } from '../src/services/incoming-media-service';

const prisma = new PrismaClient();
const incomingMediaService = new IncomingMediaService();

async function reprocessUnprocessedMedia() {
  console.log('🔄 Reprocessing messages with unprocessed WhatsApp URLs...');

  try {
    const messages = await prisma.message.findMany({
      where: {
        mediaUrl: {
          contains: 'mmg.whatsapp.net'
        },
        fromMe: false // Only received messages
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`📋 Found ${messages.length} messages to reprocess:`);
    console.log('─'.repeat(100));

    for (const msg of messages) {
      console.log(`🔄 Reprocessing message ${msg.id} (${msg.messageType})`);
      console.log(`   Original URL: ${msg.mediaUrl?.substring(0, 100)}...`);

      try {
        const processedUrl = await incomingMediaService.processIncomingMedia({
          messageId: msg.id,
          mediaUrl: msg.mediaUrl!,
          mediaType: msg.messageType.toLowerCase() as 'image' | 'video' | 'audio' | 'sticker' | 'document'
        });

        if (processedUrl) {
          await prisma.message.update({
            where: { id: msg.id },
            data: { mediaUrl: processedUrl }
          });

          console.log(`✅ Successfully reprocessed: ${processedUrl}`);
        } else {
          console.log(`⚠️ No processed URL returned for message ${msg.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to reprocess message ${msg.id}:`, error);
      }

      console.log('');
    }

  } catch (error) {
    console.error('❌ Error reprocessing messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reprocessUnprocessedMedia();