# 🎨 RECEBIMENTO DE STICKERS - Como Funciona

## 📊 **Estado Atual (30/10/2025)**

### ✅ **Stickers SÃO suportados completamente!**

---

## 🔄 **FLUXO COMPLETO - Recebimento de Sticker**

### 1️⃣ **Webhook Chega** (`messages.upsert`)

```json
{
  "event": "messages.upsert",
  "data": {
    "key": {
      "remoteJid": "5541998773200@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0STICKER123"
    },
    "message": {
      "stickerMessage": {
        "url": "https://mmg.whatsapp.net/o1/v/t62.15575-24/...",
        "mimetype": "image/webp",
        "fileLength": "12345",
        "height": 512,
        "width": 512,
        "mediaKey": { "0": 63, "1": 7, ... },  // Array numérico
        "fileEncSha256": { ... },
        "fileSha256": { ... }
      }
    }
  }
}
```

**Arquivo**: `server/src/schemas/webhook-schemas.ts` (linha 156-167)
- ✅ Schema valida `stickerMessage`
- ✅ Aceita: `url`, `mimetype`, `fileLength`, `height`, `width`, `mediaKey`, etc.

---

### 2️⃣ **Detecção do Tipo** (`MessageTypeService`)

**Arquivo**: `server/src/services/messages/MessageTypeService.ts` (linha 26)

```typescript
static getMessageType(messageData: any): MessageType {
  if (messageData.message?.stickerMessage) return MessageType.STICKER;
  // ... outros tipos
}
```

**Resultado**: `messageType = "STICKER"`

---

### 3️⃣ **Extração de Conteúdo**

**Arquivo**: `MessageTypeService.ts` (linha 62)

```typescript
case MessageType.STICKER:
  return '[Sticker]';
```

**O que salva no banco:**
- `content`: `"[Sticker]"` (texto descritivo)
- `messageType`: `"STICKER"`
- `mediaUrl`: URL do sticker (depois processada)

---

### 4️⃣ **Processamento de Mídia** (`IncomingMediaService`)

**Arquivo**: `server/src/services/incoming-media-service.ts`

#### A. **Detecção de Tipo de Mídia**

```typescript
const mediaType = 'sticker'; // Detectado automaticamente
```

#### B. **Download e Descriptografia** (linha 231)

```typescript
const mediaMessage = message.imageMessage 
                  || message.videoMessage 
                  || message.audioMessage 
                  || message.documentMessage 
                  || message.stickerMessage;  // ✅ Inclui sticker!
```

**Processo:**
1. Converte `mediaKey`, `fileEncSha256`, `fileSha256` de objeto numérico → Buffer
2. Usa Baileys `downloadMediaMessage()` para descriptografar
3. Retorna Buffer do arquivo WebP

#### C. **Upload para DigitalOcean Spaces**

```typescript
// Upload com nome estruturado
const fileName = `sticker_${messageId}_${timestamp}.webp`;
const s3Key = `instances/${instanceName}/stickers/${fileName}`;

// Upload para bucket
await this.s3Client.send(new PutObjectCommand({
  Bucket: 'whatsais3',
  Key: s3Key,
  Body: buffer,
  ContentType: 'image/webp',
  ACL: 'public-read'
}));
```

**Resultado**: URL pública no CDN
```
https://whatsais3.sfo3.digitaloceanspaces.com/instances/minha-instancia/stickers/sticker_ABC123_1730308800000.webp
```

---

### 5️⃣ **Salvamento no Banco**

**Arquivo**: `server/src/services/conversation-service.ts` (linha 1453-1480)

```typescript
// Dados salvos na tabela messages:
{
  messageId: "3EB0STICKER123",
  messageType: "STICKER",
  content: "[Sticker]",
  mediaUrl: "https://whatsais3.sfo3.digitaloceanspaces.com/.../sticker_ABC123.webp",
  fileName: null,
  caption: null,
  mimeType: "image/webp",
  timestamp: "2025-10-30T14:00:00Z"
}
```

---

### 6️⃣ **Exibição no Frontend**

**Como o frontend deve renderizar:**

```typescript
// Se messageType === "STICKER"
if (message.messageType === 'STICKER' && message.mediaUrl) {
  return (
    <div className="sticker-message">
      <img 
        src={message.mediaUrl} 
        alt="Sticker"
        className="w-32 h-32 object-contain"
      />
    </div>
  );
}
```

