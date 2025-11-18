#!/bin/bash

################################################################################
# WhatsAI Database Restore Script
# 
# This script restores a PostgreSQL database from a backup file.
#
# Usage:
#   ./restore-database.sh <backup-file.sql.gz>
#
# Example:
#   ./restore-database.sh ../backups/2025-11/whatsai_backup_20251111_020000.sql.gz
#
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}ERROR: No backup file specified${NC}"
    echo "Usage: $0 <backup-file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}ERROR: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo -e "${RED}ERROR: .env file not found at ${ENV_FILE}${NC}"
    exit 1
fi

# Extract database credentials
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}ERROR: DATABASE_URL not found in .env${NC}"
    exit 1
fi

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

echo "========================================="
echo "WhatsAI Database Restore"
echo "========================================="
echo "Timestamp: $(date)"
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "Backup file: ${BACKUP_FILE}"
echo "========================================="
echo ""

# Warning
echo -e "${YELLOW}⚠️  WARNING: This will REPLACE all current data in the database!${NC}"
echo -e "${YELLOW}   Make sure you have a recent backup before proceeding.${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

# Create a safety backup of current database
echo "Creating safety backup of current database..."
SAFETY_BACKUP="/tmp/whatsai_safety_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
export PGPASSWORD="${DB_PASS}"

if pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    --format=plain --no-owner --no-acl | gzip > "${SAFETY_BACKUP}"; then
    echo -e "${GREEN}✅ Safety backup created: ${SAFETY_BACKUP}${NC}"
else
    echo -e "${RED}ERROR: Failed to create safety backup${NC}"
    exit 1
fi

# Drop all existing tables (safer than DROP DATABASE)
echo "Dropping existing tables..."
PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "
DO \$\$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
"

# Restore from backup
echo "Restoring database from backup..."
if [[ $BACKUP_FILE == *.gz ]]; then
    # Decompress and restore
    if gunzip -c "${BACKUP_FILE}" | PGPASSWORD="${DB_PASS}" psql \
        -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
        -v ON_ERROR_STOP=1; then
        echo -e "${GREEN}✅ Database restored successfully${NC}"
    else
        echo -e "${RED}ERROR: Restore failed${NC}"
        echo -e "${YELLOW}Attempting to restore from safety backup...${NC}"
        gunzip -c "${SAFETY_BACKUP}" | PGPASSWORD="${DB_PASS}" psql \
            -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"
        exit 1
    fi
else
    # Restore directly from SQL file
    if PGPASSWORD="${DB_PASS}" psql \
        -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
        -f "${BACKUP_FILE}" -v ON_ERROR_STOP=1; then
        echo -e "${GREEN}✅ Database restored successfully${NC}"
    else
        echo -e "${RED}ERROR: Restore failed${NC}"
        exit 1
    fi
fi

unset PGPASSWORD

echo "========================================="
echo -e "${GREEN}✅ Restore completed successfully!${NC}"
echo "Safety backup saved at: ${SAFETY_BACKUP}"
echo "========================================="
