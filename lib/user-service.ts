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
import { isSuperuser } from '@/lib/permissions';
import { saveHierarchyEntry } from '@/services/organizational-hierarchy-service';
import { getCanonicalAgencyName } from '@/lib/utils/agency-name-normalizer';
import { getCanonicalName } from '@/lib/utils/name-canonicalizer';

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
 * Get user by code
 */
export async function getUserByCode(code: string): Promise<User | null> {
  try {
    if (!code || !code.trim()) {
      return null;
    }
    
    const q = query(
      collection(db, USERS_COLLECTION),
      where('code', '==', code.trim().toUpperCase())
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Should only be one user with this code
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data() as Omit<User, 'uid'>;
    return {
      uid: docSnap.id,
      ...data,
    };
  } catch (error) {
    console.error('Error getting user by code:', error);
    return null;
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
 * Sync user to organizational hierarchy
 * Automatically updates or creates hierarchy entry when user is created/updated/promoted
 */
async function syncUserToHierarchy(user: User): Promise<void> {
  try {
    // Skip admins and superusers
    if (user.role === 'admin' || user.role === 'superuser') {
      return;
    }

    // Auto-assign unitManager for leaders (except AUMs):
    // - UMs, SUMs, and ADDs should have themselves as unitManager (in all caps)
    // - AUMs keep their actual unitManager (normalized to all caps)
    let finalUnitManager = user.unitManager;
    if (user.role === 'leader' && user.rank !== 'AUM') {
      if (user.rank === 'UM' || user.rank === 'SUM' || user.rank === 'ADD') {
        // Use canonical name (all caps) for UM/SUM/ADD names
        finalUnitManager = getCanonicalName(user.name);
      }
    } else if (user.unitManager) {
      // For advisors and AUMs, normalize their unitManager to all caps
      finalUnitManager = getCanonicalName(user.unitManager);
    }

    // Normalize agency name before syncing to hierarchy
    const normalizedAgencyName = getCanonicalAgencyName(user.agencyName);

    // Sync to hierarchy
    await saveHierarchyEntry({
      name: user.name,
      displayName: user.name,
      rank: user.rank,
      agencyName: normalizedAgencyName, // Use normalized agency name
      unitManager: finalUnitManager,
      code: user.code,
    });
  } catch (error) {
    // Log error but don't fail the user operation
    console.error('Error syncing user to hierarchy:', error);
  }
}

/**
 * Update user (Admin only, or user updating their own profile)
 * Note: Only superusers can change roles to admin or superuser
 */
export async function updateUser(uid: string, updates: UserUpdateData, updatedBy?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    
    // Get current user data to merge with updates
    const currentUser = await getUserById(uid);
    if (!currentUser) {
      return { success: false, error: 'User not found' };
    }
    
    // Check if trying to change role to admin or superuser - only superusers can do this
    if (updates.role === 'admin' || updates.role === 'superuser') {
      if (updatedBy) {
        const updater = await getUserById(updatedBy);
        if (!updater || !isSuperuser(updater)) {
          return {
            success: false,
            error: 'Only Super Users can assign Admin or Super User roles',
          };
        }
      } else {
        // If no updatedBy provided, check if current user is superuser
        // This is a fallback - ideally updatedBy should always be provided
        return {
          success: false,
          error: 'Only Super Users can assign Admin or Super User roles',
        };
      }
    }
    
    // Auto-assign unitManager for leaders (except AUMs):
    // - UMs, SUMs, and ADDs ALWAYS have themselves as unitManager (in all caps)
    // - AUMs keep their actual unitManager (normalized to all caps)
    if (updates.rank) {
      const newRank = updates.rank;
      const newRole = updates.role || currentUser.role;
      
      // If becoming a leader with rank UM, SUM, or ADD, ALWAYS set unitManager to self (in all caps)
      if (newRole === 'leader' && (newRank === 'UM' || newRank === 'SUM' || newRank === 'ADD')) {
        updates.unitManager = getCanonicalName(currentUser.name);
      }
      // If becoming AUM, normalize unitManager to all caps if provided
      if (updates.unitManager && newRank === 'AUM') {
        updates.unitManager = getCanonicalName(updates.unitManager);
      }
      // If becoming AUM, keep existing unitManager or don't override if provided
      // (AUMs should have their actual unit manager, not themselves)
    } else if (updates.role === 'leader' && currentUser.rank !== 'AUM') {
      // If changing role to leader (but rank not specified), check current rank
      if (currentUser.rank === 'UM' || currentUser.rank === 'SUM' || currentUser.rank === 'ADD') {
        // UMs, SUMs, and ADDs ALWAYS have themselves as unitManager
        updates.unitManager = getCanonicalName(currentUser.name);
      }
    } else if (updates.unitManager) {
      // Normalize any unitManager update to all caps (for advisors and AUMs)
      updates.unitManager = getCanonicalName(updates.unitManager);
    }
    
    // Normalize agency name if it's being updated
    const normalizedUpdates = { ...updates };
    if (updates.agencyName) {
      normalizedUpdates.agencyName = getCanonicalAgencyName(updates.agencyName);
    }
    
    const updateData: Partial<User> = {
      ...normalizedUpdates,
      updatedAt: serverTimestamp() as Timestamp,
    };
    
    await updateDoc(userDocRef, updateData);
    
    // Sync to hierarchy after update (use normalized agency name)
    const updatedUser: User = {
      ...currentUser,
      ...normalizedUpdates,
      updatedAt: new Date(),
    };
    await syncUserToHierarchy(updatedUser);
    
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
    // - AUM → UM: UM should have themselves as unitManager (they manage their own unit)
    // - UM → SUM: SUM should have themselves as unitManager (they manage their own unit)
    // - SUM → ADD: ADD should have themselves as unitManager (they manage their own unit)
    // All leaders (except AUMs) default to themselves as unitManager
    if (nextRank === 'UM' || nextRank === 'SUM' || nextRank === 'ADD') {
      // Leaders manage their own units - use canonical name (all caps)
      updates.unitManager = getCanonicalName(user.name);
    }
    // AUM keeps their actual unitManager - no change needed

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

    // Sync to hierarchy after promotion
    const promotedUser: User = {
      ...user,
      rank: nextRank,
      role: updates.role || user.role,
      unitManager: updates.unitManager !== undefined ? updates.unitManager : user.unitManager,
      updatedAt: new Date(),
    };
    await syncUserToHierarchy(promotedUser);

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
    canManageUsers: role === 'admin' || role === 'superuser',
    canViewReports: role === 'admin' || role === 'superuser',
    canAccessLeaderTabs: role === 'leader' || role === 'admin' || role === 'superuser',
    canToggleLeaderView: role === 'leader' || role === 'admin' || role === 'superuser',
    canEditAllGoals: role === 'admin' || role === 'superuser',
    canViewAllAgencies: role === 'admin' || role === 'superuser',
  };
}

/**
 * Get all SUMs in an agency from Users collection
 * Uses Users collection as source of truth for hierarchy
 */
export async function getSUMsInAgencyFromUsers(agencyName: string): Promise<User[]> {
  try {
    if (!db) {
      console.warn('Firestore db is not available');
      return [];
    }

    const canonicalAgencyName = getCanonicalAgencyName(agencyName);
    
    // Get all users with rank SUM in this agency
    // Note: Removed orderBy to avoid requiring composite index - will sort in memory
    const q = query(
      collection(db, USERS_COLLECTION),
      where('rank', '==', 'SUM'),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const sums: User[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<User, 'uid'>;
      const user: User = {
        uid: docSnap.id,
        ...data,
      };
      
      // Filter by agency name (case-insensitive comparison)
      const userAgencyName = getCanonicalAgencyName(user.agencyName);
      if (userAgencyName === canonicalAgencyName) {
        sums.push(user);
      }
    });
    
    // Sort in memory to avoid requiring composite index
    return sums.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting SUMs in agency from Users:', error);
    return [];
  }
}

/**
 * Get all UMs (Unit Managers) under a specific SUM from Users collection
 * Uses Users collection as source of truth for hierarchy
 */
export async function getUMsUnderSUMFromUsers(sumName: string, agencyName: string): Promise<string[]> {
  try {
    if (!db) {
      console.warn('Firestore db is not available');
      return [];
    }

    const canonicalAgencyName = getCanonicalAgencyName(agencyName);
    const canonicalSumName = getCanonicalName(sumName);
    
    // Get all users with rank UM in this agency
    // Note: Removed orderBy to avoid requiring composite index - will sort in memory
    const q = query(
      collection(db, USERS_COLLECTION),
      where('rank', '==', 'UM'),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const ums: string[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<User, 'uid'>;
      const user: User = {
        uid: docSnap.id,
        ...data,
      };
      
      // Filter by agency name (case-insensitive comparison)
      const userAgencyName = getCanonicalAgencyName(user.agencyName);
      if (userAgencyName === canonicalAgencyName) {
        // Check if this UM reports to the specified SUM
        // UMs report to SUMs via unitManager field
        const userUnitManager = getCanonicalName(user.unitManager || '');
        if (userUnitManager === canonicalSumName) {
          ums.push(user.name);
        }
      }
    });
    
    return ums.sort();
  } catch (error) {
    console.error('Error getting UMs under SUM from Users:', error);
    return [];
  }
}

/**
 * Get all UMs (Unit Managers) under a specific ADD from Users collection
 * Uses Users collection as source of truth for hierarchy
 */
export async function getUMsUnderADDFromUsers(addName: string, agencyName: string): Promise<string[]> {
  try {
    if (!db) {
      console.warn('Firestore db is not available');
      return [];
    }

    const canonicalAgencyName = getCanonicalAgencyName(agencyName);
    const canonicalAddName = getCanonicalName(addName);
    
    // Get all users with rank UM in this agency
    // Note: Removed orderBy to avoid requiring composite index - will sort in memory
    const q = query(
      collection(db, USERS_COLLECTION),
      where('rank', '==', 'UM'),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const ums: string[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<User, 'uid'>;
      const user: User = {
        uid: docSnap.id,
        ...data,
      };
      
      // Filter by agency name (case-insensitive comparison)
      const userAgencyName = getCanonicalAgencyName(user.agencyName);
      if (userAgencyName === canonicalAgencyName) {
        // Check if this UM reports to the specified ADD
        // UMs report to ADDs via unitManager field
        const userUnitManager = getCanonicalName(user.unitManager || '');
        if (userUnitManager === canonicalAddName) {
          ums.push(user.name);
        }
      }
    });
    
    return ums.sort();
  } catch (error) {
    console.error('Error getting UMs under ADD from Users:', error);
    return [];
  }
}

/**
 * Get all units (UM names) in an agency from Users collection
 * Uses Users collection as source of truth for hierarchy
 */
export async function getUnitsByAgencyFromUsers(agencyName: string): Promise<string[]> {
  try {
    if (!db) {
      console.warn('Firestore db is not available');
      return [];
    }

    const canonicalAgencyName = getCanonicalAgencyName(agencyName);
    
    // Get all users with rank UM in this agency
    // Note: Removed orderBy to avoid requiring composite index - will sort in memory
    const q = query(
      collection(db, USERS_COLLECTION),
      where('rank', '==', 'UM'),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const units = new Set<string>();
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<User, 'uid'>;
      const user: User = {
        uid: docSnap.id,
        ...data,
      };
      
      // Filter by agency name (case-insensitive comparison)
      const userAgencyName = getCanonicalAgencyName(user.agencyName);
      if (userAgencyName === canonicalAgencyName) {
        units.add(user.name);
      }
    });
    
    // Also include SUMs and ADDs as units (they manage their own units)
    // Note: This query only has one where clause, so orderBy is fine
    const leadersQ = query(
      collection(db, USERS_COLLECTION),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    
    const leadersSnapshot = await getDocs(leadersQ);
    leadersSnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<User, 'uid'>;
      const user: User = {
        uid: docSnap.id,
        ...data,
      };
      
      const userAgencyName = getCanonicalAgencyName(user.agencyName);
      if (userAgencyName === canonicalAgencyName && (user.rank === 'SUM' || user.rank === 'ADD')) {
        units.add(user.name);
      }
    });
    
    return Array.from(units).sort();
  } catch (error) {
    console.error('Error getting units by agency from Users:', error);
    return [];
  }
}
