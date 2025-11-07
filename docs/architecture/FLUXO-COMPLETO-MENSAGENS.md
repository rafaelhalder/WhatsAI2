# 📊 Fluxo Completo de Mensagens - WhatsAI2

## 📝 Visão Geral

Este documento descreve o fluxo completo de disparo e recebimento de mensagens no sistema WhatsAI2, incluindo verificação de limites e contabilização.

---

## 🔄 Fluxo de Envio de Mensagens

### 1. Envio Manual via API (Chat)

**Rotas:**
- `POST /api/instances/:instanceId/send-message`
- `POST /api/conversations/:conversationId/messages`
- `POST /api/conversations/:conversationId/media`
- `POST /api/conversations/:conversationId/upload-media`
- `POST /api/conversations/instance/:instanceId/send`

**Fluxo:**
```
1. Usuário faz requisição para enviar mensagem
2. authMiddleware → Valida autenticação
3. checkMessageLimit → Verifica se usuário pode enviar (PlansService)
   ├─ Consulta plano do usuário
   ├─ Verifica messages_today vs messages_per_day
   └─ Se limite atingido → HTTP 403 "Limite diário de mensagens atingido"
4. Controller → Processa e valida dados
5. Service → Envia via Evolution API
6. Se sucesso:
   ├─ Salva mensagem no banco (fromMe=true)
   └─ incrementMessageCount → Incrementa contador do usuário
7. Retorna resposta ao usuário
```

**Implementação:**
```typescript
// conversation-routes.ts
router.post('/:conversationId/messages', 
  checkMessageLimit,           // ✅ Verifica limite
  (req, res, next) => {
    conversationController.sendMessage(req, res).then(() => {
      incrementMessageCount(req, res, next);  // ✅ Incrementa contador
    })
  }
);
```

---

### 2. Envio Automático via Campanhas

**Rota:** `POST /api/campaigns/:id/actions` (action: start)

**Fluxo:**
```
1. Usuário inicia campanha
2. checkCampaignLimit → Verifica limite de campanhas
3. CampaignService.startCampaign() → Inicia processamento
4. Para CADA mensagem da campanha:
   ├─ PlansService.canPerformAction('send_message') 
   │  └─ Verifica limite ANTES de cada envio
   ├─ Se limite OK:
   │  ├─ Envia via Evolution API
   │  ├─ Atualiza status da mensagem (SENT)
   │  ├─ Incrementa campaign.sentCount
   │  └─ PlansService.incrementMessageCount() ✅
   └─ Se limite atingido:
      ├─ Atualiza status da mensagem (FAILED: "Limite atingido")
      ├─ Pausa campanha automaticamente
      └─ Emite evento 'campaign:paused'
5. Quando todas enviadas → Status = COMPLETED
```

**Implementação:**
```typescript
// campaign-service.ts
private async sendCampaignMessage(messageId, campaign) {
  // 1. Verificar limite ANTES de enviar
  const canSend = await PlansService.canPerformAction(
    campaign.userId, 
    'send_message'
  );
  
  if (!canSend.allowed) {
    // Pausar campanha e marcar mensagem como falhada
    await prisma.campaign.update({ 
      status: 'PAUSED' 
    });
    return;
  }

  // 2. Enviar mensagem
  await evolutionService.sendTextMessage(...);

  // 3. Incrementar contador
  await PlansService.incrementMessageCount(campaign.userId, 1); ✅
}
```

**⚠️ Comportamento Importante:**
- Campanha é pausada automaticamente ao atingir limite
- Mensagens pendentes ficam com status FAILED
- Usuário pode retomar campanha após reset do limite diário

---

### 3. Envio Automático via Auto-Respostas

**Trigger:** Webhook `messages.upsert` (mensagem recebida)

**Fluxo:**
```
1. Webhook recebe mensagem (fromMe=false)
2. WebhookController.processAutoResponses()
3. AutoResponseService.checkAutoResponses()
   └─ Busca regra que dê match com mensagem
4. Se houver match:
   ├─ PlansService.canPerformAction('send_message')
   │  └─ Verifica limite do usuário ✅
   ├─ Se limite OK:
   │  ├─ Substitui variáveis na resposta
   │  ├─ Envia via Evolution API
   │  ├─ PlansService.incrementMessageCount() ✅
   │  └─ Incrementa autoResponse.triggerCount
   └─ Se limite atingido:
      └─ Ignora auto-resposta (não envia)
```

