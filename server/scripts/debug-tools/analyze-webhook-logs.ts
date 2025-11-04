/**
 * Script para analisar webhooks salvos e identificar padrões @lid
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 ANÁLISE DE WEBHOOKS SALVOS\n');

  // 1. Contar total de webhooks
  const totalWebhooks = await prisma.webhookLog.count();
  console.log(`📨 Total de webhooks salvos: ${totalWebhooks}`);

  // 2. Contar webhooks com @lid
  const webhooksComLid = await prisma.webhookLog.count({
    where: { hasLid: true }
  });
  console.log(`🗺️ Webhooks com @lid: ${webhooksComLid}`);

  // 3. Contar webhooks com campos Alt
  const webhooksComAlt = await prisma.webhookLog.count({
    where: { hasAltField: true }
  });
  console.log(`✅ Webhooks com campos Alt: ${webhooksComAlt}\n`);

  // 4. Listar webhooks com @lid
  if (webhooksComLid > 0) {
    console.log('🔍 DETALHES DOS WEBHOOKS COM @LID:\n');
    
    const logsComLid = await prisma.webhookLog.findMany({
      where: { hasLid: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    logsComLid.forEach((log, i) => {
      console.log(`${i + 1}. Webhook ID: ${log.id}`);
      console.log(`   Event: ${log.event}`);
      console.log(`   Data: ${log.createdAt.toISOString()}`);
      console.log(`   remoteJid: ${log.remoteJid}`);
      console.log(`   remoteJidAlt: ${log.remoteJidAlt || '❌ NÃO TEM'}`);
      console.log(`   participant: ${log.participant}`);
      console.log(`   participantAlt: ${log.participantAlt || '❌ NÃO TEM'}`);
      console.log(`   hasAltField: ${log.hasAltField ? '✅ SIM' : '❌ NÃO'}`);
      console.log('');
    });
  }

  // 5. Mostrar exemplo de webhook completo
  const exemploWebhook = await prisma.webhookLog.findFirst({
    where: { hasLid: true },
    orderBy: { createdAt: 'desc' }
  });

  if (exemploWebhook) {
    console.log('📋 EXEMPLO DE WEBHOOK COMPLETO COM @LID:');
    console.log(JSON.stringify(exemploWebhook.rawData, null, 2));
  }

  // 6. Análise de padrões
  console.log('\n📈 ANÁLISE DE PADRÕES:\n');
  
  const grupoAnalise = await prisma.webhookLog.groupBy({
    by: ['event', 'hasLid', 'hasAltField'],
    _count: true,
    orderBy: { _count: { _all: 'desc' } }
  });

  console.log('Distribuição por tipo:');
  grupoAnalise.forEach((item) => {
    console.log(`  ${item.event} | @lid: ${item.hasLid} | Alt: ${item.hasAltField} | Count: ${item._count}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
