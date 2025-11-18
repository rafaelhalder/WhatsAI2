# Sistema Anti-Banimento WhatsApp - Documentação Técnica

## 📋 Visão Geral

Este documento descreve a implementação de um sistema robusto de prevenção de banimentos do WhatsApp baseado em:

1. **Aquecimento Gradual (Warm-up)**: Instâncias novas enviam mensagens com delays maiores que diminuem progressivamente
2. **Rate Limiting**: Controle de taxa de mensagens por minuto/hora/dia
3. **Delays Aleatórios**: Variação aleatória nos delays para simular comportamento humano
4. **Sistema de Filas (BullMQ + Redis)**: Processamento assíncrono e controlado de mensagens

## 🏗️ Arquitetura

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                    API Routes / Controllers                  │
│          (conversation-controller, instance-controller)      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 MessageQueueService                          │
│              (Adiciona jobs à fila BullMQ)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    BullMQ Queue (Redis)                      │
│          (Armazena jobs pendentes de envio)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│               MessageQueueWorker                             │
│         (Processa jobs com delays inteligentes)              │
│                                                              │
│   1. Calcula delay baseado em warm-up (WarmupService)       │
│   2. Aguarda delay calculado                                 │
│   3. Envia mensagem (EvolutionApiService)                   │
│   4. Registra envio (incrementa contadores)                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Evolution API                              │
│              (WhatsApp Business API)                         │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Estrutura de Arquivos

```
server/src/
├── types/
│   └── queue-types.ts           # Tipos e interfaces do sistema de filas
├── services/
│   ├── message-queue-service.ts # Gerenciador da fila BullMQ
│   ├── instance-warmup-service.ts # Lógica de aquecimento de instâncias
│   └── evolution-api.ts         # Cliente da Evolution API (existente)
├── workers/
│   └── message-queue-worker.ts  # Worker que processa a fila
└── config/
    └── env.ts                   # Configurações de ambiente (com Redis)
```

## 🔧 Configuração do Sistema

### 1. Variáveis de Ambiente

Adicione ao arquivo `.env`:

```bash
# Redis Configuration (for BullMQ message queue - Anti-Ban system)
REDIS_HOST=localhost
REDIS_PORT=6379
# REDIS_PASSWORD=your-redis-password # Opcional: apenas se Redis tiver autenticação
```

### 2. Banco de Dados

O schema do Prisma foi atualizado com campos de warm-up no modelo `WhatsAppInstance`:

```prisma
model WhatsAppInstance {
  // ... campos existentes ...
  
  // Anti-Ban / Warm-up Configuration
  warmupState      String   @default("nova") // nova, aquecendo, ativa
  messagesCount    Int      @default(0)
  firstMessageAt   DateTime?
  lastMessageAt    DateTime?
}
```

Execute a migração do banco de dados:

```bash
cd server
npx prisma migrate dev --name add-warmup-fields
npx prisma generate
```

### 3. Instalar Redis

**Docker (Recomendado):**
```bash
docker run --name whatsai-redis -p 6379:6379 -d redis:alpine
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Windows:**
Baixe do site oficial: https://redis.io/download

## 🚀 Como Usar

### Inicializar o Worker

O worker deve ser iniciado junto com o servidor principal. Adicione ao arquivo `server.ts`:

```typescript
import { MessageQueueWorker } from './workers/message-queue-worker';

// ... código existente ...

// Inicializar worker de mensagens
const messageWorker = new MessageQueueWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await messageWorker.close();
  process.exit(0);
});
```

### Enviar Mensagens via Fila

**Exemplo de Uso nos Controllers:**

```typescript
import { MessageQueueService } from '../services/message-queue-service';

const queueService = MessageQueueService.getInstance();

// Enviar mensagem de texto
await queueService.addMessage({
  instanceId: 'instance-uuid',
  instanceName: 'whatsai_instance_name',
  remoteJid: '5541999999999@s.whatsapp.net',
  messageType: 'text',
  content: 'Olá, tudo bem?',
  metadata: {
    conversationId: 'conv-uuid',
    userId: 'user-uuid',
    priority: 'normal'
  }
});

// Enviar mídia
await queueService.addMessage({
  instanceId: 'instance-uuid',
  instanceName: 'whatsai_instance_name',
  remoteJid: '5541999999999@s.whatsapp.net',
  messageType: 'media',
  mediaUrl: 'https://example.com/image.jpg',
  mediaType: 'image',
  caption: 'Confira esta imagem!',
  metadata: {
    conversationId: 'conv-uuid',
    priority: 'high'
  }
});
```

## ⏱️ Configuração de Delays

Os delays são configurados em `types/queue-types.ts`:

```typescript
export const DEFAULT_DELAY_CONFIG: DelayConfig = {
  nova: {
    min: 90000,  // 90 segundos
    max: 150000, // 150 segundos (2.5 minutos)
    messagesUntilTransition: 10 // Após 10 mensagens, passa para 'aquecendo'
  },
  aquecendo: {
    min: 30000,  // 30 segundos
    max: 60000,  // 60 segundos
    messagesUntilTransition: 50 // Após 50 mensagens totais, passa para 'ativa'
  },
  ativa: {
    min: 1000,   // 1 segundo
    max: 3000    // 3 segundos
  }
};
```

### Como Ajustar os Delays

Você pode criar uma configuração customizada:

```typescript
import { InstanceWarmupService } from './services/instance-warmup-service';

