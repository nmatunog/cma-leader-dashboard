/**
 * AI Chat API Route
 * Handles chat requests for the signup chatbot
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse, type ChatMessage, type ChatContext } from '@/services/ai-chat-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, context } = body as {
      messages: ChatMessage[];
      context?: ChatContext;
    };

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Generate response
    const result = await generateChatResponse(messages, context);

    if (!result.success) {
      console.error('AI chat service returned error:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to generate response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: result.response,
    });
  } catch (error) {
    console.error('Error in AI chat API route:', error);
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

