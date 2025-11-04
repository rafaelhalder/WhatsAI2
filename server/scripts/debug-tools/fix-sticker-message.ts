#!/usr/bin/env tsx
/**
 * Script para reprocessar mensagem de sticker que ficou sem mediaUrl
 */

import { PrismaClient } from '@prisma/client';
import { IncomingMediaService } from './src/services/incoming-media-service';

const prisma = new PrismaClient();

async function main() {
  const messageId = 'cmhdpa3hs004twu5wt0hf2sa6';
  const webhookLogId = 'cmhdpa2kq004pwu5ws41vpcg2';

  console.log('🔧 REPROCESSANDO STICKER\n');

  // 1. Buscar mensagem
  const message = await prisma.message.findUnique({
    where: { id: messageId }
  });

  if (!message) {
    console.log('❌ Mensagem não encontrada');
    return;
  }

  console.log('📨 Mensagem atual:');
  console.log('   Type:', message.messageType);
  console.log('   MediaURL:', message.mediaUrl || 'NULL');
  console.log('   Content:', message.content);

  // 2. Buscar webhook raw
  const webhookLog = await prisma.webhookLog.findUnique({
    where: { id: webhookLogId }
  });

  if (!webhookLog) {
    console.log('❌ Webhook log não encontrado');
    return;
  }

  const rawData = webhookLog.rawData as any;
  const messageData = rawData.data;

  console.log('\n📦 Dados do webhook:');
  console.log('   FromMe:', messageData.key.fromMe);
  console.log('   Sticker URL:', messageData.message?.stickerMessage?.url);
  console.log('   MimeType:', messageData.message?.stickerMessage?.mimetype);
  console.log('   Size:', messageData.message?.stickerMessage?.fileLength?.low);

  const stickerUrl = messageData.message?.stickerMessage?.url;
  
  if (!stickerUrl) {
    console.log('\n❌ URL do sticker não encontrada no webhook');
    return;
  }

  // 3. Processar mídia
  console.log('\n🔄 Processando sticker...');
  
  const incomingMediaService = new IncomingMediaService();
  
  try {
    const processedUrl = await incomingMediaService.processIncomingMedia({
      messageId: message.messageId,
      mediaUrl: stickerUrl,
      mediaType: 'sticker',
      fileName: undefined,
      caption: undefined,
      mimeType: messageData.message?.stickerMessage?.mimetype,
      instanceName: message.instanceId,
      messageData: messageData
    });

    console.log('\n✅ Sticker processado:');
    console.log('   CDN URL:', processedUrl);

    // 4. Atualizar mensagem
    await prisma.message.update({
      where: { id: messageId },
      data: { 
        mediaUrl: processedUrl,
        content: '[Sticker]'
      }
    });

    console.log('\n✅ Mensagem atualizada no banco!');
    console.log('\n📋 Resultado final:');
    console.log('   Message ID:', messageId);
    console.log('   Media URL:', processedUrl);
    console.log('   Status: FIXED ✅');

  } catch (error) {
    console.error('\n❌ Erro ao processar sticker:', error);
    if (error instanceof Error) {
      console.error('   Mensagem:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
