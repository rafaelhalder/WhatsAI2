# 🤖 GPT/OpenAI Integration Guide

## Overview
WhatsAI now includes AI-powered chatbot functionality using OpenAI's GPT models. This guide explains how to configure and use the AI features.

## 🔑 API Key Configuration

### 1. Get Your OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy your API key (starts with `sk-...`)

⚠️ **Important:** Keep your API key secret and never commit it to version control!

### 2. Configure Environment Variables

Add the following variables to your `/server/.env` file:

```env
# OpenAI Configuration (for AI Chatbot / GPT Integration)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7
```

#### Configuration Options:

| Variable | Description | Default | Recommended |
|----------|-------------|---------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key (required) | - | `sk-...` |
| `OPENAI_MODEL` | GPT model to use | `gpt-4o-mini` | `gpt-4o-mini` (cost-effective) or `gpt-4o` (more powerful) |
| `OPENAI_MAX_TOKENS` | Maximum tokens in response | `500` | `500` (1-2 paragraphs) |
| `OPENAI_TEMPERATURE` | Response creativity (0-1) | `0.7` | `0.7` (balanced) |

### 3. Restart Your Server

After adding the environment variables:

```bash
cd server
npm run dev
```

The server will automatically detect the OpenAI configuration on startup.

## 📚 Available AI Models

### Recommended Models (2024):

| Model | Cost | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `gpt-4o-mini` | 💰 Low | ⚡ Fast | ⭐⭐⭐ Good | **Recommended** - Customer support, auto-responses |
| `gpt-4o` | 💰💰 Medium | ⚡⚡ Medium | ⭐⭐⭐⭐⭐ Excellent | Complex conversations, high-quality responses |
| `gpt-4-turbo` | 💰💰💰 High | ⚡⚡ Medium | ⭐⭐⭐⭐⭐ Excellent | Legacy option (use gpt-4o instead) |
| `gpt-3.5-turbo` | 💰 Very Low | ⚡⚡⚡ Very Fast | ⭐⭐ Fair | Budget option (not recommended) |

**We recommend `gpt-4o-mini`** for most use cases - it provides excellent quality at a fraction of the cost.

## 🎯 Features & Usage

### 1. AI-Enhanced Auto-Responses

Enhance your keyword-based auto-responses with AI to make them more natural and contextual:

```typescript
// When creating an auto-response via API
POST /api/auto-responses

{
  "instanceId": "your-instance-id",
  "name": "Product Inquiry",
  "keywords": ["preço", "custo", "quanto custa"],
  "response": "Nossos produtos custam entre R$ 50 e R$ 200. Qual produto te interessa?",
  "useAI": true  // ✅ Enable AI enhancement
}
```

**How it works:**
- User sends: "oi, quanto custa o produto X?"
- Base response: "Nossos produtos custam entre R$ 50 e R$ 200. Qual produto te interessa?"
- AI-enhanced: "Olá! Os nossos produtos variam entre R$ 50 e R$ 200. O produto X que você mencionou está na faixa de R$ 120. Gostaria de saber mais detalhes sobre ele?"

### 2. Direct AI Responses (PRO/BUSINESS Plans)

Generate completely AI-powered responses without predefined templates:

```typescript
// Backend service call
import { autoResponseService } from './services/auto-response-service';

const response = await autoResponseService.generateAIResponse(
  "Como faço para rastrear meu pedido?",
  "You are a helpful customer support assistant for an e-commerce store."
);
```

### 3. Smart Features

The AI service includes several smart features:

#### Sentiment Analysis
```typescript
import { openAIService } from './services/openai-service';

const sentiment = await openAIService.analyzeSentiment(
  "Estou muito insatisfeito com o atendimento!"
);
// Returns: 'negative'
```

#### Information Extraction
```typescript
const email = await openAIService.extractInformation(
  "Meu email é contato@example.com",
  'email'
);
// Returns: "contato@example.com"
```

## 💰 Cost Management

### Understanding OpenAI Pricing

OpenAI charges based on tokens (roughly 4 characters = 1 token):

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| gpt-4o-mini | $0.15 | $0.60 |
| gpt-4o | $2.50 | $10.00 |

**Example Cost Calculation (gpt-4o-mini):**
- 1,000 customer messages/day
- ~100 tokens input + 150 tokens output per message
- Cost: ~$0.11/day or **$3.30/month**

### Cost Optimization Tips:

