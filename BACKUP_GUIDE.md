# 🔒 Backup & Restore - WhatsAI Database

Este documento descreve o sistema de backup automático do WhatsAI e como restaurar dados em caso de necessidade.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração Inicial](#configuração-inicial)
3. [Backup Automático](#backup-automático)
4. [Backup Manual](#backup-manual)
5. [Restauração de Backup](#restauração-de-backup)
6. [Monitoramento](#monitoramento)
7. [Solução de Problemas](#solução-de-problemas)

---

## 🎯 Visão Geral

O sistema de backup do WhatsAI inclui:

- ✅ **Backups automáticos diários** (configurável via cron)
- ✅ **Compressão gzip** para economizar espaço
- ✅ **Retenção de 30 dias** (backups antigos são removidos automaticamente)
- ✅ **Verificação de integridade** após cada backup
- ✅ **Upload opcional para cloud** (DigitalOcean Spaces/S3)
- ✅ **Notificações de erro** (configurável)
- ✅ **Backup de segurança** antes de restauração

---

## ⚙️ Configuração Inicial

### 1. Dar permissão de execução aos scripts

```bash
cd /path/to/WhatsAI2/server/scripts
chmod +x backup-database.sh
chmod +x restore-database.sh
```

### 2. Testar backup manual

```bash
./backup-database.sh
```

Você deverá ver algo como:

```
=========================================
WhatsAI Database Backup
=========================================
Timestamp: Mon Nov 11 14:30:00 UTC 2025
Database: whatsai_production
Host: localhost:5432
Backup directory: /path/to/server/backups/2025-11
=========================================
Starting backup...
✅ Database dump completed
Compressing backup...
✅ Backup compressed
Verifying backup integrity...
✅ Backup verified (Size: 2.3M)
=========================================
✅ Backup completed successfully!
Backup file: /path/to/server/backups/2025-11/whatsai_backup_20251111_143000.sql.gz
Size: 2.3M
=========================================
```

### 3. Verificar backup criado

```bash
ls -lh ../backups/
```

---

## 🤖 Backup Automático

### Configurar Cron Job (Linux/Mac)

#### Opção 1: Backup diário às 2h da manhã

```bash
# Editar crontab
crontab -e

# Adicionar linha (ajuste o caminho):
0 2 * * * /path/to/WhatsAI2/server/scripts/backup-database.sh >> /var/log/whatsai-backup.log 2>&1
```

#### Opção 2: Backup a cada 6 horas

```bash
0 */6 * * * /path/to/WhatsAI2/server/scripts/backup-database.sh >> /var/log/whatsai-backup.log 2>&1
```

#### Opção 3: Backup duas vezes ao dia (2h e 14h)

```bash
0 2,14 * * * /path/to/WhatsAI2/server/scripts/backup-database.sh >> /var/log/whatsai-backup.log 2>&1
```

### Configurar Task Scheduler (Windows)

1. Abrir **Task Scheduler** (`taskschd.msc`)
2. **Create Basic Task**
3. Nome: "WhatsAI Database Backup"
4. Trigger: **Daily** às **02:00**
5. Action: **Start a program**
6. Program: `bash`
7. Arguments: `/path/to/WhatsAI2/server/scripts/backup-database.sh`
8. Finish

### Verificar se Cron está funcionando

```bash
# Ver últimos backups
ls -lht backups/ | head -10

# Ver log de backups
tail -f /var/log/whatsai-backup.log
```

---

## 🖐️ Backup Manual

### Backup Completo

```bash
cd /path/to/WhatsAI2/server/scripts
./backup-database.sh
```

### Backup Antes de Atualização Importante

```bash
# Fazer backup com nome descritivo
cd ../backups
mkdir pre-update-v2.0
cd ../../scripts
./backup-database.sh

# Mover backup para pasta específica
mv ../backups/$(date +%Y-%m)/whatsai_backup_*.sql.gz ../backups/pre-update-v2.0/
```

### Backup com Upload para Cloud (Opcional)

Adicione no `.env`:

```env
# DigitalOcean Spaces / AWS S3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_KEY=your-spaces-access-key
DO_SPACES_SECRET=your-spaces-secret-key
DO_SPACES_REGION=nyc3
```

O script automaticamente fará upload se essas variáveis estiverem configuradas.

---

## 🔄 Restauração de Backup

### ⚠️ AVISO IMPORTANTE

**A restauração substitui TODOS os dados atuais do banco de dados!**

### 1. Listar Backups Disponíveis

```bash
cd /path/to/WhatsAI2/server/backups
find . -name "*.sql.gz" -type f | sort -r
```

### 2. Restaurar de um Backup Específico

```bash
cd ../scripts
./restore-database.sh ../backups/2025-11/whatsai_backup_20251111_020000.sql.gz
```

O script irá:
1. ✅ Criar um backup de segurança do banco atual
2. ⚠️ Pedir confirmação (digite `yes`)
3. 🗑️ Limpar tabelas existentes
4. 📥 Restaurar dados do backup
5. ✅ Confirmar sucesso

### 3. Restaurar do Backup de Segurança (se algo der errado)

Se a restauração falhar, o script tentará restaurar automaticamente do backup de segurança.

Você também pode restaurar manualmente:

```bash
./restore-database.sh /tmp/whatsai_safety_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## 📊 Monitoramento

### Verificar Tamanho dos Backups

```bash
du -sh backups/
du -sh backups/*
```

### Verificar Últimos 10 Backups

```bash
find backups/ -name "*.sql.gz" -type f -printf '%T@ %p\n' | sort -rn | head -10
```

### Verificar Espaço em Disco

```bash
df -h
```

### Alertas de Falha

Você pode configurar notificações por email editando a função `send_notification()` em `backup-database.sh`:

```bash
send_notification() {
    local status=$1
    local message=$2
    
    if [ "$status" = "error" ]; then
        echo "$message" | mail -s "WhatsAI Backup FAILED" admin@whatsai.com.br
    fi
}
```

**Requisitos:**
- Instalar `mailutils`: `sudo apt-get install mailutils` (Linux)
- Configurar SMTP no servidor

### Integração com Slack/Telegram

Exemplo para Slack:

```bash
send_notification() {
    local status=$1
    local message=$2
    local webhook_url="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    
    if [ "$status" = "error" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 WhatsAI Backup Failed: $message\"}" \
            "$webhook_url"
    fi
}
```

---

## 🐛 Solução de Problemas

### Problema: Permission denied

```bash
chmod +x backup-database.sh restore-database.sh
```

### Problema: pg_dump: command not found

**Linux:**
```bash
sudo apt-get install postgresql-client
```

**Mac:**
```bash
brew install postgresql
```

**Windows (WSL):**
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

### Problema: Authentication failed

Verifique se o `DATABASE_URL` no `.env` está correto:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/database"
```

### Problema: Backup file is empty

Possíveis causas:
1. Banco de dados vazio (normal em instalação nova)
2. Erro de permissão no diretório de backup
3. Disco cheio

```bash
# Verificar espaço em disco
df -h

# Criar diretório de backup manualmente
mkdir -p backups/$(date +%Y-%m)
```

### Problema: Old backups not being deleted

```bash
# Listar backups antigos
find backups/ -name "*.sql.gz" -mtime +30

# Deletar manualmente
find backups/ -name "*.sql.gz" -mtime +30 -delete
```

### Problema: Cloud upload fails

1. Verifique se AWS CLI está instalado:
   ```bash
   which aws
   # Se não estiver: sudo apt-get install awscli
   ```

2. Verifique credenciais do Spaces:
   ```bash
   echo $DO_SPACES_KEY
   echo $DO_SPACES_SECRET
   ```

3. Teste upload manual:
   ```bash
   AWS_ACCESS_KEY_ID="your-key" \
   AWS_SECRET_ACCESS_KEY="your-secret" \
   aws s3 ls --endpoint-url="https://nyc3.digitaloceanspaces.com"
   ```

---

## 📝 Checklist de Backup Saudável

- [ ] Backup automático configurado via cron
- [ ] Último backup tem menos de 24h
- [ ] Backups ocupam menos de 80% do disco
- [ ] Pelo menos 3 backups recentes disponíveis
- [ ] Backups antigos (>30 dias) são removidos automaticamente
- [ ] Teste de restauração realizado nos últimos 3 meses
- [ ] Notificações de erro configuradas
- [ ] Backup em cloud configurado (recomendado para produção)

---

## 🚨 Recomendações de Segurança

### Produção

1. ✅ **Backup diário às 2h** (horário de menor tráfego)
2. ✅ **Retenção de 30 dias** local + **90 dias** em cloud
3. ✅ **Upload para Spaces** habilitado
4. ✅ **Notificações de falha** configuradas
5. ✅ **Teste de restauração** mensal
6. ✅ **Monitoramento de espaço** em disco

### Desenvolvimento

1. ✅ **Backup semanal** é suficiente
2. ✅ **Retenção de 7 dias**
3. ✅ Sem upload para cloud (opcional)

---

## 📞 Suporte

Se você tiver problemas com backups:

1. Verifique logs: `tail -f /var/log/whatsai-backup.log`
2. Execute backup manual para debug
3. Entre em contato: `suporte@whatsai.com.br`

---

**Última atualização:** 11 de Novembro de 2025  
**Versão:** 1.0.0
