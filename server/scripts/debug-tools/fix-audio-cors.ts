import AWS from 'aws-sdk';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function fixAudioCORS() {
  console.log('🎵 [AUDIO_CORS] Configurando CORS para arquivos de áudio...');

  try {
    // Configurar AWS SDK para DigitalOcean Spaces
    const spacesEndpoint = new AWS.Endpoint('https://sfo3.digitaloceanspaces.com');
    const s3 = new AWS.S3({
      endpoint: spacesEndpoint,
      accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
      region: 'sfo3'
    });

    const bucketName = 'whatsais3';

    // Configuração CORS COMPLETA para permitir acesso de TODOS os tipos de mídia
    const corsConfiguration = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          AllowedOrigins: ['*'], // Permitir todas as origens
          ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'Accept-Ranges'],
          MaxAgeSeconds: 86400 // 24 horas
        }
      ]
    };

    console.log('📡 Enviando configuração CORS atualizada...');
    console.log('Bucket:', bucketName);
    console.log('Configuração:', JSON.stringify(corsConfiguration, null, 2));

    const result = await s3.putBucketCors({
      Bucket: bucketName,
      CORSConfiguration: corsConfiguration
    }).promise();

    console.log('✅ CORS configurado com sucesso!');
    console.log('Resultado:', result);

    // Verificar se a configuração foi aplicada
    console.log('\n🔍 Verificando configuração CORS aplicada...');
    const currentCors = await s3.getBucketCors({ Bucket: bucketName }).promise();
    console.log('CORS atual:', JSON.stringify(currentCors, null, 2));

  } catch (error: any) {
    console.error('❌ Erro ao configurar CORS:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

fixAudioCORS();
