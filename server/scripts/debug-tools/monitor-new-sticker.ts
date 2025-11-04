#!/usr/bin/env tsx
/**
 * Script para monitorar o próximo sticker animado que chegar
 * Verifica se foi detectado como animado e se a animação foi preservada
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function monitorNewSticker() {
  console.log('🔍 MONITORANDO PRÓXIMO STICKER...\n');
  console.log('Aguardando novo sticker chegar...');
  
  // Só detectar stickers enviados AGORA (últimos 30 segundos)
  const now = new Date();
  const startTime = new Date(now.getTime() - 30000); // 30 segundos atrás
  
  console.log(`⏰ Monitorando stickers enviados após: ${startTime.toLocaleTimeString()}\n`);
  
  let processedIds = new Set<string>();
  
  // Polling a cada 2 segundos
  setInterval(async () => {
    const newSticker = await prisma.message.findFirst({
      where: {
        conversationId: 'cmhdp2zzg0029wu5wmof2mxsi',
        messageType: 'STICKER',
        timestamp: {
          gte: startTime
        }
      },
      orderBy: { timestamp: 'desc' }
    });
    
    if (newSticker && !processedIds.has(newSticker.id)) {
      processedIds.add(newSticker.id);
      console.log('\n🎉 NOVO STICKER DETECTADO!\n');
      console.log('📦 Informações:');
      console.log(`   Message ID: ${newSticker.messageId}`);
      console.log(`   DB ID: ${newSticker.id}`);
      console.log(`   Media URL: ${newSticker.mediaUrl}`);
      console.log(`   Timestamp: ${newSticker.timestamp}`);
      
      // Buscar webhook para ver tamanho original
      const webhook = await (prisma as any).webhookLog.findFirst({
        where: { messageId: newSticker.messageId }
      });
      
      if (webhook) {
        const messageData = webhook.rawData.data;
        const stickerMsg = messageData?.message?.stickerMessage;
        
        console.log('\n📊 Dados do Webhook:');
        console.log(`   Tamanho original: ${stickerMsg?.fileLength?.low} bytes`);
        console.log(`   MimeType: ${stickerMsg?.mimetype}`);
        console.log(`   isAnimated (WhatsApp): ${stickerMsg?.isAnimated}`);
        
        // Verificar tamanho na CDN
        if (newSticker.mediaUrl) {
          try {
            const axios = (await import('axios')).default;
            const response = await axios.head(newSticker.mediaUrl);
            const cdnSize = parseInt(response.headers['content-length'] || '0');
            
            const originalSize = stickerMsg?.fileLength?.low || 0;
            const reduction = originalSize > 0 ? ((originalSize - cdnSize) / originalSize * 100).toFixed(2) : '0';
            
            console.log('\n🔍 Comparação de tamanho:');
            console.log(`   Original WhatsApp: ${originalSize} bytes`);
            console.log(`   Processado CDN: ${cdnSize} bytes`);
            console.log(`   Redução: ${reduction}%`);
            
            console.log('\n🎯 ANÁLISE:');
            if (cdnSize >= originalSize * 0.9) {
              console.log('   ✅ ANIMAÇÃO PRESERVADA! (tamanho mantido ~100%)');
              console.log('   ✅ Código está funcionando corretamente!');
            } else if (parseFloat(reduction as string) > 50) {
              console.log('   ⚠️  POSSÍVEL PERDA DE ANIMAÇÃO (redução >50%)');
              console.log('   ❌ Código pode não ter detectado animação');
            } else {
              console.log('   ✅ Otimização normal (sticker estático)');
            }
          } catch (err: any) {
            console.log('   ❌ Erro ao verificar CDN:', err.message);
          }
        }
      }
      
      console.log('\n✅ Verificação concluída! Script finalizado.');
      process.exit(0);
    }
  }, 2000);
}

monitorNewSticker().catch(console.error);

// Timeout de 5 minutos
setTimeout(() => {
  console.log('\n⏱️  Timeout - nenhum sticker novo recebido em 5 minutos');
  process.exit(0);
}, 5 * 60 * 1000);
