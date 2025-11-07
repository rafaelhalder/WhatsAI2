import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para mesclar conversas duplicadas
 * Identifica conversas com números parecidos e mescla em uma só
 */

async function mergeConversations(keepId: string, deleteId: string) {
  console.log(`\n🔄 Mesclando conversas:`);
  console.log(`   ✅ Manter: ${keepId}`);
  console.log(`   ❌ Deletar: ${deleteId}`);

  // 1. Mover todas as mensagens da conversa a ser deletada para a que será mantida
  const movedMessages = await prisma.message.updateMany({
    where: { conversationId: deleteId },
    data: { conversationId: keepId }
  });

  console.log(`   📨 ${movedMessages.count} mensagens movidas`);

  // 2. Atualizar informações da conversa mantida com dados mais recentes
  const keepConv = await prisma.conversation.findUnique({
    where: { id: keepId },
    include: { messages: { orderBy: { timestamp: 'desc' }, take: 1 } }
  });

  const deleteConv = await prisma.conversation.findUnique({
    where: { id: deleteId },
    include: { messages: { orderBy: { timestamp: 'desc' }, take: 1 } }
  });

  if (keepConv && deleteConv) {
    // Usar a última mensagem mais recente entre as duas
    const deleteLastMsg = deleteConv.messages[0];
    const keepLastMsg = keepConv.messages[0];
    
    const lastMessage = 
      (deleteLastMsg && keepLastMsg && deleteLastMsg.timestamp > keepLastMsg.timestamp)
        ? deleteLastMsg
        : (deleteLastMsg || keepLastMsg);

    await prisma.conversation.update({
      where: { id: keepId },
      data: {
        lastMessage: lastMessage?.content || keepConv.lastMessage,
        lastMessageAt: lastMessage?.timestamp || keepConv.lastMessageAt,
        contactName: deleteConv.contactName || keepConv.contactName,
        contactPicture: deleteConv.contactPicture || keepConv.contactPicture,
        unreadCount: keepConv.unreadCount + deleteConv.unreadCount
      }
    });

    console.log(`   ✅ Conversa atualizada com dados mesclados`);
  }

  // 3. Deletar a conversa duplicada
  await prisma.conversation.delete({
    where: { id: deleteId }
  });

  console.log(`   🗑️  Conversa duplicada removida`);
}

async function findAndMergeDuplicates(instanceId: string) {
  console.log(`\n🔍 Buscando conversas duplicadas na instância ${instanceId}...\n`);

  const conversations = await prisma.conversation.findMany({
    where: { instanceId },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`📊 Total de conversas: ${conversations.length}`);

  // Agrupar por número normalizado
  const groupedByNumber = new Map<string, typeof conversations>();

  for (const conv of conversations) {
    // Normalizar número (remover @s.whatsapp.net, @g.us, etc)
    const normalized = conv.remoteJid
      .replace('@s.whatsapp.net', '')
      .replace('@g.us', '')
      .replace('@c.us', '');

    if (!groupedByNumber.has(normalized)) {
      groupedByNumber.set(normalized, []);
    }
    groupedByNumber.get(normalized)!.push(conv);
  }

  // Encontrar duplicatas
  let duplicatesFound = 0;
  let mergedCount = 0;

  for (const [number, convs] of groupedByNumber.entries()) {
    if (convs.length > 1) {
      duplicatesFound++;
      console.log(`\n⚠️  Duplicata encontrada: ${number}`);
      
      if (convs.length === 0) {
        console.log(`   ⚠️  Nenhuma conversa encontrada para ${number}`);
        continue;
      }

      convs.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.remoteJid} (ID: ${c.id.slice(0, 8)}...) - ${c.createdAt.toISOString()}`);
      });

      // Manter a primeira (mais antiga) e mesclar as outras nela
      const firstConv = convs[0];
      if (!firstConv) continue;
      
      console.log(`\n   → Mantendo a primeira (mais antiga): ${firstConv.remoteJid}`);
      
      // Mesclar todas as outras na primeira
      for (let i = 1; i < convs.length; i++) {
        const convToMerge = convs[i];
        if (!convToMerge) continue;
        
        await mergeConversations(firstConv.id, convToMerge.id);
        mergedCount++;
      }
    }
  }

  console.log(`\n✅ Processo concluído!`);
  console.log(`   📊 Duplicatas encontradas: ${duplicatesFound}`);
  console.log(`   🔄 Conversas mescladas: ${mergedCount}`);
}

async function main() {
  try {
    // Listar instâncias disponíveis
    const instances = await prisma.whatsAppInstance.findMany();
    
    console.log('📱 Instâncias disponíveis:');
    instances.forEach((inst, i) => {
      console.log(`   ${i + 1}. ${inst.name} (ID: ${inst.id})`);
    });

    if (instances.length === 0) {
      console.log('❌ Nenhuma instância encontrada');
      return;
    }

    // Usar a primeira instância (ou você pode escolher)
    const firstInstance = instances[0];
    if (!firstInstance) {
      console.log('❌ Erro: primeira instância é undefined');
      return;
    }
    
    const instanceId = firstInstance.id;
    console.log(`\n🎯 Usando instância: ${firstInstance.name}`);

    await findAndMergeDuplicates(instanceId);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
