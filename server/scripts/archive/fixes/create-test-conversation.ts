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

async function createTestConversation() {
  // Criar uma conversa de teste que corresponda ao @lid que estamos testando
  const testConv = await prisma.conversation.create({
    data: {
      instanceId: 'cmh73gobi0001vr6waqem8syp', // instance existente
      remoteJid: '554198773200@s.whatsapp.net', // número real correspondente ao @lid
      contactName: 'Contato Original',
      isGroup: false,
      lastMessage: 'Mensagem de teste',
      lastMessageAt: new Date(),
      unreadCount: 0
    }
  });

  console.log('✅ Conversa de teste criada:');
  console.log({
    id: testConv.id,
    remoteJid: testConv.remoteJid,
    contactName: testConv.contactName
  });

  await prisma.$disconnect();
}

createTestConversation().catch(console.error);