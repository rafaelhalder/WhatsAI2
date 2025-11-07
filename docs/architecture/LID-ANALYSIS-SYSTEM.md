# 🗺️ Sistema de Análise @lid - Implementação

## 📋 O que foi implementado

### 1. **Tabela de Log de Webhooks** (`webhook_logs`)
- **Propósito**: Armazenar todos os webhooks recebidos para análise posterior
- **Campos principais**:
  - `rawData`: JSON completo do webhook
  - `remoteJid`, `remoteJidAlt`: JIDs para análise
  - `participant`, `participantAlt`: Participantes em grupos
  - `hasLid`: Flag indicando se contém @lid
  - `hasAltField`: Flag indicando se os campos Alt existem

### 2. **Captura Automática no Webhook Controller**
- Salva automaticamente todos os webhooks `messages.upsert`
- Extrai e indexa campos relevantes para @lid
- Logs detalhados quando @lid é detectado
- **Arquivo**: `server/src/api/controllers/webhook-controller.ts`

### 3. **Scripts de Análise**
- **`analyze-webhook-logs.ts`**: Analisa webhooks salvos
  - Conta total de webhooks
  - Identifica webhooks com @lid
  - Verifica se campos Alt estão presentes
  - Mostra exemplos completos

- **`test-webhook-lid.sh`**: Envia webhook simulado
  - Testa se sistema captura @lid corretamente
  - Simula webhook da Evolution API

## 🎯 Como usar

### Passo 1: Aguardar mensagens reais
Quando uma mensagem com @lid chegar, o sistema automaticamente:
1. Salva o webhook completo na tabela `webhook_logs`
2. Extrai campos `remoteJid`, `remoteJidAlt`, `participant`, `participantAlt`
3. Marca se contém @lid e se campos Alt existem

### Passo 2: Analisar logs salvos
```bash
cd server
npx tsx analyze-webhook-logs.ts
```

Isso mostrará:
- Quantos webhooks com @lid foram recebidos
- Se a Evolution API envia campos `participantAlt`/`remoteJidAlt`
- Exemplo completo do JSON do webhook

### Passo 3: Testar com webhook simulado (opcional)
```bash
cd server
# Editar INSTANCE_ID no arquivo test-webhook-lid.sh
./test-webhook-lid.sh
```

## 🔍 O que descobriremos

Com os webhooks salvos, poderemos responder:

### ✅ SE a Evolution API envia campos Alt:
- Sistema já está pronto para capturar e unificar conversas automaticamente
- A lógica de merge já está implementada

### ❌ SE a Evolution API NÃO envia campos Alt:
Precisaremos de estratégia alternativa:
1. **Buscar na API Evolution**: Endpoint para resolver @lid → número real
2. **Cache de interações**: Quando usuário responde, mapear @lid → número
3. **Análise de mensagens anteriores**: Verificar histórico para encontrar mapeamento

## 📊 Consultas úteis

### Ver todos webhooks com @lid:
```sql
SELECT * FROM webhook_logs 
WHERE "hasLid" = true 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### Verificar se algum webhook tem campos Alt:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE "hasAltField" = true) as com_alt,
  COUNT(*) FILTER (WHERE "hasLid" = true) as com_lid
FROM webhook_logs;
```

### Ver exemplo de webhook com @lid:
```sql
SELECT "rawData" 
FROM webhook_logs 
WHERE "hasLid" = true 
LIMIT 1;
```

## 🚀 Próximos passos

1. **Aguardar mensagens reais** de contatos com @lid
2. **Executar `analyze-webhook-logs.ts`** para verificar estrutura
3. **Decidir estratégia** baseado no que a Evolution API envia:
   - Se tem Alt fields: Sistema já funciona ✅
   - Se não tem: Implementar busca alternativa na API

## 📁 Arquivos modificados

- ✅ `server/prisma/schema.prisma` - Adicionado modelo WebhookLog
- ✅ `server/prisma/migrations/add-webhook-logs.sql` - Migração SQL
- ✅ `server/src/api/controllers/webhook-controller.ts` - Captura de logs
- ✅ `server/analyze-webhook-logs.ts` - Script de análise
- ✅ `server/test-webhook-lid.sh` - Script de teste
- ✅ `COMANDOS-TESTADOS.md` - Documentação atualizada
