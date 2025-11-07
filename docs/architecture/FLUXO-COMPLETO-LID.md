# 🔄 FLUXO COMPLETO - Sistema de Detecção e Unificação de Duplicatas @lid

## 📨 FASE 1: Recebimento do Webhook

### Entrada: `POST /api/webhooks/evolution/:instanceId`
**Arquivo**: `server/src/api/controllers/webhook-controller.ts`

```
1. Webhook chega via POST
   ├─ Body: JSON com event, instance, data
   └─ Exemplo: { event: 'messages.upsert', data: { key: {...}, message: {...} } }

2. Validação com Zod Schema
   ├─ evolutionWebhookSchema.parse(webhookData)
   ├─ Aceita campos: remoteJid, remoteJidAlt, participant, participantAlt
   └─ Se falhar, usa genericWebhookSchema (fallback)

3. 💾 SALVAMENTO NO LOG (NOVO!)
   ├─ Extrai campos da key: remoteJid, participant, etc.
   ├─ Detecta se tem @lid: hasLid = true/false
   ├─ Detecta se tem campos Alt: hasAltField = true/false
   └─ Salva na tabela webhook_logs (JSON completo + campos indexados)
   
   📊 Tabela: webhook_logs
   {
     instanceId: string,
     event: string,
     rawData: JSON (webhook completo),
     remoteJid: string,
     remoteJidAlt: string | null,
     participant: string | null,
     participantAlt: string | null,
     messageId: string,
     hasLid: boolean,
     hasAltField: boolean,
     createdAt: datetime
   }

4. Verifica se instância existe no banco
   └─ Se não existe, retorna 200 mas ignora
```

---

## 📬 FASE 2: Processamento de Mensagens (`messages.upsert`)

### Arquivo: `server/src/services/conversation-service.ts` → `handleIncomingMessageAtomic()`

```
1. 🗺️ CAPTURA DE MAPEAMENTO @lid → Real
   ├─ Se messageData.key.participant contém '@lid'
   │  └─ E messageData.key.participantAlt contém '@s.whatsapp.net'
   │     └─ Salva no cache: lidToRealNumberCache.set(participant, participantAlt)
   │
   └─ Se messageData.key.remoteJid contém '@lid'
      └─ E messageData.key.remoteJidAlt contém '@s.whatsapp.net'
         └─ Salva no cache: lidToRealNumberCache.set(remoteJid, remoteJidAlt)

2. 🔀 AUTO-MERGE POR MAPEAMENTO (SE HOUVER)
   ├─ Se capturou mapeamento @lid → real
   ├─ Busca conversa com JID @lid
   ├─ Busca conversa com JID real
   └─ Se ambas existem e são diferentes
      └─ Chama mergeConversations(lidJid, realJid)
         └─ Migra mensagens
         └─ Remove conversa @lid

3. 🔄 Normalização do RemoteJid
   ├─ normalizeWhatsAppNumber(remoteJid, remoteJidAlt, false)
   └─ Usa remoteJidAlt se disponível, senão usa remoteJid

4. 👥 Para GRUPOS: Busca informações (nome, foto)
   └─ Chama Evolution API: /group/findGroupInfo

5. 💾 Salvamento no Banco
   ├─ Busca ou cria Conversation
   │  └─ findFirst({ where: { remoteJid, instanceId } })
   │  └─ Se não existe: create()
   │
   └─ Cria Message
      └─ create({ conversationId, instanceId, ... })
```

---

## 👤 FASE 3: Atualização de Contatos (`contacts.update`)

### Arquivo: `server/src/api/controllers/webhook-controller.ts`

```
1. Webhook contacts.update chega
   └─ Dados: { remoteJid, profilePicUrl, pushName }

2. Atualiza conversa no banco
   └─ updateContactFromWebhook(instanceId, remoteJid, { contactName, contactPicture })

3. 🔍 AUTO-DETECT POR FOTO DE PERFIL (NOVO!)
   ├─ Se profilePicUrl foi atualizado
   │
   ├─ Busca conversa que foi atualizada
   │
   ├─ Detecta se é @lid ou número real
   │  └─ isLid = remoteJid.includes('@lid')
   │
   ├─ Busca conversa com MESMA FOTO mas JID diferente
   │  └─ WHERE: contactPicture = profilePicUrl
   │     AND remoteJid = (se @lid busca real, se real busca @lid)
   │     AND id != conversa atual
   │
   └─ Se encontrar duplicata
      └─ Chama mergeConversations(lidJid, realJid)
         ├─ Migra mensagens
         ├─ Preserva nome e foto
         └─ Remove conversa @lid
```

---

## 🔀 FASE 4: Unificação (Merge)

### Arquivo: `server/src/utils/conversation-merger.ts` → `mergeConversations()`

