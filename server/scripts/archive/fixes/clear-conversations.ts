import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllConversations() {
  try {
    console.log('🗑️  Deletando TODAS as conversas e mensagens...\n');

    // 1. Deletar todas as mensagens primeiro (por causa da FK)
    const deletedMessages = await prisma.message.deleteMany({});
    console.log(`✅ ${deletedMessages.count} mensagens deletadas`);

    // 2. Deletar todas as conversas
    const deletedConversations = await prisma.$executeRaw`DELETE FROM "conversations"`;
    console.log(`✅ ${deletedConversations} conversas deletadas`);

    console.log('\n🎉 Tudo limpo! Banco zerado.');
    console.log('📝 Novas conversas serão criadas corretamente com a normalização.');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllConversations();
