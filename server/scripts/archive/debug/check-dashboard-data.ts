import { prisma } from '../src/database/prisma';

async function checkData() {
  try {
    const userCount = await prisma.user.count();
    const instanceCount = await prisma.whatsAppInstance.count();
    const messageCount = await prisma.message.count();
    const conversationCount = await prisma.conversation.count();

    console.log('📊 Dados no Banco de Dados:');
    console.log(`   Usuários: ${userCount}`);
    console.log(`   Instâncias: ${instanceCount}`);
    console.log(`   Mensagens: ${messageCount}`);
    console.log(`   Conversas: ${conversationCount}`);
    console.log('');

    if (userCount === 0) {
      console.log('⚠️  Nenhum usuário encontrado no banco');
      console.log('💡 Crie um usuário para testar o dashboard');
    } else {
      const user = await prisma.user.findFirst();
      console.log(`✅ Usuário disponível: ${user?.email}`);
      console.log('✅ Dashboard pronto para testes!');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
