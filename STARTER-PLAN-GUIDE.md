# 🚀 STARTER Plan Configuration Guide

## Overview
The STARTER plan is the entry-level paid tier designed for small businesses and freelancers. This guide explains how to properly configure the STARTER plan in WhatsAI.

## 💰 STARTER Plan Features

### Plan Limits
- **Instances:** 2 WhatsApp connections
- **Messages per day:** 1,000
- **Templates:** 20 message templates
- **Campaigns:** 5 campaigns per month (bulk sending)
- **Storage:** 5GB for media files
- **Auto-responses:** Basic keyword-based responses
- **AI Enhancement:** ✅ Available (AI-enhanced auto-responses)
- **Support:** Email support (48h response time)

### Pricing
- **Monthly:** R$ 47.00/month
- **Trial:** 14 days free trial included

## 🔧 Backend Configuration

### 1. Stripe Price ID Setup

The STARTER plan requires a Stripe Price ID to enable subscriptions.

#### Create Stripe Product (First Time)

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Add Product**
3. Fill in product details:
   ```
   Name: WhatsAI - STARTER Plan
   Description: Starter plan with 2 instances, 1000 msgs/day, campaigns
   ```
4. Add pricing:
   ```
   Price: R$ 47.00 (or $47.00 depending on currency)
   Billing: Recurring - Monthly
   Trial: 14 days (optional)
   ```
5. Click **Save product**
6. Copy the **Price ID** (starts with `price_...`)

#### Configure Environment Variable

Add the Stripe Price ID to `/server/.env`:

```env
# Stripe Price IDs
STRIPE_PRICE_STARTER=price_1SOMIYBIx243ARlEdJ8bSkkh  # Replace with your actual price ID
STRIPE_PRICE_PRO=price_1SOMIlBIx243ARlEDcb62AVI
STRIPE_PRICE_BUSINESS=price_1SOMIuBIx243ARlEXOkFTJdg
```

⚠️ **Important:** Replace with your actual Stripe Price ID!

### 2. Verify Plan Constants

The STARTER plan is defined in `/server/src/constants/plans.ts`:

```typescript
[PlanType.STARTER]: {
  name: 'STARTER',
  displayName: 'Starter',
  description: 'Ideal para pequenos negócios',
  price: 4700, // R$ 47.00 in cents
  priceFormatted: 'R$ 47',
  currency: 'BRL',
  billingPeriod: 'monthly',
  features: [
    '2 instâncias WhatsApp',
    '1.000 mensagens por dia',
    '20 templates de mensagem',
    '✅ Envio em massa (5 campanhas/mês)',
    '2 membros na equipe',
    '5GB de armazenamento',
    'Respostas automáticas básicas',
    'Dashboard completo',
    'Suporte por email (48h)',
  ],
  limits: {
    instances: 2,
    messages_per_day: 1000,
    broadcasts: true,
    broadcasts_per_month: 5,
    templates: 20,
    team_members: 2,
    storage_gb: 5,
    api_access: false,
    priority_support: false,
    custom_domain: false,
    whitelabel: false,
  },
}
```

This configuration is already correct and doesn't need changes.

### 3. Database Migration

After updating the schema, run:

```bash
cd server
npx prisma generate
npx prisma db push
```

## 🎨 Frontend Configuration

### 1. Environment Variables

Add the Stripe Price ID to `/client/.env`:

```env
# Stripe Price IDs (Frontend)
VITE_STRIPE_PRICE_STARTER=price_1SOMIYBIx243ARlEdJ8bSkkh  # Replace with your actual price ID
VITE_STRIPE_PRICE_PRO=price_1SOMIlBIx243ARlEDcb62AVI
VITE_STRIPE_PRICE_BUSINESS=price_1SOMIuBIx243ARlEXOkFTJdg
```

### 2. Verify Billing Service

The STARTER plan is configured in `/client/src/services/billing.ts`:

```typescript
export const PLANS: Plan[] = [
  // ... FREE plan ...
  {
    id: 'starter',
    name: 'Starter',
    price: 47,
    priceId: import.meta.env.VITE_STRIPE_PRICE_STARTER || 'price_1SOMIYBIx243ARlEdJ8bSkkh',
    interval: 'month',
    features: [
      '3 instâncias WhatsApp',
      '1.000 mensagens/dia',
      '5GB de armazenamento',
      'Templates de mensagem',
      'Campanhas básicas',
      'Suporte prioritário',
    ],
  },
  // ... other plans ...
];
```

