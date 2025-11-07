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
  const conversations = await prisma.conversation.findMany({
    where: { remoteJid: '120363129197033819@g.us' }
  });

  console.log('📋 CONVERSA DO GRUPO TESTADO:');
  console.log(JSON.stringify(conversations, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);