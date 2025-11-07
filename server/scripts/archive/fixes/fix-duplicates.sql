-- Script SQL para deletar conversas duplicadas
-- Execute no Prisma Studio ou diretamente no PostgreSQL

-- 1. Ver conversas duplicadas
SELECT 
  REPLACE(REPLACE(REPLACE("remoteJid", '@s.whatsapp.net', ''), '@g.us', ''), '@c.us', '') as numero_limpo,
  COUNT(*) as quantidade,
  STRING_AGG(id, ', ') as ids
FROM "Conversation"
GROUP BY numero_limpo
HAVING COUNT(*) > 1;

-- 2. Deletar conversa específica (substitua o ID)
-- DELETE FROM "Conversation" WHERE id = 'ID_DA_CONVERSA_DUPLICADA';

-- Exemplo para o seu caso:
-- Se 79512746377469 e 554198773200 são o mesmo contato, delete uma delas:
-- DELETE FROM "Conversation" WHERE "remoteJid" LIKE '%79512746377469%';
-- OU
-- DELETE FROM "Conversation" WHERE "remoteJid" LIKE '%554198773200%';
