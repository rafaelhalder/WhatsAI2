# Guia de Integração - Sistema Anti-Banimento

Este guia mostra como integrar o sistema anti-banimento nos serviços existentes.

## 📋 Passo a Passo

### 1. Inicializar o Worker no Servidor

Adicione o worker ao arquivo principal do servidor (`server/src/server.ts`):

```typescript
import { MessageQueueWorker } from './workers/message-queue-worker';

// ... código existente ...

// Inicializar worker de mensagens (apenas se queue estiver habilitada)
let messageWorker: MessageQueueWorker | null = null;

if (env.USE_MESSAGE_QUEUE) {
  messageWorker = new MessageQueueWorker();
  console.log('✅ Message queue worker started');
} else {
  console.log('⚠️ Message queue DISABLED - using direct sending');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, closing server gracefully...');
  
  if (messageWorker) {
    await messageWorker.close();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, closing server gracefully...');
  
  if (messageWorker) {
    await messageWorker.close();
  }
  
  process.exit(0);
});
```

### 2. Atualizar `conversation-service.ts`

**Localização**: `server/src/services/conversation-service.ts`

#### Método `sendMessage` (linha ~818)

**ANTES:**
```typescript
async sendMessage(instanceId: string, remoteJid: string, content: string): Promise<Message> {
  try {
    const normalizedRemoteJid = this.normalizeWhatsAppNumber(remoteJid, null, false);
    
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: instanceId },
      select: { id: true, evolutionInstanceName: true }
    });

    if (!instance) {
      throw new Error(`Instância não encontrada: ${instanceId}`);
    }

    const [evolutionResponse, conversation] = await Promise.all([
      this.evolutionApiService.sendTextMessage(
        instance.evolutionInstanceName, 
        normalizedRemoteJid,
        content
      ),
      this.createOrUpdateConversation(instanceId, normalizedRemoteJid)
    ]);

    // ... resto do código
  }
}
```

**DEPOIS:**
```typescript
import { MessagingService } from './messaging-service';

export class ConversationService {
  // Adicionar nova propriedade
  private messagingService: MessagingService;

  constructor() {
    // ... inicialização existente ...
    this.messagingService = MessagingService.getInstance();
  }

  async sendMessage(instanceId: string, remoteJid: string, content: string): Promise<Message> {
    try {
      const normalizedRemoteJid = this.normalizeWhatsAppNumber(remoteJid, null, false);
      
      // Criar/atualizar conversa primeiro
      const conversation = await this.createOrUpdateConversation(instanceId, normalizedRemoteJid);

      // Enviar mensagem via MessagingService (usa fila ou direto baseado em config)
      const result = await this.messagingService.sendTextMessage({
        instanceId,
        remoteJid: normalizedRemoteJid,
        content,
        priority: 'normal',
        metadata: {
          conversationId: conversation.id
        }
      });

      // Salvar mensagem no banco
      const message = await this.messageRepository.create({
        instanceId,
        remoteJid: normalizedRemoteJid,
        fromMe: true,
        messageType: 'TEXT',
        content,
        messageId: result.messageId || `msg_${Date.now()}`,
        timestamp: new Date(),
        status: 'PENDING', // Será atualizado quando enviar
        conversationId: conversation.id
      });

      // Atualizar conversa e emitir eventos (em background)
      Promise.all([
        this.conversationRepository.update(conversation.id, {
          lastMessage: content,
          lastMessageAt: new Date()
        }),
        (async () => {
          this.socketService.emitToInstance(instanceId, 'message:sent', {
            conversationId: conversation.id,
            message: {
              id: message.id,
              content: message.content,
              fromMe: message.fromMe,
              timestamp: message.timestamp,
              messageType: message.messageType
            }
          });
        })()
      ]).catch(error => {
        console.error('⚠️ Erro em operações pós-envio:', error);
      });

      return message;
    } catch (error: any) {
      console.error('❌ [sendMessage] Error:', error);
      throw error;
    }
  }
}
```

### 3. Atualizar `instance-service.ts`

**Localização**: `server/src/services/instance-service.ts`

#### Método `sendMessage` (linha ~477)

**ANTES:**
```typescript
async sendMessage(instanceId: string, number: string, text: string): Promise<any> {
  try {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    // ... validações ...

    const result = await this.conversationService.sendMessage(
      instanceId,
      remoteJid,
      text
    );

    return result;
  } catch (error: any) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
}
```

