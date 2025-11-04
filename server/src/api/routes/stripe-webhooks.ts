import { Router, Request, Response } from 'express';
import { stripeService } from '../../services/stripe-service';
import Stripe from 'stripe';

const router = Router();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhooks
 * 
 * IMPORTANT: This endpoint must use raw body (not JSON parsed)
 * Configure in app.ts to skip body parser for this route
 */
router.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || typeof signature !== 'string') {
    console.error('[STRIPE WEBHOOK] Missing stripe-signature header');
    return res.status(400).send('Missing stripe-signature header');
  }

  try {
    // Get raw body (must be configured in app.ts)
    const rawBody = (req as any).rawBody || req.body;
    
    // Construct event from webhook
    const event = stripeService.constructWebhookEvent(rawBody, signature);

    console.log(`[STRIPE WEBHOOK] Received event: ${event.type} (${event.id})`);

    // Process webhook event
    await stripeService.processWebhook(event);

    // Return 200 to acknowledge receipt
    return res.json({ received: true, eventId: event.id });
  } catch (error) {
    console.error('[STRIPE WEBHOOK] Error processing webhook:', error);
    
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
    }

    return res.status(500).send('Webhook processing failed');
  }
});

export default router;
