import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProcessedMedia() {
  console.log('🔍 Checking recently processed media messages...');

  try {
    const messages = await prisma.message.findMany({
      where: {
        mediaUrl: {
          contains: 'digitaloceanspaces.com'
        },
        fromMe: false,
        messageType: 'IMAGE'
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        content: true,
        mediaUrl: true,
        messageType: true,
        updatedAt: true,
        instanceId: true
      }
    });

    console.log(`📋 Found ${messages.length} processed media messages:`);
    console.log('─'.repeat(100));

    for (const msg of messages) {
      console.log(`${msg.updatedAt.toISOString()} - ${msg.messageType} - ${msg.instanceId}`);
      console.log(`   URL: ${msg.mediaUrl}`);
      console.log(`   Content: "${msg.content}"`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error checking messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProcessedMedia();