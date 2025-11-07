const { PrismaClient } = require('@prisma/client');
const { EvolutionApiService } = require('../src/services/evolution-api');

const prisma = new PrismaClient();

async function fixContactNames() {
  console.log('🔧 Iniciando correção de contactNames...');

  // Buscar todas as conversas que não são grupos e têm contactName que parece ser um número
  const conversations = await prisma.conversation.findMany({
    where: {
      isGroup: false,
      contactName: {
        not: null
      }
    },
    include: {
      instance: true
    }
  });

  console.log(`📊 Encontradas ${conversations.length} conversas para verificar`);

  let fixed = 0;
  let errors = 0;

  for (const conversation of conversations) {
    try {
      // Verificar se contactName parece ser um número formatado (sem letras, só números)
      const isFormattedNumber = /^[\d\-\+\(\)\s]+$/.test(conversation.contactName) &&
                               conversation.contactName.length >= 10;

      if (!isFormattedNumber) {
        console.log(`⏭️  Pulando conversa ${conversation.id} - contactName parece válido: ${conversation.contactName}`);
        continue;
      }

      console.log(`🔍 Verificando conversa ${conversation.id}: ${conversation.contactName} (${conversation.remoteJid})`);

      // Extrair número do remoteJid
      const number = conversation.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');

      // Buscar informações do contato na Evolution API
      const evolutionService = new EvolutionApiService(
        conversation.instance.evolutionApiUrl,
        conversation.instance.evolutionApiKey
      );

      // Tentar buscar contatos específicos primeiro
      let contacts = await evolutionService.fetchContacts(conversation.instance.evolutionInstanceName, [number]);

      // Se não encontrou, tentar buscar todos os contatos
      if (!contacts || contacts.length === 0) {
        console.log(`🔄 Tentando buscar todos os contatos...`);
        contacts = await evolutionService.fetchContacts(conversation.instance.evolutionInstanceName);

        // Mostrar alguns exemplos para debug
        if (contacts.length > 0) {
          console.log(`📋 Exemplos de contatos encontrados:`);
          contacts.slice(0, 3).forEach((c: any, i: number) => {
            console.log(`  ${i+1}. ID: ${c.id}, PushName: ${c.pushName || 'N/A'}`);
          });
        }
      }

      const contactInfo = contacts.find((c: any) =>
        c.id === conversation.remoteJid ||
        c.id === number ||
        c.id.includes(number) ||
        c.id.replace('@s.whatsapp.net', '') === number ||
        c.id.replace('@s.whatsapp.net', '') === conversation.contactName
      );

      if (contactInfo?.pushName && contactInfo.pushName !== conversation.contactName) {
        // Atualizar contactName
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { contactName: contactInfo.pushName }
        });

        console.log(`✅ Corrigido: ${conversation.contactName} → ${contactInfo.pushName}`);
        fixed++;
      } else {
        console.log(`⏭️  Não foi possível encontrar pushName melhor para ${conversation.contactName}`);
      }

      // Pequena pausa para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Erro ao processar conversa ${conversation.id}:`, error instanceof Error ? error.message : String(error));
      errors++;
    }
  }

  console.log(`\n📈 Resultado:`);
  console.log(`✅ Corrigidas: ${fixed}`);
  console.log(`❌ Erros: ${errors}`);
  console.log(`⏭️  Ignoradas: ${conversations.length - fixed - errors}`);
}

fixContactNames()
  .catch(console.error)
  .finally(() => prisma.$disconnect());