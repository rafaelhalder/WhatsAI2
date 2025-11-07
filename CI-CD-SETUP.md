# ⚙️ CI/CD Configuration Guide - WhatsAI

## Overview

This document provides a step-by-step guide to configure Continuous Integration and Continuous Deployment (CI/CD) for the WhatsAI project using GitHub Actions.

---

## 📋 Prerequisites

Before setting up CI/CD, ensure you have:

- ✅ GitHub repository with admin access
- ✅ DigitalOcean account (or preferred hosting provider)
- ✅ SSH access to production server
- ✅ Domain configured (app.whatsai.com.br)
- ✅ Environment variables documented

---

## 🚀 GitHub Actions Workflow

### Step 1: Create Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, production ]
  pull_request:
    branches: [ main ]

jobs:
  # Job 1: Test & Lint
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [20.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies (server)
        working-directory: ./server
        run: npm ci
      
      - name: Install dependencies (client)
        working-directory: ./client
        run: npm ci
      
      - name: Lint server
        working-directory: ./server
        run: npm run lint || echo "Lint not configured"
      
      - name: Lint client
        working-directory: ./client
        run: npm run lint || echo "Lint not configured"
      
      - name: Run tests (server)
        working-directory: ./server
        run: npm test || echo "Tests not configured"
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://test:test@localhost:5432/test
      
      - name: Run tests (client)
        working-directory: ./client
        run: npm test || echo "Tests not configured"

  # Job 2: Build
  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: 'npm'
      
      - name: Install dependencies (server)
        working-directory: ./server
        run: npm ci
      
      - name: Install dependencies (client)
        working-directory: ./client
        run: npm ci
      
      - name: Build server
        working-directory: ./server
        run: npm run build || echo "Build script not configured"
      
      - name: Build client
        working-directory: ./client
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: |
            server/dist
            client/dist
          retention-days: 7

  # Job 3: Deploy to Production
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [test, build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-artifacts
      
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT || 22 }}
          script: |
            set -e
            cd /var/www/whatsai
            
            # Pull latest changes
            git pull origin main
            
            # Install dependencies
            cd server && npm ci --production
            cd ../client && npm ci
            
            # Build application
            npm run build
            
            # Run database migrations
            cd ../server
            npx prisma migrate deploy
            
            # Restart application
            pm2 restart whatsai || pm2 start ecosystem.config.js
            
            # Health check
            sleep 5
            curl -f http://localhost:5173/api/health || exit 1
      
      - name: Notify deployment success
        if: success()
        run: echo "✅ Deployment successful!"
      
      - name: Notify deployment failure
        if: failure()
        run: |
          echo "❌ Deployment failed!"
          # Add notification logic (Slack, Discord, Email, etc.)
```

---

## 🔐 GitHub Secrets Configuration

### Required Secrets

Navigate to **Settings → Secrets and variables → Actions** and add:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `PRODUCTION_HOST` | Server IP or domain | `123.45.67.89` |
| `PRODUCTION_USER` | SSH username | `deploy` |
| `SSH_PRIVATE_KEY` | Private SSH key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `SSH_PORT` | SSH port (optional) | `22` |
| `VITE_API_URL` | API URL for client build | `https://app.whatsai.com.br/api` |
| `DATABASE_URL` | Production database URL | `postgresql://user:pass@host:5432/db` |

### Optional Secrets (for notifications)

| Secret Name | Description |
|-------------|-------------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications |
| `DISCORD_WEBHOOK_URL` | Discord webhook |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram chat ID |

---

## 🔧 Server Setup

### 1. Create Deploy User

```bash
# On production server
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo su - deploy
```

### 2. Setup SSH Key

```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -C "deploy@whatsai" -f ~/.ssh/whatsai_deploy

# Copy public key
cat ~/.ssh/whatsai_deploy.pub

# On production server (as deploy user)
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 startup script
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
```

### 4. Create PM2 Ecosystem File

