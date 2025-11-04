import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function downloadOriginalSticker() {
  try {
    const messageId = '3A298012221AEDD69CAA';

    // Buscar webhook
    const webhook = await (prisma as any).webhookLog.findFirst({
      where: { messageId }
    });

    if (!webhook) {
      console.log('❌ Webhook não encontrado');
      return;
    }

    const messageData = webhook.rawData.data;
    
    console.log('📥 Baixando sticker original do WhatsApp...');
    
    // Download usando Baileys
    const buffer = await downloadMediaMessage(
      messageData,
      'buffer',
      {}
    );

    console.log(`✅ Download concluído: ${buffer.length} bytes\n`);

    // Salvar arquivo original
    const originalPath = '/tmp/sticker-original.webp';
    await fs.writeFile(originalPath, buffer);
    console.log(`💾 Salvo em: ${originalPath}`);

    // Metadata
    const metadata = await sharp(buffer).metadata();
    console.log('\n🔍 Metadata:');
    console.log(JSON.stringify({
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      pages: metadata.pages,
      pageHeight: metadata.pageHeight,
      hasAlpha: metadata.hasAlpha,
      delay: metadata.delay,
      loop: metadata.loop,
      compression: metadata.compression
    }, null, 2));

    console.log('\n🎯 RESULTADO:');
    if (metadata.pages && metadata.pages > 1) {
      console.log(`   ✅ É ANIMADO! (${metadata.pages} frames)`);
      console.log(`   Delay entre frames: ${metadata.delay} ms`);
      console.log(`   Loop: ${metadata.loop}`);
    } else {
      console.log('   ❌ NÃO é animado (sticker estático)');
    }

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

downloadOriginalSticker();
