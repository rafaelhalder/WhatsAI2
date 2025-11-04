#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const msgId = '3A298012221AEDD69CAA';
  
  const webhook = await prisma.webhookLog.findFirst({
    where: {
      rawData: {
        path: ['data', 'key', 'id'],
        equals: msgId
      }
    }
  });
  
  if (webhook) {
    const data = webhook.rawData as any;
    const stickerMsg = data?.data?.message?.stickerMessage;
    
    const originalSize = stickerMsg?.fileLength?.low || 0;
    const originalKB = (originalSize / 1024).toFixed(2);
    
    console.log('📦 STICKER #2 (Original do WhatsApp):');
    console.log(`   Original Size: ${originalSize} bytes (${originalKB} KB)`);
    console.log(`   isAnimated: ${stickerMsg?.isAnimated || 'not specified'}`);
    console.log(`   MimeType: ${stickerMsg?.mimetype}`);
    console.log(`   Dimensions: ${stickerMsg?.width}x${stickerMsg?.height}`);
    
    // Buscar mensagem processada
    const message = await prisma.message.findFirst({
      where: { messageId: msgId }
    });
    
    if (message?.mediaUrl) {
      console.log(`\n✅ Processado e salvo:`);
      console.log(`   MediaURL: ${message.mediaUrl}`);
      
      // Verificar tamanho do arquivo no CDN
      console.log(`\n🔍 Verificando tamanho no CDN...`);
      const response = await fetch(message.mediaUrl, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const processedKB = (parseInt(contentLength) / 1024).toFixed(2);
        const reduction = (((originalSize - parseInt(contentLength)) / originalSize) * 100).toFixed(2);
        console.log(`   Processed Size: ${contentLength} bytes (${processedKB} KB)`);
        console.log(`   Reduction: ${reduction}%`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
