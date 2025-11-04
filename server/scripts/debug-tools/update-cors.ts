import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function updateCORS() {
  try {
    const spacesEndpoint = new AWS.Endpoint('https://sfo3.digitaloceanspaces.com');
    const s3 = new AWS.S3({
      endpoint: spacesEndpoint,
      accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
      region: 'sfo3'
    });

    const bucketName = 'whatsais3';

    const corsConfiguration = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD'],
          AllowedOrigins: ['http://localhost:3000'],
          MaxAgeSeconds: 3000
        },
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD'],
          AllowedOrigins: ['http://127.0.0.1:3000'],
          MaxAgeSeconds: 3000
        },
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'DELETE', 'HEAD', 'POST'],
          AllowedOrigins: ['http://127.0.0.1'],
          MaxAgeSeconds: 3000
        }
      ]
    };

    console.log('📡 Atualizando CORS...');
    await s3.putBucketCors({
      Bucket: bucketName,
      CORSConfiguration: corsConfiguration
    }).promise();

    console.log('✅ CORS atualizado com sucesso!');

    // Verificar
    const newCors = await s3.getBucketCors({ Bucket: bucketName }).promise();
    console.log('Nova configuração:', JSON.stringify(newCors, null, 2));

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

updateCORS();
