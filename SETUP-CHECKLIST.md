# ✅ Checklist de Implementação - Sistema Anti-Banimento

## 📊 Status Atual

### ✅ Já Implementado
- [x] Serviços core criados (`message-queue-service.ts`, `instance-warmup-service.ts`)
- [x] Worker de fila criado (`message-queue-worker.ts`)
- [x] Tipos definidos (`queue-types.ts`)
- [x] Documentação completa (ANTI-BAN-SYSTEM.md, INTEGRATION-GUIDE.md)
- [x] Campo `warmupState` no schema Prisma
- [x] Dependências instaladas (bullmq, redis packages)
- [x] Variáveis de ambiente configuradas (.env.example)

### ❌ Pendente de Implementação

## 🚀 Passo 1: Instalar e Configurar Redis

### Opção A: Via Homebrew (Recomendado para Mac)
```bash
# 1. Instalar Redis
brew install redis

# 2. Iniciar Redis
brew services start redis

# 3. Verificar se está rodando
redis-cli ping
# Deve retornar: PONG
```

### Opção B: Via Docker
```bash
# 1. Iniciar container Redis
docker run --name whatsai-redis \
  -p 6379:6379 \
  -d redis:alpine

# 2. Verificar se está rodando
docker ps | grep redis

# 3. Testar conexão
docker exec -it whatsai-redis redis-cli ping
# Deve retornar: PONG
```

### ✅ Checklist Redis
- [ ] Redis instalado
- [ ] Redis rodando (porta 6379)
- [ ] Comando `redis-cli ping` retorna `PONG`

---

## 🔧 Passo 2: Atualizar Variáveis de Ambiente

### server/.env
```bash
# Adicionar/Atualizar estas linhas:

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=  # Deixar vazio se não tiver senha

# Anti-Ban System
USE_MESSAGE_QUEUE=true  # ⚠️ IMPORTANTE: Mudar de false para true
```

### ✅ Checklist .env
- [ ] `REDIS_HOST=localhost` configurado
- [ ] `REDIS_PORT=6379` configurado
- [ ] `USE_MESSAGE_QUEUE=true` ativado

---

## 🗄️ Passo 3: Adicionar Campos no Banco de Dados

### Verificar/Adicionar no schema.prisma

```prisma
model WhatsAppInstance {
  // ... campos existentes ...
  
  // ⚠️ VERIFICAR SE JÁ EXISTEM:
  warmupState              String   @default("nova") // nova, aquecendo, ativa
  messagesSentToday        Int      @default(0)
  lastWarmupStateChange    DateTime @default(now())
  
  // ... resto dos campos ...
}
```

### Executar Migração

```bash
cd server

# Gerar migration
npx prisma migrate dev --name add-warmup-fields

# OU apenas sincronizar (development)
npx prisma db push
```

### ✅ Checklist Database
- [ ] Campos warmup existem no schema.prisma
- [ ] Migração executada com sucesso
- [ ] `npx prisma generate` executado

---

## 🔌 Passo 4: Integrar Worker no Servidor

### Arquivo: `server/src/core/app.ts`

**Adicionar no início do arquivo:**
```typescript
import { MessageQueueWorker } from '../workers/message-queue-worker';
```

**Adicionar como propriedade da classe:**
```typescript
export class App {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private socketService: SocketService;
  private messageWorker: MessageQueueWorker | null = null; // ← ADICIONAR ESTA LINHA

  constructor() {
    // ... código existente ...
  }
```

**Adicionar no método `async start()`:**
```typescript
public async start(): Promise<void> {
  // ... código existente ...

  // ============ ADICIONAR ESTE BLOCO ============
  // Inicializar worker de mensagens (Anti-Ban System)
  if (env.USE_MESSAGE_QUEUE) {
    try {
      this.messageWorker = new MessageQueueWorker();
      console.log('✅ Message queue worker started (Anti-Ban System Active)');
    } catch (error) {
      console.error('❌ Failed to start message queue worker:', error);
      console.warn('⚠️ Falling back to direct message sending');
    }
  } else {
    console.log('⚠️ Message queue DISABLED - using direct sending (NOT RECOMMENDED)');
  }
  // ============================================

  // ... resto do código ...
}
```

