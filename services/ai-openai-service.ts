/**
 * OpenAI Service
 * Alternative AI service using OpenAI API (cost-effective option)
 * Uses GPT-4o-mini which is very affordable: $0.15/$0.60 per million tokens
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
  // Chat-collected data
  newAdvisors?: number;
  clientsPerWeek?: number;
  jfwsPerWeek?: number;
  recruitmentInterviewsPerWeek?: number;
  agencyAssembly?: { frequency: string; schedule: string };
  unitMeeting?: { frequency: string; schedule: string };
  businessReview?: { frequency: string; schedule: string };
  morningMeeting?: { frequency: string; schedule: string };
  aceSbsg?: { frequency: string; schedule: string };
}

/**
 * Generate activity planning using OpenAI GPT-4o-mini
 */
export async function generateActivityPlanningOpenAI(
  context: ActivityPlanningContext
): Promise<{ success: boolean; response?: string; error?: string }> {
  const API_KEY = process.env.OPENAI_API_KEY;
  
  if (!API_KEY) {
    return {
      success: false,
      error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.',
    };
  }

  try {
    const prompt = buildActivityPlanningPrompt(context);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Very cost-effective model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant that provides practical, actionable activity planning suggestions for insurance agency leaders.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }
    
    const text = data.choices[0].message.content;
    
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from OpenAI API');
    }

    return {
      success: true,
      response: text,
    };
  } catch (error) {
    console.error('Error generating activity planning with OpenAI:', error);
    
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

Your task is to provide a comprehensive activity plan organized into three timeframes: Day In the Life Of (DILO), Week In the Life Of (WILO), and Month In the Life Of (MILO) of the Agency Leader.

**ACTIVITY TARGETS (User-specified from chat):**
${context.newAdvisors ? `- New Advisors: ${context.newAdvisors}` : `- New Advisors: ${context.newCount} (from team data)`}
${context.clientsPerWeek ? `- Target Clients per Week: ${context.clientsPerWeek}` : ''}
${context.jfwsPerWeek ? `- Joint Field Works (JFWs) per Week: ${context.jfwsPerWeek}` : ''}
${context.recruitmentInterviewsPerWeek ? `- Recruitment Interviews/1-on-1 BOPs per Week: ${context.recruitmentInterviewsPerWeek}` : ''}

**MANDATORY MEETING SCHEDULES (User-specified from chat):**
${context.agencyAssembly ? `- Agency Assembly: ${context.agencyAssembly.frequency}${context.agencyAssembly.schedule ? `, ${context.agencyAssembly.schedule}` : ''}` : '- Agency Assembly: Not specified'}
${context.unitMeeting ? `- Unit Meeting: ${context.unitMeeting.frequency}${context.unitMeeting.schedule ? `, ${context.unitMeeting.schedule}` : ''}` : '- Unit Meeting: Not specified'}
${context.businessReview ? `- Leaders Meeting: ${context.businessReview.frequency}${context.businessReview.schedule ? `, ${context.businessReview.schedule}` : ''}` : '- Leaders Meeting: Not specified'}
${context.morningMeeting ? `- Morning Meeting: ${context.morningMeeting.frequency}${context.morningMeeting.schedule ? `, ${context.morningMeeting.schedule}` : ''}` : '- Morning Meeting: Not specified'}
${context.aceSbsg ? `- ACE/SBSG: ${context.aceSbsg.frequency}${context.aceSbsg.schedule ? `, ${context.aceSbsg.schedule}` : ''}` : '- ACE/SBSG: Not specified'}

**ACTIVITY PLANNING NOTES:**
- Use the user-specified targets and meeting schedules above to create the plan
- Allocate time appropriately based on the specified targets (clients per week, JFWs per week, recruitment interviews per week)
- Incorporate all mandatory meetings according to their specified frequency and schedule
- Balance the activities within a 40-hour workweek (or adjust accordingly based on meeting schedules)

**OUTPUT STRUCTURE REQUIREMENTS:**

Format your response using markdown with the following sections:

## Day In the Life Of (DILO) - Agency Leader

List typical daily activities broken down by time blocks (Morning, Afternoon, Evening if applicable). Include:
- Daily routines and check-ins
- Client appointments (if applicable)
- Administrative tasks
- Team interactions
- Personal selling activities

## Week In the Life Of (WILO) - Agency Leader

Break down the weekly schedule showing:
- Distribution of activities across the week based on user-specified meeting schedules
- Allocation of JFW, recruitment interviews, client meetings according to user targets
- Specific hours allocated per activity based on user-specified targets
- Total hours per activity per week
- Incorporate all mandatory meetings according to their specified schedules

## Month In the Life Of (MILO) - Agency Leader

Monthly overview including:
- All mandatory meetings with their specified frequencies and schedules
- Weekly recurring activities
- Monthly targets and goals
- Strategic planning and review sessions
- Summary of activities and achievements

**Activity Planning Guidelines:**
- Structure the plan based on user-specified targets and meeting schedules
- Use the exact meeting frequencies and schedules provided by the user
- Allocate time according to user-specified targets (clients per week, JFWs per week, recruitment interviews per week)
- Balance activities within available time (accounting for all mandatory meetings)
- Higher Personal FYC → More hours for client meetings (personal selling)
- Lower Personal FYC → More hours for recruitment interviews and JFW with new advisors
- Balance time between personal production and team development
- Be specific with time allocations
- Consider the leader's rank (${context.rank}) and team composition
- Provide actionable, time-specific recommendations
- Be encouraging and motivational
- Keep the total response comprehensive but focused (aim for 600-900 words)

Generate a detailed activity plan following the DILO/WILO/MILO structure that helps this leader achieve their goals while maintaining work-life balance.`;
}

