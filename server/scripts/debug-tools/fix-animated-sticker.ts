#!/usr/bin/env tsx
/**
 * Script para reprocessar sticker animado que foi convertido para estático
 * Baixa o original do WhatsApp e salva sem otimização para preservar animação
 */

import { PrismaClient } from '@prisma/client';
import { IncomingMediaService } from './src/services/incoming-media-service';

const prisma = new PrismaClient();

async function main() {
  // Sticker #2 que era animado (100KB original, virou 24KB estático)
  const messageId = '3A298012221AEDD69CAA';
  const dbMessageId = 'cmhdptwam0004n5drxbr0zqdz';

  console.log('🎬 REPROCESSANDO STICKER ANIMADO\n');

  // 1. Buscar webhook original
  const webhook = await prisma.webhookLog.findFirst({
    where: {
      rawData: {
        path: ['data', 'key', 'id'],
        equals: messageId
      }
    }
  });

  if (!webhook) {
    console.log('❌ Webhook não encontrado');
    return;
  }

  const rawData = webhook.rawData as any;
  const messageData = rawData.data;
  const stickerMsg = messageData?.message?.stickerMessage;

  console.log('📦 Sticker Original:');
  console.log(`   Size: ${stickerMsg?.fileLength?.low} bytes`);
  console.log(`   URL: ${stickerMsg?.url?.substring(0, 80)}...`);
  console.log(`   MimeType: ${stickerMsg?.mimetype}`);

  // 2. Buscar mensagem no banco
  const message = await prisma.message.findUnique({
    where: { id: dbMessageId }
  });

  if (!message) {
    console.log('❌ Mensagem não encontrada');
    return;
  }

  console.log('\n📨 Mensagem atual:');
  console.log(`   MediaURL: ${message.mediaUrl}`);
  console.log(`   InstanceId: ${message.instanceId}`);

  // 3. Reprocessar com novo código que preserva animação
  console.log('\n🔄 Reprocessando com preservação de animação...');

  const incomingMediaService = new IncomingMediaService();

  try {
    const processedUrl = await incomingMediaService.processIncomingMedia({
      messageId: message.messageId,
      mediaUrl: stickerMsg.url,
      mediaType: 'sticker',
      fileName: undefined,
      caption: undefined,
      mimeType: stickerMsg.mimetype,
      instanceName: message.instanceId,
      messageData: messageData
    });

    if (processedUrl) {
      console.log('\n✅ Sticker reprocessado:');
      console.log(`   Nova URL: ${processedUrl}`);

      // 4. Atualizar no banco
      await prisma.message.update({
        where: { id: dbMessageId },
        data: { mediaUrl: processedUrl }
      });

      console.log('\n✅ Mensagem atualizada no banco!');
      console.log('\n📋 Resultado:');
      console.log(`   Message ID: ${dbMessageId}`);
      console.log(`   Media URL: ${processedUrl}`);
      console.log(`   Status: ANIMAÇÃO PRESERVADA ✅`);
    }

  } catch (error) {
    console.error('\n❌ Erro ao reprocessar:', error);
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
