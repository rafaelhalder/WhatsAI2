/**
 * Script para unificar conversas duplicadas da Flávia Araújo
 * @lid: 79512746377469@lid
 * Real: 5541998773200@s.whatsapp.net
 */

import { mergeConversations } from './src/utils/conversation-merger';

async function main() {
  try {
    console.log('🚀 Iniciando unificação de conversas da Flávia Araújo...\n');

    const result = await mergeConversations(
      '79512746377469@lid',
      '5541998773200@s.whatsapp.net'
    );

    console.log('\n📋 Resultado:');
    console.log(JSON.stringify(result, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao unificar conversas:', error);
    process.exit(1);
  }
}

main();
