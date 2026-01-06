# AI-Powered Signup Chatbot & Admin Link Generation - Implementation Plan

## Overview
Create an AI-powered chatbot to assist users during the signup process and enable admins to generate tracked signup links with pre-filled information.

## Features

### 1. AI-Powered Signup Chatbot
- **Purpose**: Guide users through signup, answer questions, help find names in hierarchy
- **Features**:
  - Conversational interface during signup
  - Help with name matching in organizational hierarchy
  - Answer questions about required fields
  - Provide real-time assistance
  - Suggest corrections for name/agency/unit selection

### 2. Admin Link Generation
- **Purpose**: Allow admins to generate unique signup links with pre-filled information
- **Features**:
  - Generate unique signup links
  - Pre-fill agency, unit, or other fields via URL parameters
  - Track which admin created the link
  - Optional: Track signup conversion per link
  - Expiration dates (optional)
  - Usage analytics (optional)

## Architecture

### Frontend Components

#### 1. Signup Chatbot Component
**File**: `components/signup/ai-chatbot.tsx`
- Floating chat widget on signup page
- Chat interface with message history
- Integration with AI API
- Context-aware responses based on form state

#### 2. Admin Signup Link Generator
**File**: `app/admin/signup-links/page.tsx`
- List of generated signup links
- Create new signup link modal
- Configure pre-filled fields (agency, unit, etc.)
- Copy link functionality
- Link analytics (usage, conversions)

### Backend/API Integration

#### 1. AI Chat API Route
**File**: `app/api/ai/chat/route.ts`
- Handle chat messages
- Integrate with AI provider (OpenAI/Anthropic)
- Context: current form state, hierarchy data
- Return AI responses

#### 2. Signup Link Service
**File**: `services/signup-link-service.ts`
- Generate unique link tokens
- Store link metadata in Firestore
- Validate and retrieve link parameters
- Track link usage

### Database Schema

#### Signup Links Collection (`signup_links`)
```typescript
interface SignupLink {
  id: string; // Document ID
  token: string; // Unique token for URL
  createdBy: string; // Admin UID
  createdAt: Timestamp;
  expiresAt?: Timestamp; // Optional expiration
  prefillData: {
    agencyName?: string;
    unitName?: string;
    code?: string;
  };
  metadata: {
    usageCount: number;
    signupCount: number; // Successful signups via this link
    lastUsedAt?: Timestamp;
  };
  isActive: boolean;
}
```

## Implementation Phases

### Phase 1: AI Chatbot (Basic)
1. ✅ Create chat widget component
2. ✅ Integrate with OpenAI API (or similar)
3. ✅ Add context about form state
4. ✅ Basic Q&A functionality
5. ✅ Help with name matching

### Phase 2: Admin Link Generation (Basic)
1. ✅ Create admin page for link generation
2. ✅ Generate unique tokens
3. ✅ Store links in Firestore
4. ✅ Create signup page route with token parameter
5. ✅ Pre-fill form fields from link parameters

### Phase 3: Enhanced Features
1. ⏳ Chatbot improvements (better context, hierarchy knowledge)
2. ⏳ Link analytics dashboard
3. ⏳ Link expiration
4. ⏳ Multiple link templates
5. ⏳ Email notifications (optional)

### Phase 4: Advanced Features
1. ⏳ Chatbot integration with hierarchy search
2. ⏳ Predictive text suggestions
3. ⏳ Multi-language support
4. ⏳ Link usage analytics charts
5. ⏳ A/B testing different signup flows

## Technical Details

### AI Integration Options

#### Option 1: Google Gemini API ⭐ RECOMMENDED (You have Gemini AI Pro)
- **Pros**: 
  - You already have Gemini AI Pro account
  - Good performance and context handling
  - Competitive pricing
  - Free tier available (with limits)
- **Cons**: Requires Google Cloud project setup
- **Implementation**: Use `@google/generative-ai` SDK
- **Billing**:
  - **Free Tier**: Available but limited (requires Google Cloud account)
  - **Paid Tier**: Pay-as-you-go pricing (very affordable)
  - **Note**: Gemini AI Pro subscription ($19.99/month) is for the consumer product (gemini.google), NOT the API
  - **API Billing**: Separate Google Cloud billing account needed for API usage
  - **Charging Starts**: When you enable billing on Google Cloud project (free tier stops when billing enabled)

