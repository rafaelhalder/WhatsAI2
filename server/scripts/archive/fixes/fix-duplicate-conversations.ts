// Script para mesclar conversas duplicadas do @lid
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicateConversations() {
  console.log('🔍 Buscando conversas duplicadas do @lid...\n');

  const instanceId = 'cmh3qh1px0001p9qtojm51xhi';

  // Buscar todas as conversas
  const conversations = await prisma.conversation.findMany({
    where: { instanceId },
    include: {
      messages: {
        select: { id: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`📊 Total de conversas: ${conversations.length}\n`);

  // Identificar conversas @lid que precisam ser mescladas
  const lidConversations = conversations.filter(c => 
    !c.remoteJid.includes('@s.whatsapp.net') && 
    !c.remoteJid.includes('@g.us')
  );

  console.log(`🔍 Conversas @lid encontradas: ${lidConversations.length}`);
  lidConversations.forEach(c => {
    console.log(`   - ${c.contactName} (${c.remoteJid}) - ${c.messages.length} mensagens`);
  });

  if (lidConversations.length === 0) {
    console.log('\n✅ Nenhuma conversa @lid duplicada encontrada!');
    return;
  }

  console.log('\n⚠️  CONVERSAS @LID IDENTIFICADAS:');
  console.log('   - 795127463774669 → Deveria ser 554198773200@s.whatsapp.net (Flavia)');
  console.log('\n❌ Para mesclar essas conversas, você precisa:');
  console.log('   1. Fazer deploy do webhook-deploy-CORRETO.zip atualizado');
  console.log('   2. Deletar manualmente a conversa 795127463774669 (sem mensagens importantes)');
  console.log('   3. Novas mensagens da Flavia virão corretamente como 554198773200');
  
  console.log('\n🗑️  COMANDOS PARA DELETAR CONVERSA @LID:');
  
  for (const lidConv of lidConversations) {
    console.log(`\n-- Deletar conversa: ${lidConv.contactName}`);
    console.log(`DELETE FROM "messages" WHERE "conversationId" = '${lidConv.id}';`);
    console.log(`DELETE FROM "conversations" WHERE "id" = '${lidConv.id}';`);
  }

  console.log('\n💡 Ou rode este script com --delete para deletar automaticamente');
}

async function deleteAutomatic() {
  console.log('🗑️  DELETANDO conversas @lid duplicadas...\n');

  const instanceId = 'cmh3qh1px0001p9qtojm51xhi';

  const conversations = await prisma.conversation.findMany({
    where: { instanceId }
  });

  const lidConversations = conversations.filter(c => 
    !c.remoteJid.includes('@s.whatsapp.net') && 
    !c.remoteJid.includes('@g.us')
  );

  for (const conv of lidConversations) {
    console.log(`🗑️  Deletando: ${conv.contactName} (${conv.remoteJid})`);
    
    // Deletar mensagens primeiro
    const deletedMessages = await prisma.message.deleteMany({
      where: { conversationId: conv.id }
    });
    console.log(`   ✅ ${deletedMessages.count} mensagens deletadas`);
    
    // Deletar conversa
    await prisma.conversation.delete({
      where: { id: conv.id }
    });
    console.log(`   ✅ Conversa deletada\n`);
  }

  console.log('✅ Limpeza concluída!');
}

async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.includes('--delete')) {
      await deleteAutomatic();
    } else {
      await fixDuplicateConversations();
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