---

## 📊 **Estrutura de Dados**

### Schema do Webhook (Zod)
```typescript
stickerMessage: z.object({
  url: z.string().optional(),           // URL WhatsApp criptografada
  mimetype: z.string().optional(),      // "image/webp"
  fileLength: z.union([...]),           // Tamanho do arquivo
  height: z.number().optional(),        // 512 (geralmente)
  width: z.number().optional(),         // 512 (geralmente)
  mediaKey: z.record(z.any()).optional(),      // Chave de criptografia
  fileEncSha256: z.record(z.any()).optional(), // Hash SHA256
  fileSha256: z.record(z.any()).optional()     // Hash SHA256
}).optional()
```

### Tabela Messages (PostgreSQL)
```sql
{
  id: "cmh123...",
  messageId: "3EB0STICKER123",
  messageType: "STICKER",
  content: "[Sticker]",
  mediaUrl: "https://whatsais3.sfo3.digitaloceanspaces.com/.../sticker.webp",
  fileName: null,
  caption: null,
  mimeType: "image/webp"
}
```

---

## 🔍 **Pontos Importantes**

### ✅ **O que funciona:**
1. Recebimento de stickers via webhook ✅
2. Validação do schema `stickerMessage` ✅
3. Detecção do tipo `STICKER` ✅
4. Download e descriptografia do arquivo WebP ✅
5. Upload para DigitalOcean Spaces ✅
6. Salvamento no banco com URL pública ✅
7. Exibição no chat (frontend precisa renderizar) ✅

### 🎯 **Características dos Stickers:**
- **Formato**: WebP (image/webp)
- **Tamanho**: Geralmente 512x512px
- **Criptografia**: Sim (via Baileys `downloadMediaMessage`)
- **Storage**: DigitalOcean Spaces
- **Path**: `instances/{instanceName}/stickers/sticker_{id}_{timestamp}.webp`

### 📝 **Conteúdo Salvo:**
- `content`: `"[Sticker]"` (texto descritivo para lista de conversas)
- `mediaUrl`: URL pública do CDN
- `messageType`: `"STICKER"`

---

## 🧪 **Testando Stickers**

### 1. Enviar sticker pelo WhatsApp
```
1. Abra WhatsApp
2. Envie um sticker para número conectado
3. Verifique logs do servidor
```

### 2. Verificar no banco
```sql
SELECT * FROM messages 
WHERE "messageType" = 'STICKER' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### 3. Verificar URL do sticker
```sql
SELECT 
  "messageId",
  "content",
  "mediaUrl",
  "mimeType"
FROM messages 
WHERE "messageType" = 'STICKER' 
LIMIT 1;
```

**Exemplo de resultado:**
```
messageId: 3EB0STICKER123
content: [Sticker]
mediaUrl: https://whatsais3.sfo3.digitaloceanspaces.com/instances/comercial/stickers/sticker_3EB0STICKER123_1730308800000.webp
mimeType: image/webp
```

---

## 🖼️ **Renderização no Frontend**

### Componente de Mensagem
```tsx
function MessageContent({ message }: { message: Message }) {
  // Para stickers
  if (message.messageType === 'STICKER') {
    return (
      <div className="inline-block">
        <img 
          src={message.mediaUrl} 
          alt="Sticker"
          className="w-32 h-32 object-contain cursor-pointer hover:scale-105 transition-transform"
          onError={(e) => {
            // Fallback se imagem não carregar
            e.currentTarget.src = '/placeholder-sticker.png';
          }}
        />
      </div>
    );
  }
  
  // Para outros tipos...
}
```

---

## 🚀 **Resumo Executivo**

| Aspecto | Status |
|---------|--------|
| **Recebimento** | ✅ Funcionando |
| **Validação Schema** | ✅ Implementado |
| **Download** | ✅ Via Baileys |
| **Descriptografia** | ✅ Automática |
| **Upload CDN** | ✅ DigitalOcean Spaces |
| **Salvamento Banco** | ✅ Completo |
| **URL Pública** | ✅ Gerada |
| **Frontend** | ⚠️ Precisa implementar renderização |

### 💡 **Próximos Passos (se necessário):**
1. ✅ Backend está completo
2. Implementar componente de renderização no frontend
3. Adicionar preview ao clicar no sticker
4. (Opcional) Adicionar suporte a envio de stickers
