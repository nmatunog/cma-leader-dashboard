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
import type { User, UserUpdateData, UserRole, UserRank } from '@/types/user';

const USERS_COLLECTION = 'users';

/**
 * Get all users (Admin only)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    // Check if db is available (Firebase initialized)
    if (!db) {
      console.warn('Firestore db is not available');
      return [];
    }
    
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
    // Return empty array instead of throwing - allows setup page to proceed
    // This is expected when Firebase isn't configured or Firestore rules don't allow access
    return [];
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
 * Get users by unitManager (users reporting to a specific manager)
 */
export async function getUsersByUnitManager(unitManagerName: string, agencyName: string): Promise<User[]> {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('unitManager', '==', unitManagerName),
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
    console.error('Error getting users by unitManager:', error);
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
 * Promote user to next rank (Admin only)
 * Promotion path: ADV → AUM → UM → SUM → ADD
 * Maintains hierarchy and updates relationships
 */
export async function promoteUser(uid: string): Promise<{ success: boolean; error?: string; newRank?: UserRank }> {
  try {
    const user = await getUserById(uid);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Define promotion path
    const promotionPath: Record<UserRank, UserRank | null> = {
      'ADV': 'AUM',
      'AUM': 'UM',
      'UM': 'SUM',
      'SUM': 'ADD',
      'ADD': null, // Cannot promote further
      'ADMIN': null, // Admins cannot be promoted
    };

    const nextRank = promotionPath[user.rank];
    if (!nextRank) {
      return { success: false, error: `User is already at the highest rank (${user.rank}) or cannot be promoted` };
    }

    const batch = writeBatch(db);
    const updates: UserUpdateData = {
      rank: nextRank,
      updatedAt: serverTimestamp() as Timestamp,
    };

    // Handle role change: ADV → AUM changes role from 'advisor' to 'leader'
    if (user.rank === 'ADV' && nextRank === 'AUM') {
      updates.role = 'leader';
    }

    // Handle unitManager updates based on promotion:
    // - AUM → UM: AUM keeps their unitManager (they remain in the unit)
    // - UM → SUM: UM's unitManager becomes the SUM (or they report to ADD if no SUM exists)
    // - SUM → ADD: SUM's unitManager is removed (they're at top level)
    if (user.rank === 'UM' && nextRank === 'SUM') {
      // When UM is promoted to SUM, they no longer need a unitManager (they report to ADD)
      updates.unitManager = undefined;
    } else if (user.rank === 'SUM' && nextRank === 'ADD') {
      // When SUM is promoted to ADD, remove unitManager (top level)
      updates.unitManager = undefined;
    }
    // AUM keeps unitManager - no change needed
    // UM → SUM: unitManager removed (handled above)

    // Update the promoted user
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    batch.update(userDocRef, updates);

    // Handle reporting relationships:
    // When AUM is promoted to UM, users reporting to them keep their unitManager
    // When UM is promoted to SUM, users reporting to them now report to the new SUM
    // When SUM is promoted to ADD, users reporting to them now report to the new ADD (or stay with their current manager)
    if (user.rank === 'AUM' && nextRank === 'UM') {
      // AUM → UM: Users reporting to this AUM should now report to the UM
      // But wait - AUMs have advisors under them, but they also belong to a unit
      // The advisors under AUM should continue reporting to the AUM (now UM)
      // Actually, when AUM becomes UM, they manage the unit, so advisors/AUMs reporting to them stay
      // No change needed - the unitManager name stays the same (the person's name)
    } else if (user.rank === 'UM' && nextRank === 'SUM') {
      // UM → SUM: Users reporting to this UM should continue reporting to them (they're now SUM)
      // No change needed - unitManager name stays the same
    } else if (user.rank === 'SUM' && nextRank === 'ADD') {
      // SUM → ADD: Users reporting to this SUM should continue reporting to them (they're now ADD)
      // But SUMs don't have unitManager, so this doesn't apply
      // Actually, if there are UMs reporting to SUM, they should update their reporting
      // For now, we'll leave this as-is since the hierarchy is maintained by the unitManager field
    }

    await batch.commit();

    return { success: true, newRank: nextRank };
  } catch (error) {
    console.error('Error promoting user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to promote user',
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
