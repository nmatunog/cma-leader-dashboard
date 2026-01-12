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
import { getUserByCode, getUserById } from './user-service';
import { saveHierarchyEntry } from '@/services/organizational-hierarchy-service';
import { getCanonicalAgencyName } from '@/lib/utils/agency-name-normalizer';
import { getCanonicalName } from '@/lib/utils/name-canonicalizer';

const USERS_COLLECTION = 'users';

/**
 * Register a new user (Admin only)
 * Creates Firebase Auth account and Firestore user document
 */
export async function registerUser(userData: UserCreateData, createdBy: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Check if trying to create admin or superuser - only superusers can do this
    if (userData.role === 'admin' || userData.role === 'superuser') {
      const creator = await getUserById(createdBy);
      if (!creator || creator.role !== 'superuser') {
        return {
          success: false,
          error: 'Only Super Users can create Admin or Super User accounts',
        };
      }
    }
    
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );
    
    const firebaseUser = userCredential.user;
    
    // Auto-assign unitManager for leaders (except AUMs):
    // - UMs, SUMs, and ADDs should have themselves as unitManager (in all caps)
    // - AUMs keep their actual unitManager (normalized to all caps)
    let finalUnitManager = userData.unitManager;
    if (userData.role === 'leader' && userData.rank !== 'AUM') {
      if (userData.rank === 'UM' || userData.rank === 'SUM' || userData.rank === 'ADD') {
        // Use canonical name (all caps) for UM/SUM/ADD names
        finalUnitManager = getCanonicalName(userData.name);
      }
    } else if (userData.unitManager) {
      // For advisors and AUMs, normalize their unitManager to all caps
      finalUnitManager = getCanonicalName(userData.unitManager);
    }
    
    // Normalize agency name to canonical form for consistency
    const normalizedAgencyName = getCanonicalAgencyName(userData.agencyName);
    
    // Create user document in Firestore
    const userDoc: Omit<User, 'uid'> = {
      email: userData.email,
      code: userData.code,
      name: userData.name,
      role: userData.role,
      rank: userData.rank,
      unitManager: finalUnitManager,
      agencyName: normalizedAgencyName, // Use normalized agency name
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
    
    // Sync to organizational hierarchy (skip admins)
    if (userData.role !== 'admin') {
      try {
        await saveHierarchyEntry({
          name: userData.name,
          displayName: userData.name,
          rank: userData.rank,
          agencyName: normalizedAgencyName, // Use normalized agency name
          unitManager: finalUnitManager, // Use final unit manager
          code: userData.code,
        });
      } catch (hierarchyError) {
        // Log but don't fail user creation
        console.error('Error syncing new user to hierarchy:', hierarchyError);
      }
    }
    
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
 * Login user with email/username and password
 * Supports both email and code-based login
 */
export async function loginUser(emailOrCode: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    let email = emailOrCode.trim();
    
    // If input doesn't look like an email (no @), treat it as a code
    if (!email.includes('@')) {
      // Look up user by code
      const userByCode = await getUserByCode(email.toUpperCase());
      if (!userByCode) {
        return {
          success: false,
          error: 'No account found with this code. Please check your code or use your email address.',
        };
      }
      // Use the user's email (which might be code-based like "abc123@cma.local")
      email = userByCode.email;
    }
    
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

