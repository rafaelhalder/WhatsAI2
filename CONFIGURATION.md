# 🔧 WhatsAI Configuration Guide

Complete guide for configuring WhatsAI for production deployment.

## 📊 Analytics Configuration

### Google Analytics 4

1. **Create GA4 Property:**
   - Go to https://analytics.google.com
   - Create a new GA4 property
   - Get your Measurement ID (format: `G-XXXXXXXXXX`)

2. **Update index.html:**
   - Open `/client/index.html`
   - Find the Google Analytics section (line ~56)
   - Uncomment the script
   - Replace `G-XXXXXXXXXX` with your actual Measurement ID

```html
<!-- Uncomment and replace G-XXXXXXXXXX -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR-ID-HERE"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-YOUR-ID-HERE');
</script>
```

### Facebook Pixel

1. **Create Facebook Pixel:**
   - Go to https://business.facebook.com/events_manager
   - Create a new Pixel
   - Get your Pixel ID (numeric value)

2. **Update index.html:**
   - Open `/client/index.html`
   - Find the Facebook Pixel section (line ~65)
   - Uncomment the script
   - Replace `YOUR_PIXEL_ID` with your actual Pixel ID

```html
<!-- Uncomment and replace YOUR_PIXEL_ID -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID_HERE');
  fbq('track', 'PageView');
</script>
```

### Hotjar

1. **Create Hotjar Account:**
   - Go to https://www.hotjar.com
   - Create account and add your site
   - Get your Site ID (numeric value)

2. **Update index.html:**
   - Open `/client/index.html`
   - Find the Hotjar section (line ~82)
   - Uncomment the script
   - Replace `YOUR_SITE_ID` with your actual Site ID

```html
<!-- Uncomment and replace YOUR_SITE_ID -->
<script>
  (function(h,o,t,j,a,r){
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
    h._hjSettings={hjid:YOUR_SITE_ID_HERE,hjsv:6};
    a=o.getElementsByTagName('head')[0];
    r=o.createElement('script');r.async=1;
    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
    a.appendChild(r);
  })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>
```

---

## 🔐 CI/CD Secrets Configuration

The project uses GitHub Actions for CI/CD. Configure these secrets in your repository:

### Required Secrets

1. **Go to GitHub Repository Settings:**
   - Navigate to: `Settings` → `Secrets and variables` → `Actions`

2. **Add Repository Secrets:**

#### Database Secrets
```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
```

#### Stripe Secrets
```
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_STARTER=price_starter_plan_id
STRIPE_PRICE_PRO=price_pro_plan_id
STRIPE_PRICE_BUSINESS=price_business_plan_id
```

#### Evolution API Secrets
```
EVOLUTION_API_URL=https://your-evolution-api.com
EVOLUTION_API_KEY=your_evolution_api_key
```

#### DigitalOcean Spaces Secrets
```
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_KEY=your_spaces_access_key
DO_SPACES_SECRET=your_spaces_secret_key
DO_SPACES_BUCKET=whatsai-media
DO_SPACES_REGION=nyc3
```

#### Deployment Secrets (if using SSH deployment)
```
DO_HOST=your-server-ip-or-domain
DO_USER=your-ssh-username
DO_SSH_KEY=your-private-ssh-key
```

#### Optional Monitoring Secrets
```
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Updating CI/CD Workflow

The workflow file is located at `.github/workflows/ci-cd.yml`

**To enable deployment:**
1. Uncomment the deployment section (lines ~159-170)
2. Add your deployment commands
3. Ensure all required secrets are configured

Example deployment (DigitalOcean):
```yaml
- name: Deploy to DigitalOcean
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.DO_HOST }}
    username: ${{ secrets.DO_USER }}
    key: ${{ secrets.DO_SSH_KEY }}
    script: |
      cd /var/www/whatsai
      git pull origin main
      docker-compose down
      docker-compose up -d --build
```

---

## 🚀 Production Deployment Checklist

### Pre-Deployment

- [ ] All analytics IDs configured in `client/index.html`
- [ ] All GitHub Secrets configured
- [ ] `.env` files created from `.env.example` (server & client)
- [ ] Database migrated: `npx prisma migrate deploy`
- [ ] Stripe products created and price IDs added
- [ ] SSL certificates configured
- [ ] Domain DNS configured

### Post-Deployment

- [ ] Test Google Analytics (Real-time reports)
- [ ] Test Facebook Pixel (Facebook Events Manager)
- [ ] Test Hotjar (Recordings tab)
- [ ] Verify Stripe webhooks receiving events
- [ ] Monitor Sentry for errors (if configured)
- [ ] Check CI/CD pipeline runs successfully

---

## 🧪 Testing Configuration

### Test Stripe Webhooks Locally

1. Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
# or
scoop install stripe
```

2. Login and forward webhooks:
```bash
stripe login
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

3. Trigger test events:
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

### Test Analytics Locally

For local development, you can test analytics with:
- **GA4**: Use GA Debugger Chrome extension
- **Facebook Pixel**: Use Facebook Pixel Helper Chrome extension  
- **Hotjar**: Check recordings in Hotjar dashboard (may take a few minutes)

---

## 📚 Additional Resources

- [Google Analytics 4 Setup](https://support.google.com/analytics/answer/9304153)
- [Facebook Pixel Implementation](https://www.facebook.com/business/help/952192354843755)
- [Hotjar Installation](https://help.hotjar.com/hc/en-us/articles/115011639927)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [DigitalOcean Spaces](https://docs.digitalocean.com/products/spaces/)

---

## ⚠️ Important Notes

1. **Never commit secrets** to version control
2. **Use test keys** in development (Stripe test mode)
3. **Validate webhooks** in production (Stripe signature verification is enabled)
4. **Monitor analytics** for the first 48 hours after deployment
5. **Set up alerts** for critical errors in Sentry

---

## 🆘 Troubleshooting

### Analytics not tracking

- **Check browser console** for errors
- **Verify IDs are correct** (no typos)
- **Check ad blockers** (may block tracking scripts)
- **Wait 24-48 hours** for data to appear in dashboards

### Stripe webhooks failing

- **Verify webhook secret** matches Stripe dashboard
- **Check endpoint URL** is publicly accessible
- **Review webhook logs** in Stripe dashboard
- **Test with Stripe CLI** first

### CI/CD pipeline failing

- **Verify all secrets** are configured
- **Check workflow syntax** with GitHub Actions validator
- **Review workflow logs** for specific errors
- **Test locally** before pushing

---

**Last Updated:** November 5, 2025  
**Version:** 1.0.0
