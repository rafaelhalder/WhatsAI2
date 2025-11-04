# 🔧 Configuração de Webhooks Stripe para Desenvolvimento

## 🎯 Estratégia: Usar Stripe CLI (Recomendado)

Para desenvolvimento, NÃO precisamos configurar webhook no dashboard. Usamos o **Stripe CLI** que escuta eventos localmente.

---

## 📋 Passo a Passo

### 1️⃣ Instalar Stripe CLI

**macOS (Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Verificar instalação:**
```bash
stripe --version
```

---

### 2️⃣ Fazer Login no Stripe

```bash
stripe login
```

Isso vai abrir o navegador para autorizar o CLI com sua conta Stripe.

---

### 3️⃣ Criar os Produtos no Stripe Dashboard

Acesse: https://dashboard.stripe.com/test/products

**STARTER (R$ 47/mês):**
- Nome: WhatsAI Starter
- Preço: R$ 47,00 BRL
- Tipo: Recorrente (mensal)
- Trial: 14 dias
- **Price ID gerado**: `prod_TL2NiXnU2UQCEV` ✅ (você já tem!)

**PRO (R$ 97/mês):**
- Nome: WhatsAI Pro
- Preço: R$ 97,00 BRL
- Tipo: Recorrente (mensal)
- Trial: 14 dias
- **Price ID gerado**: `prod_TL2NZL10JE577Z` ✅ (você já tem!)

**BUSINESS (R$ 297/mês):**
- Nome: WhatsAI Business
- Preço: R$ 297,00 BRL
- Tipo: Recorrente (mensal)
- Trial: 14 dias
- **Price ID gerado**: `prod_TL2NGNmwolwK8M` ✅ (você já tem!)

---

### 4️⃣ Escutar Webhooks Localmente

Com o servidor rodando em `http://localhost:3333`:

```bash
stripe listen --forward-to localhost:3333/api/webhooks/stripe
```

**Saída esperada:**
```
> Ready! You are using Stripe API Version [2025-10-29]. Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**⚠️ IMPORTANTE**: Copie o `whsec_xxxxxxxxxxxxx` que aparece!

---

### 5️⃣ Atualizar o .env com o Webhook Secret

Edite `server/.env`:

```env
# Stripe Test Keys
STRIPE_SECRET_KEY=sk_test_51SOM1zBIx243ARlE2FLlMI2sBiVv8YvETWkmn4Mxx5iH2Fq1LDAAw4RF4kUIhxq0Ob8yDTsXmrTLzFXfdiMiOYBa00GmNv1gQS
STRIPE_PUBLISHABLE_KEY=pk_test_51SOM1zBIx243ARlEwvxA4d2LuTAbfZHGl0kJQtzuqsW3WRT1XMREYOOHUrynXg8L8ANelYnq3wpXB9aFnvclpOFO000wpoppr8

# Webhook Secret do Stripe CLI (gerado no passo anterior)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # ← COLAR AQUI
```

---

### 6️⃣ Testar o Webhook

**Terminal 1** (Servidor):
```bash
npm run dev
```

**Terminal 2** (Stripe CLI escutando):
```bash
stripe listen --forward-to localhost:3333/api/webhooks/stripe
```

**Terminal 3** (Simular eventos):
```bash
# Simular checkout completo
stripe trigger checkout.session.completed

# Simular pagamento de fatura
stripe trigger invoice.paid

# Simular assinatura criada
stripe trigger customer.subscription.created
```

**Verificar logs:**
- No Terminal 1 (servidor), você deve ver as requisições chegando
- No Terminal 2 (Stripe CLI), você deve ver os eventos sendo enviados
- No banco de dados, os registros devem ser criados

---

## 🧪 Fluxo de Teste Completo

### 1. Criar Checkout Session (API)

```bash
curl -X POST http://localhost:3333/api/billing/checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "prod_TL2NiXnU2UQCEV",
    "successUrl": "http://localhost:3000/success",
    "cancelUrl": "http://localhost:3000/cancel"
  }'
```

**Resposta esperada:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxxxx"
}
```

### 2. Abrir URL no Navegador

- Cole a URL retornada no navegador
- Use cartão de teste: `4242 4242 4242 4242`
- Data: qualquer futura
- CVC: qualquer 3 dígitos
- CEP: qualquer

### 3. Completar Pagamento

- Após completar, o webhook `checkout.session.completed` será disparado
- O Stripe CLI vai encaminhar para `localhost:3333/api/webhooks/stripe`
- O servidor vai processar e criar a assinatura no banco

### 4. Verificar no Banco

```bash
npx prisma studio
```

Abra a tabela `Subscription` e veja o registro criado!

---

## 🌐 Quando Usar ngrok?

Use ngrok se você quiser **testar com webhooks reais do Stripe Dashboard** (não recomendado agora):

```bash
# Terminal 1: ngrok
ngrok http 3333

# Copiar URL: https://abc123.ngrok.io
# Configurar no Stripe Dashboard: https://abc123.ngrok.io/api/webhooks/stripe
```

**Problema**: Toda vez que reiniciar o ngrok, a URL muda e precisa reconfigurar no Stripe.

**Solução**: Usar Stripe CLI (não precisa de URL pública).

---

## 🚀 Quando Configurar no EasyPanel/DigitalOcean?

Configure webhook no dashboard Stripe **apenas em PRODUÇÃO**:

1. Deploy do servidor no EasyPanel
2. Obter URL pública: `https://whatsai.seu-dominio.com`
3. Criar webhook no Stripe Dashboard:
   - URL: `https://whatsai.seu-dominio.com/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `invoice.paid`, `customer.subscription.*`
4. Copiar Webhook Secret de produção
5. Adicionar no EasyPanel como variável de ambiente

---

## 📊 Comparação

| Método | Desenvolvimento | Produção | URL Fixa | Facilidade |
|--------|----------------|----------|----------|------------|
| **Stripe CLI** | ✅ Ideal | ❌ Não | ✅ Sim | ⭐⭐⭐⭐⭐ |
| **ngrok** | ⚠️ OK | ❌ Não | ❌ Não | ⭐⭐⭐ |
| **Dashboard Webhook** | ❌ Não | ✅ Ideal | ✅ Sim | ⭐⭐⭐⭐ |

---

## ✅ Resumo: O que fazer AGORA

```bash
# 1. Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# 2. Login
stripe login

# 3. Escutar webhooks (deixar rodando)
stripe listen --forward-to localhost:3333/api/webhooks/stripe

# 4. Copiar o whsec_xxx e colar no .env → STRIPE_WEBHOOK_SECRET

# 5. Reiniciar servidor
npm run dev

# 6. Testar
stripe trigger checkout.session.completed
```

**Pronto!** Agora você pode desenvolver e testar webhooks localmente sem precisar de ngrok ou configurar nada no dashboard. 🎉

---

## 🐛 Troubleshooting

### Erro: "stripe: command not found"
```bash
brew install stripe/stripe-cli/stripe
```

### Erro: "Invalid webhook signature"
- Verificar se `STRIPE_WEBHOOK_SECRET` no .env é o mesmo do Stripe CLI
- Reiniciar o servidor após alterar .env

### Webhook não chega no servidor
- Verificar se Stripe CLI está rodando
- Verificar se servidor está em `localhost:3333`
- Verificar logs do Stripe CLI

### Eventos não criam registros no banco
- Verificar logs do servidor (erros?)
- Verificar se Prisma Client foi regenerado (`npx prisma generate`)
- Verificar se os modelos Subscription/Invoice existem no banco (`npx prisma studio`)
