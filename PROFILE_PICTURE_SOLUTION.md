# Solução: Links de Fotos de Perfil Expirados

## Problema Identificado

### Hipótese Original
Links de fotos de perfil (avatares) de contatos do WhatsApp que expiram não estavam sendo renovados, resultando em imagens quebradas no frontend.

### Análise do Código - PROBLEMA CONFIRMADO ✅

**Fluxo Identificado:**

1. **Webhook `contacts.update`** (webhook-controller.ts, linha 348):
   - Recebia evento com `profilePicUrl` do WhatsApp
   - **ERRO:** Salvava URL temporária diretamente no banco: `contactPicture: profilePicUrl`

2. **Serviço de Conversação** (conversation-service.ts):
   - Método `updateContactFromWebhook()` recebia URLs temporárias
   - Tentava baixar e salvar permanentemente (linhas 116-178)
   - **PROBLEMA:** Nem sempre funcionava, URLs expiravam antes do download

3. **URLs do WhatsApp CDN:**
   - Formato: `https://pps.whatsapp.net/...?token=...`
   - **Expiração:** Após algumas horas/dias
   - **Consequência:** Imagens quebradas no frontend

## Solução Implementada

### Arquitetura: Busca Dinâmica de Fotos

Em vez de armazenar URLs que expiram, implementamos um **endpoint dinâmico** que busca fotos sob demanda.

### 1. Novo Endpoint (Backend)

```http
GET /api/conversations/picture/:instanceId/:jid
```

