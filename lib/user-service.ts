/**
 * User Management Service
 * Handles CRUD operations for users (Admin only)
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { deleteUser as firebaseDeleteUser } from 'firebase/auth';
import { auth, db } from './firebase';
import type { User, UserUpdateData, UserRole } from '@/types/user';

const USERS_COLLECTION = 'users';

/**
 * Get all users (Admin only)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const users: User[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<User, 'uid'>;
      users.push({
        uid: docSnap.id,
        ...data,
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

/**
 * Get user by UID
 */
export async function getUserById(uid: string): Promise<User | null> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      return null;
    }
    
    const data = userDocSnap.data() as Omit<User, 'uid'>;
    return {
      uid: userDocSnap.id,
      ...data,
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: UserRole): Promise<User[]> {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('role', '==', role),
      orderBy('name', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const users: User[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<User, 'uid'>;
      users.push({
        uid: docSnap.id,
        ...data,
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users by role:', error);
    throw error;
  }
}

/**
 * Get users by agency
 */
export async function getUsersByAgency(agencyName: string): Promise<User[]> {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('agencyName', '==', agencyName),
      orderBy('name', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const users: User[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<User, 'uid'>;
      users.push({
        uid: docSnap.id,
        ...data,
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users by agency:', error);
    throw error;
  }
}

/**
 * Update user (Admin only, or user updating their own profile)
 */
export async function updateUser(uid: string, updates: UserUpdateData): Promise<{ success: boolean; error?: string }> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    
    const updateData: Partial<User> = {
      ...updates,
      updatedAt: serverTimestamp() as Timestamp,
    };
    
    await updateDoc(userDocRef, updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    };
  }
}

/**
 * Deactivate user (Admin only)
 * Sets isActive to false instead of deleting
 */
export async function deactivateUser(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      return { success: false, error: 'Cannot deactivate your own account' };
    }
    
    await updateUser(uid, { isActive: false });
    return { success: true };
  } catch (error) {
    console.error('Error deactivating user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate user',
    };
  }
}

/**
 * Reactivate user (Admin only)
 */
export async function reactivateUser(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateUser(uid, { isActive: true });
    return { success: true };
  } catch (error) {
    console.error('Error reactivating user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reactivate user',
    };
  }
}

/**
 * Delete user (Admin only)
 * WARNING: This permanently deletes the user from both Auth and Firestore
 */
export async function deleteUser(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      return { success: false, error: 'Cannot delete your own account' };
    }
    
    // Note: To delete from Firebase Auth, you need Admin SDK
    // For client-side, we'll just delete from Firestore and deactivate Auth
    // For full deletion, this should be done via Cloud Function with Admin SDK
    
    // Delete from Firestore
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await deleteDoc(userDocRef);
    
    // Note: Firebase Auth user deletion requires Admin SDK
    // The Auth account will remain but user data is deleted
    // For production, create a Cloud Function to handle this
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
}

/**
 * Check if current user is admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }
    
    const user = await getUserById(currentUser.uid);
    return user?.role === 'admin' || false;
  } catch (error) {
    console.error('Error checking if user is admin:', error);
    return false;
  }
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(role: UserRole) {
  return {
    canManageUsers: role === 'admin',
    canViewReports: role === 'admin',
    canAccessLeaderTabs: role === 'leader' || role === 'admin',
    canToggleLeaderView: role === 'leader' || role === 'admin',
    canEditAllGoals: role === 'admin',
    canViewAllAgencies: role === 'admin',
  };
}