#### Option 2: OpenAI GPT-4/3.5
- **Pros**: Excellent understanding, good for conversational AI
- **Cons**: Requires API key, costs per request
- **Implementation**: Use OpenAI SDK
- **Billing**:
  - **Free Credits**: $5 free credits on signup (expires after 3 months)
  - **After Free Credits**: Pay-as-you-go
  - **Charging Starts**: Immediately after free credits used up
  - **Billing**: Monthly invoice or pay-as-you-go

#### Option 3: Anthropic Claude
- **Pros**: Good context handling, safety features
- **Cons**: Requires API key, costs per request
- **Implementation**: Use Anthropic SDK
- **Billing**: Pay-as-you-go, typically more expensive than GPT-3.5

#### Option 4: Local LLM (Ollama, etc.)
- **Pros**: No API costs, privacy
- **Cons**: Requires server infrastructure, may be less capable
- **Implementation**: Self-hosted solution

**Recommendation**: Use **Google Gemini API** since you already have a Gemini AI Pro account. However, note that:
- The Gemini AI Pro subscription ($19.99/month) is for the consumer product
- The Gemini API requires a separate Google Cloud project and billing
- You can start with the free tier, then enable billing when needed

### Link Token Generation
```typescript
// Generate secure random token
function generateSignupToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// URL format: /signup?token=abc123... or /signup/abc123...
```

### Environment Variables Needed

#### For Google Gemini API (Recommended)
```env
GOOGLE_GEN_AI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-1.5-flash  # or gemini-1.5-pro, gemini-2.0-flash-exp
```

#### For OpenAI (Alternative)
```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo  # or gpt-4, gpt-4-turbo
```

#### For Anthropic (Alternative)
```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-haiku  # or claude-3-sonnet, claude-3-opus
```

### Firestore Security Rules
```javascript
// signup_links collection
match /signup_links/{linkId} {
  // Public read for active links
  allow read: if resource.data.isActive == true;
  
  // Only admins can create/update
  allow create, update, delete: if isAdmin();
}
```

## UI/UX Design

### Chatbot Widget
- **Position**: Bottom-right corner (floating)
- **Trigger**: Always visible or button to open
- **Size**: Expandable, max 400px width
- **Design**: Modern chat interface with message bubbles
- **Features**:
  - Typing indicator
  - Suggested questions/quick replies
  - Context-aware responses
  - Clear chat button

### Admin Link Generator
- **Page**: `/admin/signup-links`
- **Features**:
  - Table/list of existing links
  - "Generate New Link" button
  - Modal with form:
    - Agency selector (optional)
    - Unit selector (optional)
    - Code prefix (optional)
    - Expiration date (optional)
  - Copy link button
  - Usage stats (views, signups)
  - Deactivate/delete links

### Signup Page Integration
- **URL Parameters**: `/signup?token=abc123` or `/signup/abc123`
- **Behavior**:
  - Load token from URL
  - Fetch link data from Firestore
  - Pre-fill form fields
  - Track link usage (view)
  - Track successful signup
  - Show "invited by" indicator (optional)

## File Structure

```
components/
  signup/
    ai-chatbot.tsx          # Chat widget component
    chatbot-message.tsx     # Individual message component
    suggested-questions.tsx # Quick reply suggestions

app/
  api/
    ai/
      chat/
        route.ts            # AI chat API endpoint
    signup-links/
      validate/
        route.ts            # Validate signup link token
  admin/
    signup-links/
      page.tsx              # Admin link management page
  signup/
    page.tsx                # Updated signup page (with token support)
    [token]/
      page.tsx              # Alternative: dedicated token route

services/
  signup-link-service.ts    # Signup link CRUD operations
  ai-chat-service.ts        # AI chat service wrapper

types/
  signup-link.ts            # SignupLink interface
```

## Security Considerations

1. **Token Security**:
   - Use cryptographically secure random tokens
   - Tokens should be long enough (32+ bytes)
   - Validate tokens server-side
   - Prevent token enumeration attacks