**Adicionar no método `async stop()`:**
```typescript
public async stop(): Promise<void> {
  console.log('📴 Shutting down server...');

  // ============ ADICIONAR ESTE BLOCO ============
  // Stop message worker
  if (this.messageWorker) {
    console.log('⏹️ Closing message queue worker...');
    await this.messageWorker.close();
    console.log('✅ Message queue worker closed');
  }
  // ============================================

  // Stop campaign scheduler
  await campaignScheduler.stop();
  
  // ... resto do código ...
}
```

### ✅ Checklist Integração Worker
- [ ] Import do MessageQueueWorker adicionado
- [ ] Propriedade `messageWorker` adicionada na classe
- [ ] Worker inicializado no método `start()`
- [ ] Worker finalizado no método `stop()`

---

## 📝 Passo 5: Atualizar conversation-service.ts

### Localização: `server/src/services/conversation-service.ts`

**Adicionar import no início:**
```typescript
import { MessageQueueService } from './message-queue-service';
```

**Adicionar instância do serviço:**
```typescript
export class ConversationService {
  private messageQueueService: MessageQueueService; // ← ADICIONAR

  constructor() {
    this.messageQueueService = new MessageQueueService(); // ← ADICIONAR
  }
  
  // ... resto do código ...
}
```

**Localizar método `sendMessage` e substituir:**

```typescript
async sendMessage(params: SendMessageParams): Promise<Message> {
  // ... validações existentes ...

  // ============ SUBSTITUIR ESTA PARTE ============
  // ANTES (envio direto):
  // await evolutionService.sendTextMessage(...)
  
  // DEPOIS (usando fila):
  if (env.USE_MESSAGE_QUEUE) {
    // Envia via fila (com warm-up e rate limiting)
    await this.messageQueueService.addMessageToQueue({
      instanceId: instance.id,
      instanceName: instance.evolutionInstanceName,
      number: params.remoteJid.replace('@s.whatsapp.net', ''),
      text: params.content,
      apiUrl: instance.evolutionApiUrl,
      apiKey: instance.evolutionApiKey
    });
  } else {
    // Fallback: envio direto (legado)
    await evolutionService.sendTextMessage(
      instance.evolutionInstanceName,
      params.remoteJid.replace('@s.whatsapp.net', ''),
      params.content
    );
  }
  // ============================================

  // ... resto do método (salvar mensagem no DB, etc) ...
}
```

### ✅ Checklist conversation-service
- [ ] Import do MessageQueueService adicionado
- [ ] Instância criada no constructor
- [ ] Método `sendMessage` atualizado para usar fila

---

## 🧪 Passo 6: Testar o Sistema

### 6.1 Verificar Redis
```bash
# Terminal 1: Monitorar Redis
redis-cli monitor

# Deve mostrar comandos sendo executados quando mensagens forem enviadas
```

### 6.2 Verificar Logs do Worker
```bash
# Terminal 2: Iniciar servidor em modo desenvolvimento
cd server
npm run dev

# Deve aparecer:
# ✅ Message queue worker started (Anti-Ban System Active)
```

### 6.3 Testar Envio de Mensagem

**Via cURL:**
```bash
curl -X POST http://localhost:5173/api/conversations/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "conversationId": "conv-id-here",
    "content": "Teste de mensagem via fila",
    "messageType": "text"
  }'
```

**Ou via frontend WhatsAI**

### 6.4 Verificar Comportamento

**Instância NOVA (0-9 mensagens):**
- ✅ Delay de 90-150 segundos entre mensagens
- ✅ Logs mostram: `⏳ [WARMUP] Estado: nova - Delay: XXXs`

**Instância AQUECENDO (10-49 mensagens):**
- ✅ Delay de 30-60 segundos
- ✅ Logs mostram: `⏳ [WARMUP] Estado: aquecendo - Delay: XXXs`

**Instância ATIVA (50+ mensagens):**
- ✅ Delay de 1-3 segundos
- ✅ Logs mostram: `⏳ [WARMUP] Estado: ativa - Delay: XXXs`

### ✅ Checklist Testes
- [ ] Redis monitor mostrando atividade
- [ ] Worker iniciado sem erros
- [ ] Mensagem enviada via API
- [ ] Mensagem processada pela fila (ver logs)
- [ ] Mensagem entregue no WhatsApp
- [ ] Delays aplicados corretamente
- [ ] Estado warmup transicionando (nova → aquecendo → ativa)

