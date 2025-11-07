import axios from 'axios';

const EVOLUTION_API_URL = 'https://hsapi.studio';
const EVOLUTION_API_KEY = 'Pz6qEerZE5IYwaoc8ZCQxmBdLAinX4dl';

async function checkInstanceStatus() {
  const instanceName = 'whatsai_dc7b043e_45af_4511_a06b_783f64f7cd89';
  
  console.log('🔍 Verificando status da instância:', instanceName);
  console.log('📡 URL:', EVOLUTION_API_URL);
  
  try {
    // 1. Buscar informações da instância
    const instanceInfo = await axios.get(
      `${EVOLUTION_API_URL}/instance/fetchInstances`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY
        },
        params: {
          instanceName: instanceName
        }
      }
    );
    
    console.log('\n📋 Informações da instância:');
    console.log(JSON.stringify(instanceInfo.data, null, 2));
    
    // 2. Buscar connection state
    const connectionState = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY
        }
      }
    );
    
    console.log('\n🔌 Estado da conexão:');
    console.log(JSON.stringify(connectionState.data, null, 2));
    
  } catch (error: any) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

checkInstanceStatus();
