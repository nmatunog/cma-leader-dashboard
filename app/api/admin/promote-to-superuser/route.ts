/**
 * API Route to promote an admin user to superuser
 * POST /api/admin/promote-to-superuser
 * Body: { email: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Note: This API route should verify the requester is a superuser
// For now, we'll add a simple check - in production, you should verify the auth token
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Firestore is not initialized' },
        { status: 500 }
      );
    }

    // Get the authorization header to verify the requester
    const authHeader = request.headers.get('authorization');
    // Note: In a real implementation, you'd verify the Firebase Auth token here
    // For now, we'll rely on the client-side check and Firestore rules

    const body = await request.json();
    const { email, requesterUid } = body;
    
    // Verify requester is superuser
    if (requesterUid) {
      const requesterDocRef = doc(db, 'users', requesterUid);
      const requesterDoc = await getDoc(requesterDocRef);
      if (!requesterDoc.exists()) {
        return NextResponse.json(
          { success: false, error: 'Requester not found' },
          { status: 404 }
        );
      }
      const requesterData = requesterDoc.data();
      if (requesterData.role !== 'superuser') {
        return NextResponse.json(
          { success: false, error: 'Only Super Users can promote users to Super User' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Requester UID is required' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { success: false, error: `User with email ${email} not found` },
        { status: 404 }
      );
    }

    if (querySnapshot.size > 1) {
      return NextResponse.json(
        { success: false, error: `Multiple users found with email ${email}` },
        { status: 400 }
      );
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Check if user is already superuser
    if (userData.role === 'superuser') {
      return NextResponse.json(
        { success: true, message: 'User is already a superuser' },
        { status: 200 }
      );
    }

    // Update user role to superuser
    await updateDoc(doc(db, 'users', userDoc.id), {
      role: 'superuser',
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json(
      { success: true, message: `Successfully promoted ${email} to superuser` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error promoting user to superuser:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to promote user to superuser',
      },
      { status: 500 }
    );
  }
}

