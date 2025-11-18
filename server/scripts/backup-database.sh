#!/bin/bash

################################################################################
# WhatsAI Database Backup Script
# 
# This script creates automated backups of the PostgreSQL database with:
# - Timestamped backups
# - Compression (gzip)
# - Retention policy (keeps last 30 days)
# - Backup verification
# - Optional upload to S3/Spaces
# - Error notifications
#
# Usage:
#   ./backup-database.sh
#
# Cron example (daily at 2 AM):
#   0 2 * * * /path/to/whatsai/server/scripts/backup-database.sh >> /var/log/whatsai-backup.log 2>&1
#
################################################################################

set -euo pipefail  # Exit on error, undefined vars, and pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"
ENV_FILE="${PROJECT_ROOT}/.env"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_DIR=$(date +"%Y-%m")
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo -e "${RED}ERROR: .env file not found at ${ENV_FILE}${NC}"
    exit 1
fi

# Extract database credentials from DATABASE_URL
# Format: postgresql://user:password@host:port/database
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}ERROR: DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Parse DATABASE_URL
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo -e "${RED}ERROR: Invalid DATABASE_URL format${NC}"
    exit 1
fi

# Create backup directory structure
mkdir -p "${BACKUP_DIR}/${DATE_DIR}"

# Backup filename
BACKUP_FILE="${BACKUP_DIR}/${DATE_DIR}/whatsai_backup_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo "========================================="
echo "WhatsAI Database Backup"
echo "========================================="
echo "Timestamp: $(date)"
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "Backup directory: ${BACKUP_DIR}/${DATE_DIR}"
echo "========================================="

# Function to send notification (implement your own notification service)
send_notification() {
    local status=$1
    local message=$2
    
    # Example: You can implement email, Slack, Telegram notifications here
    if [ "$status" = "success" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    else
        echo -e "${RED}❌ $message${NC}"
    fi
    
    # Optional: Send email notification (requires mailutils)
    # echo "$message" | mail -s "WhatsAI Backup $status" admin@whatsai.com
}

# Perform backup
echo "Starting backup..."
export PGPASSWORD="${DB_PASS}"

if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --verbose \
    --format=plain \
    --no-owner \
    --no-acl \
    > "${BACKUP_FILE}" 2>&1; then
    
    echo -e "${GREEN}✅ Database dump completed${NC}"
    
    # Compress backup
    echo "Compressing backup..."
    if gzip -9 "${BACKUP_FILE}"; then
        echo -e "${GREEN}✅ Backup compressed${NC}"
        FINAL_BACKUP="${BACKUP_FILE_GZ}"
    else
        echo -e "${YELLOW}⚠️  Compression failed, keeping uncompressed backup${NC}"
        FINAL_BACKUP="${BACKUP_FILE}"
    fi
    
    # Verify backup integrity
    echo "Verifying backup integrity..."
    if [ -f "${FINAL_BACKUP}" ] && [ -s "${FINAL_BACKUP}" ]; then
        BACKUP_SIZE=$(du -h "${FINAL_BACKUP}" | cut -f1)
        echo -e "${GREEN}✅ Backup verified (Size: ${BACKUP_SIZE})${NC}"
        
        # Optional: Upload to S3/DigitalOcean Spaces
        if [ -n "${DO_SPACES_ENDPOINT:-}" ] && [ -n "${DO_SPACES_KEY:-}" ] && [ -n "${DO_SPACES_SECRET:-}" ]; then
            echo "Uploading to DigitalOcean Spaces..."
            if command -v aws &> /dev/null; then
                AWS_ACCESS_KEY_ID="${DO_SPACES_KEY}" \
                AWS_SECRET_ACCESS_KEY="${DO_SPACES_SECRET}" \
                aws s3 cp "${FINAL_BACKUP}" \
                    "s3://whatsai-backups/database/${DATE_DIR}/$(basename ${FINAL_BACKUP})" \
                    --endpoint-url="${DO_SPACES_ENDPOINT}" \
                    --region="${DO_SPACES_REGION:-us-east-1}" \
                    && echo -e "${GREEN}✅ Backup uploaded to cloud${NC}" \
                    || echo -e "${YELLOW}⚠️  Cloud upload failed${NC}"
            else
                echo -e "${YELLOW}⚠️  AWS CLI not installed, skipping cloud upload${NC}"
            fi
        fi
        
        # Clean up old backups (keep last RETENTION_DAYS days)
        echo "Cleaning up old backups (keeping last ${RETENTION_DAYS} days)..."
        find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
        find "${BACKUP_DIR}" -type f -name "*.sql" -mtime +${RETENTION_DAYS} -delete
        
        # Remove empty directories
        find "${BACKUP_DIR}" -type d -empty -delete
        
        # Success notification
        send_notification "success" "Backup completed successfully: $(basename ${FINAL_BACKUP}) (${BACKUP_SIZE})"
        
        echo "========================================="
        echo -e "${GREEN}✅ Backup completed successfully!${NC}"
        echo "Backup file: ${FINAL_BACKUP}"
        echo "Size: ${BACKUP_SIZE}"
        echo "========================================="
        exit 0
    else
        send_notification "error" "Backup verification failed: file is empty or missing"
        echo -e "${RED}ERROR: Backup verification failed${NC}"
        exit 1
    fi
else
    send_notification "error" "Database dump failed"
    echo -e "${RED}ERROR: Database dump failed${NC}"
    exit 1
fi

unset PGPASSWORD