**Parâmetros:**
- `instanceId` - ID da instância do WhatsApp
- `jid` - JID do contato (ex: `5511999998888@s.whatsapp.net`)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "profilePictureUrl": "https://pps.whatsapp.net/...",
    "jid": "5511999998888@s.whatsapp.net",
    "cached": false
  }
}
```

**Implementação:**
- Arquivo: `server/src/api/controllers/conversation-controller.ts`
- Método: `getContactProfilePicture()`
- Comportamento:
  1. Valida instância e JID
  2. Verifica se instância está conectada
  3. Chama Evolution API para buscar URL **fresca**
  4. Retorna URL válida no momento da requisição

### 2. Alterações no Webhook

**Arquivo:** `server/src/api/controllers/webhook-controller.ts`

**ANTES:**
```typescript
await this.conversationService.updateContactFromWebhook(instanceId, remoteJid, {
  ...(pushName && { contactName: pushName }),
  ...(profilePicUrl && { contactPicture: profilePicUrl }) // ❌ REMOVIDO
});
```

**DEPOIS:**
```typescript
await this.conversationService.updateContactFromWebhook(instanceId, remoteJid, {
  ...(pushName && { contactName: pushName })
  // ✅ NÃO salva mais profilePicUrl
});
```

### 3. Alterações no Serviço de Conversação

**Arquivo:** `server/src/services/conversation-service.ts`

**Métodos Depreciados:**
- `downloadAndStoreProfilePicture()` → `downloadAndStoreProfilePicture_DEPRECATED()`
- `fetchContactInfoInBackground()` → `fetchContactInfoInBackground_DEPRECATED()`

**Lógica Removida:**
- Busca automática de fotos em background
- Download e armazenamento de fotos temporárias
- Atualização de `contactPicture` no banco de dados

### 4. Modelo de Dados

**Tabela `conversations` (Prisma Schema):**
```prisma
model Conversation {
  id              String   @id @default(cuid())
  instanceId      String
  remoteJid       String
  contactName     String?  // ✅ Continua sendo salvo
  contactPicture  String?  // ⚠️ Não mais atualizado (será removido futuramente)
  // ...
}
```

**Nota:** O campo `contactPicture` ainda existe no schema mas não é mais atualizado. Em uma migração futura, pode ser removido.

## Integração Frontend

### Como Usar o Novo Endpoint

**React/TypeScript Example:**

```typescript
const ContactAvatar: React.FC<{ instanceId: string; jid: string }> = ({ instanceId, jid }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/conversations/picture/${instanceId}/${encodeURIComponent(jid)}`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          }
        );
        
        const data = await response.json();
        if (data.success && data.data.profilePictureUrl) {
          setAvatarUrl(data.data.profilePictureUrl);
        } else {
          setAvatarUrl(null); // Sem foto de perfil
        }
      } catch (error) {
        console.error('Erro ao buscar avatar:', error);
        setAvatarUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAvatar();
  }, [instanceId, jid]);

  if (loading) {
    return <Skeleton circle width={40} height={40} />;
  }

  return (
    <Avatar
      src={avatarUrl || '/default-avatar.png'}
      alt="Foto de perfil"
      width={40}
      height={40}
    />
  );
};
```

### Otimizações Recomendadas

1. **Cache no Frontend:**
   ```typescript
   // Usar React Query ou SWR para cachear por 5-10 minutos
   const { data: avatar } = useQuery(
     ['avatar', instanceId, jid],
     () => fetchAvatar(instanceId, jid),
     { staleTime: 5 * 60 * 1000 } // 5 minutos
   );
   ```

2. **Lazy Loading:**
   - Usar `IntersectionObserver` para carregar avatares apenas quando visíveis
   - Evitar requisições desnecessárias

3. **Placeholder Default:**
   - Sempre ter um avatar padrão para quando não houver foto

## Vantagens da Solução

✅ **URLs Sempre Válidas:**
- Fotos buscadas dinamicamente nunca expiram no banco
- Sistema sempre retorna URL fresca da Evolution API

✅ **Menor Uso de Storage:**
- Não armazena imagens de perfil localmente
- Reduz uso de disco e CDN

✅ **Sincronização Automática:**
- Se usuário trocar foto no WhatsApp, próxima requisição já retorna nova foto
- Não precisa webhook para atualizar

✅ **Simplicidade:**
- Menos lógica de background jobs
- Menos pontos de falha
- Código mais limpo e manutenível

## Desvantagens e Mitigações

⚠️ **Latência Adicional:**
- **Problema:** Cada avatar requer uma requisição HTTP extra
- **Mitigação:** Cache no frontend (5-10 min) + lazy loading

⚠️ **Carga na Evolution API:**
- **Problema:** Mais chamadas à Evolution API
- **Mitigação:** Cache no frontend reduz drasticamente as chamadas

⚠️ **Dependência de Conexão:**
- **Problema:** Se instância estiver desconectada, não retorna foto
- **Mitigação:** Endpoint retorna erro 503, frontend usa placeholder

## Testes Recomendados

### 1. Teste Manual do Endpoint

```bash
# Substituir com valores reais
INSTANCE_ID="clw9x8y0z000008l5a1b2c3d4"
JID="5511999998888@s.whatsapp.net"
AUTH_TOKEN="eyJhbGc..."

curl -X GET \
  "http://localhost:3000/api/conversations/picture/$INSTANCE_ID/$JID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

**Resposta Esperada:**
```json
{
  "success": true,
  "data": {
    "profilePictureUrl": "https://pps.whatsapp.net/...",
    "jid": "5511999998888@s.whatsapp.net",
    "cached": false
  }
}
```

### 2. Teste de Instância Desconectada

```bash
# Usar uma instância desconectada
curl -X GET \
  "http://localhost:3000/api/conversations/picture/$INSTANCE_ID_OFFLINE/$JID" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Resposta Esperada:**
```json
{
  "success": false,
  "error": "Instance is not connected"
}
```

### 3. Teste de JID Inválido

```bash
# Usar JID que não existe
curl -X GET \
  "http://localhost:3000/api/conversations/picture/$INSTANCE_ID/invalid" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Resposta Esperada:**
```json
{
  "success": true,
  "data": {
    "profilePictureUrl": null,
    "jid": "invalid",
    "cached": false
  }
}
```

## Rollout e Migração

### Fase 1: Deploy Backend (Atual) ✅
- Novo endpoint disponível
- Webhook não salva mais URLs
- Métodos antigos depreciados

### Fase 2: Atualizar Frontend (Próximo Passo)
- Modificar componentes de Avatar
- Implementar cache com React Query/SWR
- Adicionar lazy loading

### Fase 3: Limpeza (Futuro)
- Remover campo `contactPicture` do schema Prisma
- Executar migração de banco de dados
- Remover métodos depreciados do código

## Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `server/src/api/controllers/conversation-controller.ts` | ✅ Adicionado método `getContactProfilePicture()` |
| `server/src/api/routes/conversation-routes.ts` | ✅ Nova rota `GET /picture/:instanceId/:jid` |
| `server/src/api/controllers/webhook-controller.ts` | ✅ Removido salvamento de `profilePicUrl` |
| `server/src/services/conversation-service.ts` | ✅ Depreciados métodos de download/cache de fotos |

## Conclusão

A solução implementada resolve definitivamente o problema de links de fotos expirados ao:

1. **Eliminar o caching de URLs temporárias** no banco de dados
2. **Buscar fotos dinamicamente** sob demanda via Evolution API
3. **Garantir URLs sempre válidas** no momento da requisição

O frontend agora tem controle total sobre quando buscar fotos, permitindo implementar estratégias de cache e otimização adequadas para sua arquitetura.

---

**Autor:** GitHub Copilot Workspace Agent  
**Data:** 2025-01-12  
**Status:** Implementado - Aguardando Integração Frontend
