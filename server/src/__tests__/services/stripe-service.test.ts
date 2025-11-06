import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { StripeService } from '../stripe-service';
import Stripe from 'stripe';
import { prisma } from '../../database/prisma';

// Mock Stripe
jest.mock('stripe');
jest.mock('../../database/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    paymentMethod: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

describe('StripeService', () => {
  let stripeService: StripeService;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create mock Stripe instance
    mockStripe = {
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
        },
      },
      subscriptions: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
        list: jest.fn(),
      },
      invoices: {
        list: jest.fn(),
        retrieveUpcoming: jest.fn(),
      },
      billingPortal: {
        sessions: {
          create: jest.fn(),
        },
      },
    } as any;

    // Mock Stripe constructor
    (Stripe as any).mockImplementation(() => mockStripe);

    stripeService = new StripeService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createOrGetCustomer', () => {
    it('should return existing Stripe customer ID if user has one', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        stripeCustomerId: 'cus_existing123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const customerId = await stripeService.createOrGetCustomer('user-123');

      expect(customerId).toBe('cus_existing123');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          name: true,
          email: true,
          stripeCustomerId: true,
        },
      });
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
    });

    it('should create new Stripe customer if user does not have one', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        stripeCustomerId: null,
      };

      const mockCustomer = {
        id: 'cus_new123',
        email: 'john@example.com',
        name: 'John Doe',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockStripe.customers.create as jest.Mock).mockResolvedValue(mockCustomer);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        stripeCustomerId: 'cus_new123',
      });

      const customerId = await stripeService.createOrGetCustomer('user-123');

      expect(customerId).toBe('cus_new123');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'john@example.com',
        name: 'John Doe',
        metadata: {
          userId: 'user-123',
        },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { stripeCustomerId: 'cus_new123' },
      });
    });

    it('should throw error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(stripeService.createOrGetCustomer('non-existent')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session successfully', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        stripeCustomerId: 'cus_123',
      };

      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        customer: 'cus_123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([]);
      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      const session = await stripeService.createCheckoutSession({
        userId: 'user-123',
        priceId: 'price_starter',
        successUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
      });

      expect(session.id).toBe('cs_test_123');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
    });

    it('should cancel existing active subscriptions before creating new one', async () => {
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        stripeCustomerId: 'cus_123',
      };

      const existingSubscription = {
        id: 'sub-old-123',
        stripeSubscriptionId: 'sub_stripe_old',
        status: 'active',
        userId: 'user-123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([existingSubscription]);
      (mockStripe.subscriptions.cancel as jest.Mock).mockResolvedValue({});
      (prisma.subscription.update as jest.Mock).mockResolvedValue({});
      (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        id: 'cs_new_123',
      });

      await stripeService.createCheckoutSession({
        userId: 'user-123',
        priceId: 'price_pro',
        successUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
      });

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_stripe_old');
      expect(prisma.subscription.update).toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately when cancelAtPeriodEnd is false', async () => {
      const mockSubscription = {
        id: 'sub-123',
        stripeSubscriptionId: 'sub_stripe_123',
        userId: 'user-123',
        status: 'active',
      };

      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription);
      (mockStripe.subscriptions.cancel as jest.Mock).mockResolvedValue({
        id: 'sub_stripe_123',
        status: 'canceled',
      });
      (prisma.subscription.update as jest.Mock).mockResolvedValue({
        ...mockSubscription,
        status: 'canceled',
      });

      await stripeService.cancelSubscription('user-123', false);

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_stripe_123');
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-123' },
        data: expect.objectContaining({
          status: 'canceled',
        }),
      });
    });

    it('should schedule cancellation at period end when cancelAtPeriodEnd is true', async () => {
      const mockSubscription = {
        id: 'sub-123',
        stripeSubscriptionId: 'sub_stripe_123',
        userId: 'user-123',
        status: 'active',
      };

      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription);
      (mockStripe.subscriptions.update as jest.Mock).mockResolvedValue({
        id: 'sub_stripe_123',
        cancel_at_period_end: true,
      });
      (prisma.subscription.update as jest.Mock).mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: true,
      });

      await stripeService.cancelSubscription('user-123', true);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_stripe_123', {
        cancel_at_period_end: true,
      });
    });

    it('should throw error if no active subscription found', async () => {
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(stripeService.cancelSubscription('user-123', false)).rejects.toThrow(
        'No active subscription found'
      );
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate a canceled subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        stripeSubscriptionId: 'sub_stripe_123',
        userId: 'user-123',
        status: 'canceled',
        cancelAtPeriodEnd: true,
      };

      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription);
      (mockStripe.subscriptions.update as jest.Mock).mockResolvedValue({
        id: 'sub_stripe_123',
        cancel_at_period_end: false,
        status: 'active',
      });
      (prisma.subscription.update as jest.Mock).mockResolvedValue({
        ...mockSubscription,
        status: 'active',
        cancelAtPeriodEnd: false,
      });

      await stripeService.reactivateSubscription('user-123');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_stripe_123', {
        cancel_at_period_end: false,
      });
    });
  });

  describe('changePlan', () => {
    it('should upgrade plan with immediate proration', async () => {
      const mockSubscription = {
        id: 'sub-123',
        stripeSubscriptionId: 'sub_stripe_123',
        stripePriceId: 'price_starter',
        userId: 'user-123',
        status: 'active',
      };

      const mockUpdatedSubscription = {
        id: 'sub_stripe_123',
        status: 'active',
        items: {
          data: [
            {
              id: 'si_123',
              price: {
                id: 'price_pro',
              },
            },
          ],
        },
      };

      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription);
      (mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
        items: {
          data: [{ id: 'si_123' }],
        },
      });
      (mockStripe.subscriptions.update as jest.Mock).mockResolvedValue(
        mockUpdatedSubscription
      );
      (prisma.subscription.update as jest.Mock).mockResolvedValue({
        ...mockSubscription,
        stripePriceId: 'price_pro',
      });

      await stripeService.changePlan({
        userId: 'user-123',
        newPriceId: 'price_pro',
        isUpgrade: true,
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_stripe_123',
        expect.objectContaining({
          items: [
            {
              id: 'si_123',
              price: 'price_pro',
            },
          ],
          proration_behavior: 'always_invoice',
        })
      );
    });

    it('should downgrade plan at period end', async () => {
      const mockSubscription = {
        id: 'sub-123',
        stripeSubscriptionId: 'sub_stripe_123',
        stripePriceId: 'price_pro',
        userId: 'user-123',
        status: 'active',
      };

      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(mockSubscription);
      (mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue({
        items: {
          data: [{ id: 'si_123' }],
        },
      });
      (mockStripe.subscriptions.update as jest.Mock).mockResolvedValue({});
      (prisma.subscription.update as jest.Mock).mockResolvedValue({});

      await stripeService.changePlan({
        userId: 'user-123',
        newPriceId: 'price_starter',
        isUpgrade: false,
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_stripe_123',
        expect.objectContaining({
          proration_behavior: 'none',
        })
      );
    });
  });

  describe('getCustomerPortalUrl', () => {
    it('should create and return billing portal URL', async () => {
      const mockUser = {
        id: 'user-123',
        stripeCustomerId: 'cus_123',
      };

      const mockPortalSession = {
        url: 'https://billing.stripe.com/session/xyz',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockStripe.billingPortal.sessions.create as jest.Mock).mockResolvedValue(
        mockPortalSession
      );

      const url = await stripeService.getCustomerPortalUrl({
        userId: 'user-123',
        returnUrl: 'http://localhost/dashboard',
      });

      expect(url).toBe('https://billing.stripe.com/session/xyz');
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'http://localhost/dashboard',
      });
    });
  });

  describe('listInvoices', () => {
    it('should return list of invoices', async () => {
      const mockUser = {
        id: 'user-123',
        stripeCustomerId: 'cus_123',
      };

      const mockInvoices = {
        data: [
          {
            id: 'in_123',
            amount_paid: 4700,
            currency: 'brl',
            status: 'paid',
            created: 1234567890,
            invoice_pdf: 'https://pdf.url',
          },
        ],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockStripe.invoices.list as jest.Mock).mockResolvedValue(mockInvoices);

      const invoices = await stripeService.listInvoices('user-123', 10);

      expect(invoices).toHaveLength(1);
      expect(invoices[0].id).toBe('in_123');
      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        limit: 10,
      });
    });
  });

  describe('getUpcomingInvoice', () => {
    it('should return upcoming invoice', async () => {
      const mockUser = {
        id: 'user-123',
        stripeCustomerId: 'cus_123',
      };

      const mockInvoice = {
        id: 'in_upcoming',
        amount_due: 9700,
        currency: 'brl',
        period_start: 1234567890,
        period_end: 1234567990,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockStripe.invoices.retrieveUpcoming as jest.Mock).mockResolvedValue(mockInvoice);

      const invoice = await stripeService.getUpcomingInvoice('user-123');

      expect(invoice.id).toBe('in_upcoming');
      expect(invoice.amount_due).toBe(9700);
    });

    it('should return null if no upcoming invoice', async () => {
      const mockUser = {
        id: 'user-123',
        stripeCustomerId: 'cus_123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockStripe.invoices.retrieveUpcoming as jest.Mock).mockRejectedValue(
        new Error('No upcoming invoice')
      );

      const invoice = await stripeService.getUpcomingInvoice('user-123');

      expect(invoice).toBeNull();
    });
  });
});
