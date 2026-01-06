/**
 * AI Chat Service
 * Handles communication with Google Gemini API for signup chatbot
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key at runtime (not at module load time for better Next.js compatibility)
function getApiKey(): string | undefined {
  return process.env.GOOGLE_GEN_AI_API_KEY;
}

function getModelName(): string {
  // Use gemini-1.5-pro as default (most stable and widely available)
  // Alternative: gemini-pro (older but also stable)
  return process.env.GEMINI_MODEL || 'gemini-1.5-pro';
}

// Initialize GoogleGenerativeAI instance
function getGenAI(): GoogleGenerativeAI | null {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    console.warn('GOOGLE_GEN_AI_API_KEY not set. AI chatbot will not work.');
    return null;
  }

  try {
    return new GoogleGenerativeAI(API_KEY);
  } catch (error) {
    console.error('Error initializing Google Generative AI:', error);
    return null;
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  currentFormState?: {
    code?: string;
    name?: string;
    email?: string;
    agencyName?: string;
    unitName?: string;
    hasHierarchyMatch?: boolean;
  };
  availableAgencies?: string[];
  availableUnits?: string[];
}

/**
 * Generate AI response for signup chatbot
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  context?: ChatContext
): Promise<{ success: boolean; response?: string; error?: string }> {
  const API_KEY = getApiKey();
  const genAI = getGenAI();
  
  if (!genAI || !API_KEY) {
    return {
      success: false,
      error: 'AI service is not configured. Please set GOOGLE_GEN_AI_API_KEY environment variable.',
    };
  }

  try {
    const MODEL_NAME = getModelName();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);
    
    // Build full prompt with system instruction and conversation
    let fullPrompt = systemPrompt + '\n\n';
    
    // Add conversation history
    for (const msg of messages.slice(0, -1)) {
      if (msg.role === 'user') {
        fullPrompt += `User: ${msg.content}\n`;
      } else {
        fullPrompt += `Assistant: ${msg.content}\n`;
      }
    }
    
    // Add current user message
    const lastMessage = messages[messages.length - 1];
    fullPrompt += `User: ${lastMessage.content}\nAssistant:`;

    // Generate response using generateContent
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    
    // Check if response is valid
    if (!response) {
      throw new Error('Empty response from Gemini API');
    }
    
    const text = response.text();
    
    if (!text || text.trim().length === 0) {
      throw new Error('Empty text response from Gemini API');
    }

    return {
      success: true,
      response: text,
    };
  } catch (error) {
    // Enhanced error logging
    console.error('Error generating AI response:', error);
    
    let errorMessage = 'Failed to generate AI response';
    if (error instanceof Error) {
      errorMessage = error.message;
      // Log additional error details if available
      if ('cause' in error && error.cause) {
        console.error('Error cause:', error.cause);
      }
      if ('stack' in error && error.stack) {
        console.error('Error stack:', error.stack);
      }
    } else {
      console.error('Unknown error type:', typeof error, error);
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Build system prompt for signup chatbot
 */
function buildSystemPrompt(context?: ChatContext): string {
  return `You are a helpful AI assistant for a signup form. Your role is to:

1. Help users complete their signup by answering questions about the form fields
2. Assist users in finding their name in the organizational hierarchy
3. Explain what information is required and why
4. Provide guidance on selecting the correct agency and unit
5. Be friendly, concise, and helpful

Current form context:
${context?.currentFormState ? `
- Code: ${context.currentFormState.code || 'Not entered'}
- Name: ${context.currentFormState.name || 'Not entered'}
- Email: ${context.currentFormState.email || 'Not entered'}
- Agency: ${context.currentFormState.agencyName || 'Not selected'}
- Unit: ${context.currentFormState.unitName || 'Not selected'}
- Hierarchy Match: ${context.currentFormState.hasHierarchyMatch ? 'Found' : 'Not found'}
` : 'No form data available'}

${context?.availableAgencies && context.availableAgencies.length > 0 ? `
Available agencies: ${context.availableAgencies.join(', ')}
` : ''}

${context?.availableUnits && context.availableUnits.length > 0 ? `
Available units: ${context.availableUnits.join(', ')}
` : ''}

Important guidelines:
- Keep responses concise and actionable
- Focus on helping users complete the signup form
- If a user's name isn't found in the hierarchy, suggest checking spelling or contacting their administrator
- Don't make up information - only use what's provided in the context
- Be encouraging and supportive`;
}

/**
 * Activity Planning Context for Leaders
 */
export interface ActivityPlanningContext {
  leaderName: string;
  rank: string;
  agency: string;
  personalFYC: number;
  activeRecruits: number;
  tenuredCount: number;
  tenuredProd: number;
  newCount: number;
  newProd: number;
  persistency: number;
}

