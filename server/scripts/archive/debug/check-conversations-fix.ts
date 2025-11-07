const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkConversations() {
  try {
    // Verificar conversa com contactName '554191188909'
    const conv1 = await prisma.conversation.findFirst({
      where: { contactName: '554191188909' }
    });
    console.log('Conversa 554191188909:', conv1?.remoteJid);

    // Verificar conversa com contactName '554198773200'
    const conv2 = await prisma.conversation.findFirst({
      where: { contactName: '554198773200' }
    });
    console.log('Conversa 554198773200:', conv2?.remoteJid);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConversations();