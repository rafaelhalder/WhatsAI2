import { Router, Request, Response } from 'express';
import { openAIService } from '../../services/openai-service';
import { authMiddleware } from '../middlewares/auth-middleware';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Schema validations
 */
const generateSmartRepliesSchema = z.object({
  incomingMessage: z.string().min(1, 'Message is required'),
  conversationHistory: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).optional(),
});

const adjustToneSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  tone: z.enum(['professional', 'friendly', 'formal', 'casual', 'concise']),
});

const checkGrammarSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

/**
 * @route   POST /api/ai-features/smart-replies
 * @desc    Generate 3 smart reply suggestions for an incoming message
 * @access  Private
 */
router.post('/smart-replies', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    // Validate request body
    const validation = generateSmartRepliesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors,
      });
    }

    const { incomingMessage, conversationHistory } = validation.data;

    // Check if AI is available
    if (!openAIService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'AI features are not available. Please configure OPENAI_API_KEY.',
      });
    }

    // Generate smart replies
    const replies = await openAIService.generateSmartReplies(
      incomingMessage,
      conversationHistory
    );

    return res.json({
      success: true,
      data: {
        replies,
        count: replies.length,
      },
    });
  } catch (error: any) {
    console.error('[AI_FEATURES] Smart replies error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate smart replies',
    });
  }
});

/**
 * @route   POST /api/ai-features/adjust-tone
 * @desc    Adjust the tone of a message
 * @access  Private
 */
router.post('/adjust-tone', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    // Validate request body
    const validation = adjustToneSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors,
      });
    }

    const { message, tone } = validation.data;

    // Check if AI is available
    if (!openAIService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'AI features are not available. Please configure OPENAI_API_KEY.',
      });
    }

    // Adjust message tone
    const adjustedMessage = await openAIService.adjustMessageTone(message, tone);

    return res.json({
      success: true,
      data: {
        original: message,
        adjusted: adjustedMessage,
        tone,
      },
    });
  } catch (error: any) {
    console.error('[AI_FEATURES] Adjust tone error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to adjust message tone',
    });
  }
});

/**
 * @route   POST /api/ai-features/check-grammar
 * @desc    Check grammar and spelling in a message
 * @access  Private
 */
router.post('/check-grammar', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    // Validate request body
    const validation = checkGrammarSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validation.error.errors,
      });
    }

    const { text } = validation.data;

    // Check if AI is available
    if (!openAIService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'AI features are not available. Please configure OPENAI_API_KEY.',
      });
    }

    // Check grammar and spelling
    const result = await openAIService.checkGrammarAndSpelling(text);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[AI_FEATURES] Check grammar error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check grammar',
    });
  }
});

/**
 * @route   GET /api/ai-features/status
 * @desc    Check if AI features are available
 * @access  Private
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const isAvailable = openAIService.isAvailable();

    return res.json({
      success: true,
      data: {
        available: isAvailable,
        features: {
          smartReplies: isAvailable,
          toneAdjuster: isAvailable,
          grammarCheck: isAvailable,
        },
      },
    });
  } catch (error: any) {
    console.error('[AI_FEATURES] Status check error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check AI features status',
    });
  }
});

export default router;
