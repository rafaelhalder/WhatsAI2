const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixKnownContacts() {
  console.log('🔧 Corrigindo conversas conhecidas...');

  try {
    // Corrigir conversa que sabemos que é Rafa
    const result1 = await prisma.conversation.updateMany({
      where: {
        remoteJid: '5541991188909@s.whatsapp.net'
      },
      data: { contactName: 'Rafa' }
    });

    console.log(`✅ Conversa de Rafa corrigida: ${result1.count} registros atualizados`);

    // Para outras conversas, vamos definir contactName como null por enquanto
    // O fetchContactInfoInBackground vai buscar o pushName correto depois
    const result2 = await prisma.conversation.updateMany({
      where: {
        isGroup: false,
        contactName: {
          not: null
        },
        OR: [
          { contactName: { startsWith: '55' } },
          { contactName: { matches: '^[0-9]+$' } }
        ]
      },
      data: { contactName: null }
    });

    console.log(`🧹 Limpas ${result2.count} conversas com contactName numérico - fetchContactInfoInBackground vai buscar os nomes corretos`);

    // Verificar se há outras conversas com números formatados
    const allConversations = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        contactName: {
          not: null
        }
      },
      select: {
        id: true,
        remoteJid: true,
        contactName: true
      }
    });

    const otherConversations = allConversations.filter((conv: any) => {
      // Verificar se contactName parece ser um número formatado
      return /^\d+$/.test(conv.contactName) && conv.contactName.length >= 10;
    });

    console.log(`📋 Outras conversas com contactName numérico: ${otherConversations.length}`);
    otherConversations.forEach((conv: any) => {
      console.log(`  - ${conv.contactName} (${conv.remoteJid})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixKnownContacts();