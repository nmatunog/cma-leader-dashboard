# Google Gemini API Setup Guide

## Important: Gemini AI Pro vs Gemini API

### Gemini AI Pro Subscription ($19.99/month)
- This is the **consumer product** at gemini.google
- Includes access to advanced models in the web interface
- Includes Gmail/Docs integration, 2TB storage, etc.
- **Does NOT include API access**

### Gemini API (For Development)
- This is the **developer API** for integrating into applications
- Requires a separate **Google Cloud Project**
- Has its own billing (separate from Gemini Pro subscription)
- Free tier available (until billing enabled)
- Very affordable pay-as-you-go pricing

## Setup Steps

### 1. Create Google Cloud Project (if you don't have one)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Generative Language API**

### 2. Get API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Select your Google Cloud project
4. Copy the API key
5. **Important**: Keep this key secure!

### 3. Free Tier vs Billing

#### Option A: Start with Free Tier (Recommended for Testing)
- Free tier is available for testing/development
- No billing account needed initially
- Has usage limits
- Good for development and small-scale testing

#### Option B: Enable Billing (For Production)
1. Go to Google Cloud Console → Billing
2. Link a billing account
3. **Note**: Once billing enabled, free tier stops
4. You'll be charged pay-as-you-go (very affordable)
5. Can set spending limits/budgets to control costs

### 4. Add API Key to Environment Variables

#### For Local Development (.env.local)
```env
GOOGLE_GEN_AI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-1.5-flash
```

#### For Vercel Deployment
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `GOOGLE_GEN_AI_API_KEY`: Your API key
   - `GEMINI_MODEL`: `gemini-1.5-flash` (or `gemini-1.5-pro`)
3. Apply to all environments (Production, Preview, Development)

## Pricing Details

### Gemini 1.5 Flash (Recommended - Cost Effective)
- **Input**: $0.075 per 1M tokens (~$0.000075 per 1K tokens)
- **Output**: $0.30 per 1M tokens (~$0.0003 per 1K tokens)
- **Best for**: Most use cases, very cost-effective

### Gemini 1.5 Pro (More Capable)
- **Input**: $1.25 per 1M tokens (~$0.00125 per 1K tokens)
- **Output**: $5.00 per 1M tokens (~$0.005 per 1K tokens)
- **Best for**: Complex reasoning, better quality needed

### Cost Estimation for Signup Chatbot
- Average chat session: ~500 input tokens + ~200 output tokens
- Cost per signup with Flash: ~$0.0002
- Cost per signup with Pro: ~$0.0008
- 1,000 signups/month: $0.20-$0.80/month
- 10,000 signups/month: $2-$8/month

## Security Best Practices

1. **Never commit API keys to Git**
2. **Use environment variables only**
3. **Restrict API key usage** in Google Cloud Console:
   - Application restrictions (HTTP referrers)
   - API restrictions (limit to Generative Language API only)
4. **Set up billing alerts** in Google Cloud Console
5. **Set spending limits** to prevent unexpected charges

## Installation

```bash
npm install @google/generative-ai
```

## Usage Example

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEN_AI_API_KEY!);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

const result = await model.generateContent(prompt);
const response = await result.response;
const text = response.text();
```

## Resources

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Pricing Information](https://ai.google.dev/pricing)
- [Google Cloud Console](https://console.cloud.google.com/)


