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
  // Reset the group name to null to force re-fetching
  const updateResult = await prisma.conversation.updateMany({
    where: { remoteJid: '120363129197033819@g.us' },
    data: { contactName: null }
  });

  console.log('📝 GRUPO RESETADO:', updateResult);

  // Check the current state
  const conversation = await prisma.conversation.findFirst({
    where: { remoteJid: '120363129197033819@g.us' }
  });

  console.log('📋 ESTADO ATUAL DO GRUPO:');
  console.log(JSON.stringify(conversation, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);