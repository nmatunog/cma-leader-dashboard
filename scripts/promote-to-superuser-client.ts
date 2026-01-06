/**
 * Client-side script to promote nmatunog@gmail.com to superuser
 * This uses the Firebase client SDK and can be run in the browser console
 * or as a Next.js API route
 * 
 * Usage: Copy and paste this into browser console while logged in as admin,
 * or create an API route that calls this function
 */

import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TARGET_EMAIL = 'nmatunog@gmail.com';

export async function promoteToSuperuserClient(): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    if (!db) {
      return { success: false, error: 'Firestore is not initialized' };
    }

    console.log(`Looking for user with email: ${TARGET_EMAIL}`);
    
    // Find user by email in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', TARGET_EMAIL.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: `User with email ${TARGET_EMAIL} not found` };
    }
    
    if (querySnapshot.size > 1) {
      return { success: false, error: `Multiple users found with email ${TARGET_EMAIL}` };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    console.log(`Found user: ${userData.name} (${userData.email})`);
    console.log(`Current role: ${userData.role}`);
    
    if (userData.role === 'superuser') {
      return { success: true, message: 'User is already a superuser' };
    }
    
    // Update user role to superuser
    await updateDoc(doc(db, 'users', userId), {
      role: 'superuser',
      rank: 'ADMIN',
      updatedAt: serverTimestamp(),
    });
    
    return { 
      success: true, 
      message: `Successfully promoted ${userData.name} (${TARGET_EMAIL}) to superuser` 
    };
    
  } catch (error) {
    console.error('Error promoting user to superuser:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to promote user to superuser',
    };
  }
}

