/**
 * Test API Route: Check if Firebase Admin SDK can initialize
 * This helps debug environment variable issues
 */

import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';

export async function GET() {
  try {
    console.log('🧪 Testing Firebase Admin SDK initialization...');
    
    // Check environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    const envCheck = {
      FIREBASE_PROJECT_ID: projectId ? 'SET' : 'NOT SET',
      FIREBASE_CLIENT_EMAIL: clientEmail ? 'SET' : 'NOT SET',
      FIREBASE_PRIVATE_KEY: privateKey ? `SET (${privateKey.length} chars)` : 'NOT SET',
    };

    // Try to initialize
    const app = getAdminApp();
    
    return NextResponse.json({
      success: true,
      message: 'Firebase Admin SDK initialized successfully',
      envCheck,
      appName: app.name,
    });
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      envCheck: {
        FIREBASE_PROJECT_ID: projectId ? 'SET' : 'NOT SET',
        FIREBASE_CLIENT_EMAIL: clientEmail ? 'SET' : 'NOT SET',
        FIREBASE_PRIVATE_KEY: privateKey ? `SET (${privateKey.length} chars)` : 'NOT SET',
      },
    }, { status: 500 });
  }
}


