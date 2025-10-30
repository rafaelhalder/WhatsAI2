import { Router } from 'express';
import { ConversationController } from '../controllers/conversation-controller';
import { authMiddleware } from '../middlewares/auth-middleware';
import multer from 'multer';

const router = Router();
const conversationController = new ConversationController();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio, and documents
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/quicktime',
      'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
      'application/pdf', 'text/plain', 'application/msword'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Apply auth middleware to all conversation routes
router.use(authMiddleware);

// Get all conversations (with optional instanceId filter)
router.get('/', (req, res) => {
  conversationController.getConversations(req, res);
});

// Get conversations for a specific instance
router.get('/instance/:instanceId', (req, res) => {
  conversationController.getConversations(req, res);
});

// Get specific conversation
router.get('/:conversationId', (req, res) => {
  conversationController.getConversation(req, res);
});

// Get messages for a specific conversation
router.get('/:conversationId/messages', (req, res) => {
  conversationController.getConversationMessages(req, res);
});

// Send message in a conversation
router.post('/:conversationId/messages', (req, res) => {
  conversationController.sendMessage(req, res);
});

// Send media message in a conversation
router.post('/:conversationId/media', (req, res) => {
  conversationController.sendMediaMessage(req, res);
});

// Upload and send media file in a conversation
router.post('/:conversationId/upload-media',
  upload.single('file'),
  (req, res) => {
    conversationController.uploadAndSendMediaMessage(req, res);
  }
);

// Send message in a conversation (alternative route for instance)
router.post('/instance/:instanceId/send', (req, res) => {
  conversationController.sendMessage(req, res);
});

// Mark conversation as read
router.patch('/:conversationId/read', (req, res) => {
  conversationController.markConversationAsRead(req, res);
});

// Mark conversation as unread  
router.patch('/:conversationId/unread', (req, res) => {
  conversationController.markConversationAsUnread(req, res);
});

// Pin conversation
router.patch('/:conversationId/pin', (req, res) => {
  conversationController.pinConversation(req, res);
});

// Unpin conversation
router.patch('/:conversationId/unpin', (req, res) => {
  conversationController.unpinConversation(req, res);
});

// Archive conversation
router.patch('/:conversationId/archive', (req, res) => {
  conversationController.archiveConversation(req, res);
});

// Unarchive conversation
router.patch('/:conversationId/unarchive', (req, res) => {
  conversationController.unarchiveConversation(req, res);
});

// Get archived conversations for an instance
router.get('/instance/:instanceId/archived', (req, res) => {
  conversationController.getArchivedConversations(req, res);
});

// Clear all messages in a conversation
router.delete('/:conversationId/messages', (req, res) => {
  conversationController.clearConversationMessages(req, res);
});

// Delete conversation
router.delete('/:conversationId', (req, res) => {
  conversationController.deleteConversation(req, res);
});

export { router as conversationRoutes };