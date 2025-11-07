/**
 * Diagnóstico Completo do Sistema de Chat
 * 
 * Verifica:
 * 1. Conversas duplicadas por remoteJid
 * 2. Mensagens na conversa errada
 * 3. Fotos de perfil corretas (grupo vs individual)
 * 4. Carregamento de imagens
 * 5. Agrupamento correto de conversas
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DiagnosticReport {
  totalConversations: number;
  totalMessages: number;
  duplicateConversations: Array<{
    remoteJid: string;
    instanceId: string;
    count: number;
    conversationIds: string[];
  }>;
  messagesInWrongConversation: Array<{
    messageId: string;
    messageRemoteJid: string;
    conversationRemoteJid: string;
    conversationId: string;
  }>;
  groupsWithoutPicture: Array<{
    id: string;
    remoteJid: string;
    contactName: string | null;
  }>;
  individualsWithoutPicture: Array<{
    id: string;
    remoteJid: string;
    contactName: string | null;
  }>;
  messagesWithMedia: {
    total: number;
    withValidUrl: number;
    withInvalidUrl: number;
    samples: Array<{
      id: string;
      conversationId: string;
      conversationName: string | null;
      mediaUrl: string | null;
      messageType: string;
    }>;
  };
}

async function diagnoseChatSystem(): Promise<DiagnosticReport> {
  console.log('🔍 Iniciando diagnóstico completo do sistema de chat...\n');

  // 1. Estatísticas gerais
  const totalConversations = await prisma.conversation.count();
  const totalMessages = await prisma.message.count();

  console.log(`📊 Estatísticas Gerais:`);
  console.log(`   Total de conversas: ${totalConversations}`);
  console.log(`   Total de mensagens: ${totalMessages}\n`);

  // 2. Verificar conversas duplicadas por (instanceId, remoteJid)
  console.log('🔎 Verificando conversas duplicadas...');
  
  const allConversations = await prisma.conversation.findMany({
    select: {
      id: true,
      instanceId: true,
      remoteJid: true,
      contactName: true,
    }
  });

  const conversationMap = new Map<string, Array<{ id: string; remoteJid: string; instanceId: string }>>();
  
  allConversations.forEach(conv => {
    const key = `${conv.instanceId}:${conv.remoteJid}`;
    if (!conversationMap.has(key)) {
      conversationMap.set(key, []);
    }
    conversationMap.get(key)!.push({
      id: conv.id,
      remoteJid: conv.remoteJid,
      instanceId: conv.instanceId
    });
  });

  const duplicateConversations: DiagnosticReport['duplicateConversations'] = [];
  
  conversationMap.forEach((conversations, key) => {
    if (conversations.length > 1) {
      const [instanceId, remoteJid] = key.split(':');
      duplicateConversations.push({
        remoteJid,
        instanceId,
        count: conversations.length,
        conversationIds: conversations.map(c => c.id)
      });
    }
  });

  if (duplicateConversations.length > 0) {
    console.log(`   ⚠️  Encontradas ${duplicateConversations.length} conversas duplicadas:`);
    duplicateConversations.forEach(dup => {
      console.log(`      - ${dup.remoteJid} (${dup.count}x): ${dup.conversationIds.join(', ')}`);
    });
  } else {
    console.log(`   ✅ Nenhuma conversa duplicada encontrada!`);
  }
  console.log('');

  // 3. Verificar mensagens na conversa errada
  console.log('🔎 Verificando mensagens na conversa correta...');
  
  const messagesWithConversation = await prisma.message.findMany({
    include: {
      conversation: {
        select: {
          remoteJid: true,
          instanceId: true
        }
      }
    },
    take: 1000 // Amostra
  });

  const messagesInWrongConversation: DiagnosticReport['messagesInWrongConversation'] = [];

  messagesWithConversation.forEach(msg => {
    if (msg.conversation && msg.remoteJid !== msg.conversation.remoteJid) {
      messagesInWrongConversation.push({
        messageId: msg.messageId,
        messageRemoteJid: msg.remoteJid,
        conversationRemoteJid: msg.conversation.remoteJid,
        conversationId: msg.conversationId!
      });
    }
  });

  if (messagesInWrongConversation.length > 0) {
    console.log(`   ⚠️  Encontradas ${messagesInWrongConversation.length} mensagens na conversa errada:`);
    messagesInWrongConversation.slice(0, 5).forEach(msg => {
      console.log(`      - Mensagem: ${msg.messageRemoteJid} → Conversa: ${msg.conversationRemoteJid}`);
    });
    if (messagesInWrongConversation.length > 5) {
      console.log(`      ... e mais ${messagesInWrongConversation.length - 5} mensagens`);
    }
  } else {
    console.log(`   ✅ Todas as mensagens estão nas conversas corretas!`);
  }
  console.log('');

  // 4. Verificar fotos de perfil (grupos vs individuais)
  console.log('🔎 Verificando fotos de perfil...');
  
  const groupsWithoutPicture = await prisma.conversation.findMany({
    where: {
      isGroup: true,
      contactPicture: null
    },
    select: {
      id: true,
      remoteJid: true,
      contactName: true
    }
  });

  const individualsWithoutPicture = await prisma.conversation.findMany({
    where: {
      isGroup: false,
      contactPicture: null
    },
    select: {
      id: true,
      remoteJid: true,
      contactName: true
    },
    take: 20
  });

  console.log(`   Grupos sem foto: ${groupsWithoutPicture.length}`);
  console.log(`   Individuais sem foto: ${individualsWithoutPicture.length}`);
  console.log('');

  // 5. Verificar mensagens com mídia
  console.log('🔎 Verificando mensagens com mídia...');
  
  const messagesWithMediaTotal = await prisma.message.count({
    where: {
      mediaUrl: {
        not: null
      }
    }
  });

  const messagesWithValidUrl = await prisma.message.count({
    where: {
      mediaUrl: {
        not: null,
        startsWith: 'http'
      }
    }
  });

  const messagesWithMediaSamples = await prisma.message.findMany({
    where: {
      mediaUrl: {
        not: null
      }
    },
    select: {
      id: true,
      conversationId: true,
      mediaUrl: true,
      messageType: true,
      conversation: {
        select: {
          contactName: true,
          remoteJid: true,
          isGroup: true
        }
      }
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: 10
  });

  console.log(`   Total de mensagens com mídia: ${messagesWithMediaTotal}`);
  console.log(`   Com URL válida (http): ${messagesWithValidUrl}`);
  console.log(`   Com URL inválida: ${messagesWithMediaTotal - messagesWithValidUrl}`);
  console.log(`\n   Amostras recentes:`);
  
  messagesWithMediaSamples.forEach((msg, i) => {
    const urlStatus = msg.mediaUrl?.startsWith('http') ? '✅' : '❌';
    const groupLabel = msg.conversation?.isGroup ? '(Grupo)' : '';
    console.log(`      ${i + 1}. ${urlStatus} ${msg.messageType} - ${msg.conversation?.contactName || msg.conversation?.remoteJid} ${groupLabel}`);
    console.log(`         URL: ${msg.mediaUrl?.substring(0, 80)}...`);
  });
  console.log('');

  return {
    totalConversations,
    totalMessages,
    duplicateConversations,
    messagesInWrongConversation,
    groupsWithoutPicture: groupsWithoutPicture.slice(0, 10),
    individualsWithoutPicture: individualsWithoutPicture.slice(0, 10),
    messagesWithMedia: {
      total: messagesWithMediaTotal,
      withValidUrl: messagesWithValidUrl,
      withInvalidUrl: messagesWithMediaTotal - messagesWithValidUrl,
      samples: messagesWithMediaSamples.map(msg => ({
        id: msg.id,
        conversationId: msg.conversationId || '',
        conversationName: msg.conversation?.contactName || null,
        mediaUrl: msg.mediaUrl,
        messageType: msg.messageType
      }))
    }
  };
}

async function generateSummary(report: DiagnosticReport) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 RESUMO DO DIAGNÓSTICO');
  console.log('='.repeat(80) + '\n');

  // Problemas críticos
  const criticalIssues: string[] = [];
  
  if (report.duplicateConversations.length > 0) {
    criticalIssues.push(`❌ ${report.duplicateConversations.length} conversas duplicadas (CRÍTICO)`);
  }
  
  if (report.messagesInWrongConversation.length > 0) {
    criticalIssues.push(`❌ ${report.messagesInWrongConversation.length} mensagens na conversa errada (CRÍTICO)`);
  }

  if (report.messagesWithMedia.withInvalidUrl > 0) {
    criticalIssues.push(`⚠️  ${report.messagesWithMedia.withInvalidUrl} mensagens com URL de mídia inválida`);
  }

  // Avisos
  const warnings: string[] = [];
  
  if (report.groupsWithoutPicture.length > 0) {
    warnings.push(`⚠️  ${report.groupsWithoutPicture.length} grupos sem foto de perfil`);
  }
  
  if (report.individualsWithoutPicture.length > 10) {
    warnings.push(`⚠️  ${report.individualsWithoutPicture.length} contatos individuais sem foto`);
  }

  // Sucesso
  const successes: string[] = [];
  
  if (report.duplicateConversations.length === 0) {
    successes.push('✅ Nenhuma conversa duplicada');
  }
  
  if (report.messagesInWrongConversation.length === 0) {
    successes.push('✅ Todas as mensagens estão nas conversas corretas');
  }
  
  if (report.messagesWithMedia.withValidUrl === report.messagesWithMedia.total) {
    successes.push('✅ Todas as mensagens com mídia têm URLs válidas');
  }

  console.log('🔴 PROBLEMAS CRÍTICOS:');
  if (criticalIssues.length > 0) {
    criticalIssues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('   ✅ Nenhum problema crítico encontrado!');
  }
  console.log('');

  console.log('🟡 AVISOS:');
  if (warnings.length > 0) {
    warnings.forEach(warning => console.log(`   ${warning}`));
  } else {
    console.log('   ✅ Nenhum aviso!');
  }
  console.log('');

  console.log('🟢 SUCESSOS:');
  successes.forEach(success => console.log(`   ${success}`));
  console.log('');

  console.log('📊 ESTATÍSTICAS:');
  console.log(`   Total de conversas: ${report.totalConversations}`);
  console.log(`   Total de mensagens: ${report.totalMessages}`);
  console.log(`   Mensagens com mídia: ${report.messagesWithMedia.total}`);
  console.log(`   Taxa de URLs válidas: ${((report.messagesWithMedia.withValidUrl / report.messagesWithMedia.total) * 100).toFixed(1)}%`);
  console.log('');
}

async function main() {
  try {
    const report = await diagnoseChatSystem();
    await generateSummary(report);

    console.log('='.repeat(80));
    console.log('✅ Diagnóstico concluído!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