2. **Rate Limiting**:
   - Limit AI chat requests per user/IP
   - Prevent abuse of link generation
   - Implement cooldown periods

3. **Data Privacy**:
   - Don't log sensitive user data in chat
   - Follow GDPR/privacy regulations
   - Allow users to clear chat history

4. **Link Validation**:
   - Verify link is active and not expired
   - Check admin permissions for link generation
   - Validate pre-fill data

## Testing Strategy

1. **Unit Tests**:
   - Token generation
   - Link validation
   - Pre-fill logic

2. **Integration Tests**:
   - Chat API integration
   - Link creation and retrieval
   - Signup flow with pre-filled data

3. **E2E Tests**:
   - Complete signup flow with chatbot
   - Admin link generation and usage
   - Token expiration handling

## Deployment Checklist

- [ ] Add AI API key to environment variables
- [ ] Update Firestore security rules
- [ ] Deploy API routes
- [ ] Test chatbot in staging
- [ ] Test link generation and usage
- [ ] Monitor API costs
- [ ] Set up rate limiting
- [ ] Add error handling and logging
- [ ] Create admin documentation
- [ ] Train admins on link generation

## Cost Estimation & Billing Details

### Google Gemini API ⭐ (Recommended for You)
- **Free Tier**: 
  - Available but limited (exact limits vary)
  - Free tier stops when billing enabled on Google Cloud project
  - Good for testing/development
- **Paid Tier** (Pay-as-you-go):
  - **Gemini 1.5 Flash**: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
  - **Gemini 1.5 Pro**: ~$1.25 per 1M input tokens, ~$5.00 per 1M output tokens
  - **Estimate for Signup Chatbot**:
    - Average chat session: ~500 input + 200 output tokens
    - Cost per signup: ~$0.0002 (Flash) or ~$0.0008 (Pro)
    - 1,000 signups/month: ~$0.20-$0.80/month
    - 10,000 signups/month: ~$2-$8/month
- **Billing**: 
  - Charging starts when you enable billing on Google Cloud project
  - Free tier available until billing enabled
  - Monthly billing through Google Cloud
- **Note**: Gemini AI Pro subscription ($19.99/month) is separate - it's for the consumer product, not the API

### OpenAI GPT-3.5-turbo (Alternative)
- **Free Credits**: $5 free credits on signup (expires after 3 months)
- **Cost**: ~$0.50 per 1M input tokens, ~$1.50 per 1M output tokens
- **Estimate**: 
  - Average chat session: ~500 tokens
  - Cost per signup: ~$0.0004
  - 1,000 signups/month: ~$0.40/month
  - 10,000 signups/month: ~$4/month
- **Billing**: 
  - Charging starts immediately after free credits used up
  - Pay-as-you-go with monthly invoices
  - No recurring subscription required

### OpenAI GPT-4 (Alternative - More Expensive)
- **Cost**: ~$30 per 1M input tokens, ~$60 per 1M output tokens
- **Estimate**: 15x more expensive than GPT-3.5

**Recommendation**: 
1. **Start with Google Gemini API** (you already have account)
2. Use **Gemini 1.5 Flash** for cost-effectiveness (very capable for chat)
3. Upgrade to **Gemini 1.5 Pro** only if you need better quality
4. Start with free tier, enable billing when ready for production

## Next Steps

1. **Review and approve plan**
2. **Set up AI API account and get API key**
3. **Implement Phase 1 (Basic Chatbot)**
4. **Test chatbot functionality**
5. **Implement Phase 2 (Link Generation)**
6. **Test link generation and usage**
7. **Deploy to staging**
8. **Gather feedback and iterate**
9. **Deploy to production**

## Questions to Consider

1. **AI Provider**: Which AI provider do you prefer? (OpenAI, Anthropic, other)
2. **Budget**: What's the monthly budget for AI API calls?
3. **Link Analytics**: How detailed should link analytics be?
4. **Chatbot Scope**: Should chatbot only help with signup, or broader questions?
5. **Multi-language**: Do you need multi-language support?
6. **Link Expiration**: Should links expire by default, or remain active indefinitely?

