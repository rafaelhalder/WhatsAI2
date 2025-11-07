import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSubscriptionIssue() {
  console.log('\n🔍 VERIFICANDO PROBLEMA COM SUBSCRIPTION...\n');

  // Verificar usuário
  const user = await prisma.user.findFirst({
    where: {
      email: 'rafaelhalder4@gmail.com'
    }
  });

  if (!user) {
    console.log('❌ Usuário não encontrado');
    return;
  }

  console.log('👤 Usuário encontrado:', {
    id: user.id,
    email: user.email,
    plan: user.plan,
    stripeCustomerId: user.stripeCustomerId
  });

  // Verificar subscription no banco
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log('\n💳 Subscription no banco:', subscription || 'NULL - Não foi salva!');

  // Verificar invoice
  const invoice = await prisma.invoice.findFirst({
    where: {
      userId: user.id
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log('\n📋 Invoice no banco:', invoice ? {
    id: invoice.id,
    stripeInvoiceId: invoice.stripeInvoiceId,
    amount: invoice.amount,
    paidAt: invoice.paidAt
  } : 'NULL');

  // Buscar o subscriptionId da invoice no Stripe
  if (invoice?.stripeInvoiceId) {
    const stripe = require('stripe')(process.env['STRIPE_SECRET_KEY']);
    
    console.log('\n🔍 Buscando invoice no Stripe:', invoice.stripeInvoiceId);
    
    try {
      const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId);
      
      console.log('\n📄 Invoice do Stripe:', {
        id: stripeInvoice.id,
        subscription: stripeInvoice.subscription,
        customer: stripeInvoice.customer,
        amount_paid: stripeInvoice.amount_paid,
        status: stripeInvoice.status
      });

      if (stripeInvoice.subscription) {
        console.log('\n🔍 Buscando subscription no Stripe:', stripeInvoice.subscription);
        
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeInvoice.subscription);
        
        console.log('\n💳 Subscription do Stripe:', {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          customer: stripeSubscription.customer,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          metadata: stripeSubscription.metadata,
          items: stripeSubscription.items.data.map((item: any) => ({
            price: item.price.id,
            product: item.price.product
          }))
        });

        console.log('\n⚠️ PROBLEMA IDENTIFICADO:');
        console.log('✅ Subscription EXISTE no Stripe');
        console.log('❌ Subscription NÃO FOI SALVA no banco de dados');
        console.log('\nPossíveis causas:');
        console.log('1. Erro no handleSubscriptionChanged() - verificar metadata.userId');
        console.log('2. Erro na conversão de dados');
        console.log('3. Erro no upsert do Prisma');
        console.log('\n📝 Metadata da subscription:', stripeSubscription.metadata);
      }
    } catch (error: any) {
      console.error('\n❌ Erro ao buscar no Stripe:', error.message);
    }
  }

  await prisma.$disconnect();
}

checkSubscriptionIssue().catch(console.error);
