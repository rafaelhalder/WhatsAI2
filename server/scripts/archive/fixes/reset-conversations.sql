-- Limpar todas as conversas e mensagens para começar do zero
-- Isso garantirá que todas as novas mensagens tenham senderName desde o início

-- Deletar todas as mensagens primeiro (devido à foreign key)
DELETE FROM messages;

-- Deletar todas as conversas
DELETE FROM conversations;

-- Opcional: Reset das sequences (IDs começam do 1 novamente)
-- Não necessário pois usamos CUID, mas deixo comentado caso queira
-- ALTER SEQUENCE messages_id_seq RESTART WITH 1;
-- ALTER SEQUENCE conversations_id_seq RESTART WITH 1;
