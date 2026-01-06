/**
 * API Route: Set Temporary Password
 * Admin only - Generates and sets a temporary password for a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { generateSecurePassword, generateReadablePassword } from '@/lib/utils/password-generator';
import { encryptPassword } from '@/lib/utils/password-encryption';
import { verifyIdToken } from '@/lib/api-auth-helper';

const TEMP_PASSWORDS_COLLECTION = 'temp_passwords';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Missing or invalid authorization header.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);
    
    // Verify user is admin or superuser
    if (decodedToken.role !== 'admin' && decodedToken.role !== 'superuser' && decodedToken.rank !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Admin or Super User access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, useReadable = false } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid request. userId is required.' },
        { status: 400 }
      );
    }

    // Generate temporary password
    const tempPassword = useReadable ? generateReadablePassword() : generateSecurePassword(12);

    // Set password using Firebase Admin Auth
    const adminAuth = getAdminAuth();
    await adminAuth.updateUser(userId, {
      password: tempPassword,
    });

    // Update user document to set isTempPassword flag
    const adminDb = getAdminDb();
    await adminDb.collection('users').doc(userId).update({
      isTempPassword: true,
      updatedAt: new Date(),
    });

    // Encrypt and store password for later retrieval
    const encryptedPassword = await encryptPassword(tempPassword);
    await adminDb.collection(TEMP_PASSWORDS_COLLECTION).doc(userId).set({
      encryptedPassword,
      createdAt: new Date(),
      createdBy: decodedToken.uid,
      userId,
    });

    // Return the password (this is the only time it's returned in plain text)
    return NextResponse.json({
      success: true,
      tempPassword, // Only returned once
      message: 'Temporary password set successfully',
    });
  } catch (error) {
    console.error('Error setting temporary password:', error);
    
    let errorMessage = 'Failed to set temporary password';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}


