import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] || '', {
  apiVersion: '2025-10-29.clover'
});

async function saveSubscription() {
  const sub: any = await stripe.subscriptions.retrieve('sub_1SPkHKBIx243ARlEdQPnGqyB');
  
  const periodStart = sub.items.data[0].current_period_start;
  const periodEnd = sub.items.data[0].current_period_end;
  
  const saved = await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    update: {
      status: 'active',
      plan: 'PRO',
      amount: 97,
      currency: 'BRL',
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000)
    },
    create: {
      userId: 'cmh72vo100000dsl5ujmtw9me',
      stripeSubscriptionId: sub.id,
      stripeCustomerId: sub.customer,
      stripePriceId: 'price_1SOMIlBIx243ARlEDcb62AVI',
      status: 'active',
      plan: 'PRO',
      amount: 97,
      currency: 'BRL',
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000)
    }
  });
  
  console.log('\n✅ SUBSCRIPTION SALVA COM SUCESSO!\n');
  console.log(JSON.stringify({
    id: saved.id,
    plan: saved.plan,
    status: saved.status,
    currentPeriodStart: saved.currentPeriodStart,
    currentPeriodEnd: saved.currentPeriodEnd
  }, null, 2));
  
  await prisma.$disconnect();
}

saveSubscription().catch(console.error);
