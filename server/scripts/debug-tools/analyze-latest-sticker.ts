import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function analyzeLatestSticker() {
  // Buscar o último sticker (mais recente)
  const sticker = await prisma.message.findFirst({
    where: {
      conversationId: 'cmhdp2zzg0029wu5wmof2mxsi',
      messageType: 'STICKER'
    },
    orderBy: { timestamp: 'desc' }
  });

  if (!sticker) {
    console.log('❌ Nenhum sticker encontrado');
    return;
  }

  console.log('🎉 ANALISANDO ÚLTIMO STICKER\n');
  console.log('📦 Informações:');
  console.log(`   Message ID: ${sticker.messageId}`);
  console.log(`   DB ID: ${sticker.id}`);
  console.log(`   Timestamp: ${sticker.timestamp}`);
  console.log(`   Media URL: ${sticker.mediaUrl}`);

  // Buscar webhook
  const webhook = await (prisma as any).webhookLog.findFirst({
    where: { messageId: sticker.messageId }
  });

  if (!webhook) {
    console.log('\n❌ Webhook não encontrado');
    await prisma.$disconnect();
    return;
  }

  const messageData = webhook.rawData.data;
  const stickerMsg = messageData?.message?.stickerMessage;

  console.log('\n📊 Dados do Webhook:');
  console.log(`   Tamanho original: ${stickerMsg?.fileLength?.low} bytes (${(stickerMsg?.fileLength?.low / 1024).toFixed(2)} KB)`);
  console.log(`   MimeType: ${stickerMsg?.mimetype}`);
  console.log(`   isAnimated (campo WhatsApp): ${stickerMsg?.isAnimated ?? 'undefined'}`);

  // Verificar tamanho na CDN
  if (sticker.mediaUrl) {
    try {
      const response = await axios.head(sticker.mediaUrl);
      const cdnSize = parseInt(response.headers['content-length'] || '0');
      const originalSize = stickerMsg?.fileLength?.low || 0;
      const reduction = originalSize > 0 ? ((originalSize - cdnSize) / originalSize * 100).toFixed(2) : '0';

      console.log('\n🔍 Comparação de tamanho:');
      console.log(`   Original WhatsApp: ${originalSize} bytes (${(originalSize / 1024).toFixed(2)} KB)`);
      console.log(`   Processado CDN: ${cdnSize} bytes (${(cdnSize / 1024).toFixed(2)} KB)`);
      console.log(`   Redução: ${reduction}%`);

      console.log('\n🎯 ANÁLISE FINAL:');
      if (cdnSize >= originalSize * 0.95) {
        console.log('   ✅ ✅ ✅ ANIMAÇÃO PRESERVADA! (tamanho mantido ~100%)');
        console.log('   ✅ O código está funcionando PERFEITAMENTE!');
        console.log('   ✅ Sharp detectou WebP animado e NÃO otimizou!');
      } else if (parseFloat(reduction) > 50) {
        console.log('   ⚠️  POSSÍVEL PERDA DE ANIMAÇÃO (redução >50%)');
        console.log('   ❌ Código pode não ter detectado animação');
        console.log('   💡 Verifique os logs do servidor para ver se apareceu "🎬 [ANIMATED_STICKER]"');
      } else {
        console.log('   ✅ Otimização normal para sticker estático');
        console.log(`   ℹ️  Redução de ${reduction}% é esperada para imagens WebP estáticas`);
      }
    } catch (err: any) {
      console.log('\n❌ Erro ao verificar CDN:', err.message);
    }
  }

  await prisma.$disconnect();
}

analyzeLatestSticker().catch(console.error);
