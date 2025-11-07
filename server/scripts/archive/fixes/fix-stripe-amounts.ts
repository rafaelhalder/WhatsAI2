import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixStripeAmounts() {
  console.log('🔧 Corrigindo valores do Stripe (convertendo centavos para reais)...\n');

  // Fix Invoices - valores estão multiplicados por 100
  const invoices = await prisma.invoice.findMany({
    where: {
      amount: {
        gt: 100 // Valores maiores que R$ 100 provavelmente estão em centavos
      }
    }
  });

  console.log(`📄 Encontradas ${invoices.length} invoices para corrigir`);
  
  for (const invoice of invoices) {
    const correctedAmount = invoice.amount / 100;
    console.log(`  Invoice ${invoice.invoiceNumber}: R$ ${invoice.amount} → R$ ${correctedAmount}`);
    
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { amount: correctedAmount }
    });
  }

  // Fix Subscriptions - valores estão multiplicados por 100
  const subscriptions = await prisma.subscription.findMany({
    where: {
      amount: {
        gt: 100 // Valores maiores que R$ 100 provavelmente estão em centavos
      }
    }
  });

  console.log(`\n💳 Encontradas ${subscriptions.length} subscriptions para corrigir`);
  
  for (const subscription of subscriptions) {
    const correctedAmount = subscription.amount / 100;
    console.log(`  Subscription ${subscription.id}: R$ ${subscription.amount} → R$ ${correctedAmount}`);
    
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { amount: correctedAmount }
    });
  }

  console.log('\n✅ Correção concluída!');
  await prisma.$disconnect();
}

fixStripeAmounts()
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