1. ✅ Use `gpt-4o-mini` instead of `gpt-4o` (10x cheaper)
2. ✅ Set reasonable `OPENAI_MAX_TOKENS` (500 is plenty for most responses)
3. ✅ Use AI only when needed (enable `useAI: true` selectively)
4. ✅ Combine keyword matching with AI enhancement
5. ✅ Monitor usage in OpenAI dashboard

## 🔒 Security Best Practices

### 1. Protect Your API Key

❌ **DON'T:**
```env
# Committed to Git
OPENAI_API_KEY=sk-proj-abc123...
```

✅ **DO:**
```env
# In .env (gitignored)
OPENAI_API_KEY=sk-proj-abc123...
```

### 2. Use Environment Variables

Never hardcode API keys in your source code:

❌ **DON'T:**
```typescript
const openai = new OpenAI({
  apiKey: 'sk-proj-abc123...'  // ❌ Never do this
});
```

✅ **DO:**
```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY  // ✅ Use env vars
});
```

### 3. Restrict API Key Permissions

In OpenAI dashboard:
1. Set usage limits (e.g., $10/month)
2. Restrict to specific models if needed
3. Monitor usage regularly

## 📊 Monitoring & Debugging

### Check AI Availability

```typescript
import { autoResponseService } from './services/auto-response-service';

if (autoResponseService.isAIAvailable()) {
  console.log('✅ AI features are enabled');
} else {
  console.log('⚠️ AI features disabled - check OPENAI_API_KEY');
}
```

### Server Logs

When the server starts:
- ✅ AI configured: No warnings
- ⚠️ AI not configured: "OpenAI API key not configured. AI chatbot features will be disabled."

### Monitor Costs

Check your usage at: https://platform.openai.com/usage

## 🎨 Customization

### Custom System Prompts

Tailor the AI behavior to your business:

```typescript
const systemPrompt = `You are a professional customer service assistant for "TechStore Brasil", 
an electronics e-commerce store. 

Guidelines:
- Always be polite and professional
- Respond in Brazilian Portuguese
- Keep responses concise (2-3 sentences max)
- Include product links when relevant
- Use a friendly but professional tone
- Sign off with "Equipe TechStore 🛒"`;

const response = await autoResponseService.generateAIResponse(
  userMessage,
  systemPrompt
);
```

### Adjust Response Style

Control creativity with temperature:

```env
# More predictable, consistent (good for support)
OPENAI_TEMPERATURE=0.3

# Balanced (recommended)
OPENAI_TEMPERATURE=0.7

# More creative, varied (good for marketing)
OPENAI_TEMPERATURE=0.9
```

## 🚀 Plan-Based Features

Different plans have different AI capabilities:

| Plan | AI Features |
|------|-------------|
| **FREE** | ❌ No AI features |
| **STARTER** | ✅ AI-enhanced auto-responses (keyword + AI) |
| **PRO** | ✅ Full AI chatbot + enhanced auto-responses |
| **BUSINESS** | ✅ Unlimited AI responses + advanced features |

## 🐛 Troubleshooting

### "OpenAI is not configured" Error

**Problem:** AI features return error or fallback to basic responses

**Solutions:**
1. Verify `OPENAI_API_KEY` is set in `.env`
2. Check API key is valid (starts with `sk-`)
3. Restart the server after adding the key
4. Check OpenAI account has credits

### "Rate limit exceeded" Error

**Problem:** Too many requests to OpenAI API

**Solutions:**
1. Check your OpenAI account limits
2. Reduce `OPENAI_MAX_TOKENS`
3. Implement request throttling
4. Upgrade OpenAI plan if needed

### Slow Response Times

**Problem:** AI responses take too long

**Solutions:**
1. Use `gpt-4o-mini` instead of `gpt-4o`
2. Reduce `OPENAI_MAX_TOKENS`
3. Optimize system prompts (shorter is faster)
4. Consider caching frequent responses

## 📖 Additional Resources

- [OpenAI Documentation](https://platform.openai.com/docs)
- [OpenAI Pricing](https://openai.com/pricing)
- [Best Practices Guide](https://platform.openai.com/docs/guides/production-best-practices)
- [Usage Dashboard](https://platform.openai.com/usage)

## 💡 Tips for Success

1. **Start Small:** Enable AI for just a few auto-responses initially
2. **Monitor Costs:** Set up billing alerts in OpenAI dashboard
3. **Test Thoroughly:** Try various customer messages to tune responses
4. **Update Prompts:** Refine system prompts based on actual conversations
5. **Combine Methods:** Use keyword matching + AI for best results
6. **Track Performance:** Monitor which AI responses work best

---

Need help? Check our main [README.md](../README.md) or contact support.
