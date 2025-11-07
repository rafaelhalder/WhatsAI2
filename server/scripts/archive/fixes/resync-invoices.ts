import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover'
});

async function resyncInvoicesFromStripe() {
  console.log('🔄 Ressincronizando invoices do Stripe...\n');

  // Get all subscriptions
  const subscriptions = await prisma.subscription.findMany({
    where: {
      stripeSubscriptionId: {
        not: ''
      }
    }
  });

  console.log(`💳 Encontradas ${subscriptions.length} subscriptions\n`);

  for (const subscription of subscriptions) {
    console.log(`📋 Processando subscription: ${subscription.stripeSubscriptionId}`);
    
    // Get invoices from Stripe
    const stripeInvoices = await stripe.invoices.list({
      subscription: subscription.stripeSubscriptionId!,
      limit: 100
    });

    console.log(`  Encontradas ${stripeInvoices.data.length} invoices no Stripe`);

    for (const invoice of stripeInvoices.data) {
      console.log(`  📄 Invoice ${invoice.number || invoice.id}:`);
      console.log(`     Status: ${invoice.status}`);
      console.log(`     Amount: ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()}`);
      console.log(`     Paid at: ${invoice.status_transitions.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : 'N/A'}`);

      // Upsert invoice
      await prisma.invoice.upsert({
        where: { stripeInvoiceId: invoice.id },
        create: {
          userId: subscription.userId,
          stripeInvoiceId: invoice.id,
          stripeCustomerId: invoice.customer as string,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: invoice.status || 'paid',
          paid: invoice.paid || false,
          paidAt: invoice.status_transitions.paid_at 
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : new Date(),
          invoiceNumber: invoice.number || undefined,
          invoicePdfUrl: invoice.invoice_pdf || undefined,
          hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
          periodStart: invoice.period_start 
            ? new Date(invoice.period_start * 1000)
            : new Date(),
          periodEnd: invoice.period_end 
            ? new Date(invoice.period_end * 1000)
            : new Date(),
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null
        },
        update: {
          amount: invoice.amount_paid / 100,
          status: invoice.status || 'paid',
          paid: invoice.paid || false,
          paidAt: invoice.status_transitions.paid_at 
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : new Date(),
          invoicePdfUrl: invoice.invoice_pdf || undefined,
          hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
          periodStart: invoice.period_start 
            ? new Date(invoice.period_start * 1000)
            : new Date(),
          periodEnd: invoice.period_end 
            ? new Date(invoice.period_end * 1000)
            : new Date()
        }
      });

      console.log(`     ✅ Salva no banco`);
    }
  }

  console.log('\n✅ Ressincronização concluída!');
  await prisma.$disconnect();
}

resyncInvoicesFromStripe()
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
