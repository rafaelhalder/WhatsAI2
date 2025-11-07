import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUnprocessedMedia() {
  console.log('🔍 Checking messages with unprocessed WhatsApp URLs...');

  try {
    const messages = await prisma.message.findMany({
      where: {
        mediaUrl: {
          contains: 'mmg.whatsapp.net'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        content: true,
        mediaUrl: true,
        messageType: true,
        createdAt: true,
        instanceId: true,
        fromMe: true
      }
    });

    console.log(`📋 Found ${messages.length} messages with unprocessed WhatsApp URLs:`);
    console.log('─'.repeat(100));

    for (const msg of messages) {
      console.log(`${msg.createdAt.toISOString()} - ${msg.messageType} - ${msg.instanceId} - fromMe: ${msg.fromMe}`);
      console.log(`   URL: ${msg.mediaUrl?.substring(0, 100)}...`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error checking messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUnprocessedMedia();