/**
 * Verificar se as conversas da Flávia Araújo têm a mesma foto de perfil
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 VERIFICANDO FOTO DE PERFIL - Flávia Araújo\n');

  // Buscar conversa @lid
  const lidConv = await prisma.conversation.findFirst({
    where: { remoteJid: '79512746377469@lid' },
    select: {
      id: true,
      remoteJid: true,
      contactName: true,
      contactPicture: true,
      _count: { select: { messages: true } }
    }
  });

  // Buscar conversa com número real
  const realConv = await prisma.conversation.findFirst({
    where: { remoteJid: '5541998773200@s.whatsapp.net' },
    select: {
      id: true,
      remoteJid: true,
      contactName: true,
      contactPicture: true,
      _count: { select: { messages: true } }
    }
  });

  if (!lidConv) {
    console.log('❌ Conversa @lid não encontrada');
  } else {
    console.log('📱 CONVERSA @LID:');
    console.log(`   ID: ${lidConv.id}`);
    console.log(`   RemoteJid: ${lidConv.remoteJid}`);
    console.log(`   Nome: ${lidConv.contactName || 'SEM NOME'}`);
    console.log(`   Foto: ${lidConv.contactPicture || 'SEM FOTO'}`);
    console.log(`   Mensagens: ${lidConv._count.messages}`);
  }

  console.log('');

  if (!realConv) {
    console.log('❌ Conversa com número real não encontrada');
  } else {
    console.log('📱 CONVERSA NÚMERO REAL:');
    console.log(`   ID: ${realConv.id}`);
    console.log(`   RemoteJid: ${realConv.remoteJid}`);
    console.log(`   Nome: ${realConv.contactName || 'SEM NOME'}`);
    console.log(`   Foto: ${realConv.contactPicture || 'SEM FOTO'}`);
    console.log(`   Mensagens: ${realConv._count.messages}`);
  }

  console.log('\n🔍 ANÁLISE:');

  if (!lidConv || !realConv) {
    console.log('⚠️ Uma ou ambas conversas não existem');
    return;
  }

  if (!lidConv.contactPicture && !realConv.contactPicture) {
    console.log('❌ Nenhuma das conversas tem foto de perfil');
    console.log('💡 Precisamos aguardar a Evolution API enviar a foto via webhook contacts.update');
    return;
  }

  if (lidConv.contactPicture === realConv.contactPicture) {
    console.log('✅ AS FOTOS SÃO IDÊNTICAS!');
    console.log('🎯 Podemos usar isso para identificar duplicatas automaticamente');
    console.log(`\n📸 URL da foto: ${lidConv.contactPicture}`);
    console.log('\n🚀 Execute para unificar:');
    console.log('   npx tsx merge-flavia-conversations.ts');
  } else {
    console.log('⚠️ As fotos são diferentes:');
    console.log(`   @lid: ${lidConv.contactPicture?.substring(0, 80)}...`);
    console.log(`   Real: ${realConv.contactPicture?.substring(0, 80)}...`);
    
    if (!lidConv.contactPicture) {
      console.log('\n💡 Conversa @lid não tem foto. Aguardar webhook contacts.update');
    }
    if (!realConv.contactPicture) {
      console.log('\n💡 Conversa real não tem foto. Aguardar webhook contacts.update');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
