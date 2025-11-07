import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMessageStatus() {
  console.log('🔄 Corrigindo status de mensagens antigas...\n');
  
  try {
    // Mensagens enviadas por mim (fromMe = true) → SENT
    const sentMessages = await prisma.message.updateMany({
      where: { 
        status: null,
        fromMe: true
      },
      data: { status: 'SENT' }
    });
    
    console.log(`✅ ${sentMessages.count} mensagens enviadas marcadas como SENT`);
    
    // Mensagens recebidas (fromMe = false) → DELIVERED
    const receivedMessages = await prisma.message.updateMany({
      where: { 
        status: null,
        fromMe: false
      },
      data: { status: 'DELIVERED' }
    });
    
    console.log(`✅ ${receivedMessages.count} mensagens recebidas marcadas como DELIVERED`);
    
    // Verificar se ainda há mensagens sem status
    const remainingNull = await prisma.message.count({
      where: { status: null }
    });
    
    if (remainingNull > 0) {
      console.log(`⚠️ Ainda existem ${remainingNull} mensagens sem status`);
      
      // Marcar todas restantes como DELIVERED por padrão
      const remaining = await prisma.message.updateMany({
        where: { status: null },
        data: { status: 'DELIVERED' }
      });
      
      console.log(`✅ ${remaining.count} mensagens restantes marcadas como DELIVERED`);
    }
    
    // Estatísticas finais
    console.log('\n📊 Estatísticas finais:');
    
    const stats = await prisma.$queryRaw`
      SELECT 
        status,
        "fromMe",
        COUNT(*) as count
      FROM messages
      WHERE status IS NOT NULL
      GROUP BY status, "fromMe"
      ORDER BY status, "fromMe"
    `;
    
    console.table(stats);
    
    console.log('\n✅ Status das mensagens corrigido com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir status:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixMessageStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
