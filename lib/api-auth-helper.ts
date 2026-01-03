/**
 * API Authentication Helper
 * Verifies Firebase ID tokens for API routes
 */

import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

interface DecodedToken {
  uid: string;
  email?: string;
  role?: string;
  rank?: string;
  [key: string]: any;
}

/**
 * Verify Firebase ID token and get user data
 */
export async function verifyIdToken(token: string): Promise<DecodedToken> {
  const adminAuth = getAdminAuth();
  const decodedToken = await adminAuth.verifyIdToken(token);
  
  // Get user data from Firestore to include role and rank
  const adminDb = getAdminDb();
  const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
  
  if (!userDoc.exists) {
    throw new Error('User document not found');
  }
  
  const userData = userDoc.data();
  
  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    role: userData?.role,
    rank: userData?.rank,
    ...decodedToken,
  };
}


