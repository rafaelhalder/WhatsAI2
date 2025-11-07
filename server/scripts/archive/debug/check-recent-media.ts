import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentMediaMessages() {
  console.log('🔍 Checking recent media messages in database...');

  try {
    // Get recent messages with media
    const recentMessages = await prisma.message.findMany({
      where: {
        mediaUrl: {
          not: null
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      select: {
        id: true,
        content: true,
        mediaUrl: true,
        messageType: true,
        fileName: true,
        createdAt: true
      }
    });

    console.log(`📋 Found ${recentMessages.length} recent media messages:`);
    console.log('─'.repeat(100));

    for (const msg of recentMessages) {
      const isSpacesUrl = msg.mediaUrl?.includes('digitaloceanspaces.com');
      const fileExtension = msg.mediaUrl ? msg.mediaUrl.split('.').pop()?.split('?')[0] : 'none';
      const hasBinExtension = fileExtension === 'bin';

      const status = hasBinExtension ? '❌ .bin' : (isSpacesUrl ? '✅ Spaces' : '⚠️ Other');

      console.log(`${status} ${msg.createdAt.toISOString()} - ${msg.messageType} - ${msg.fileName || 'no-filename'}`);
      console.log(`   URL: ${msg.mediaUrl?.substring(0, 80)}...`);
      console.log(`   Extension: .${fileExtension}`);
      console.log('');
    }

    // Count .bin files
    const binFiles = recentMessages.filter(msg => {
      const fileExtension = msg.mediaUrl ? msg.mediaUrl.split('.').pop()?.split('?')[0] : 'none';
      return fileExtension === 'bin';
    });

    console.log(`📊 Summary: ${binFiles.length} .bin files out of ${recentMessages.length} total media messages`);

  } catch (error) {
    console.error('❌ Error checking messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentMediaMessages();