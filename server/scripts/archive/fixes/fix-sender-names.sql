-- Atualizar senderName para mensagens antigas de grupos
-- Usar nome do grupo como fallback (idealmente seria o nome real do membro)

UPDATE messages m
SET "senderName" = COALESCE(c."contactName", 'Membro do Grupo')
FROM conversations c
WHERE m."conversationId" = c.id
  AND m."senderName" IS NULL
  AND m."fromMe" = false
  AND c."isGroup" = true;
