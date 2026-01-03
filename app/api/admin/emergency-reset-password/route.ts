/**
 * Emergency Password Reset API Route
 * Uses a hardcoded password to reset any user's password
 * This is a last resort option when normal temp password generation fails
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { verifyIdToken } from '@/lib/api-auth-helper';

// Hardcoded emergency password (should be set in environment variables)
const EMERGENCY_PASSWORD = process.env.ADMIN_EMERGENCY_RESET_PASSWORD || 'CMA2026-Reset-Emergency!';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);

    // Verify user is admin
    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Set password using Firebase Admin Auth
    const adminAuth = getAdminAuth();
    await adminAuth.updateUser(userId, {
      password: EMERGENCY_PASSWORD,
    });

    // Update user document to set isTempPassword flag
    const adminDb = getAdminDb();
    await adminDb.collection('users').doc(userId).update({
      isTempPassword: true,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      password: EMERGENCY_PASSWORD, // Return the hardcoded password
      message: 'Emergency password reset successful. User must change password on next login.',
    });
  } catch (error) {
    console.error('Error in emergency password reset:', error);
    
    let errorMessage = 'Failed to reset password';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

