import { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// Cliente S3 para DigitalOcean Spaces
const s3Client = new S3Client({
  region: process.env['DO_SPACES_REGION'] || 'sfo3',
  endpoint: process.env['DO_SPACES_ENDPOINT'] || 'https://sfo3.digitaloceanspaces.com',
  credentials: {
    accessKeyId: process.env['DO_SPACES_ACCESS_KEY']!,
    secretAccessKey: process.env['DO_SPACES_SECRET_KEY']!,
  },
});

const bucket = process.env['DO_SPACES_BUCKET'] || 'whatsais3';
const region = process.env['DO_SPACES_REGION'] || 'sfo3';

async function diagnoseAudioIssues() {
  console.log('🔍 DIAGNÓSTICO DE PROBLEMAS DE ÁUDIO\n');
  console.log('=' .repeat(80));
  
  // 1. Verificar configuração do Spaces
  console.log('\n1️⃣ CONFIGURAÇÃO DO DIGITALOCEAN SPACES:');
  console.log(`   Bucket: ${bucket}`);
  console.log(`   Region: ${region}`);
  console.log(`   Endpoint: ${process.env['DO_SPACES_ENDPOINT']}`);
  console.log(`   Access Key: ${process.env['DO_SPACES_ACCESS_KEY'] ? '✅ Configurada' : '❌ FALTANDO'}`);
  console.log(`   Secret Key: ${process.env['DO_SPACES_SECRET_KEY'] ? '✅ Configurada' : '❌ FALTANDO'}`);
  
  // 2. Buscar mensagens de áudio no banco
  console.log('\n2️⃣ MENSAGENS DE ÁUDIO NO BANCO DE DADOS:');
  try {
    const audioMessages = await prisma.message.findMany({
      where: { messageType: 'AUDIO' },
      take: 5,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        mediaUrl: true,
        timestamp: true,
        fromMe: true
      }
    });

    console.log(`   Total encontrado: ${audioMessages.length} mensagens`);
    
    if (audioMessages.length > 0) {
      console.log('\n   📋 Últimas 5 mensagens de áudio:');
      audioMessages.forEach((msg, i) => {
        console.log(`\n   ${i + 1}. Message ID: ${msg.id}`);
        console.log(`      Timestamp: ${msg.timestamp.toISOString()}`);
        console.log(`      From Me: ${msg.fromMe}`);
        console.log(`      Media URL: ${msg.mediaUrl || 'NULL'}`);
        
        // Analisar a URL
        if (msg.mediaUrl) {
          const url = msg.mediaUrl;
          
          // Verificar se é URL do CDN
          if (url.includes('digitaloceanspaces.com')) {
            console.log(`      ✅ Tipo: URL do CDN`);
            
            // Extrair o path do arquivo
            if (url.includes('incoming/audio/')) {
              const parts = url.split('incoming/audio/');
              const filename = parts[1];
              console.log(`      📁 Filename: ${filename}`);
              console.log(`      🔑 S3 Key: incoming/audio/${filename}`);
              console.log(`      🌐 CDN URL: https://${bucket}.${region}.cdn.digitaloceanspaces.com/incoming/audio/${filename}`);
              console.log(`      🔗 Proxy URL: /api/media/audio/${filename}`);
            }
          } else if (url.includes('mmg.whatsapp.net')) {
            console.log(`      ⚠️ Tipo: URL do WhatsApp (não processada)`);
          } else {
            console.log(`      ❓ Tipo: Desconhecido`);
          }
        } else {
          console.log(`      ❌ Media URL está NULL!`);
        }
      });
      
      // 3. Verificar se os arquivos existem no S3
      console.log('\n3️⃣ VERIFICAÇÃO DE ARQUIVOS NO S3:');
      
      for (const msg of audioMessages) {
        if (msg.mediaUrl && msg.mediaUrl.includes('incoming/audio/')) {
          const parts = msg.mediaUrl.split('incoming/audio/');
          const filename = parts[1];
          const s3Key = `incoming/audio/${filename}`;
          
          try {
            const command = new GetObjectCommand({
              Bucket: bucket,
              Key: s3Key,
            });
            
            const response = await s3Client.send(command);
            
            if (response.Body) {
              console.log(`   ✅ Arquivo existe: ${s3Key}`);
              console.log(`      Content-Type: ${response.ContentType}`);
              console.log(`      Content-Length: ${response.ContentLength} bytes`);
              console.log(`      Last-Modified: ${response.LastModified}`);
            }
          } catch (error: any) {
            console.log(`   ❌ Arquivo NÃO existe: ${s3Key}`);
            console.log(`      Erro: ${error.message}`);
          }
        }
      }
      
      // 4. Listar todos os arquivos de áudio no bucket
      console.log('\n4️⃣ LISTAGEM DE ARQUIVOS DE ÁUDIO NO BUCKET:');
      try {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: 'incoming/audio/',
          MaxKeys: 10
        });
        
        const listResponse = await s3Client.send(listCommand);
        
        if (listResponse.Contents && listResponse.Contents.length > 0) {
          console.log(`   Total de arquivos encontrados: ${listResponse.Contents.length}`);
          console.log('\n   📁 Arquivos no bucket:');
          listResponse.Contents.forEach((obj, i) => {
            console.log(`   ${i + 1}. ${obj.Key}`);
            console.log(`      Size: ${obj.Size} bytes`);
            console.log(`      Last Modified: ${obj.LastModified}`);
          });
        } else {
          console.log('   ⚠️ Nenhum arquivo de áudio encontrado no bucket!');
        }
      } catch (error: any) {
        console.log(`   ❌ Erro ao listar arquivos: ${error.message}`);
      }
      
    } else {
      console.log('   ⚠️ Nenhuma mensagem de áudio encontrada no banco!');
    }
    
  } catch (error: any) {
    console.error(`   ❌ Erro ao buscar mensagens: ${error.message}`);
  }
  
  // 5. Sugestões de correção
  console.log('\n5️⃣ ANÁLISE E SUGESTÕES:');
  console.log('\n   🔍 Possíveis causas do erro:');
  console.log('   1. Servidor não está rodando (fetch failed)');
  console.log('   2. Arquivo não existe no S3 (404)');
  console.log('   3. Problema de CORS no S3');
  console.log('   4. Path incorreto no upload');
  console.log('   5. Credenciais do S3 inválidas');
  
  console.log('\n   💡 Soluções sugeridas:');
  console.log('   1. Verificar se o servidor está rodando: npm run dev');
  console.log('   2. Testar acesso direto ao CDN do arquivo');
  console.log('   3. Verificar configuração CORS no DigitalOcean Spaces');
  console.log('   4. Confirmar que o upload está salvando no path correto');
  console.log('   5. Validar credenciais do DigitalOcean Spaces');
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Diagnóstico concluído!\n');
}

diagnoseAudioIssues()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
