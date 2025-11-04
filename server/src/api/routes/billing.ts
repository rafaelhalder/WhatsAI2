import { Router, Request, Response } from 'express';
import { stripeService } from '../../services/stripe-service';
import { prisma } from '../../database/prisma';
import { authMiddleware } from '../middlewares/auth-middleware';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/billing/checkout
 * Create checkout session for subscription
 */
router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    const schema = z.object({
      priceId: z.string(),
      successUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
      trialDays: z.number().int().min(0).max(30).optional()
    });

    const { priceId, successUrl, cancelUrl, trialDays } = schema.parse(req.body);

    const checkoutParams: {
      userId: string;
      priceId: string;
      successUrl: string;
      cancelUrl: string;
      trialDays?: number;
    } = {
      userId,
      priceId,
      successUrl: successUrl || `${process.env['CLIENT_URL'] || 'http://localhost:5173'}/billing/success`,
      cancelUrl: cancelUrl || `${process.env['CLIENT_URL'] || 'http://localhost:5173'}/pricing`
    };

    if (trialDays !== undefined) {
      checkoutParams.trialDays = trialDays;
    }

    const session = await stripeService.createCheckoutSession(checkoutParams);

    return res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('[BILLING] Checkout error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/billing/subscription
 * Get current user subscription
 */
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Buscar por updatedAt para pegar a subscription mais recentemente modificada
    // Isso garante que se o usuário cancelou e criou outra, pegamos a atual
    const subscription = await prisma.subscription.findFirst({
      where: { 
        userId,
        status: { in: ['active', 'trialing'] }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('[BILLING] Get subscription error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/billing/invoices
 * List user invoices
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query['limit'] as string) || 10;

    const invoices = await stripeService.listInvoices(userId, limit);

    return res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('[BILLING] List invoices error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/billing/upcoming-invoice
 * Get upcoming invoice
 */
router.get('/upcoming-invoice', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const invoice = await stripeService.getUpcomingInvoice(userId);

    return res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('[BILLING] Get upcoming invoice error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/billing/cancel
 * Cancel subscription
 */
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    console.log('🚫 [CANCEL] Iniciando cancelamento para userId:', userId);
    
    const schema = z.object({
      immediately: z.boolean().optional().default(false)
    });

    const { immediately } = schema.parse(req.body);
    
    console.log('🚫 [CANCEL] Immediately:', immediately);

    // Get user's active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['active', 'trialing'] }
      }
    });

    if (!subscription) {
      console.log('❌ [CANCEL] Nenhuma assinatura ativa encontrada');
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    console.log('🚫 [CANCEL] Subscription encontrada:', subscription.stripeSubscriptionId);
    console.log('🚫 [CANCEL] Chamando Stripe para cancelar...');

    const canceledSubscription = await stripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      !immediately
    );

    console.log('✅ [CANCEL] Stripe respondeu:', {
      id: canceledSubscription.id,
      status: canceledSubscription.status,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      cancelAt: canceledSubscription.cancel_at
    });

    return res.json({
      success: true,
      data: {
        subscriptionId: canceledSubscription.id,
        status: canceledSubscription.status,
        cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
        cancelAt: canceledSubscription.cancel_at
      },
      message: immediately 
        ? 'Subscription canceled immediately' 
        : 'Subscription will be canceled at the end of billing period'
    });
  } catch (error) {
    console.error('[BILLING] Cancel subscription error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/billing/reactivate
 * Reactivate canceled subscription
 */
router.post('/reactivate', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Get user's subscription scheduled for cancellation
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
        cancelAt: { not: null }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No subscription scheduled for cancellation found'
      });
    }

    const reactivatedSubscription = await stripeService.reactivateSubscription(
      subscription.stripeSubscriptionId
    );

    return res.json({
      success: true,
      data: {
        subscriptionId: reactivatedSubscription.id,
        status: reactivatedSubscription.status
      },
      message: 'Subscription reactivated successfully'
    });
  } catch (error) {
    console.error('[BILLING] Reactivate subscription error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/billing/change-plan
 * Change subscription plan
 */
router.post('/change-plan', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    const schema = z.object({
      newPriceId: z.string()
    });

    const { newPriceId } = schema.parse(req.body);

    // Get user's active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['active', 'trialing'] }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    const updatedSubscription = await stripeService.updateSubscription(
      subscription.stripeSubscriptionId,
      newPriceId
    );

    return res.json({
      success: true,
      data: {
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status
      },
      message: 'Plan changed successfully'
    });
  } catch (error) {
    console.error('[BILLING] Change plan error:', error);
    
    // Tratamento específico para erros do Stripe
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      
      if (stripeError.type === 'StripeCardError') {
        return res.status(402).json({
          success: false,
          error: 'Pagamento recusado. Verifique seu cartão e tente novamente.',
          details: stripeError.message
        });
      }
      
      if (stripeError.code === 'resource_missing') {
        return res.status(404).json({
          success: false,
          error: 'Assinatura não encontrada no Stripe.'
        });
      }
    }
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar plano. Tente novamente.'
    });
  }
});

/**
 * GET /api/billing/portal
 * Get Stripe Customer Portal URL
 */
router.get('/portal', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const returnUrl = (req.query['returnUrl'] as string) || `${process.env['CLIENT_URL'] || 'http://localhost:5173'}/settings/billing`;

    const portalSession = await stripeService.createPortalSession(userId, returnUrl);

    return res.json({
      success: true,
      data: {
        url: portalSession.url
      }
    });
  } catch (error) {
    console.error('[BILLING] Portal error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
