# 📁 Server Scripts Directory

This directory contains utility scripts for database management, testing, and maintenance.

## 📂 Directory Structure

### `/tools` - Active Utility Scripts
Scripts that are actively used for maintenance and inspection:
- `inspect-db-schema.ts` - Inspect database schema and relationships
- `investigate-payment.ts` - Debug payment issues
- `validate-stripe-products.ts` - Validate Stripe product configuration

### `/tests` - Manual Test Scripts
Scripts for manually testing specific features:
- `test-audio-routes.js` - Test audio message handling
- `test-contact-update.ts` - Test contact update functionality
- `test-dashboard-service.ts` - Test dashboard service
- `test-db-connection.ts` - Test database connectivity
- `test-evolution-api.ts` - Test Evolution API integration
- `test-mime-detection.ts` - Test MIME type detection
- `test-spaces-connection.ts` - Test DigitalOcean Spaces connection
- `test-spaces.ts` - Test Spaces storage functionality
- `test-template-system.ts` - Test message template system

### `/archive` - Historical Scripts
Scripts that were used for one-time operations or debugging:

#### `/archive/debug`
Diagnostic scripts for troubleshooting specific issues

#### `/archive/fixes`
One-time fix scripts that have already been executed

#### `/archive/migrations`
Data migration scripts from previous operations

#### `/archive/2025-10-30-cleanup`
Scripts from the October 30, 2025 cleanup operation

### Root Level
- `setup-db.sh` - Database initialization script
- `debug-tools/` - Debugging utilities

## 🚀 Usage

### Running a Script

```bash
# From server directory
npx tsx scripts/tools/inspect-db-schema.ts

# Or with Node
NODE_ENV=production npx tsx scripts/tests/test-db-connection.ts
```

### Creating New Scripts

When creating a new script:
1. Add it to the appropriate subdirectory (`/tools` for utilities, `/tests` for testing)
2. Include a descriptive comment at the top explaining its purpose
3. Document any required environment variables
4. Update this README if it's an important utility

## ⚠️ Important Notes

- **Archive scripts** are kept for historical reference but should not be executed unless you know what you're doing
- **Test scripts** are for manual testing only and are not part of the automated test suite
- **Tool scripts** should be documented and maintained as they are actively used
- Always check `COMANDOS-TESTADOS.md` in the project root before running scripts

## 📋 Maintenance

When a script is no longer needed:
1. Move it to the appropriate `/archive` subdirectory
2. Add a note in this README about when/why it was archived
3. Update any references to it in documentation

## 🗑️ Cleanup History

- **2025-11-07**: Major cleanup - organized scripts into subdirectories, archived debug/fix scripts
- **2025-10-30**: Previous cleanup operation (see archive/2025-10-30-cleanup)
