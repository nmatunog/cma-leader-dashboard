/**
 * API Route to hardcode promote nmatunog@gmail.com to superuser
 * POST /api/admin/hardcode-superuser
 * This bypasses normal permission checks for initial setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

const TARGET_EMAIL = 'nmatunog@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const db = getAdminDb();
    
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Firestore is not initialized' },
        { status: 500 }
      );
    }

    console.log(`[Hardcode Superuser] Looking for user with email: ${TARGET_EMAIL}`);
    
    // Find user by email in Firestore (using Admin SDK)
    const usersRef = db.collection('users');
    const querySnapshot = await usersRef.where('email', '==', TARGET_EMAIL.toLowerCase().trim()).get();
    
    if (querySnapshot.empty) {
      return NextResponse.json(
        { success: false, error: `User with email ${TARGET_EMAIL} not found` },
        { status: 404 }
      );
    }
    
    if (querySnapshot.size > 1) {
      return NextResponse.json(
        { success: false, error: `Multiple users found with email ${TARGET_EMAIL}` },
        { status: 400 }
      );
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    console.log(`[Hardcode Superuser] Found user: ${userData.name} (${userData.email})`);
    console.log(`[Hardcode Superuser] Current role: ${userData.role}`);
    
    if (userData.role === 'superuser') {
      return NextResponse.json(
        { success: true, message: 'User is already a superuser' },
        { status: 200 }
      );
    }
    
    // Update user role to superuser (bypassing permission checks)
    console.log(`[Hardcode Superuser] Updating role to superuser...`);
    await userDoc.ref.update({
      role: 'superuser',
      rank: 'ADMIN',
      updatedAt: new Date(),
    });
    
    console.log(`[Hardcode Superuser] Successfully updated user role to superuser!`);
    
    return NextResponse.json(
      { 
        success: true, 
        message: `Successfully promoted ${userData.name} (${TARGET_EMAIL}) to superuser` 
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('[Hardcode Superuser] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to promote user to superuser',
      },
      { status: 500 }
    );
  }
}

