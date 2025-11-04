import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInvoices() {
  try {
    const count = await prisma.invoice.count();
    console.log('\n📊 Total de invoices no banco:', count);

    const invoices = await prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        amount: true,
        status: true,
        paid: true,
        createdAt: true,
        invoiceNumber: true
      }
    });

    console.log('\n📋 Últimas 5 invoices:');
    invoices.forEach((inv, i) => {
      console.log(`\n${i + 1}. Invoice ${inv.invoiceNumber || 'sem número'}`);
      console.log(`   User ID: ${inv.userId}`);
      console.log(`   Valor: R$ ${inv.amount.toFixed(2)}`);
      console.log(`   Status: ${inv.status}`);
      console.log(`   Pago: ${inv.paid ? 'Sim' : 'Não'}`);
      console.log(`   Data: ${inv.createdAt}`);
    });

    const subscriptions = await prisma.subscription.count();
    console.log(`\n💳 Total de subscriptions no banco: ${subscriptions}`);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoices();