This is already correctly configured.

## ✅ Testing the STARTER Plan

### 1. Test Stripe Checkout

1. Start the application:
   ```bash
   npm run dev
   ```

2. Navigate to the pricing page: `http://localhost:3000/pricing`

3. Click **"Assinar Agora"** on the STARTER plan card

4. Verify you're redirected to Stripe Checkout

5. Use Stripe test card:
   ```
   Card: 4242 4242 4242 4242
   Expiry: Any future date
   CVC: Any 3 digits
   ZIP: Any 5 digits
   ```

6. Complete the checkout

7. Verify subscription is created in:
   - Stripe Dashboard
   - WhatsAI database (check `subscriptions` table)
   - User profile shows plan: "STARTER"

### 2. Test Plan Limits

After subscribing to STARTER:

1. Try creating more than 2 instances → Should be blocked
2. Send messages → Should be limited to 1000/day
3. Create templates → Should be limited to 20
4. Create campaigns → Should be limited to 5/month

### 3. Test Upgrade/Downgrade

1. From STARTER → PRO:
   - Should create immediate proration charge
   - User gets PRO features immediately

2. From PRO → STARTER:
   - Should schedule downgrade for next billing cycle
   - User keeps PRO until period ends

## 🔍 Troubleshooting

### Error: "Plan not recognized"

**Problem:** Backend doesn't recognize STARTER plan

**Solution:**
1. Check `STRIPE_PRICE_STARTER` is set in `.env`
2. Restart server after changing `.env`
3. Verify price ID matches Stripe dashboard

### Error: "Checkout URL not found"

**Problem:** Frontend can't create checkout session

**Solution:**
1. Check `VITE_STRIPE_PRICE_STARTER` is set in client `.env`
2. Rebuild frontend: `npm run build`
3. Check browser console for errors

### Plan Limits Not Enforced

**Problem:** User can exceed STARTER plan limits

**Solution:**
1. Verify user plan in database: `SELECT plan FROM users WHERE id = '...'`
2. Check limits in `/server/src/constants/plans.ts`
3. Review validation in `/server/src/services/plans-service.ts`

## 📊 Monitoring

### Check Active STARTER Subscriptions

```sql
-- Database query
SELECT 
  u.email,
  u.plan,
  s.status,
  s.amount,
  s.currentPeriodEnd
FROM users u
JOIN subscriptions s ON s.userId = u.id
WHERE u.plan = 'STARTER'
  AND s.status IN ('active', 'trialing');
```

### Check Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Subscriptions**
3. Filter by product: "WhatsAI - STARTER Plan"
4. Monitor:
   - Active subscriptions
   - MRR (Monthly Recurring Revenue)
   - Churn rate
   - Trial conversions

## 🎯 Best Practices

### 1. Price ID Management

✅ **DO:**
- Keep test and production price IDs separate
- Use environment variables for all price IDs
- Document price IDs in internal wiki

❌ **DON'T:**
- Hardcode price IDs in source code
- Commit price IDs to git (except in `.env.example`)
- Change price IDs after launch (create new ones instead)

### 2. Plan Migrations

When updating plan features:

1. Create new Stripe price
2. Add new environment variable
3. Update constants file
4. Deploy backend first, then frontend
5. Migrate existing users gradually

### 3. Testing

Always test in Stripe test mode before production:

```env
# Test mode
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_STARTER=price_test_...

# Production mode
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_STARTER=price_live_...
```

## 📈 Analytics & KPIs

Track these metrics for STARTER plan:

- **Conversion Rate:** FREE → STARTER %
- **Trial-to-Paid:** Users completing trial %
- **Churn Rate:** Cancellations per month %
- **MRR:** Monthly Recurring Revenue
- **ARPU:** Average Revenue Per User
- **Upgrade Rate:** STARTER → PRO %

## 🔗 Related Documentation

- [Main README](README.md) - General setup
- [GPT Integration Guide](GPT-INTEGRATION-GUIDE.md) - AI features
- [Stripe Integration](server/docs/SPRINT-2-BILLING-COMPLETE.md) - Billing system
- [Plans System](server/src/constants/plans.ts) - Plan definitions

---

Need help? Contact support or check our [troubleshooting guide](README.md#troubleshooting).
