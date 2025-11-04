import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestPayment() {
  try {
    // Buscar última invoice
    const invoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, plan: true } } }
    });

    console.log('\n📋 ÚLTIMA INVOICE:');
    console.log(JSON.stringify(invoice, null, 2));

    // Buscar última subscription
    const subscription = await prisma.subscription.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, plan: true } } }
    });

    console.log('\n💳 ÚLTIMA SUBSCRIPTION:');
    console.log(JSON.stringify(subscription, null, 2));

    // Buscar usuário
    if (invoice?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: invoice.userId },
        select: { id: true, name: true, email: true, plan: true }
      });

      console.log('\n👤 DADOS DO USUÁRIO:');
      console.log(JSON.stringify(user, null, 2));
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestPayment();
