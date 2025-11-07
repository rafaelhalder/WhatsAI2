import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Atualizando senderName para mensagens de grupos antigas...\n');
  
  // Buscar todas as mensagens de grupos sem senderName
  const messages = await (prisma.message as any).findMany({
    where: {
      senderName: null,
      fromMe: false,
      conversation: {
        isGroup: true
      }
    },
    include: {
      conversation: {
        select: {
          contactName: true,
          remoteJid: true
        }
      }
    },
    orderBy: { timestamp: 'desc' }
  });
  
  console.log(`📊 Encontradas ${messages.length} mensagens de grupos sem senderName\n`);
  
  if (messages.length === 0) {
    console.log('✅ Nenhuma mensagem para atualizar!');
    return;
  }
  
  // Para cada mensagem, usar o nome do grupo como fallback
  // (idealmente seria o nome do membro, mas não temos essa informação histórica)
  let updated = 0;
  for (const msg of messages) {
    const senderName = msg.conversation.contactName || 'Membro do Grupo';
    
    await (prisma.message as any).update({
      where: { id: msg.id },
      data: { senderName }
    });
    
    updated++;
    if (updated % 10 === 0) {
      console.log(`✅ Atualizados: ${updated}/${messages.length}...`);
    }
  }
  
  console.log(`\n🎉 ${messages.length} mensagens atualizadas com sucesso!`);
  console.log('\n⚠️  NOTA: Mensagens antigas usam nome do GRUPO como fallback.');
  console.log('   Novas mensagens terão o nome real do remetente.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
