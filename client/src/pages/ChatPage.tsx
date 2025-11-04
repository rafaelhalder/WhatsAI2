import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Phone, Video, MoreVertical, ArrowLeft, Search, Paperclip } from 'lucide-react';
import { userAuthStore } from '../features/auth/store/authStore';
import { conversationService } from '../services/conversationService';
import { socketService } from '../services/socketService';
import { getDisplayName } from '../utils/contact-display';
import { MediaMessage } from '../components/messages';
import { FileUploadService } from '../services/fileUploadService';
import { usePresence } from '../hooks/usePresence';

interface Message {
  id: string;
  content: string;
  fromMe: boolean;
  timestamp: Date;
  messageType: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
  status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'PLAYED' | 'FAILED';
  mediaUrl?: string;
  fileName?: string;
  caption?: string;
  senderName?: string; // Nome do remetente (para mensagens de grupo)
}

interface Conversation {
  id: string;
  remoteJid: string;
  contactName: string | null;
  contactPicture?: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
}

export const ChatPage: React.FC = () => {
  // instanceId vem da URL, mas não é usado diretamente aqui (ChatLayout gerencia a conexão)
  // @ts-ignore - instanceId é necessário na URL mas não usado no componente
  const { instanceId, conversationId } = useParams<{ instanceId: string; conversationId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook para gerenciar status de presença
  const { getPresence } = usePresence(instanceId || '');

  // Usar o store de autenticação global
  const token = userAuthStore((state) => state.token);
  const logout = userAuthStore((state) => state.logout);

  // Componente de check mark do WhatsApp
  const MessageStatusCheck = ({ status }: { status?: Message['status'] }) => {
    if (!status) return null;

    const CheckIcon = () => (
      <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
        <path d="M5.5 8.5L2 5l-1 1 4.5 4.5L15 1l-1-1z"/>
      </svg>
    );

    const DoubleCheckIcon = () => (
      <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
        <path d="M11 1l-1 1 4.5 4.5L11 10l1 1 5.5-5.5z"/>
        <path d="M5.5 8.5L2 5l-1 1 4.5 4.5L15 1l-1-1z"/>
      </svg>
    );

    switch (status) {
      case 'PENDING':
        return (
          <div className="inline-flex items-center ml-1">
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-base-content/50 opacity-60">
              <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
        );
      
      case 'SENT':
        return (
          <div className="inline-flex items-center ml-1 text-primary">
            <CheckIcon />
          </div>
        );
      
      case 'DELIVERED':
        return (
          <div className="inline-flex items-center ml-1 text-base-content/50">
            <DoubleCheckIcon />
          </div>
        );
      
      case 'READ':
      case 'PLAYED':
        return (
          <div className="inline-flex items-center ml-1 text-primary">
            <DoubleCheckIcon />
          </div>
        );
      
      case 'FAILED':
        return (
          <div className="inline-flex items-center ml-1 text-error" title="Falha no envio">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 3v3M6 8v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        );
      
      default:
        return null;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (conversationId) {
      loadConversation();
      loadMessages();
      
      console.log('🔌 [ChatPage] Notificando conversa aberta:', conversationId);
      
      // � Notificar que a conversa foi aberta
      socketService.openConversation(conversationId);
      
      // 📱 Cleanup: notificar quando a conversa for fechada
      return () => {
        console.log('🔌 [ChatPage] Notificando conversa fechada:', conversationId);
        socketService.closeConversation(conversationId);
      };
    }
  }, [conversationId]);

  // 🔗 Setup WebSocket listeners for real-time updates
  useEffect(() => {
    if (!conversationId) return;

    // Listen for new messages in this conversation
    const handleNewMessage = (data: { conversationId: string; message: any }) => {
      if (data.conversationId === conversationId) {
        const newMessage: Message = {
          id: data.message.id,
          content: data.message.content,
          fromMe: data.message.fromMe,
          timestamp: new Date(data.message.timestamp),
          messageType: data.message.messageType || 'text',
          status: data.message.status || (data.message.fromMe ? 'SENT' : undefined),
          senderName: data.message.senderName,
          mediaUrl: data.message.mediaUrl,
          fileName: data.message.fileName,
          caption: data.message.caption
        };
        
        setMessages(prev => [...prev, newMessage]);
        console.log(`📩 Nova mensagem recebida via WebSocket para conversa ${conversationId}`, newMessage);
      }
    };

    // Listen for conversation updates
    const handleConversationUpdate = (conversation: Conversation) => {
      if (conversation.id === conversationId) {
        setConversation(conversation);
        console.log(`🔄 Conversa ${conversationId} atualizada via WebSocket`);
      }
    };

    // Listen for message status updates (READ, DELIVERED, etc.)
    const handleMessageStatusUpdate = (data: { messageId: string; status: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, status: data.status as Message['status'] }
            : msg
        ));
        console.log(`✅ Status da mensagem ${data.messageId} atualizado para: ${data.status}`);
      }
    };

    socketService.on('message:received', handleNewMessage);
    socketService.on('conversation:updated', handleConversationUpdate);
    socketService.on('message:status', handleMessageStatusUpdate);

    return () => {
      socketService.off('message:received', handleNewMessage);
      socketService.off('conversation:updated', handleConversationUpdate);
      socketService.off('message:status', handleMessageStatusUpdate);
    };
  }, [conversationId]);

  // ✨ Marcar como lida após um tempo ativo na conversa
  useEffect(() => {
    if (!conversation || !conversationId || !token || conversation.unreadCount === 0) {
      return;
    }

    // Marcar como lida após 3 segundos de permanência na conversa
    const timeoutId = setTimeout(async () => {
      if (conversation.unreadCount > 0) {
        try {
          await conversationService.markAsRead(conversationId, token);
          console.log(`📖 Conversa ${conversationId} marcada como lida após permanência ativa`);
          setConversation(prev => prev ? { ...prev, unreadCount: 0 } : null);
        } catch (error) {
          console.error('❌ Erro ao marcar conversa como lida:', error);
        }
      }
    }, 3000); // 3 segundos

    return () => clearTimeout(timeoutId);
  }, [conversation?.id, conversation?.unreadCount, conversationId, token]);

  // ✨ Marcar como lida quando a página fica visível novamente (usuário volta para a aba)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && conversation && conversation.unreadCount > 0 && conversationId && token) {
        // Quando o usuário volta para a aba, marcar como lida se houver mensagens não lidas
        conversationService.markAsRead(conversationId, token)
          .then(() => {
            console.log(`📖 Conversa ${conversationId} marcada como lida (foco na aba)`);
            setConversation(prev => prev ? { ...prev, unreadCount: 0 } : null);
          })
          .catch(error => {
            console.error('❌ Erro ao marcar como lida (foco na aba):', error);
          });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [conversation, conversationId, token]);

  const loadConversation = async () => {
    try {
      if (!token) {
        logout();
        navigate('/login');
        return;
      }
      
      const response = await fetch(`/api/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setConversation(data.data);
        
        // ✨ NÃO marcar automaticamente como lida apenas por carregar a conversa
        // A marcação como lida acontece via WebSocket quando mensagens chegam 
        // e a conversa está ativa, ou via visibility change quando usuário volta à aba
        console.log(`📱 Conversa carregada: ${data.data?.contactName || data.data?.remoteJid} (unreadCount: ${data.data?.unreadCount || 0})`);
      }
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        logout();
        navigate('/login');
        return;
      }
      
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('Dados recebidos do backend:', data);
        // O backend retorna data.data.messages, não data.data
        const messages = data.data?.messages || [];
        
        // Debug: verificar se status está vindo
        if (messages.length > 0) {
          console.log('🔍 Primeira mensagem (verificar status):', {
            id: messages[0].id,
            content: messages[0].content?.substring(0, 50),
            fromMe: messages[0].fromMe,
            status: messages[0].status,
            hasStatus: 'status' in messages[0]
          });
        }
        
        // Converter timestamps string para Date
        const processedMessages = messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(processedMessages);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation || sending) return;

    setSending(true);
    try {
      if (!token) {
        logout();
        navigate('/login');
        return;
      }
      
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          remoteJid: conversation.remoteJid,
          content: newMessage.trim()
        })
      });

      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      if (response.ok) {
        await response.json();
        
        // Adicionar mensagem localmente
        const tempMessage: Message = {
          id: Date.now().toString(),
          content: newMessage.trim(),
          fromMe: true,
          timestamp: new Date(),
          messageType: 'text',
          status: 'SENT'
        };
        
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        
        // ✨ Marcar como lida quando o usuário envia uma mensagem (se ainda não estava lida)
        if (conversation && conversation.unreadCount > 0 && conversationId) {
          try {
            await conversationService.markAsRead(conversationId, token);
            console.log(`📖 Conversa ${conversationId} marcada como lida após envio de mensagem`);
            
            // Atualizar o estado local
            setConversation(prev => prev ? { ...prev, unreadCount: 0 } : null);
          } catch (error) {
            console.error('❌ Erro ao marcar conversa como lida após envio:', error);
            // Não bloquear o envio se falhar
          }
        }
      } else {
        // Tentar obter mensagem de erro específica do backend
        try {
          const errorData = await response.json();
          const errorMessage = errorData.message || 'Erro ao enviar mensagem';
          alert(errorMessage);
        } catch {
          alert('Erro ao enviar mensagem');
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Verifique sua conexão.');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !conversation) return;

    setUploadingMedia(true);
    setUploadProgress(0);

    try {
      // Validar arquivo
      const allowedTypes = [
        ...FileUploadService.SUPPORTED_TYPES.image,
        ...FileUploadService.SUPPORTED_TYPES.video,
        ...FileUploadService.SUPPORTED_TYPES.audio,
        ...FileUploadService.SUPPORTED_TYPES.document
      ];

      const validation = FileUploadService.validateFile(file, allowedTypes);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      // Upload do arquivo com progresso (agora usa servidor)
      if (!token) {
        alert('Token de autenticação não encontrado');
        return;
      }

      const uploadResult = await FileUploadService.uploadFile(
        file,
        (progress) => {
          setUploadProgress(progress.percentage);
        },
        undefined, // signal
        conversationId,
        token
      );

      // A mensagem já foi enviada pelo servidor, apenas adicionar localmente
      const tempMessage: Message = {
        id: Date.now().toString(),
        content: '',
        fromMe: true,
        timestamp: new Date(),
        messageType: uploadResult.mediaType.toUpperCase() as Message['messageType'],
        mediaUrl: uploadResult.url,
        fileName: uploadResult.fileName,
        status: 'SENT'
      };

      setMessages(prev => [...prev, tempMessage]);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Erro ao enviar arquivo:', error);

      // Verificar se é um erro do FileUploadService
      if (error.code) {
        alert(`Erro no upload: ${error.message}`);
      } else {
        alert('Erro ao enviar arquivo. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };



  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className={`text-lg font-medium text-base-content`}>
            Conversa não encontrada
          </h3>
          <p className={`mt-2 text-base-content/70`}>
            A conversa solicitada não existe ou foi removida.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`p-4 border-b bg-base-100 border-base-300`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate(`/chat/${instanceId}`)}
              className={`p-2 rounded-full lg:hidden hover:bg-base-200 transition-colors`}
              title="Voltar para conversas"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="relative">
                {conversation.contactPicture ? (
                  <img
                    src={conversation.contactPicture}
                    alt={conversation.contactName || 'Contato'}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-content font-medium">
                      {(conversation.contactName || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className={`absolute bottom-0 right-0 h-3 w-3 bg-success rounded-full border-2 border-base-100`}></div>
              </div>
              <div>
                <h2 className={`font-medium text-base-content`}>
                  {getDisplayName({
                    nickname: (conversation as any).nickname,
                    contactName: conversation.contactName,
                    remoteJid: conversation.remoteJid
                  })}
                </h2>
                <p className={`text-sm text-base-content/70`}>
                  {conversation.isGroup ? 'Grupo' : (() => {
                    if (!conversation) return 'Offline';
                    const presence = getPresence(conversation.remoteJid);
                    switch (presence.status) {
                      case 'online':
                        return 'Online';
                      case 'typing':
                        return 'Digitando...';
                      case 'offline':
                        // Usar lastMessageAt da conversa em vez de lastSeen do presence
                        const lastInteraction = conversation.lastMessageAt;
                        if (lastInteraction) {
                          const date = new Date(lastInteraction);
                          return `Visto por último ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                        }
                        return 'Offline';
                      default:
                        return 'Offline';
                    }
                  })()}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className={`p-2 rounded-full hover:bg-base-200 transition-colors`}>
              <Phone className={`h-5 w-5 text-base-content/60`} />
            </button>
            <button className={`p-2 rounded-full hover:bg-base-200 transition-colors`}>
              <Video className={`h-5 w-5 text-base-content/60`} />
            </button>
            <button className={`p-2 rounded-full hover:bg-base-200 transition-colors`}>
              <Search className={`h-5 w-5 text-base-content/60`} />
            </button>
            <button className="p-2 rounded-full hover:bg-base-200">
              <MoreVertical className="h-5 w-5 text-base-content/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-100">
        {messages.length === 0 ? (
          <div className="text-center mt-8 text-base-content/60">
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm mt-2">Envie a primeira mensagem para iniciar a conversa!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSticker = message.messageType?.toUpperCase() === 'STICKER';
            const isAudio = message.messageType?.toUpperCase() === 'AUDIO';
            
            return (
              <div
                key={message.id}
                className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* Stickers sem balão de mensagem */}
                {isSticker ? (
                  <div className="relative">
                    {message.mediaUrl && (
                      <MediaMessage
                        mediaUrl={message.mediaUrl}
                        mediaType="sticker"
                        fromMe={message.fromMe}
                      />
                    )}
                    {/* Timestamp pequeno abaixo do sticker */}
                    <div className={`text-[10px] mt-1 ${
                      message.fromMe ? 'text-right text-base-content/60' : 'text-left text-base-content/50'
                    }`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                ) : isAudio ? (
                  /* Áudios sem balão de mensagem */
                  <div className="relative">
                    {message.mediaUrl && (
                      <MediaMessage
                        mediaUrl={message.mediaUrl}
                        mediaType="audio"
                        fromMe={message.fromMe}
                      />
                    )}
                    {/* Timestamp pequeno abaixo do áudio */}
                    <div className={`text-[10px] mt-1 ${
                      message.fromMe ? 'text-right text-base-content/60' : 'text-left text-base-content/50'
                    }`}>
                      {formatTime(message.timestamp)}
                      {message.fromMe && (
                        <span className="ml-1 inline-block">
                          <MessageStatusCheck status={message.status} />
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Mensagens normais com balão */
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] lg:max-w-[60%] px-4 py-2 rounded-lg break-words ${
                      message.fromMe
                        ? 'bg-primary text-primary-content rounded-br-none'
                        : `bg-base-100 text-base-content rounded-bl-none shadow-sm`
                    }`}
                  >
                    {/* Nome do remetente (apenas para mensagens de grupo recebidas) */}
                    {message.senderName && !message.fromMe && (
                      <div className="text-xs font-medium text-base-content/80 mb-1">
                        {message.senderName}
                      </div>
                    )}

                    {/* Renderizar mídia se existir */}
                    {message.mediaUrl && (
                      <div className="mb-2">
                        <MediaMessage
                          mediaUrl={message.mediaUrl}
                          mediaType={message.messageType?.toLowerCase() as any || 'image'}
                          fileName={message.fileName}
                          caption={message.caption}
                          fromMe={message.fromMe}
                        />
                      </div>
                    )}

                    {/* Renderizar texto se existir */}
                    {message.content && message.content.trim() && (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}

                    {/* Timestamp e status */}
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      <span className={`text-xs ${
                        message.fromMe ? 'text-primary-content/70' : 'text-base-content/60'
                      }`}>
                        {formatTime(message.timestamp)}
                      </span>
                      {message.fromMe && (
                        <MessageStatusCheck status={message.status} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-base-100 border-base-300">
        <div className="flex items-end space-x-3">
          {/* Input file oculto */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            className="hidden"
          />

          {/* Botão de anexar */}
          <div className="relative">
            <button
              onClick={handleAttachClick}
              disabled={uploadingMedia}
              className="p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base-content/60 hover:text-base-content hover:bg-base-200"
              title={uploadingMedia ? `Enviando... ${uploadProgress}%` : "Anexar arquivo"}
            >
              {uploadingMedia ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-base-content/60"></div>
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </button>

            {/* Barra de progresso */}
            {uploadingMedia && uploadProgress > 0 && (
              <div className="absolute -top-2 -left-2 -right-2 rounded-md p-2 shadow-lg bg-base-100 border border-base-300">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 rounded-full h-2 bg-base-200">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs min-w-[3rem] text-base-content/60">
                    {uploadProgress}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite uma mensagem..."
              className="w-full p-3 border border-base-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-primary bg-base-100 text-base-content placeholder-base-content/60"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-primary text-primary-content rounded-lg hover:bg-primary-focus focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-content"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};