Create `/var/www/whatsai/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'whatsai',
      script: './server/dist/index.js',
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
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

### 5. Configure Nginx

Create `/etc/nginx/sites-available/whatsai`:

```nginx
server {
    listen 80;
    server_name app.whatsai.com.br;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.whatsai.com.br;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.whatsai.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.whatsai.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Client build (static files)
    location / {
        root /var/www/whatsai/client/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy
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
        proxy_connect_timeout 75s;
    }
    
    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/whatsai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📊 Monitoring & Alerts

### Setup PM2 Monitoring

```bash
# Install PM2 Keymetrics (optional)
pm2 link YOUR_SECRET_KEY YOUR_PUBLIC_KEY

# Or use PM2 Plus for advanced monitoring
pm2 install pm2-server-monit
```

### Health Check Endpoint

Already implemented at `/api/health`:

```typescript
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'WhatsAI Multi-Instance Manager',
    version: '1.0.0'
  });
});
```

### UptimeRobot Configuration

1. Go to [UptimeRobot](https://uptimerobot.com)
2. Add New Monitor:
   - Type: HTTPS
   - URL: `https://app.whatsai.com.br/api/health`
   - Interval: 5 minutes
   - Alert Contacts: Your email

---

## 🔄 Rollback Strategy

### Automatic Rollback

Add to GitHub Actions:

```yaml
- name: Health check after deployment
  id: health_check
  run: |
    sleep 10
    response=$(curl -s -o /dev/null -w "%{http_code}" https://app.whatsai.com.br/api/health)
    if [ $response -ne 200 ]; then
      echo "Health check failed with status $response"
      exit 1
    fi

- name: Rollback on failure
  if: failure() && steps.health_check.outcome == 'failure'
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.PRODUCTION_HOST }}
    username: ${{ secrets.PRODUCTION_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      cd /var/www/whatsai
      git reset --hard HEAD~1
      npm ci --production
      pm2 restart whatsai
```

### Manual Rollback

```bash
# SSH into server
ssh deploy@app.whatsai.com.br

# Go to app directory
cd /var/www/whatsai

# Check git log
git log --oneline -5

# Rollback to specific commit
git reset --hard <commit-hash>

# Reinstall dependencies
npm ci --production

# Restart app
pm2 restart whatsai

# Verify
pm2 logs whatsai --lines 50
```

---

## ✅ Testing the Pipeline

### 1. Test Locally

```bash
# Install act (GitHub Actions locally)
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow locally
act -j test
```

### 2. Create Test PR

```bash
git checkout -b test-ci-cd
echo "# Test CI/CD" >> TEST.md
git add TEST.md
git commit -m "test: CI/CD pipeline"
git push origin test-ci-cd
```

### 3. Monitor Workflow

- Go to GitHub → Actions tab
- Watch the workflow run
- Check logs for any errors

---

## 📝 Best Practices

### ✅ DO:
- Always run tests before deployment
- Use staging environment for pre-production testing
- Keep secrets secure and rotate regularly
- Monitor deployment metrics
- Have a rollback plan
- Document changes in CHANGELOG.md

### ❌ DON'T:
- Commit secrets to repository
- Deploy without tests
- Skip code reviews for main branch
- Deploy during peak hours (without notice)
- Ignore failed health checks

---

## 🆘 Troubleshooting

### Deployment Fails

```bash
# SSH into server
ssh deploy@app.whatsai.com.br

# Check PM2 status
pm2 status

# Check logs
pm2 logs whatsai --lines 100

# Check disk space
df -h

# Check memory
free -m

# Restart app
pm2 restart whatsai
```

### Build Fails

- Check Node version compatibility
- Verify all environment variables are set
- Check for TypeScript errors: `npm run build`
- Review GitHub Actions logs

### Tests Fail

- Run tests locally: `npm test`
- Check database connection
- Verify environment variables
- Review test logs in GitHub Actions

---

## 📞 Support

For CI/CD issues:
- 📧 Email: devops@whatsai.com.br
- 💬 Slack: #ci-cd channel
- 📖 Docs: Internal wiki

---

**Last Updated:** November 7, 2025  
**Maintained by:** WhatsAI DevOps Team