---

## 🎯 Passo 7: Monitoramento (Opcional)

### 7.1 Dashboard BullMQ (Recomendado)

```bash
# Instalar globalmente
npm install -g bull-board

# Iniciar dashboard
npx bull-board
```

Acesse: `http://localhost:3000/queues`

### 7.2 Redis Commander (Alternativa)

```bash
# Via Docker
docker run --rm --name redis-commander \
  -d \
  -p 8081:8081 \
  --link whatsai-redis:redis \
  rediscommander/redis-commander:latest \
  --redis-host redis
```

Acesse: `http://localhost:8081`

### ✅ Checklist Monitoramento
- [ ] Dashboard BullMQ instalado (opcional)
- [ ] Redis Commander rodando (opcional)
- [ ] Jobs sendo processados visíveis

---

## 📈 Passo 8: Deploy em Produção

### 8.1 Preparação

```bash
# 1. Build do projeto
cd server
npm run build

# 2. Testar build
node dist/src/server.js

# 3. Verificar se worker inicia corretamente
```

### 8.2 Variáveis de Ambiente Produção

```bash
# .env.production
NODE_ENV=production
USE_MESSAGE_QUEUE=true

# Redis (usar serviço gerenciado recomendado)
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# ... outras variáveis ...
```

### 8.3 Deploy Gradual (Recomendado)

1. **Fase 1 (10%)**: Ativar para 10% dos usuários
2. **Fase 2 (50%)**: Aumentar para 50% após 48h sem problemas
3. **Fase 3 (100%)**: Rollout completo após mais 48h

### ✅ Checklist Produção
- [ ] Build gerado sem erros
- [ ] Redis production configurado
- [ ] Variáveis de ambiente production definidas
- [ ] Deploy gradual planejado
- [ ] Monitoramento ativo (Sentry, logs)

---

## 🔥 Troubleshooting

### Problema: Worker não inicia
```bash
# Verificar se Redis está acessível
redis-cli -h localhost -p 6379 ping

# Verificar logs do servidor
tail -f server/logs/app.log
```

### Problema: Mensagens não sendo processadas
```bash
# Verificar fila no Redis
redis-cli
> KEYS *whatsai:messages*
> LLEN bull:whatsai:messages:wait

# Ver jobs pendentes
> LRANGE bull:whatsai:messages:wait 0 -1
```

### Problema: Delays muito longos
```bash
# Verificar estado warmup da instância
# No código, adicionar log temporário:
console.log('Estado atual:', await prisma.whatsAppInstance.findUnique({
  where: { id: 'instance-id' },
  select: { warmupState, messagesSentToday }
}));
```

---

## 📚 Documentação Adicional

- [ANTI-BAN-SYSTEM.md](./ANTI-BAN-SYSTEM.md) - Arquitetura técnica completa
- [INTEGRATION-GUIDE.md](./INTEGRATION-GUIDE.md) - Guia de integração detalhado
- [VISUAL-DIAGRAMS.md](./VISUAL-DIAGRAMS.md) - Diagramas visuais do fluxo

---

## ✅ Checklist Final

### Ambiente Local
- [ ] Redis instalado e rodando
- [ ] Variáveis `.env` configuradas
- [ ] Migração do banco executada
- [ ] Worker integrado no `app.ts`
- [ ] `conversation-service.ts` atualizado
- [ ] Testes básicos passando
- [ ] Delays funcionando conforme esperado

### Ambiente Produção
- [ ] Redis gerenciado configurado
- [ ] Variáveis produção configuradas
- [ ] Build gerado e testado
- [ ] Deploy gradual planejado
- [ ] Monitoramento ativo

---

## 🎉 Próximos Passos

Após completar todos os itens deste checklist:

1. ✅ Sistema anti-banimento estará **100% funcional**
2. 🚀 Pronto para **deploy em produção**
3. 📊 Monitoramento de **taxa de banimentos** (deve cair drasticamente)
4. 🎯 Considerar **campanhas em massa** com segurança

---

**Última atualização**: 2025-11-13
**Status**: 🚧 Em Implementação
