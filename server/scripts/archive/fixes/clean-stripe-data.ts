import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanStripeData() {
  try {
    console.log('🧹 Limpando dados antigos do Stripe...\n');

    // Buscar dados antes de deletar
    const invoices = await prisma.invoice.findMany({});
    const subscriptions = await prisma.subscription.findMany({});
    
    console.log(`📋 Encontradas ${invoices.length} invoices`);
    console.log(`💳 Encontradas ${subscriptions.length} subscriptions`);

    // Deletar invoices
    const deletedInvoices = await prisma.invoice.deleteMany({});
    console.log(`✅ ${deletedInvoices.count} invoices deletadas`);

    // Deletar subscriptions
    const deletedSubscriptions = await prisma.subscription.deleteMany({});
    console.log(`✅ ${deletedSubscriptions.count} subscriptions deletadas`);

    // Resetar plano dos usuários para FREE
    const updatedUsers = await prisma.user.updateMany({
      data: {
        plan: 'FREE',
      },
    });
    console.log(`✅ ${updatedUsers.count} usuários resetados para plano FREE`);

    console.log('\n✨ Limpeza concluída! Agora você pode fazer um novo pagamento.');
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanStripeData();
