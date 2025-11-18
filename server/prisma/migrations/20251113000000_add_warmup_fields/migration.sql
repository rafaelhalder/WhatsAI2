-- AlterTable
ALTER TABLE "whatsapp_instances" 
ADD COLUMN IF NOT EXISTS "messagesSentToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastWarmupStateChange" TIMESTAMP(3);

-- Create indexes for warmup queries (if they don't exist)
CREATE INDEX IF NOT EXISTS "whatsapp_instances_lastMessageAt_idx" ON "whatsapp_instances"("lastMessageAt");
