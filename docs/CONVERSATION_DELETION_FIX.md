# Conversation Deletion Fix

## Problem
When attempting to delete a conversation through the UI, the operation was failing with the error message "Erro ao excluir conversa" (Error deleting conversation). The conversation was not being deleted from the database.

## Root Cause
The issue was caused by a missing `onDelete: Cascade` configuration in the Prisma schema for the Message-Conversation relationship. When a user tried to delete a conversation that contained messages, the database was preventing the deletion due to foreign key constraints - the messages still referenced the conversation that was being deleted.

## Solution
Added `onDelete: Cascade` to the Message-Conversation relationship in the Prisma schema. This ensures that when a conversation is deleted, all associated messages are automatically deleted as well.

### Changes Made

1. **Schema Update** (`server/prisma/schema.prisma`):
   ```prisma
   // Before:
   conversation   Conversation     @relation(fields: [conversationId], references: [id])
   
   // After:
   conversation   Conversation     @relation(fields: [conversationId], references: [id], onDelete: Cascade)
   ```

2. **Database Migration** (`server/prisma/migrations/20251111151138_add_cascade_delete_to_message_conversation/migration.sql`):
   ```sql
   -- DropForeignKey
   ALTER TABLE "messages" DROP CONSTRAINT "messages_conversationId_fkey";
   
   -- AddForeignKey
   ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" 
     FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") 
     ON DELETE CASCADE ON UPDATE CASCADE;
   ```

## How to Apply

### Development Environment
```bash
cd server
npx prisma migrate dev
```

### Production Environment
```bash
cd server
npx prisma migrate deploy
```

## Testing
After applying the migration:

1. Navigate to the conversations list in the UI
2. Select a conversation that has messages
3. Click the "..." menu and select "Excluir conversa" (Delete conversation)
4. Confirm the deletion
5. Verify that:
   - The conversation is removed from the list
   - No error message is displayed
   - The conversation and its messages are deleted from the database

## Impact
- **User-facing**: Users can now successfully delete conversations from the UI
- **Database**: Messages are automatically deleted when their parent conversation is deleted (cascade delete behavior)
- **Performance**: No performance impact; the cascade delete is handled efficiently at the database level

## Related Files
- `server/prisma/schema.prisma` - Schema definition
- `server/prisma/migrations/20251111151138_add_cascade_delete_to_message_conversation/migration.sql` - Migration SQL
- `client/src/components/ConversationList.tsx` - UI component for conversation deletion
- `server/src/api/controllers/conversation-controller.ts` - Backend controller
- `server/src/services/conversation-service.ts` - Business logic
- `server/src/database/repositories/conversation-repository.ts` - Database operations
