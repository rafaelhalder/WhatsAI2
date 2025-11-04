import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function checkCORS() {
  try {
    const spacesEndpoint = new AWS.Endpoint('https://sfo3.digitaloceanspaces.com');
    const s3 = new AWS.S3({
      endpoint: spacesEndpoint,
      accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
      region: 'sfo3'
    });

    const bucketName = 'whatsais3';

    console.log('🔍 Verificando configuração CORS atual...');
    const currentCors = await s3.getBucketCors({ Bucket: bucketName }).promise();
    console.log('✅ CORS atual:', JSON.stringify(currentCors, null, 2));

  } catch (error: any) {
    if (error.code === 'NoSuchCORSConfiguration') {
      console.log('⚠️ Nenhuma configuração CORS encontrada');
    } else {
      console.error('❌ Erro:', error.message);
    }
  }
}

checkCORS();