**Implementação:**
```typescript
// webhook-controller.ts
private async processAutoResponses(instanceId, messageData) {
  // 1. Verifica se há regra de auto-resposta
  const autoResponse = await autoResponseService.checkAutoResponses(...);
  
  if (autoResponse) {
    // 2. Busca instância e userId
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: instanceId },
      select: { userId: true, ... }
    });

    // 3. Verifica limite
    const canSend = await PlansService.canPerformAction(
      instance.userId, 
      'send_message'
    );

    if (!canSend.allowed) {
      console.log('⚠️ Limite atingido, ignorando auto-resposta');
      return;
    }

    // 4. Envia resposta
    await apiService.sendTextMessage(...);

    // 5. Incrementa contador
    await PlansService.incrementMessageCount(instance.userId, 1); ✅
  }
}
```

---

### 4. Envio Automático via Mensagem Fora de Expediente

**Trigger:** Webhook `messages.upsert` + fora do horário comercial

**Fluxo:**
```
1. Webhook recebe mensagem (fromMe=false)
2. WebhookController.checkBusinessHours()
3. Verifica:
   ├─ Dia da semana está em businessDays?
   └─ Hora atual está entre businessHoursStart e businessHoursEnd?
4. Se FORA do expediente:
   ├─ PlansService.canPerformAction('send_message') ✅
   ├─ Se limite OK:
   │  ├─ Substitui variáveis na mensagem
   │  ├─ Envia via Evolution API
   │  └─ PlansService.incrementMessageCount() ✅
   └─ Se limite atingido:
      └─ Ignora mensagem de ausência
```

**Implementação:**
```typescript
// webhook-controller.ts
private async sendOutOfOfficeMessage(instance, messageData) {
  // 1. Verifica limite
  const canSend = await PlansService.canPerformAction(
    instance.userId, 
    'send_message'
  );

  if (!canSend.allowed) {
    console.log('⚠️ Limite atingido, ignorando out-of-office');
    return;
  }

  // 2. Envia mensagem
  await apiService.sendTextMessage(...);

  // 3. Incrementa contador
  await PlansService.incrementMessageCount(instance.userId, 1); ✅
}
```

---

## 📥 Fluxo de Recebimento de Mensagens

### 1. Mensagem Recebida

**Webhook:** `messages.upsert`

**Fluxo:**
```
1. Evolution API envia webhook para sistema
2. WebhookController.handleEvolutionWebhook()
3. Valida schema do webhook
4. ConversationService.handleIncomingMessageAtomic()
   ├─ Extrai dados da mensagem
   ├─ Normaliza números de telefone
   ├─ Busca ou cria conversa
   ├─ Salva mensagem no banco (fromMe=false)
   └─ Atualiza conversation.lastMessage e lastMessageAt
5. SocketService.emit() → Notifica frontend em tempo real
6. Processa automações (em paralelo, não bloqueia webhook):
   ├─ checkBusinessHours() → Verifica horário
   └─ processAutoResponses() → Verifica regras
```

**Dados Salvos:**
```typescript
await prisma.message.create({
  data: {
    instanceId,
    remoteJid,
    fromMe: false,
    messageType,      // TEXT, IMAGE, VIDEO, etc
    content,          // Texto ou caption
    mediaUrl,         // URL da mídia (se houver)
    senderName,       // Nome do remetente (em grupos)
    senderNumber,     // Número do remetente (participantAlt)
    messageId,        // ID único da mensagem
    timestamp,        // Data/hora do envio
    status: 'RECEIVED'
  }
});
```

---

### 2. Atualização de Status

**Webhook:** `messages.update`

**Fluxo:**
```
1. Evolution API envia atualização de status
2. Sistema identifica mensagem pelo messageId
3. Atualiza Message.status no banco
4. Possíveis status:
   ├─ PENDING → Enviada mas não confirmada
   ├─ SERVER_ACK → Servidor recebeu
   ├─ DELIVERY_ACK → Entregue ao destinatário
   ├─ READ → Lida pelo destinatário
   └─ PLAYED → Reproduzida (áudio/vídeo)
```

**Nota:** Este webhook é processado mas atualmente não dispara ações adicionais.

---

## 📊 Contabilização de Mensagens

### Como Funciona

O sistema usa dois campos no modelo `User`:

1. **planLimits (JSON):**
```json
{
  "instances": 1,
  "messages_per_day": 100,
  "broadcasts": false,
  "templates": 3
}
```

2. **usageStats (JSON):**
```json
{
  "messages_today": 45,
  "last_reset": "2025-11-06T00:00:00.000Z",
  "campaigns_this_month": 2,
  "storage_used_gb": 0.5
}
```

### Reset Diário

```typescript
PlansService.shouldResetUsage(usageStats)
├─ Compara last_reset com data atual
├─ Se dia diferente:
│  └─ Reset: messages_today = 0
└─ Atualiza last_reset
```

### Verificação de Limite

```typescript
PlansService.canPerformAction(userId, 'send_message')
├─ Obtém planLimits e usageStats do usuário
├─ Verifica reset diário
├─ Compara: messages_today < messages_per_day
├─ Se -1 → Ilimitado (ENTERPRISE)
└─ Retorna: { allowed: true/false, reason: string }
```

