import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] || '', {
  apiVersion: '2025-10-29.clover'
});

async function investigatePayment() {
  console.log('\n🔍 INVESTIGANDO O PAGAMENTO DE TESTE\n');

  const invoice = await prisma.invoice.findFirst({
    where: { userId: 'cmh72vo100000dsl5ujmtw9me' },
    orderBy: { createdAt: 'desc' }
  });

  if (!invoice) {
    console.log('❌ Nenhuma invoice encontrada');
    return;
  }

  console.log('📋 Invoice no banco:', {
    id: invoice.stripeInvoiceId,
    amount: invoice.amount
  });

  const stripeInvoice: any = await stripe.invoices.retrieve(invoice.stripeInvoiceId, {
    expand: ['lines.data.price']
  });

  console.log('\n📄 Invoice completa do Stripe:', {
    id: stripeInvoice.id,
    subscription: stripeInvoice.subscription || '❌ NULL - NÃO TEM SUBSCRIPTION!',
    billing_reason: stripeInvoice.billing_reason,
    amount_paid: stripeInvoice.amount_paid,
    status: stripeInvoice.status
  });

  console.log('\n📦 Line items:');
  stripeInvoice.lines.data.forEach((line: any, idx: number) => {
    console.log(`\n  Item ${idx + 1}:`);
    console.log(`    Description: ${line.description}`);
    console.log(`    Amount: ${line.amount} ${line.currency}`);
    
    if (line.price && typeof line.price === 'object') {
      console.log(`    Price ID: ${line.price.id}`);
      console.log(`    Price Type: ${line.price.type}`);
      console.log(`    Recurring: ${line.price.recurring ? 'YES' : 'NO'}`);
      
      if (line.price.recurring) {
        console.log(`    Interval: ${line.price.recurring.interval}`);
      }
    }
  });

  // Verificar se há session de checkout
  const sessions = await stripe.checkout.sessions.list({
    customer: invoice.stripeCustomerId,
    limit: 5
  });

  console.log(`\n\n💳 CHECKOUT SESSIONS (últimas 5):`);
  for (const session of sessions.data) {
    console.log(`\n  Session ID: ${session.id}`);
    console.log(`  Mode: ${session.mode} ${session.mode === 'payment' ? '❌ PAYMENT (one-time)' : '✅ SUBSCRIPTION'}`);
    console.log(`  Status: ${session.status}`);
    console.log(`  Subscription: ${session.subscription || 'NULL'}`);
    console.log(`  Invoice: ${session.invoice || 'NULL'}`);
    console.log(`  Created: ${new Date(session.created * 1000).toISOString()}`);

    if (session.invoice === invoice.stripeInvoiceId) {
      console.log(`\n  🎯 ENCONTRADA! Esta session criou a invoice:`);
      console.log(`     Mode: ${session.mode}`);
      console.log(`\n  ❌ PROBLEMA IDENTIFICADO!`);
      console.log(`     A session foi criada com mode="${session.mode}"`);
      console.log(`     Mas deveria ser mode="subscription"`);
    }
  }

  await prisma.$disconnect();
}

investigatePayment().catch(console.error);
