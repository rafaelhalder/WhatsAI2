import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function checkLidContact() {
  // Verificar se existe conversa com o número real
  const conversations = await prisma.conversation.findMany({
    where: {
      remoteJid: '554198773200@s.whatsapp.net'
    }
  });

  console.log('📋 Conversa encontrada para 554198773200@s.whatsapp.net:');
  console.log(conversations.map(c => ({
    id: c.id,
    remoteJid: c.remoteJid,
    contactName: c.contactName,
    isGroup: c.isGroup
  })));

  // Verificar todas as conversas que contenham "554198773200"
  const allRelated = await prisma.conversation.findMany({
    where: {
      remoteJid: { contains: '554198773200' }
    }
  });

  console.log('\n📋 Todas as conversas relacionadas:');
  console.log(allRelated.map(c => ({
    id: c.id,
    remoteJid: c.remoteJid,
    contactName: c.contactName
  })));

  await prisma.$disconnect();
}

checkLidContact().catch(console.error);