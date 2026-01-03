/**
 * API Route: Get Temporary Password
 * Admin only - Retrieves a stored temporary password
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { decryptPassword } from '@/lib/utils/password-encryption';
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
    
    // Verify user is admin
    if (decodedToken.role !== 'admin' && decodedToken.rank !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid request. userId is required.' },
        { status: 400 }
      );
    }

    // Retrieve encrypted password
    const adminDb = getAdminDb();
    const tempPasswordDoc = await adminDb.collection(TEMP_PASSWORDS_COLLECTION).doc(userId).get();

    if (!tempPasswordDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'No temporary password found for this user.' },
        { status: 404 }
      );
    }

    const data = tempPasswordDoc.data();
    if (!data?.encryptedPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid temporary password record.' },
        { status: 500 }
      );
    }

    // Decrypt password
    const tempPassword = await decryptPassword(data.encryptedPassword);

    return NextResponse.json({
      success: true,
      tempPassword,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
    });
  } catch (error) {
    console.error('Error retrieving temporary password:', error);
    
    let errorMessage = 'Failed to retrieve temporary password';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}


