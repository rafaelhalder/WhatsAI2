import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestStickers() {
  const stickers = await prisma.message.findMany({
    where: {
      conversationId: 'cmhdp2zzg0029wu5wmof2mxsi',
      messageType: 'STICKER'
    },
    orderBy: { timestamp: 'desc' },
    take: 5
  });

  console.log('📦 Últimos 5 stickers:\n');
  stickers.forEach((s, i) => {
    console.log(`${i + 1}. ${s.messageId}`);
    console.log(`   Timestamp: ${s.timestamp}`);
    console.log(`   Media URL: ${s.mediaUrl?.substring(0, 80)}...`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkLatestStickers();
