import { Router } from 'express';
import { authRoutes } from './auth';
import { instanceRoutes } from './instances';
import { webhookRoutes } from './webhooks';
import settingsRoutes from './settings';
import accountRoutes from './account';
import { conversationRoutes } from './conversation-routes';
import { dashboardRoutes } from './dashboard';
import { templateRoutes } from './templates';
import campaignRoutes from './campaigns';
import plansRoutes from './plans';
import billingRoutes from './billing';
import stripeWebhooksRoutes from './stripe-webhooks';
import { mediaRoutes } from './media';
import autoResponsesRoutes from './auto-responses';
import onboardingRoutes from './onboarding';
import { authMiddleware } from '@/api/middlewares/auth-middleware';
import { debounceService } from '../../services/debounce-service';
import { cacheService } from '../../services/cache-service';

const router = Router();

// Health check endpoint (public)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'WhatsAI Multi-Instance Manager',
    version: '1.0.0'
  });
});

// Performance stats endpoint (public)
router.get('/stats', (req, res) => {
  try {
    const debounceStats = debounceService.getStats();
    const cacheStats = cacheService.getStats();
    
    res.json({
      timestamp: new Date().toISOString(),
      debounce: debounceStats,
      cache: cacheStats
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Authentication routes (public)
router.use('/auth', authRoutes);

// Stripe webhooks (public, signature verified inside)
router.use('/webhooks/stripe', stripeWebhooksRoutes);

// Protected routes (require authentication)
router.use('/instances', authMiddleware, instanceRoutes);
router.use('/conversations', authMiddleware, conversationRoutes);
router.use('/dashboard', authMiddleware, dashboardRoutes);
router.use('/templates', authMiddleware, templateRoutes);
router.use('/campaigns', authMiddleware, campaignRoutes);
router.use('/auto-responses', autoResponsesRoutes); // Already has authMiddleware inside
router.use('/plans', authMiddleware, plansRoutes);
router.use('/billing', billingRoutes); // Already has authMiddleware inside
router.use('/settings', authMiddleware, settingsRoutes);
router.use('/account', authMiddleware, accountRoutes);
router.use('/onboarding', onboardingRoutes); // Already has authMiddleware inside
router.use('/media', mediaRoutes);
router.use('/webhooks', webhookRoutes);

export { router as apiRoutes };