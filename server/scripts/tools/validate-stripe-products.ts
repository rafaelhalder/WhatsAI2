/**
 * Script para validar produtos Stripe
 * Verifica se os Product IDs configurados existem e estão corretos
 */

import Stripe from 'stripe';
import 'dotenv/config';

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
  apiVersion: '2025-10-29.clover',
});

async function validateProducts() {
  console.log('🔍 Validando produtos Stripe...\n');

  const productIds = [
    { name: 'STARTER', id: process.env['STRIPE_PRODUCT_STARTER'] },
    { name: 'PRO', id: process.env['STRIPE_PRODUCT_PRO'] },
    { name: 'BUSINESS', id: process.env['STRIPE_PRODUCT_BUSINESS'] },
  ];

  for (const { name, id } of productIds) {
    if (!id) {
      console.log(`❌ ${name}: Produto não configurado no .env`);
      continue;
    }

    try {
      const product = await stripe.products.retrieve(id);
      console.log(`✅ ${name}:`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Nome: ${product.name}`);
      console.log(`   Ativo: ${product.active ? 'Sim' : 'Não'}`);

      // Buscar prices associados
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      if (prices.data.length > 0) {
        console.log(`   Preços:`);
        prices.data.forEach((price) => {
          const amount = price.unit_amount ? price.unit_amount / 100 : 0;
          const currency = price.currency.toUpperCase();
          const interval = price.recurring?.interval || 'one-time';
          console.log(`     - ${currency} ${amount} (${interval})`);
          console.log(`       Price ID: ${price.id}`);
        });
      } else {
        console.log(`   ⚠️ Nenhum preço ativo encontrado`);
      }
      console.log('');
    } catch (error: any) {
      console.log(`❌ ${name}: Erro ao buscar produto`);
      if (error.type === 'StripeInvalidRequestError') {
        console.log(`   Motivo: Produto '${id}' não encontrado no Stripe`);
      } else {
        console.log(`   Erro: ${error.message}`);
      }
      console.log('');
    }
  }

  // Listar todos os produtos
  console.log('\n📋 Listando todos os produtos na conta Stripe:\n');
  try {
    const allProducts = await stripe.products.list({ limit: 10, active: true });
    
    if (allProducts.data.length === 0) {
      console.log('❌ Nenhum produto encontrado na conta Stripe');
      console.log('   Você precisa criar os produtos manualmente no dashboard:');
      console.log('   https://dashboard.stripe.com/test/products\n');
    } else {
      allProducts.data.forEach((product) => {
        console.log(`📦 ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Ativo: ${product.active ? 'Sim' : 'Não'}`);
        console.log('');
      });
    }
  } catch (error: any) {
    console.log(`❌ Erro ao listar produtos: ${error.message}\n`);
  }

  console.log('✅ Validação concluída!\n');
}

validateProducts().catch(console.error);
