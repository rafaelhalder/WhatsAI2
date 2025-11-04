import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDashboardMetrics() {
  try {
    console.log('\n=== VERIFICAÇÃO DE MÉTRICAS DO DASHBOARD ===\n');

    // 1. Total de Mensagens
    const totalMessages = await prisma.message.count();
    console.log(`📨 Total de Mensagens: ${totalMessages}`);

    // 2. Instâncias Ativas
    const activeInstances = await prisma.whatsAppInstance.count({
      where: {
        status: 'CONNECTED'
      }
    });
    console.log(`📱 Instâncias Ativas (CONNECTED): ${activeInstances}`);

    // Todas as instâncias por status
    const instancesByStatus = await prisma.whatsAppInstance.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    console.log('\n📊 Instâncias por Status:');
    instancesByStatus.forEach(group => {
      console.log(`   ${group.status}: ${group._count.status}`);
    });

    // 3. Total de Usuários
    const totalUsers = await prisma.user.count();
    console.log(`\n👥 Total de Usuários: ${totalUsers}`);

    // 4. Taxa de Entrega
    const deliveredMessages = await prisma.message.count({
      where: {
        status: 'DELIVERED'
      }
    });
    const deliveryRate = totalMessages > 0 
      ? ((deliveredMessages / totalMessages) * 100).toFixed(1)
      : '0.0';
    console.log(`\n✅ Mensagens Entregues: ${deliveredMessages}/${totalMessages} (${deliveryRate}%)`);

    // Mensagens por status
    const messagesByStatus = await prisma.message.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    console.log('\n📊 Mensagens por Status:');
    messagesByStatus.forEach(group => {
      console.log(`   ${group.status}: ${group._count.status}`);
    });

    // 5. Armazenamento (média estimada)
    const mediaMessages = await prisma.message.count({
      where: {
        mediaUrl: { not: null }
      }
    });
    const estimatedStorageMB = mediaMessages * 0.5; // 500KB por arquivo
    console.log(`\n💾 Mensagens com Mídia: ${mediaMessages}`);
    console.log(`💾 Armazenamento Estimado: ${estimatedStorageMB.toFixed(1)} MB`);

    // Tipos de mídia
    const mediaTypes = await prisma.message.groupBy({
      by: ['messageType'],
      where: {
        mediaUrl: { not: null }
      },
      _count: {
        messageType: true
      }
    });
    console.log('\n📊 Tipos de Mensagem com Mídia:');
    mediaTypes.forEach(group => {
      console.log(`   ${group.messageType}: ${group._count.messageType}`);
    });

    // 6. Custos (baseado no novo cálculo)
    const FIXED_COST = 41.00;
    const COST_PER_INSTANCE = 5.00;
    const COST_PER_GB = 0.02;

    const allInstances = await prisma.whatsAppInstance.count();
    const storageGB = estimatedStorageMB / 1024;
    const instanceCost = allInstances * COST_PER_INSTANCE;
    const storageCost = storageGB * COST_PER_GB;
    const totalCost = FIXED_COST + instanceCost + storageCost;

    console.log(`\n💰 CÁLCULO DE CUSTOS:`);
    console.log(`   Custo Fixo: R$ ${FIXED_COST.toFixed(2)}`);
    console.log(`   Instâncias (${allInstances} × R$ ${COST_PER_INSTANCE}): R$ ${instanceCost.toFixed(2)}`);
    console.log(`   Storage (${storageGB.toFixed(3)} GB × R$ ${COST_PER_GB}): R$ ${storageCost.toFixed(2)}`);
    console.log(`   TOTAL: R$ ${totalCost.toFixed(2)}`);

    // 7. Verificar usuário logado
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: {
            instances: true
          }
        }
      }
    });
    console.log(`\n👤 USUÁRIOS NO SISTEMA:`);
    users.forEach(user => {
      console.log(`   ${user.name} (${user.email}) - ${user.role} - ${user._count.instances} instâncias`);
    });

    // 8. Verificar conversas
    const totalConversations = await prisma.conversation.count();
    console.log(`\n💬 Total de Conversações: ${totalConversations}`);

    // 9. Verificar campanhas
    const campaigns = await prisma.campaign.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    console.log(`\n📢 Campanhas por Status:`);
    campaigns.forEach(group => {
      console.log(`   ${group.status}: ${group._count.status}`);
    });

    // 10. Últimas mensagens
    const recentMessages = await prisma.message.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fromMe: true,
        status: true,
        messageType: true,
        createdAt: true,
        instance: {
          select: {
            name: true
          }
        }
      }
    });
    console.log(`\n📬 Últimas 5 Mensagens:`);
    recentMessages.forEach(msg => {
      const direction = msg.fromMe ? '→' : '←';
      const media = msg.messageType !== 'conversation' ? `[${msg.messageType}]` : '';
      console.log(`   ${direction} ${msg.instance.name} - ${msg.status} ${media} - ${msg.createdAt.toLocaleString()}`);
    });

    console.log('\n=== FIM DA VERIFICAÇÃO ===\n');

  } catch (error) {
    console.error('❌ Erro ao verificar métricas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDashboardMetrics();
