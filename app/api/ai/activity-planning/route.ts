/**
 * AI Activity Planning API Route
 * Handles activity planning requests for agency leaders
 * Uses OpenAI GPT-4o-mini (cost-effective)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateActivityPlanningOpenAI, type ActivityPlanningContext } from '@/services/ai-openai-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const context = body.context as ActivityPlanningContext;

    // Validate request
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Context is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!context.leaderName || !context.rank || !context.agency) {
      return NextResponse.json(
        { success: false, error: 'Leader name, rank, and agency are required' },
        { status: 400 }
      );
    }

    // Generate activity plan using OpenAI
    const result = await generateActivityPlanningOpenAI(context);

    if (!result.success) {
      console.error('AI activity planning service returned error:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to generate activity plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: result.response,
    });
  } catch (error) {
    console.error('Error in AI activity planning API route:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

