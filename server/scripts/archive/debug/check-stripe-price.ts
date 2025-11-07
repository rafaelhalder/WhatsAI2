import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../.env') });

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] || '', {
  apiVersion: '2025-10-29.clover'
});

async function checkPriceConfig() {
  console.log('\n🔍 VERIFICANDO CONFIGURAÇÃO DO PRICE NO STRIPE\n');

  // Os prices que estão sendo usados
  const priceIds = [
    'price_1SOMIYBIx243ARlEdJ8bSkkh', // STARTER
    'price_1SOMIlBIx243ARlEDcb62AVI', // PRO
    'price_1SOMIsB Ix243ARlEPlCXjCZR', // BUSINESS
  ];

  for (const priceId of priceIds) {
    try {
      const price = await stripe.prices.retrieve(priceId, {
        expand: ['product']
      });

      console.log(`\n📊 Price ID: ${priceId}`);
      console.log(`   Type: ${price.type}`);
      console.log(`   Recurring: ${price.recurring ? 'YES ✅' : 'NO ❌'}`);
      
      if (price.recurring) {
        console.log(`   Interval: ${price.recurring.interval}`);
        console.log(`   Interval Count: ${price.recurring.interval_count}`);
      }
      
      console.log(`   Amount: ${price.unit_amount} ${price.currency.toUpperCase()}`);
      console.log(`   Active: ${price.active ? 'YES' : 'NO'}`);
      
      if (typeof price.product === 'object' && 'name' in price.product) {
        console.log(`   Product: ${price.product.name}`);
      }

      // VERIFICAÇÃO CRÍTICA
      if (price.type !== 'recurring') {
        console.log(`\n❌ PROBLEMA ENCONTRADO!`);
        console.log(`   Este price é do tipo "${price.type}" - deveria ser "recurring"`);
        console.log(`   Isso explica porque não cria subscription!`);
      } else {
        console.log(`   ✅ OK - Este price criará subscription`);
      }
    } catch (error: any) {
      console.error(`\n❌ Erro ao buscar price ${priceId}:`, error.message);
    }
  }

  console.log(`\n\n💡 COMO CORRIGIR:`);
  console.log(`1. Entre no Stripe Dashboard`);
  console.log(`2. Vá em Products > [Seu Produto]`);
  console.log(`3. Verifique se o price é "Recurring" não "One-time"`);
  console.log(`4. Se for One-time, crie um novo price do tipo Recurring`);
  console.log(`5. Atualize os .env com os novos price IDs`);
}

checkPriceConfig().catch(console.error);
