# 📋 Tarefa 6: Deploy em Produção - Guia Completo

## 🎯 Objetivo da Tarefa

Colocar o WhatsAI no ar em produção, acessível em `https://app.whatsai.com.br`, com todos os sistemas funcionando e monitoramento ativo.

---

## 📦 O QUE SERÁ FEITO NO DEPLOY

### 1. Preparação da Infraestrutura
- **Provisionar servidor** DigitalOcean (Droplet 4GB RAM)
- **Configurar banco de dados** PostgreSQL gerenciado
- **Configurar Redis** para cache e filas
- **Configurar storage** DigitalOcean Spaces (S3)
- **Configurar domínio** e SSL (Let's Encrypt)

### 2. Instalação da Aplicação
- Clonar repositório no servidor
- Instalar dependências (Node.js, npm packages)
- Configurar variáveis de ambiente
- Executar migrations do banco
- Build da aplicação (client + server)

### 3. Configuração do Servidor Web
- Instalar e configurar **Nginx** como reverse proxy
- Configurar **SSL/TLS** com certificado automático
- Configurar **PM2** para gerenciar processo Node.js
- Configurar **logs** e rotação

### 4. Configuração de Monitoramento
- **UptimeRobot**: Verificar disponibilidade (ping a cada 5min)
- **PM2 Monitoring**: Métricas de performance
- **Logs centralizados**: Erros e eventos importantes
- **Alertas**: Email/Telegram quando sistema cair

### 5. Testes Finais
- Health check da API
- Teste de login
- Teste de criação de instância
- Teste de envio de mensagem
- Verificação de SSL
- Teste de performance

---

## ✅ O QUE VOCÊ PRECISA DEIXAR PRONTO ANTES

### 1. Infraestrutura (Crítico)

#### a) Conta DigitalOcean
```
✅ Criar conta em: https://digitalocean.com
✅ Adicionar cartão de crédito
✅ Custo estimado: ~R$ 60/mês
   - Droplet 4GB: R$ 24/mês
   - PostgreSQL Managed: R$ 15/mês
   - Redis Managed: R$ 15/mês
   - Spaces: R$ 5/mês
```

**Ação:** 
1. Criar conta DigitalOcean
2. Adicionar método de pagamento
3. Criar Personal Access Token (para API)

#### b) Domínio
```
✅ Registrar domínio: whatsai.com.br
✅ Apontar nameservers para DigitalOcean
✅ Custo: ~R$ 40/ano
```

**Ação:**
1. Comprar domínio em Registro.br ou similar
2. Configurar DNS para apontar para DigitalOcean
3. Aguardar propagação (até 24h)

#### c) Conta Stripe (Produção)
```
✅ Conta Stripe ativa
✅ Modo produção configurado
✅ Produtos e preços criados
```

**Ação:**
1. Ir em https://dashboard.stripe.com
2. Ativar modo produção (sair do test mode)
3. Criar 3 produtos:
   - STARTER: R$ 47/mês (price_id: copiar)
   - PRO: R$ 97/mês (price_id: copiar)
   - BUSINESS: R$ 297/mês (price_id: copiar)
4. Guardar os `price_id` de cada um

---

### 2. Configurações e Credenciais

#### Arquivo `.env` de Produção

Você precisará ter TODOS esses valores prontos:

```bash
# === APLICAÇÃO ===
NODE_ENV=production
PORT=5173

# === JWT ===
JWT_SECRET=<gerar-senha-forte-aleatoria-64-caracteres>
JWT_EXPIRES_IN=7d

# === BANCO DE DADOS ===
# Após criar o banco gerenciado no DigitalOcean:
DATABASE_URL=******<host>:25060/whatsai?sslmode=require
DIRECT_URL=******<host>:25060/whatsai?sslmode=require

# === REDIS ===
# Após criar o Redis gerenciado no DigitalOcean:
REDIS_URL=rediss://:<password>@<host>:25061

# === EVOLUTION API ===
EVOLUTION_API_URL=https://hsapi.studio/
EVOLUTION_API_KEY=Pz6qEerZE5IYwaoc8ZCQxmBdLAinX4dl

# === STRIPE (PRODUÇÃO) ===
STRIPE_SECRET_KEY=sk_live_<sua-chave-producao>
STRIPE_WEBHOOK_SECRET=whsec_<webhook-secret-producao>
STRIPE_PRICE_STARTER=price_<id-do-starter>
STRIPE_PRICE_PRO=price_<id-do-pro>
STRIPE_PRICE_BUSINESS=price_<id-do-business>

# === CLIENT URL ===
CLIENT_URL=https://app.whatsai.com.br

# === DIGITALOCEAN SPACES (S3) ===
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_KEY=<sua-access-key>
DO_SPACES_SECRET=<sua-secret-key>
DO_SPACES_BUCKET=whatsai-media
DO_SPACES_REGION=nyc3

# === SENTRY (OPCIONAL - para tracking de erros) ===
# SENTRY_DSN=https://<key>@sentry.io/<project>
```

**Como obter cada valor:**

1. **JWT_SECRET**: Gerar senha aleatória
   ```bash
   openssl rand -base64 48
   ```

2. **DATABASE_URL**: No DigitalOcean, criar banco PostgreSQL
   - Ir em "Databases" → Create → PostgreSQL 14
   - Copiar connection string
   - Adicionar `?sslmode=require` no final

3. **REDIS_URL**: No DigitalOcean, criar Redis
   - Ir em "Databases" → Create → Redis
   - Copiar connection string

4. **STRIPE_SECRET_KEY**: No Stripe Dashboard
   - Ir em Developers → API Keys
   - **IMPORTANTE**: Usar chave de PRODUÇÃO (sk_live_...)
   - NÃO usar chave de teste (sk_test_...)

5. **STRIPE_WEBHOOK_SECRET**: 
   - Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://app.whatsai.com.br/api/webhooks/stripe`
   - Eventos a escutar:
     - checkout.session.completed
     - customer.subscription.created
     - customer.subscription.updated
     - customer.subscription.deleted
     - invoice.paid
     - invoice.payment_failed
   - Copiar Webhook signing secret (whsec_...)

6. **DO_SPACES_KEY e SECRET**:
   - DigitalOcean → API → Spaces Keys
   - Generate New Key
   - Copiar Access Key e Secret Key

---

### 3. GitHub Secrets (para CI/CD)

Se for usar deploy automático via GitHub Actions:

**Ir em:** Settings → Secrets and variables → Actions → New repository secret

```
PRODUCTION_HOST = <IP-do-servidor-digitalocean>
PRODUCTION_USER = deploy
SSH_PRIVATE_KEY = <conteudo-da-chave-privada-ssh>
VITE_API_URL = https://app.whatsai.com.br/api
```

---

### 4. Checklist de Pré-Deploy

Marque cada item conforme completa:

#### Infraestrutura
- [ ] Conta DigitalOcean criada e com crédito
- [ ] Droplet 4GB provisionado (Ubuntu 22.04 LTS)
- [ ] PostgreSQL managed criado
- [ ] Redis managed criado
- [ ] Spaces bucket criado
- [ ] Domínio registrado e DNS configurado

#### Credenciais
- [ ] Todas variáveis do .env prontas
- [ ] Stripe em modo produção
- [ ] Produtos Stripe criados (STARTER, PRO, BUSINESS)
- [ ] Webhook Stripe configurado
- [ ] SSH configurado (chave pública no servidor)

#### Código
- [ ] Branch main atualizada
- [ ] Todos testes passando
- [ ] Build local funciona (`npm run build`)
- [ ] Migrations testadas
- [ ] .env.example atualizado

---

## 🚀 PROCESSO DE DEPLOY (Passo a Passo)

### Fase 1: Preparar Servidor (2h)

#### 1.1. Criar Droplet
```bash
# No DigitalOcean Dashboard:
1. Create → Droplets
2. Escolher Ubuntu 22.04 LTS
3. Plano: 4GB RAM / 2 vCPU ($24/mês)
4. Região: NYC3 (mesma do Spaces)
5. Add SSH Key (sua chave pública)
6. Nome: whatsai-production
7. Create Droplet
```

#### 1.2. Conectar ao Servidor
```bash
# Anotar o IP do droplet (ex: 123.45.67.89)
ssh root@123.45.67.89
```

#### 1.3. Atualizar Sistema
```bash
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx
```

#### 1.4. Instalar Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Deve ser v20.x
npm --version
```

#### 1.5. Criar Usuário Deploy
```bash
adduser deploy
usermod -aG sudo deploy
# Configurar senha forte
```

#### 1.6. Configurar SSH para Deploy
```bash
su - deploy
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Copie sua chave pública SSH para:
nano ~/.ssh/authorized_keys
# Cole a chave
chmod 600 ~/.ssh/authorized_keys
exit
```

Teste conexão:
```bash
ssh deploy@123.45.67.89
```

---

### Fase 2: Configurar Aplicação (2h)

#### 2.1. Clonar Repositório
```bash
cd /var/www
sudo mkdir -p whatsai
sudo chown deploy:deploy whatsai
cd whatsai

git clone https://github.com/softwarePredador/WhatsAI2.git .
git checkout main
```

#### 2.2. Instalar Dependências
```bash
# Backend
cd server
npm ci --production

# Client
cd ../client
npm ci
```

#### 2.3. Configurar Environment
```bash
cd /var/www/whatsai/server
nano .env
# Cole todas as variáveis de produção
# Ctrl+X, Y, Enter para salvar
```

#### 2.4. Build Aplicação
```bash
# Client (frontend)
cd /var/www/whatsai/client
npm run build
# Cria pasta dist/ com arquivos estáticos

# Server (backend se necessário)
cd /var/www/whatsai/server
npm run build || echo "No build needed"
```

#### 2.5. Executar Migrations
```bash
cd /var/www/whatsai/server
npx prisma migrate deploy
npx prisma generate
```

---

### Fase 3: Configurar PM2 (30min)

#### 3.1. Instalar PM2
```bash
sudo npm install -g pm2
```

#### 3.2. Criar Arquivo de Configuração
```bash
cd /var/www/whatsai
nano ecosystem.config.js
```

Cole:
```javascript
module.exports = {
  apps: [{
    name: 'whatsai',
    script: './server/src/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader ts-node/esm',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5173
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '500M',
    autorestart: true
  }]
};
```

#### 3.3. Criar Pasta de Logs
```bash
mkdir -p /var/www/whatsai/logs
```

#### 3.4. Iniciar Aplicação
```bash
cd /var/www/whatsai
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
# Copie o comando que aparecer e execute
```

#### 3.5. Verificar Status
```bash
pm2 status
pm2 logs whatsai --lines 50
```

---

### Fase 4: Configurar Nginx (1h)

#### 4.1. Criar Configuração
```bash
sudo nano /etc/nginx/sites-available/whatsai
```

Cole:
```nginx
# Redirecionar HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name app.whatsai.com.br;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.whatsai.com.br;

    # SSL será configurado pelo Certbot
    
    # Client (Frontend - arquivos estáticos)
    location / {
        root /var/www/whatsai/client/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API (Backend - proxy para Node.js)
    location /api {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
    
    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### 4.2. Ativar Site
```bash
sudo ln -s /etc/nginx/sites-available/whatsai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4.3. Configurar SSL (Let's Encrypt)
```bash
sudo certbot --nginx -d app.whatsai.com.br

# Responda as perguntas:
# - Email: seu@email.com
# - Termos: Yes
# - Redirect HTTP→HTTPS: Yes
```

SSL é configurado automaticamente! ✅

#### 4.4. Testar
```bash
curl https://app.whatsai.com.br/api/health
# Deve retornar: {"status":"ok",...}
```

---

### Fase 5: Configurar Monitoramento (30min)

#### 5.1. UptimeRobot
1. Ir em https://uptimerobot.com
2. Criar conta grátis
3. Add New Monitor:
   - Type: HTTPS
   - URL: https://app.whatsai.com.br/api/health
   - Name: WhatsAI Production
   - Interval: 5 minutes
4. Add Alert Contact: seu email

#### 5.2. PM2 Monitoring (Opcional)
```bash
pm2 install pm2-server-monit
```

---

### Fase 6: Testes Finais (30min)

#### Checklist de Testes:

```bash
# 1. Health Check
curl https://app.whatsai.com.br/api/health

# 2. SSL
curl -I https://app.whatsai.com.br
# Verificar: HTTP/2 200

# 3. Frontend
# Abrir no navegador: https://app.whatsai.com.br
# Deve carregar a página de login

# 4. Teste Completo (manual)
```

**Teste Manual:**
1. Acessar https://app.whatsai.com.br
2. Criar nova conta
3. Fazer login
4. Criar instância WhatsApp
5. Escanear QR Code
6. Enviar mensagem de teste
7. Verificar se chegou

---

## 📊 CUSTO MENSAL ESTIMADO

| Serviço | Custo |
|---------|-------|
| Droplet 4GB RAM | R$ 24 |
| PostgreSQL Managed | R$ 15 |
| Redis Managed | R$ 15 |
| Spaces 5GB | R$ 5 |
| Domínio | R$ 3 (R$ 40/ano) |
| **TOTAL** | **~R$ 62/mês** |

---

## 🆘 PROBLEMAS COMUNS E SOLUÇÕES

### Erro: "Cannot connect to database"
```bash
# Verificar connection string
echo $DATABASE_URL

# Testar conexão
cd /var/www/whatsai/server
npx prisma studio
```

### Erro: "Port 5173 already in use"
```bash
# Ver o que está usando a porta
sudo lsof -i :5173

# Matar processo
pm2 stop whatsai
pm2 start whatsai
```

### Erro: "SSL certificate error"
```bash
# Renovar certificado
sudo certbot renew
sudo systemctl reload nginx
```

### Site não carrega
```bash
# Verificar nginx
sudo nginx -t
sudo systemctl status nginx

# Verificar PM2
pm2 status
pm2 logs whatsai --lines 100

# Verificar logs
tail -f /var/www/whatsai/logs/pm2-error.log
```

---

## 📋 RESUMO: O QUE FAZER ANTES DO DEPLOY

### Preparação (você faz ANTES):
1. ✅ Criar conta DigitalOcean
2. ✅ Registrar domínio whatsai.com.br
3. ✅ Ativar Stripe modo produção
4. ✅ Criar produtos no Stripe (STARTER, PRO, BUSINESS)
5. ✅ Preparar arquivo .env com TODAS as variáveis
6. ✅ Gerar chave SSH
7. ✅ Testar build local (`npm run build`)

### Execução (fazemos durante deploy):
1. Provisionar servidor
2. Instalar software (Node, Nginx, PM2)
3. Clonar código
4. Configurar .env
5. Build aplicação
6. Executar migrations
7. Configurar Nginx + SSL
8. Iniciar com PM2
9. Configurar monitoramento
10. Testes finais

---

## ⏱️ TEMPO ESTIMADO TOTAL

| Fase | Tempo |
|------|-------|
| Preparação (você) | 2h |
| Provisionar infraestrutura | 1h |
| Configurar servidor | 2h |
| Configurar aplicação | 2h |
| Configurar Nginx/SSL | 1h |
| Monitoramento | 0.5h |
| Testes | 0.5h |
| **TOTAL** | **~9h** |

Mas na prática, com experiência, pode ser feito em **4-6 horas**.

---

## 🎯 CONCLUSÃO

**O que você precisa deixar pronto:**
1. Conta DigitalOcean com crédito
2. Domínio registrado
3. Stripe em produção com produtos criados
4. Arquivo .env completo
5. Chave SSH configurada

**O que será feito no deploy:**
- Provisionar servidor e serviços
- Instalar e configurar aplicação
- Configurar SSL e domínio
- Ativar monitoramento
- Testes completos

**Após deploy:**
- Sistema funcionando em https://app.whatsai.com.br
- Monitoramento 24/7 ativo
- Backups automáticos
- SSL renovando automaticamente
- Pronto para receber usuários! 🚀

---

**Dúvidas?** Revise este documento ou peça ajuda específica sobre qualquer etapa!