```
1. Busca ambas conversas
   ├─ lidConv = findFirst({ where: { remoteJid: lidRemoteJid } })
   └─ realConv = findFirst({ where: { remoteJid: realNumberRemoteJid } })

2. Decide qual manter
   └─ keepConv = realConv (preferência por número real)
   └─ removeConv = lidConv

3. TRANSAÇÃO no Prisma
   ├─ Migra mensagens
   │  └─ updateMany({ 
   │       where: { conversationId: removeConv.id },
   │       data: { conversationId: keepConv.id, remoteJid: realNumber }
   │     })
   │
   ├─ Atualiza metadados da conversa mantida
   │  └─ update({
   │       where: { id: keepConv.id },
   │       data: {
   │         contactName: keepConv.contactName || removeConv.contactName,
   │         contactPicture: keepConv.contactPicture || removeConv.contactPicture,
   │         lastMessageAt: mais recente,
   │         unreadCount: soma dos dois
   │       }
   │     })
   │
   └─ Remove conversa @lid
      └─ delete({ where: { id: removeConv.id } })

4. Retorna resultado
   └─ { success: true, messagesMigrated: count, ... }
```

---

## 🎯 RESUMO DOS PONTOS DE UNIFICAÇÃO

### 1️⃣ **Auto-Merge por Campos Alt** (Webhook `messages.upsert`)
- **Quando**: Mensagem chega com participantAlt ou remoteJidAlt
- **Condição**: Campos Alt contêm número real enquanto JID principal é @lid
- **Ação**: Captura mapeamento → Verifica duplicatas → Unifica

### 2️⃣ **Auto-Merge por Foto de Perfil** (Webhook `contacts.update`)
- **Quando**: Foto de perfil é atualizada
- **Condição**: Existe outra conversa com mesma foto mas JID diferente (@lid vs real)
- **Ação**: Detecta duplicata → Unifica

### 3️⃣ **Manual via Script** (`auto-merge-duplicates.ts`)
- **Quando**: Executado manualmente
- **Condição**: Varre todas conversas @lid com foto, busca real com mesma foto
- **Ação**: Lista duplicatas → Unifica todas

---

## 📊 ESTRUTURA DE DADOS

### Cache em Memória (ConversationService)
```typescript
lidToRealNumberCache: Map<string, string>
// Exemplo: "79512746377469@lid" → "5541998773200@s.whatsapp.net"

keyIdToLidCache: Map<string, string>
// Exemplo: "ABC123" → "79512746377469@lid"
```

### Banco de Dados

**Tabela: conversations**
```sql
{
  id: string (PK),
  instanceId: string (FK),
  remoteJid: string,  -- Pode ser @lid ou @s.whatsapp.net
  contactName: string,
  contactPicture: string,  -- MESMA URL para @lid e número real!
  lastMessageAt: datetime,
  unreadCount: int
}
```

**Tabela: messages**
```sql
{
  id: string (PK),
  conversationId: string (FK),
  instanceId: string (FK),
  remoteJid: string,
  messageId: string,
  content: string,
  timestamp: datetime
}
```

**Tabela: webhook_logs** (NOVA!)
```sql
{
  id: string (PK),
  instanceId: string,
  event: string,
  rawData: JSONB,  -- Webhook completo
  remoteJid: string,
  remoteJidAlt: string,
  participant: string,
  participantAlt: string,
  hasLid: boolean,
  hasAltField: boolean,
  createdAt: datetime
}
```

---

## 🔍 EXEMPLO REAL - Fluxo da Flávia Araújo

### Estado Inicial (ANTES)
```
Conversation 1:
  remoteJid: "79512746377469@lid"
  contactName: "Flávia Araújo"
  contactPicture: "https://pps.whatsapp.net/.../514307980_..."
  messages: 3

Conversation 2:
  remoteJid: "5541998773200@s.whatsapp.net"
  contactName: null
  contactPicture: "https://pps.whatsapp.net/.../514307980_..."  ← MESMA URL!
  messages: 6
```

### Detecção
```bash
npx tsx check-flavia-picture.ts
# ✅ AS FOTOS SÃO IDÊNTICAS!
```

### Unificação
```bash
npx tsx merge-flavia-conversations.ts
# 🔀 Migra 3 mensagens de @lid para número real
# 🗑️ Remove conversa @lid
```

### Estado Final (DEPOIS)
```
Conversation:
  remoteJid: "5541998773200@s.whatsapp.net"
  contactName: "Flávia Araújo"  ← Copiou nome da @lid
  contactPicture: "https://pps.whatsapp.net/.../514307980_..."
  messages: 9  ← 3 + 6
```

---

## 🚀 COMANDOS ÚTEIS

### Verificar duplicatas
```bash
npx tsx check-flavia-picture.ts
```

### Unificar manualmente
```bash
npx tsx merge-flavia-conversations.ts
```

### Unificar todas automaticamente
```bash
npx tsx auto-merge-duplicates.ts
```

### Analisar webhooks salvos
```bash
npx tsx analyze-webhook-logs.ts
```

### Ver logs no banco
```sql
SELECT * FROM webhook_logs WHERE "hasLid" = true ORDER BY "createdAt" DESC LIMIT 10;
```