const customDelayConfig = {
  nova: {
    min: 120000,  // 2 minutos
    max: 180000,  // 3 minutos
    messagesUntilTransition: 15
  },
  aquecendo: {
    min: 45000,   // 45 segundos
    max: 90000,   // 90 segundos
    messagesUntilTransition: 100
  },
  ativa: {
    min: 2000,    // 2 segundos
    max: 5000     // 5 segundos
  }
};

const warmupService = new InstanceWarmupService(customDelayConfig);
```

## 📊 Estados de Aquecimento

| Estado | Mensagens | Delay Min | Delay Max | Próximo Estado |
|--------|-----------|-----------|-----------|----------------|
| **nova** | 0-9 | 90s | 150s | aquecendo após 10 msgs |
| **aquecendo** | 10-49 | 30s | 60s | ativa após 50 msgs |
| **ativa** | 50+ | 1s | 3s | - (estado final) |

## 🔄 Transição de Estados

```
┌──────┐    10 mensagens    ┌──────────┐    50 mensagens    ┌──────┐
│ NOVA ├──────────────────►│ AQUECENDO├──────────────────►│ ATIVA│
└──────┘                    └──────────┘                    └──────┘
  ↑                                                            │
  └────────────────────────────────────────────────────────────┘
                   Reset (ex: após reconexão)
```

## 📈 Monitoramento

### Obter Estatísticas da Fila

```typescript
const stats = await queueService.getQueueStats();
console.log({
  waiting: stats.waiting,    // Jobs aguardando processamento
  active: stats.active,      // Jobs sendo processados
  completed: stats.completed, // Jobs completados
  failed: stats.failed       // Jobs que falharam
});
```

### Obter Estado de Warm-up de uma Instância

```typescript
const warmupService = new InstanceWarmupService();
const stats = await warmupService.getWarmupStats('instance-uuid');

console.log({
  state: stats.state,              // 'nova', 'aquecendo', ou 'ativa'
  messagesCount: stats.messagesCount,
  firstMessageAt: stats.firstMessageAt,
  lastMessageAt: stats.lastMessageAt
});
```

## 🛡️ Segurança e Boas Práticas

### 1. Rate Limiting Global

O worker tem rate limiting configurado:
- **Concorrência**: 5 jobs simultâneos
- **Limite**: Máximo 10 jobs por minuto

### 2. Retry Logic

Jobs que falham são automaticamente re-tentados:
- **Tentativas**: 3 vezes
- **Backoff**: Exponencial começando em 5 segundos

### 3. Limpeza Automática

- Jobs completados são mantidos por **1 hora**
- Jobs falhados são mantidos por **24 horas**
- Apenas os últimos **1000 jobs** completados são mantidos

### 4. Tratamento de Erros

O worker:
- Valida se a instância existe no banco
- Verifica se a instância está conectada
- Re-lança erros para que BullMQ possa fazer retry
- Registra todos os erros nos logs

## 🔧 Troubleshooting

### Redis não está rodando

**Erro:** `ECONNREFUSED 127.0.0.1:6379`

**Solução:** Inicie o Redis
```bash
# Docker
docker start whatsai-redis

# Ubuntu/Debian
sudo systemctl start redis

# macOS
brew services start redis
```

### Jobs ficando presos na fila

**Possíveis Causas:**
1. Worker não está rodando
2. Instância desconectada
3. Credenciais da Evolution API incorretas

**Solução:**
```bash
# Verificar status do worker nos logs
# Verificar status das instâncias no banco
# Limpar fila manualmente se necessário (via Redis CLI)
```

### Mensagens sendo enviadas muito devagar

**Causa:** Instância ainda está em estado "nova" ou "aquecendo"

**Solução:** 
- Isso é intencional para prevenir banimentos
- Aguarde a transição para estado "ativa" (após 50 mensagens)
- Ou ajuste os valores em `DEFAULT_DELAY_CONFIG`

## 📝 Migração do Código Existente

### Antes (Envio Direto)

```typescript
// ❌ ANTIGO: Envio síncrono direto
const evolutionApi = new EvolutionApiService();
await evolutionApi.sendTextMessage(instanceName, number, text);
```

### Depois (Envio via Fila)

```typescript
// ✅ NOVO: Envio via fila com anti-ban
const queueService = MessageQueueService.getInstance();
await queueService.addMessage({
  instanceId,
  instanceName,
  remoteJid: number,
  messageType: 'text',
  content: text
});
```

## 🎯 Próximos Passos

1. **Implementar Dashboard**: Interface para monitorar estado das filas e warm-up
2. **Alertas**: Notificações quando uma instância está próxima de limites
3. **Analytics**: Histórico de mensagens enviadas por instância
4. **Auto-tuning**: Ajuste automático de delays baseado em taxa de sucesso

## 📚 Referências

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/documentation)
- [Evolution API Documentation](https://doc.evolution-api.com/)
- [WhatsApp Business API Best Practices](https://developers.facebook.com/docs/whatsapp/api/rate-limits/)