**DEPOIS:**
```typescript
import { MessagingService } from './messaging-service';

export class WhatsAppInstanceService {
  // Adicionar nova propriedade
  private messagingService: MessagingService;

  constructor() {
    // ... inicialização existente ...
    this.messagingService = MessagingService.getInstance();
  }

  async sendMessage(instanceId: string, number: string, text: string): Promise<any> {
    try {
      const instance = this.instances.get(instanceId);
      if (!instance) {
        throw new Error('Instance not found');
      }

      // 🔄 Verificar status da instância
      const currentApiStatus = await this.evolutionApi.getInstanceStatus(instance.evolutionInstanceName);
      
      if (currentApiStatus !== InstanceStatus.CONNECTED) {
        throw new Error(`Instance is not connected (status: ${currentApiStatus})`);
      }

      // Formatar remoteJid
      const remoteJid = number.includes('@') ? number : `${number}@s.whatsapp.net`;

      // Usar conversationService que já usa MessagingService internamente
      const result = await this.conversationService.sendMessage(
        instanceId,
        remoteJid,
        text
      );

      // Atualizar last activity
      instance.lastSeen = new Date();
      instance.updatedAt = new Date();
      this.instances.set(instanceId, instance);

      return result;
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }
}
```

### 4. Migrar Banco de Dados

Execute a migração para adicionar os campos de warm-up:

```bash
cd server
npx prisma migrate dev --name add-warmup-fields
npx prisma generate
```

### 5. Configurar Redis e Habilitar Sistema

**Opção A: Docker (Recomendado)**
```bash
docker run --name whatsai-redis -p 6379:6379 -d redis:alpine
```

**Opção B: Instalação Local**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis
```

**Configurar .env:**
```bash
# Adicionar ao arquivo server/.env
USE_MESSAGE_QUEUE=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 6. Testar o Sistema

**Teste 1: Verificar se Redis está rodando**
```bash
redis-cli ping
# Deve retornar: PONG
```

**Teste 2: Enviar mensagem de teste**
```bash
# O sistema deve adicionar à fila e processar com delay apropriado
# Verificar logs do worker para confirmar
```

**Teste 3: Monitorar fila**
```typescript
import { MessageQueueService } from './services/message-queue-service';

const queueService = MessageQueueService.getInstance();
const stats = await queueService.getQueueStats();

console.log('Queue Stats:', {
  waiting: stats.waiting,
  active: stats.active,
  completed: stats.completed,
  failed: stats.failed
});
```

## 🔄 Migração Gradual

Para migração gradual sem quebrar funcionalidade existente:

### Fase 1: Preparação (Semana 1)
- [x] Instalar Redis
- [x] Deploy das mudanças com `USE_MESSAGE_QUEUE=false`
- [ ] Monitorar logs e performance

### Fase 2: Teste (Semana 2)
- [ ] Ativar queue para 10% dos usuários
- [ ] Monitorar taxa de sucesso e erros
- [ ] Ajustar delays se necessário

### Fase 3: Rollout (Semana 3)
- [ ] Aumentar para 50% dos usuários
- [ ] Validar estabilidade
- [ ] Coletar métricas de warm-up

### Fase 4: Produção (Semana 4)
- [ ] Ativar para 100% dos usuários
- [ ] `USE_MESSAGE_QUEUE=true` por padrão
- [ ] Remover código legado após 1 mês

## 🚨 Rollback

Se necessário fazer rollback:

```bash
# 1. Desabilitar queue no .env
USE_MESSAGE_QUEUE=false

# 2. Reiniciar servidor
pm2 restart whatsai-server

# 3. Mensagens pendentes na fila serão mantidas e podem ser
#    processadas posteriormente quando reativar
```

## 📊 Monitoramento em Produção

### Dashboard de Filas (Opcional)

Você pode usar Bull Board para visualizar a fila:

```bash
npm install @bull-board/express
```

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [
    new BullMQAdapter(messageQueueService.getQueue())
  ],
  serverAdapter
});

app.use('/admin/queues', serverAdapter.getRouter());
```

Acesse: `http://localhost:3001/admin/queues`

## 🎯 Métricas Importantes

Monitore estas métricas:

1. **Taxa de Sucesso**: % de mensagens enviadas com sucesso
2. **Tempo Médio de Fila**: Tempo entre adicionar na fila e enviar
3. **Distribuição de Estados**: Quantas instâncias em cada estado (nova/aquecendo/ativa)
4. **Taxa de Erro**: % de mensagens que falharam após retries
5. **Throughput**: Mensagens por minuto processadas

## 🆘 Suporte

Em caso de problemas:

1. Verificar logs do servidor
2. Verificar logs do Redis
3. Verificar status das instâncias no banco
4. Limpar fila se necessário: `redis-cli FLUSHALL`
