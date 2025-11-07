import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function main() {
  const instances = await prisma.whatsAppInstance.findMany({
    select: {
      id: true,
      name: true,
      evolutionInstanceName: true,
      status: true
    }
  });
  
  console.log('📋 INSTÂNCIAS NO BANCO:');
  console.log(JSON.stringify(instances, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
