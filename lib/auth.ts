import { signInAnonymously, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

/**
 * Sign in anonymously to Firebase Auth
 * This allows users to use the app without email/password
 */
export async function signInAnonymouslyAuth(): Promise<User> {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw new Error(`Failed to sign in: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sign out from Firebase Auth
 */
export async function signOutAuth(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error(`Failed to sign out: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): User | null {
  try {
    return auth.currentUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Subscribe to authentication state changes
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  try {
    return onAuthStateChanged(auth, callback);
  } catch (error) {
    console.error('Error subscribing to auth state:', error);
    // Return a no-op unsubscribe function
    return () => {};
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  try {
    return auth.currentUser !== null;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