### Incremento de Contador

```typescript
PlansService.incrementMessageCount(userId, count)
├─ Obtém usageStats atual
├─ Verifica se precisa reset
├─ Incrementa: messages_today += count
└─ Salva no banco
```

---

## 🔍 Dados Úteis nos Webhooks

### 1. Participant e ParticipantAlt (Grupos)

**Problema:** Em grupos, `remoteJid` é o ID do grupo, não do remetente.

**Solução:**
```typescript
{
  "key": {
    "remoteJid": "120363354268753950@g.us",
    "participant": "150684716511331@lid",      // ID interno
    "participantAlt": "554191255426@s.whatsapp.net"  // Número real ✅
  }
}
```

**Status:** ✅ Já sendo processado pelo sistema

---

### 2. Profile Picture URL

**Disponível em:** `contacts.update`, `contacts.upsert`

```json
{
  "event": "contacts.update",
  "data": {
    "remoteJid": "554191255426@s.whatsapp.net",
    "profilePicUrl": "https://pps.whatsapp.net/v/..."
  }
}
```

**Utilidade:**
- Exibir foto de perfil dos contatos
- Sincronizar com sistema
- Detectar mudanças de foto

**Status:** ❓ Verificar se está sendo salvo

**Recomendação:** Adicionar campo `profilePictureUrl` ao modelo `Conversation`

---

### 3. Message Source

**Disponível em:** `send.message`

```json
{
  "event": "send.message",
  "data": {
    "source": "web"  // ou "mobile", "api"
  }
}
```

**Utilidade:**
- Identificar origem das mensagens
- Estatísticas de uso
- Auditoria

**Status:** ❓ Verificar se está sendo salvo

**Recomendação:** Adicionar campo `source` ao modelo `Message`

---

### 4. Context Info (Menções e Respostas)

**Disponível em:** `messages.upsert`

```json
{
  "contextInfo": {
    "mentionedJid": ["554191255426@s.whatsapp.net"],
    "quotedMessage": {
      "conversation": "Mensagem original"
    }
  }
}
```

**Utilidade:**
- Mostrar quem foi mencionado
- Exibir mensagem sendo respondida
- Contexto completo da conversa

**Status:** ❓ Verificar se está sendo aproveitado

**Recomendação:** 
- Adicionar campo `mentionedUsers` ao modelo `Message`
- Adicionar campo `quotedMessageId` ao modelo `Message`

---

## 📋 Resumo de Correções Implementadas

### ✅ Problema 1: Rotas de Conversação
**Antes:** Não verificavam limites nem contabilizavam  
**Depois:** 
- ✅ `checkMessageLimit` adicionado
- ✅ `incrementMessageCount` adicionado
- ✅ Contador só incrementa se envio bem-sucedido

### ✅ Problema 2: Auto-Respostas
**Antes:** Enviavam sem verificar limites  
**Depois:**
- ✅ Verifica limite antes de enviar
- ✅ Incrementa contador após envio
- ✅ Ignora se limite atingido

### ✅ Problema 3: Campanhas
**Antes:** Enviavam sem verificar limites  
**Depois:**
- ✅ Verifica limite antes de CADA mensagem
- ✅ Incrementa contador após envio
- ✅ Pausa campanha automaticamente ao atingir limite
- ✅ Marca mensagens como falhadas com motivo específico

### ✅ Problema 4: Out-of-Office
**Antes:** Enviava sem verificar limites  
**Depois:**
- ✅ Verifica limite antes de enviar
- ✅ Incrementa contador após envio
- ✅ Ignora se limite atingido

---

## 🎯 Próximas Melhorias Sugeridas

1. **Salvar Profile Picture URL**
   - Adicionar campo `profilePictureUrl` em `Conversation`
   - Atualizar quando webhook `contacts.update` for recebido

2. **Salvar Message Source**
   - Adicionar campo `source` em `Message`
   - Útil para analytics e auditoria

3. **Salvar Context Info**
   - Adicionar `mentionedUsers` (array) em `Message`
   - Adicionar `quotedMessageId` em `Message`
   - Melhor UX ao exibir conversas

4. **Dashboard de Limites**
   - Mostrar uso atual vs limite
   - Alertas quando próximo do limite
   - Histórico de consumo

5. **Rate Limiting Inteligente**
   - Fila de mensagens quando próximo do limite
   - Priorização de mensagens importantes
   - Sugestão de upgrade de plano

---

## 📞 Contato e Suporte

Para dúvidas sobre o fluxo de mensagens:
1. Consulte este documento
2. Verifique logs do sistema (webhook-logs.txt)
3. Use script de análise: `node analyze-message-flow.js`

---

**Documento atualizado em:** 2025-11-06  
**Versão:** 1.0
