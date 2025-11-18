# 📧 Email Transacional - WhatsAI

Guia completo para configurar e usar o sistema de emails transacionais do WhatsAI.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Instalação](#instalação)
3. [Configuração](#configuração)
4. [Provedores de Email](#provedores-de-email)
5. [Emails Disponíveis](#emails-disponíveis)
6. [Uso no Código](#uso-no-código)
7. [Testes](#testes)
8. [Solução de Problemas](#solução-de-problemas)

---

## 🎯 Visão Geral

O sistema de emails transacionais do WhatsAI envia automaticamente:

- ✅ **Boas-vindas** - Quando usuário se registra
- ✅ **Recuperação de senha** - Reset de senha
- ✅ **Confirmação de pagamento** - Após pagamento bem-sucedido
- ✅ **Cancelamento de assinatura** - Quando usuário cancela

Todos os emails são:
- 📱 **Responsivos** (funcionam em mobile)
- 🎨 **Profissionais** (templates HTML bonitos)
- 🌐 **Localizados** (português brasileiro)
- 🔒 **Seguros** (não expõem informações sensíveis)

---

## 📦 Instalação

### 1. Instalar Dependências

```bash
cd server
npm install nodemailer @types/nodemailer
```

### 2. Verificar Instalação

```bash
npm list nodemailer
```

Você deve ver algo como:
```
└── nodemailer@6.9.7
```

---

## ⚙️ Configuração

### 1. Adicionar Variáveis de Ambiente

Edite `server/.env` e adicione:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=WhatsAI <noreply@whatsai.com.br>

# Frontend URL (para links nos emails)
FRONTEND_URL=https://app.whatsai.com.br
```

### 2. Exemplo Completo (.env.example)

```env
# === Email Configuration ===
# SMTP Server (Gmail, SendGrid, Mailgun, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# From address (name and email)
SMTP_FROM=WhatsAI <noreply@whatsai.com.br>

# Frontend URL (used in email links)
FRONTEND_URL=http://localhost:3000
```

---

## 📮 Provedores de Email

### Opção 1: Gmail (Desenvolvimento)

**Passo 1:** Habilitar "App Passwords" no Google

1. Acesse: https://myaccount.google.com/security
2. Ative "2-Step Verification"
3. Vá em "App passwords"
4. Crie uma senha para "Mail"
5. Use essa senha no `.env`

**Configuração:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # Senha de app (16 caracteres)
```

⚠️ **Limitação:** Gmail tem limite de 500 emails/dia (não recomendado para produção)

---

### Opção 2: SendGrid (Produção Recomendada)

**Por que SendGrid?**
- ✅ 100 emails/dia GRÁTIS
- ✅ Infraestrutura robusta
- ✅ Analytics de emails
- ✅ API simples

**Passo 1:** Criar conta em https://sendgrid.com/

**Passo 2:** Criar API Key
1. Settings → API Keys → Create API Key
2. Nome: "WhatsAI Production"
3. Permissão: "Mail Send" (Full Access)
4. Copiar API Key

**Configuração:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey  # Literal "apikey"
SMTP_PASS=SG.xxxxxxxxxxxxx  # Sua API Key
SMTP_FROM=WhatsAI <noreply@whatsai.com.br>
```

**Passo 3:** Verificar Domínio (Opcional mas Recomendado)
1. Settings → Sender Authentication
2. Verify a Single Sender (para teste)
3. Ou Domain Authentication (para produção)

---

### Opção 3: Mailgun

**Plano Gratuito:** 5.000 emails/mês por 3 meses

**Configuração:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seu-dominio.mailgun.org
SMTP_PASS=sua-senha-mailgun
```

---

### Opção 4: Amazon SES

**Vantagens:**
- Muito barato ($0.10 por 1.000 emails)
- Escalável

**Configuração:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=seu-access-key
SMTP_PASS=sua-secret-key
```

---

## 📨 Emails Disponíveis

### 1. Email de Boas-vindas

**Quando:** Após registro de novo usuário

**Conteúdo:**
- Saudação personalizada
- Checklist de primeiros passos
- Botão para acessar dashboard
- Links de suporte

**Código:**
```typescript
import { emailService } from '@/services/email-service';

await emailService.sendWelcomeEmail(
  'usuario@exemplo.com',
  'João Silva'
);
```

---

### 2. Email de Recuperação de Senha

**Quando:** Usuário solicita reset de senha

**Conteúdo:**
- Link de reset com token temporário
- Aviso de segurança
- Expiração em 1 hora

**Código:**
```typescript
await emailService.sendPasswordResetEmail(
  'usuario@exemplo.com',
  'token-seguro-unico'
);
```

---

### 3. Email de Confirmação de Pagamento

**Quando:** Pagamento processado com sucesso (webhook Stripe)

**Conteúdo:**
- Detalhes da compra (plano, valor)
- Link para nota fiscal
- Próximos passos

**Código:**
```typescript
await emailService.sendPaymentConfirmationEmail(
  'usuario@exemplo.com',
  'João Silva',
  'PRO',              // Nome do plano
  9700,               // Valor em centavos (R$ 97.00)
  'https://invoice-url.com'  // Opcional
);
```

---

### 4. Email de Cancelamento de Assinatura

**Quando:** Usuário cancela assinatura

**Conteúdo:**
- Confirmação do cancelamento
- Data de término do acesso
- Opção de reativação
- Pedido de feedback

**Código:**
```typescript
await emailService.sendSubscriptionCancelledEmail(
  'usuario@exemplo.com',
  'João Silva',
  'PRO',
  new Date('2025-12-11')  // Data de término
);
```

---

## 💻 Uso no Código

### Exemplo 1: Enviar Email de Boas-vindas no Registro

```typescript
// server/src/services/auth-service.ts

import { emailService } from './email-service';

async register(data: RegisterData) {
  // ... criar usuário ...
  
  // Enviar email de boas-vindas
  await emailService.sendWelcomeEmail(user.email, user.name);
  
  return { user, token };
}
```

### Exemplo 2: Enviar Confirmação de Pagamento no Webhook Stripe

```typescript
// server/src/api/controllers/stripe-webhook-controller.ts

case 'invoice.payment_succeeded': {
  const invoice = event.data.object;
  
  // Buscar dados do usuário
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: invoice.customer }
  });
  
  // Enviar email
  await emailService.sendPaymentConfirmationEmail(
    user.email,
    user.name,
    subscription.plan,
    invoice.amount_paid,
    invoice.hosted_invoice_url
  );
  
  break;
}
```

### Exemplo 3: Email Personalizado

```typescript
import { emailService } from '@/services/email-service';

await emailService.sendEmail({
  to: 'usuario@exemplo.com',
  subject: 'Seu relatório está pronto!',
  html: `
    <h1>Olá!</h1>
    <p>Seu relatório mensal está disponível.</p>
    <a href="https://app.whatsai.com.br/reports">Ver Relatório</a>
  `
});
```

---

## 🧪 Testes

### 1. Testar Conexão SMTP

```typescript
// Criar arquivo server/src/scripts/test-email.ts

import { emailService } from '../services/email-service';

async function testEmail() {
  console.log('Testing SMTP connection...');
  
  const isConnected = await emailService.verifyConnection();
  
  if (isConnected) {
    console.log('✅ SMTP connection successful!');
    
    // Enviar email de teste
    const sent = await emailService.sendEmail({
      to: 'seu-email@exemplo.com',
      subject: 'Teste - WhatsAI Email Service',
      html: '<h1>Email de teste</h1><p>Se você recebeu isso, está funcionando!</p>'
    });
    
    if (sent) {
      console.log('✅ Test email sent successfully!');
    } else {
      console.log('❌ Failed to send test email');
    }
  } else {
    console.log('❌ SMTP connection failed');
  }
}

testEmail();
```

### 2. Executar Teste

```bash
cd server
npx tsx src/scripts/test-email.ts
```

### 3. Testar Todos os Templates

```bash
npx tsx -e "
import { emailService } from './src/services/email-service';

(async () => {
  await emailService.sendWelcomeEmail('teste@exemplo.com', 'João Teste');
  await emailService.sendPasswordResetEmail('teste@exemplo.com', 'token123');
  await emailService.sendPaymentConfirmationEmail('teste@exemplo.com', 'João', 'PRO', 9700);
  await emailService.sendSubscriptionCancelledEmail('teste@exemplo.com', 'João', 'PRO', new Date());
})();
"
```

---

## 🐛 Solução de Problemas

### Problema: "Email service not configured"

**Causa:** Variáveis SMTP não configuradas no `.env`

**Solução:**
```bash
# Verificar .env
cat server/.env | grep SMTP

# Adicionar se necessário
echo "SMTP_HOST=smtp.gmail.com" >> server/.env
echo "SMTP_PORT=587" >> server/.env
echo "SMTP_USER=seu-email@gmail.com" >> server/.env
echo "SMTP_PASS=sua-senha" >> server/.env
```

---

### Problema: "Invalid login" ou "Authentication failed"

**Gmail:**
1. Certifique-se de usar "App Password", não a senha normal
2. Ative 2FA primeiro
3. Gere nova senha de app

**SendGrid:**
1. Verifique se a API Key está correta
2. Use `SMTP_USER=apikey` (literal)
3. Certifique-se que a Key tem permissão "Mail Send"

---

### Problema: Emails caem no SPAM

**Soluções:**
1. **Verificar Domínio:**
   - Configure SPF, DKIM, DMARC no seu DNS
   - Use SendGrid Domain Authentication

2. **Conteúdo:**
   - Evite palavras como "grátis", "promoção" em excesso
   - Tenha versão text além de HTML
   - Não use muitos links

3. **From Email:**
   - Use domínio próprio (não @gmail.com)
   - Configure corretamente o `SMTP_FROM`

---

### Problema: Emails não chegam

**Checklist:**
1. Verificar logs do servidor: `grep -i "email" logs/*.log`
2. Testar conexão SMTP: `npx tsx src/scripts/test-email.ts`
3. Verificar se email está no SPAM
4. Verificar quota do provedor (Gmail: 500/dia)
5. Verificar se IP não está na blacklist

---

## 📊 Monitoramento

### Ver Logs de Emails Enviados

```bash
# Ver últimos emails enviados
cd server
grep "Email sent successfully" logs/*.log | tail -20

# Ver falhas
grep "Failed to send email" logs/*.log
```

### Métricas Importantes

**SendGrid Dashboard:**
- Taxa de abertura
- Taxa de cliques
- Bounces e spam reports

**Acompanhar:**
- Total de emails/dia
- Taxa de falha (<1%)
- Tempo de entrega (<30s)

---

## 🚀 Próximos Passos (Melhorias Futuras)

- [ ] Fila de emails (Bull/BullMQ) para não bloquear requests
- [ ] Templates em arquivo separado (não hardcoded)
- [ ] Sistema de preferências de email (opt-out)
- [ ] Tracking de abertura e cliques
- [ ] A/B testing de subject lines
- [ ] Tradução multi-idioma
- [ ] Anexos (PDFs, relatórios)

---

## 📞 Suporte

Problemas com emails? Entre em contato:

- 📧 Email: suporte@whatsai.com.br
- 💬 GitHub Issues: Relate bugs

---

**Última atualização:** 11 de Novembro de 2025  
**Versão:** 1.0.0