/**
 * Generate AI-assisted activity planning for agency leaders
 */
export async function generateActivityPlanning(
  context: ActivityPlanningContext
): Promise<{ success: boolean; response?: string; error?: string }> {
  const API_KEY = getApiKey();
  const genAI = getGenAI();
  
  if (!genAI || !API_KEY) {
    return {
      success: false,
      error: 'AI service is not configured. Please set GOOGLE_GEN_AI_API_KEY environment variable.',
    };
  }

  try {
    const MODEL_NAME = getModelName();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Build prompt for activity planning
    const prompt = buildActivityPlanningPrompt(context);

    // Generate response
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    // Check if response is valid
    if (!response) {
      throw new Error('Empty response from Gemini API');
    }
    
    const text = response.text();
    
    if (!text || text.trim().length === 0) {
      throw new Error('Empty text response from Gemini API');
    }

    return {
      success: true,
      response: text,
    };
  } catch (error) {
    console.error('Error generating activity planning:', error);
    
    let errorMessage = 'Failed to generate activity plan';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Build prompt for activity planning
 */
function buildActivityPlanningPrompt(context: ActivityPlanningContext): string {
  const monthlyTeamFYC = (context.tenuredCount * context.tenuredProd) + (context.newCount * context.newProd);
  const quarterlyTeamFYC = monthlyTeamFYC * 3;
  const annualTeamFYC = monthlyTeamFYC * 12;

  return `You are an AI assistant helping an agency leader with activity planning. Your role is to provide practical, actionable activity planning suggestions based on their current team performance and goals.

Leader Profile:
- Name: ${context.leaderName}
- Rank: ${context.rank}
- Agency: ${context.agency}

Current Performance Metrics:
- Personal Monthly FYC: ₱${context.personalFYC.toLocaleString()}
- Active New Recruits: ${context.activeRecruits}
- Tenured Team Count: ${context.tenuredCount} advisors
- Tenured Team Avg Monthly FYC: ₱${context.tenuredProd.toLocaleString()}
- New Recruits Count: ${context.newCount} advisors
- New Recruits Avg Monthly FYC: ₱${context.newProd.toLocaleString()}
- Team Persistency: ${context.persistency}%

Calculated Metrics:
- Monthly Team FYC: ₱${monthlyTeamFYC.toLocaleString()}
- Quarterly Team FYC: ₱${quarterlyTeamFYC.toLocaleString()}
- Annual Team FYC: ₱${annualTeamFYC.toLocaleString()}

Your task is to provide a comprehensive activity plan structured around a 40-hour workweek. The plan must allocate time across these core activities:

**Core Weekly Activities (40-hour workweek):**

1. **Joint Field Works (JFW) with New Advisors**:
   - Mentoring new advisors through joint field works
   - Essential for developing new recruits and ensuring their success
   - Allocate time based on number of new recruits (${context.newCount} new recruits)

2. **Business Reviews**:
   - Regular business reviews with team members
   - Schedule weekly business reviews

3. **Unit Meetings**:
   - Weekly unit meetings
   - Plan for unit meeting per week

4. **Recruitment Activities**:
   - Recruitment interviews (or 1-on-1 table BOPs - Business Opportunity Presentations)
   - Industry standard: 10 interviews to get 1 successful new recruit
   - If targeting ${context.newCount} new recruits, plan for ${context.newCount * 10} recruitment interviews/BOPs
   - Lower Personal FYC needs more manpower, so prioritize more recruitment activities

5. **Client Meetings for Personal Selling**:
   - Higher Personal FYC (₱${context.personalFYC.toLocaleString()}/month) requires more time for client meetings
   - At least 1 client appointment per day for higher personal FYC targets (5+ per week)
   - Lower Personal FYC allows more time for recruitment and team building instead

**Activity Planning Guidelines:**
- Structure the plan around a 40-hour workweek
- Allocate hours across the 5 core activities based on priorities
- Higher Personal FYC → More hours for client meetings (personal selling)
- Lower Personal FYC → More hours for recruitment interviews and JFW with new advisors
- Balance time between personal production and team development
- Be specific with hours allocated per activity per week
- Provide a weekly schedule breakdown (e.g., "8 hours JFW, 4 hours business reviews, 2 hours unit meeting, 10 hours recruitment, 16 hours client meetings")
- Include monthly targets and weekly breakdowns
- Consider the leader's rank (${context.rank}) and team composition
- Format the response with clear sections using markdown headers
- Provide actionable, time-specific recommendations
- Be encouraging and motivational
- Keep the total response comprehensive but focused (aim for 500-700 words)

Generate a detailed weekly activity plan (40-hour workweek) that balances all core activities and helps this leader achieve their goals.`;
}

