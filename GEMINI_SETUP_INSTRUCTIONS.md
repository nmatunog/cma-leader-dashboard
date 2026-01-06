# Gemini API Setup Instructions

## Quick Setup Steps

### 1. Get Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Select or create a Google Cloud project
4. Copy your API key (starts with `AIza...`)

### 2. Add API Key to Environment Variables

#### For Local Development

Create or update `.env.local` file in the project root:

```env
GOOGLE_GEN_AI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-1.5-flash
```

#### For Vercel Deployment

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Key**: `GOOGLE_GEN_AI_API_KEY`
   - **Value**: Your API key
   - **Environment**: Production, Preview, Development (select all)
3. Add:
   - **Key**: `GEMINI_MODEL`
   - **Value**: `gemini-1.5-flash` (or `gemini-1.5-pro` for better quality)
   - **Environment**: Production, Preview, Development (select all)
4. Click "Save"
5. Redeploy your application

### 3. Install Dependencies

The `@google/generative-ai` package has been added to `package.json`. Run:

```bash
npm install
```

### 4. Test the Chatbot

1. Start your development server: `npm run dev`
2. Navigate to `/signup` page
3. You should see a floating chat button in the bottom-right corner
4. Click it to open the AI assistant
5. Try asking a question like "What information do I need to provide?"

## Model Options

### Gemini 1.5 Flash (Recommended - Default)
- **Cost**: $0.20 per 1,000 signups/month
- **Speed**: Very fast
- **Quality**: Good (suitable for most use cases)
- **Best for**: Cost-effective, high-volume usage

### Gemini 1.5 Pro (Higher Quality)
- **Cost**: $0.80 per 1,000 signups/month
- **Speed**: Fast
- **Quality**: Excellent (comparable to GPT-4)
- **Best for**: When you need better quality

To use Pro, change `GEMINI_MODEL=gemini-1.5-pro` in your environment variables.

## Troubleshooting

### Chatbot Not Appearing

1. Check that `GOOGLE_GEN_AI_API_KEY` is set in environment variables
2. Check browser console for errors
3. Verify API key is valid at [Google AI Studio](https://aistudio.google.com/app/apikey)

### API Errors

- **"API key not valid"**: Double-check your API key
- **"Quota exceeded"**: Free tier has limits, consider enabling billing
- **"Permission denied"**: Ensure Generative Language API is enabled in Google Cloud Console

### Enable Generative Language API

If you get API errors:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Library"
4. Search for "Generative Language API"
5. Click "Enable"

## Free Tier vs Paid

### Free Tier
- Available for testing/development
- Has usage limits (varies by model)
- Good for small-scale testing
- No billing account required

### Paid Tier (Pay-as-you-go)
- Very affordable (see cost estimates above)
- No usage limits
- Requires billing account on Google Cloud
- **Note**: Free tier stops when billing is enabled

## Cost Estimation

For signup chatbot usage:
- **1,000 signups/month**: ~$0.20 (Flash) or ~$0.80 (Pro)
- **10,000 signups/month**: ~$2.00 (Flash) or ~$8.00 (Pro)
- **100,000 signups/month**: ~$20.00 (Flash) or ~$80.00 (Pro)

## Security Notes

- ⚠️ **Never commit API keys to Git**
- ✅ Use environment variables only
- ✅ Restrict API key in Google Cloud Console (optional but recommended)
- ✅ Set up billing alerts in Google Cloud Console

## Next Steps

Once set up, the AI chatbot will:
- Appear as a floating button on the signup page
- Help users with signup questions
- Provide guidance on form fields
- Assist with finding names in the hierarchy

For more details, see:
- `AI_SIGNUP_CHATBOT_PLAN.md` - Full implementation plan
- `GEMINI_API_SETUP.md` - Detailed Gemini API setup guide
- `AI_PLATFORM_COST_COMPARISON.md` - Cost comparison with other AI providers


