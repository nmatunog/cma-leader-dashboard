/**
 * Authentication Service
 * Handles user authentication (email/password) and user data management
 */

import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword,
  User as FirebaseUser,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User, UserCreateData, UserUpdateData, UserRole, UserRank } from '@/types/user';

const USERS_COLLECTION = 'users';

/**
 * Register a new user (Admin only)
 * Creates Firebase Auth account and Firestore user document
 */
export async function registerUser(userData: UserCreateData, createdBy: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );
    
    const firebaseUser = userCredential.user;
    
    // Create user document in Firestore
    const userDoc: Omit<User, 'uid'> = {
      email: userData.email,
      code: userData.code,
      name: userData.name,
      role: userData.role,
      rank: userData.rank,
      unitManager: userData.unitManager,
      agencyName: userData.agencyName,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      isActive: true,
      createdBy,
      emailVerified: firebaseUser.emailVerified,
    };
    
    await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), userDoc);
    
    // Update Firebase Auth profile
    await firebaseUpdateProfile(firebaseUser, {
      displayName: userData.name,
    });
    
    // Return user data
    const newUser: User = {
      uid: firebaseUser.uid,
      ...userDoc,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return { success: true, user: newUser };
  } catch (error) {
    console.error('Error registering user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register user',
    };
  }
}

/**
 * Login user with email and password
 */
export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Get user data from Firestore
    const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      // User exists in Auth but not in Firestore - this shouldn't happen
      await firebaseSignOut(auth);
      return {
        success: false,
        error: 'User account not found. Please contact administrator.',
      };
    }
    
    const userData = userDocSnap.data() as Omit<User, 'uid'>;
    
    // Check if user is active
    if (!userData.isActive) {
      await firebaseSignOut(auth);
      return {
        success: false,
        error: 'Your account has been deactivated. Please contact administrator.',
      };
    }
    
    // Update last login time
    await updateDoc(userDocRef, {
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    const user: User = {
      uid: firebaseUser.uid,
      ...userData,
      lastLoginAt: new Date(),
    };
    
    return { success: true, user };
  } catch (error) {
    console.error('Error logging in:', error);
    let errorMessage = 'Failed to log in';
    
    if (error instanceof Error) {
      if (error.message.includes('user-not-found')) {
        errorMessage = 'No account found with this email address.';
      } else if (error.message.includes('wrong-password')) {
        errorMessage = 'Incorrect password.';
      } else if (error.message.includes('invalid-email')) {
        errorMessage = 'Invalid email address.';
      } else if (error.message.includes('too-many-requests')) {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Get current authenticated user from Firestore
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return null;
    }
    
    const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      return null;
    }
    
    const userData = userDocSnap.data() as Omit<User, 'uid'>;
    
    // Check if user is active
    if (!userData.isActive) {
      return null;
    }
    
    return {
      uid: firebaseUser.uid,
      ...userData,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Send password reset email
 * Note: For code-based users (@cma.local emails), email reset won't work.
 * Admin must set a temporary password instead.
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string; isCodeBased?: boolean }> {
  try {
    // Check if this is a code-based user (email ends with @cma.local)
    if (email.endsWith('@cma.local')) {
      return { 
        success: false, 
        isCodeBased: true,
        error: 'Code-based accounts cannot use email password reset. Please contact your administrator to set a temporary password.' 
      };
    }
    
    await sendPasswordResetEmail(auth, email);
    return { success: true, isCodeBased: false };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    let errorMessage = 'Failed to send password reset email';
    
    if (error instanceof Error) {
      if (error.message.includes('user-not-found')) {
        errorMessage = 'No account found with this email address.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return { success: false, error: errorMessage, isCodeBased: false };
  }
}

/**
 * Update user password (for authenticated users)
 * Also clears isTempPassword flag if it was set
 */
export async function changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return { success: false, error: 'No user is currently signed in.' };
    }
    
    await updatePassword(firebaseUser, newPassword);
    
    // Clear isTempPassword flag after password change
    const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
    await updateDoc(userDocRef, {
      isTempPassword: false,
      updatedAt: serverTimestamp(),
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update password',
    };
  }
}

/**
 * Check if current user is authenticated
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}

/**
 * Get Firebase Auth user
 */
export function getFirebaseUser(): FirebaseUser | null {
  return auth.currentUser;
}


