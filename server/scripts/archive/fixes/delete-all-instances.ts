import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EVOLUTION_API_URL = 'https://hsapi.studio/';
const EVOLUTION_API_KEY = 'Pz6qEerZE5IYwaoc8ZCQxmBdLAinX4dl';

const client = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'apikey': EVOLUTION_API_KEY
  },
  timeout: 30000
});

async function deleteAllInstances() {
  try {
    console.log('🔍 Buscando todas as instâncias...\n');
    
    // Buscar instâncias da Evolution API
    const response = await client.get('/instance/fetchInstances');
    const instances = response.data || [];
    
    console.log(`📊 Encontradas ${instances.length} instâncias na Evolution API\n`);
    
    if (instances.length === 0) {
      console.log('✅ Nenhuma instância para deletar na Evolution API');
    } else {
      // Deletar cada instância
      for (const instance of instances) {
        const instanceName = instance.name;
        
        if (instanceName) {
          try {
            console.log(`🗑️  Deletando instância: ${instanceName}`);
            await client.delete(`/instance/delete/${instanceName}`);
            console.log(`   ✅ Instância ${instanceName} deletada da Evolution API`);
          } catch (error: any) {
            console.error(`   ❌ Erro ao deletar ${instanceName}:`, error.response?.data || error.message);
          }
        } else {
          console.log('⚠️  Instância sem nome:', instance);
        }
      }
    }
    
    // Limpar banco de dados
    console.log('\n🗑️  Limpando banco de dados...\n');
    
    const deletedMessages = await prisma.message.deleteMany({});
    console.log(`   ✅ ${deletedMessages.count} mensagens deletadas`);
    
    const deletedInstances = await prisma.whatsAppInstance.deleteMany({});
    console.log(`   ✅ ${deletedInstances.count} instâncias deletadas do banco`);
    
    console.log('\n🎉 Todas as instâncias foram deletadas com sucesso!');
    console.log('✨ Você pode começar do zero agora!\n');
    
  } catch (error: any) {
    console.error('❌ Erro ao deletar instâncias:', error.response?.data || error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllInstances()
  .catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
