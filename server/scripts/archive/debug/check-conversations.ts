import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConversations() {
  console.log('🔍 Verificando conversas no banco de dados...\n');
  
  const conversations = await (prisma as any).conversation.findMany({
    include: {
      messages: {
        take: 5,
        orderBy: {
          timestamp: 'desc'
        }
      }
    }
  });

  console.log(`📊 Total de conversas: ${conversations.length}\n`);

  for (const conv of conversations) {
    console.log('=' .repeat(80));
    console.log(`💬 Conversa ID: ${conv.id}`);
    console.log(`📱 remoteJid: ${conv.remoteJid}`);
    console.log(`👤 contactName: ${conv.contactName || 'N/A'}`);
    console.log(`🖼️  contactPicture: ${conv.contactPicture ? 'Sim' : 'Não'}`);
    console.log(`📨 Total de mensagens: ${conv.messages.length}`);
    
    if (conv.messages.length > 0) {
      console.log(`\n📝 Últimas mensagens:`);
      conv.messages.forEach((msg: any, idx: number) => {
        console.log(`   ${idx + 1}. [${msg.fromMe ? 'VOCÊ' : 'CONTATO'}] ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        console.log(`      remoteJid: ${msg.remoteJid}`);
      });
    }
    console.log('');
  }

  await prisma.$disconnect();
}

checkConversations().catch((error) => {
  console.error('Erro:', error);
  process.exit(1);
});
