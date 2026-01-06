# OpenAI API Setup for Activity Planning (Cost-Effective Alternative)

## Overview

The Activity Planning feature now supports OpenAI GPT-4o-mini as a cost-effective alternative to Gemini. GPT-4o-mini is one of the most affordable AI models available.

## Pricing Comparison

### OpenAI GPT-4o-mini (Recommended - Most Cost-Effective)
- **Input**: $0.15 per 1 million tokens (~$0.00015 per 1K tokens)
- **Output**: $0.60 per 1 million tokens (~$0.0006 per 1K tokens)
- **Typical cost per activity plan**: ~$0.001-0.002 (less than 1 cent)
- **Estimated monthly cost** (100 plans): ~$0.10-0.20

### Google Gemini (Current Issues)
- Free tier available but experiencing API/model availability issues
- Paid tier pricing varies

## Setup Instructions

### Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the API key (you won't be able to see it again)

### Step 2: Add API Key to Environment Variables

Add to your `.env.local` file:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

**Important**: 
- Never commit this key to git
- The `.env.local` file should be in `.gitignore`
- For production (Vercel), add this in the Vercel dashboard under Environment Variables

### Step 3: Restart Dev Server

After adding the API key, restart your dev server:

```bash
# Stop server (Ctrl+C)
npm run dev
```

## How It Works

The system will:
1. **First try OpenAI** if `OPENAI_API_KEY` is set (recommended for cost-effectiveness)
2. **Fall back to Gemini** if OpenAI is not configured (for backward compatibility)
3. Show an error if neither API key is configured

## Cost Estimation

For a typical activity plan:
- Input tokens: ~800-1200 tokens (prompt + context)
- Output tokens: ~600-1000 tokens (response)
- **Total cost**: ~$0.001-0.002 per plan

For 100 activity plans per month: **~$0.10-0.20/month**

## Benefits of OpenAI GPT-4o-mini

✅ **Very affordable** - One of the cheapest AI models available  
✅ **High quality** - Good performance for structured tasks  
✅ **Reliable** - Stable API with good uptime  
✅ **Fast** - Quick response times  
✅ **Easy integration** - Simple REST API  

## Testing

After setup, test the Activity Planning feature:
1. Navigate to Strategic Planning → Leader HQ tab
2. Enter some values (Personal FYC, team metrics, etc.)
3. Click "AI Assisted Activity Planning"
4. Should generate a detailed 40-hour workweek activity plan

## Troubleshooting

**Error: "OpenAI API key is not configured"**
- Make sure `OPENAI_API_KEY` is in `.env.local`
- Restart the dev server after adding the key
- Check for typos in the variable name

**Error: "Incorrect API key provided"**
- Verify your API key is correct
- Check that you copied the full key (starts with `sk-`)
- Make sure there are no extra spaces

**Error: "You exceeded your current quota"**
- Check your OpenAI account billing/usage
- Add payment method if needed (even for pay-as-you-go)
- Verify you have credits available


