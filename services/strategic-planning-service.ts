import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUnitsUnderSUM, getDirectAdvisorsUnderSUM, getUnitsUnderADD, getDirectAdvisorsUnderADD, getAllSUMsInAgency } from '@/services/organizational-hierarchy-service';

const GOALS_COLLECTION = 'strategic_planning_goals';

export interface StrategicPlanningGoal {
  id?: string;
  userId: string; // User's UID (unique identifier from Firebase Auth)
  userName: string;
  userRank: string; // ADMIN, ADD, SUM, UM, AUM, ADV
  unitManager: string; // Unit Manager name (for advisors) or self (for leaders)
  unitName?: string; // Normalized unit identifier (unitManager + agencyName)
  agencyName: string;
  submittedAt: Date;
  
  // Monthly Goal Targets
  monthlyTargetFYP: number;
  monthlyTargetFYC: number;
  monthlyTargetCases: number;
  
  // Monthly Team Goal Targets (for leaders only)
  monthlyTeamTargetFYP?: number;
  monthlyTeamTargetFYC?: number;
  
  // Quarterly Goals
  q1: {
    baseManpower: number;
    newRecruits: number;
    fyp: number;
    fyc: number;
    cases: number;
  };
  q2: {
    baseManpower: number;
    newRecruits: number;
    fyp: number;
    fyc: number;
    cases: number;
  };
  q3: {
    baseManpower: number;
    newRecruits: number;
    fyp: number;
    fyc: number;
    cases: number;
  };
  q4: {
    baseManpower: number;
    newRecruits: number;
    fyp: number;
    fyc: number;
    cases: number;
  };
  
  // Annual Totals (calculated)
  annualManpower: number; // Base + New Recruits
  annualFYP: number;
  annualFYC: number;
  annualIncome: number;
  avgMonthlyIncome: number;
  
  // Additional data
  persistency: number;
  commissionRate: number;
}

// Save strategic planning goal
// This function will update an existing goal if one exists for the same user and agency,
// otherwise it will create a new one. This prevents duplicate goals.
export async function saveStrategicPlanningGoal(goal: StrategicPlanningGoal): Promise<{ success: boolean; error?: string; isUpdate?: boolean }> {
  try {
    // Check if Firebase db is available by trying to access Firestore-specific properties
    // If db is an empty object (initialization failed), it won't have these properties
    if (!db || typeof db === 'undefined' || !('type' in db) || !('app' in db)) {
      // Check environment variables as fallback to provide better error message
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      
      if (!apiKey || !projectId) {
        return {
          success: false,
          error: 'Firebase is not configured. Please check your .env.local file and ensure NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set. Restart the dev server after updating .env.local.',
        };
      }
      
      return {
        success: false,
        error: 'Firebase Firestore is not initialized. Please check your Firebase configuration and restart the dev server.',
      };
    }
    
    // Check if an existing goal exists for this user and agency
    // Use a consistent document ID format (userId_agencyName) to ensure we always update the same document
    const goalId = `${goal.userId}_${goal.agencyName}`;
    
    // Check if a goal with this ID already exists
    const existingGoalDoc = await getDoc(doc(db, GOALS_COLLECTION, goalId));
    const isUpdate = existingGoalDoc.exists();
    
    // Clean up any duplicate goals for this user/agency (old format with timestamps)
    // This ensures we only have one goal per user/agency combination
    const q = query(
      collection(db, GOALS_COLLECTION),
      where('userId', '==', goal.userId),
      where('agencyName', '==', goal.agencyName)
    );
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    let hasDeletions = false;
    
    querySnapshot.forEach((docSnap) => {
      // Delete all goals except the one we're about to update/create
      if (docSnap.id !== goalId) {
        batch.delete(docSnap.ref);
        hasDeletions = true;
      }
    });
    
    if (hasDeletions) {
      await batch.commit();
      console.log(`[saveStrategicPlanningGoal] Deleted ${querySnapshot.size - (isUpdate ? 1 : 0)} duplicate goal(s) for user ${goal.userId} in agency ${goal.agencyName}`);
    }
    
    // Create normalized unit identifier (unitManager name + agencyName)
    // This helps prevent double counting when aggregating at unit/agency level
    const unitName = goal.unitName || `${goal.unitManager}_${goal.agencyName}`;
    
    const goalData = {
      ...goal,
      id: goalId,
      unitName, // Include normalized unit identifier
      submittedAt: goal.submittedAt || new Date(),
    };
    
    // Add timeout to prevent hanging (15 seconds should be enough for Firestore)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Save operation timed out after 15 seconds. Please check your internet connection and Firebase configuration.')), 15000);
    });
    
    let docRef;
    try {
      // Try to create a doc reference - this will fail if db is not initialized
      docRef = doc(db, GOALS_COLLECTION, goalId);
      
      // Additional check: try to access a property that only exists on a real Firestore instance
      if (!docRef || !docRef.path) {
        throw new Error('Invalid Firestore document reference');
      }
    } catch (dbError) {
      console.error('Error getting Firestore doc reference:', dbError);
      return {
        success: false,
        error: 'Firestore is not available. Please check Firebase configuration and ensure environment variables are set in .env.local. Restart the dev server after updating .env.local.',
      };
    }
    
    // Use setDoc with merge: true to update existing document or create new one
    const savePromise = setDoc(docRef, goalData, { merge: true });
    
    await Promise.race([savePromise, timeoutPromise]);
    
    return { success: true, isUpdate };
  } catch (error) {
    console.error('Error saving strategic planning goal:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Get all goals for an agency
export async function getAgencyGoals(agencyName: string): Promise<StrategicPlanningGoal[]> {
  try {
    const q = query(
      collection(db, GOALS_COLLECTION),
      where('agencyName', '==', agencyName)
    );
    
    const querySnapshot = await getDocs(q);
    const goals: StrategicPlanningGoal[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      goals.push({
        ...data,
        submittedAt: data.submittedAt?.toDate() || new Date(),
      } as StrategicPlanningGoal);
    });
    
    // Sort by submitted date (newest first)
    return goals.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  } catch (error) {
    console.error('Error loading agency goals:', error);
    return [];
  }
}

// Get goal by user ID (returns most recent goal)
export async function getUserGoal(userId: string, agencyName: string): Promise<StrategicPlanningGoal | null> {
  try {
    const q = query(
      collection(db, GOALS_COLLECTION),
      where('userId', '==', userId),
      where('agencyName', '==', agencyName)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      // Get all goals and sort by submittedAt (most recent first)
      const goals: StrategicPlanningGoal[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        goals.push({
          ...data,
          submittedAt: data.submittedAt?.toDate() || new Date(),
        } as StrategicPlanningGoal);
      });
      
      // Sort by submitted date (newest first) and return the most recent
      goals.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      return goals[0];
    }
    return null;
  } catch (error) {
    console.error('Error loading user goal:', error);
    return null;
  }
}

// Get all goals for a unit (unitManager + agencyName combination)
export async function getUnitGoals(unitManager: string, agencyName: string): Promise<StrategicPlanningGoal[]> {
  try {
    const unitName = `${unitManager}_${agencyName}`;
    const q = query(
      collection(db, GOALS_COLLECTION),
      where('unitName', '==', unitName),
      orderBy('submittedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const goals: StrategicPlanningGoal[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      goals.push({
        ...data,
        submittedAt: data.submittedAt?.toDate() || new Date(),
      } as StrategicPlanningGoal);
    });
    
    return goals;
  } catch (error) {
    console.error('Error loading unit goals:', error);
    return [];
  }
}

// Get the most recent goal for a unit (unitManager + agencyName)
export async function getUnitGoal(unitManager: string, agencyName: string): Promise<StrategicPlanningGoal | null> {
  try {
    const unitGoals = await getUnitGoals(unitManager, agencyName);
    return unitGoals.length > 0 ? unitGoals[0] : null;
  } catch (error) {
    console.error('Error loading unit goal:', error);
    return null;
  }
}

/**
 * Get goals for a SUM (consolidated view: all UMs under SUM + direct advisors)
 */
export async function getGoalsForSUM(sumName: string, agencyName: string): Promise<StrategicPlanningGoal[]> {
  try {
    const allGoals: StrategicPlanningGoal[] = [];
    
    // 1. Get all UMs under this SUM
    const umNames = await getUnitsUnderSUM(sumName, agencyName);
    
    // 2. Get goals for each UM's unit
    for (const umName of umNames) {
      const unitGoals = await getUnitGoals(umName, agencyName);
      allGoals.push(...unitGoals);
    }
    
    // 3. Get goals from direct advisors under SUM
    const directAdvisors = await getDirectAdvisorsUnderSUM(sumName, agencyName);
    for (const advisor of directAdvisors) {
      // Query goals where unitName matches SUM's unit name format
      const unitName = `${sumName}_${agencyName}`;
      const q = query(
        collection(db, GOALS_COLLECTION),
        where('unitName', '==', unitName),
        where('userName', '==', advisor.name)
      );
      
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allGoals.push({
          ...data,
          submittedAt: data.submittedAt?.toDate() || new Date(),
        } as StrategicPlanningGoal);
      });
    }
    
    // Remove duplicates based on goal ID and sort by submitted date
    const uniqueGoalsMap = new Map<string, StrategicPlanningGoal>();
    allGoals.forEach(goal => {
      const key = goal.id || `${goal.userId}_${goal.agencyName}_${goal.submittedAt.getTime()}`;
      if (!uniqueGoalsMap.has(key)) {
        uniqueGoalsMap.set(key, goal);
      }
    });
    
    const uniqueGoals = Array.from(uniqueGoalsMap.values());
    return uniqueGoals.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  } catch (error) {
    console.error('Error getting goals for SUM:', error);
    return [];
  }
}

export async function getGoalsForADD(addName: string, agencyName: string): Promise<StrategicPlanningGoal[]> {
  try {
    const allGoals: StrategicPlanningGoal[] = [];
    
    // 1. Get all SUMs in the agency (all SUMs report to the ADD)
    const allSUMs = await getAllSUMsInAgency(agencyName);
    for (const sumEntry of allSUMs) {
      const sumGoals = await getGoalsForSUM(sumEntry.name, agencyName);
      allGoals.push(...sumGoals);
    }
    
    // 2. Get goals from direct UMs under ADD (UMs that directly report to ADD)
    const directUMs = await getUnitsUnderADD(addName, agencyName);
    for (const umName of directUMs) {
      const unitGoals = await getUnitGoals(umName, agencyName);
      allGoals.push(...unitGoals);
    }
    
    // 3. Get goals from direct advisors under ADD
    const directAdvisors = await getDirectAdvisorsUnderADD(addName, agencyName);
    for (const advisor of directAdvisors) {
      // Query goals where unitName matches ADD's unit name format
      const unitName = `${addName}_${agencyName}`;
      const q = query(
        collection(db, GOALS_COLLECTION),
        where('unitName', '==', unitName),
        where('userName', '==', advisor.name)
      );
      
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allGoals.push({
          ...data,
          submittedAt: data.submittedAt?.toDate() || new Date(),
        } as StrategicPlanningGoal);
      });
    }
    
    // Remove duplicates based on goal ID and sort by submitted date
    const uniqueGoalsMap = new Map<string, StrategicPlanningGoal>();
    allGoals.forEach(goal => {
      const key = goal.id || `${goal.userId}_${goal.agencyName}_${goal.submittedAt.getTime()}`;
      if (!uniqueGoalsMap.has(key)) {
        uniqueGoalsMap.set(key, goal);
      }
    });
    
    const uniqueGoals = Array.from(uniqueGoalsMap.values());
    return uniqueGoals.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  } catch (error) {
    console.error('Error getting goals for ADD:', error);
    return [];
  }
}

// Check if a unit already has a submission for the current period
// This helps prevent double counting when aggregating at unit/agency level
export async function hasUnitSubmission(unitManager: string, agencyName: string, periodDays: number = 30): Promise<boolean> {
  try {
    const unitGoals = await getUnitGoals(unitManager, agencyName);
    if (unitGoals.length === 0) return false;
    
    // Check if there's a submission within the specified period (default 30 days)
    const now = new Date();
    const periodStart = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    
    return unitGoals.some(goal => {
      const submittedAt = goal.submittedAt instanceof Date ? goal.submittedAt : new Date(goal.submittedAt);
      return submittedAt >= periodStart;
    });
  } catch (error) {
    console.error('Error checking unit submission:', error);
    return false;
  }
}

// Get all goals (for admin/reporting)
export async function getAllGoals(): Promise<StrategicPlanningGoal[]> {
  try {
    const querySnapshot = await getDocs(collection(db, GOALS_COLLECTION));
    const goals: StrategicPlanningGoal[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      goals.push({
        ...data,
        submittedAt: data.submittedAt?.toDate() || new Date(),
      } as StrategicPlanningGoal);
    });
    
    return goals.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  } catch (error) {
    console.error('Error loading all goals:', error);
    return [];
  }
}

// Delete all strategic planning goals for a specific user by email (Admin only)
export async function deleteUserGoalsByEmail(email: string): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    if (!db) {
      return { success: false, deleted: 0, error: 'Firestore is not initialized' };
    }

    // First, find the user by email to get their UID
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email.toLowerCase().trim())
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      return { success: false, deleted: 0, error: `No user found with email: ${email}` };
    }

    // Get the user's UID (should only be one user with this email)
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;

    // Now find all goals for this user
    const goalsQuery = query(
      collection(db, GOALS_COLLECTION),
      where('userId', '==', userId)
    );
    
    const goalsSnapshot = await getDocs(goalsQuery);
    
    if (goalsSnapshot.empty) {
      return { success: true, deleted: 0 };
    }

    // Delete in batches (Firestore batch limit is 500)
    const batchSize = 500;
    let deleted = 0;
    const docs = goalsSnapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + batchSize);
      
      batchDocs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      deleted += batchDocs.length;
    }

    return { success: true, deleted };
  } catch (error) {
    console.error('Error deleting user goals:', error);
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Failed to delete user goals',
    };
  }
}

// Delete all strategic planning goals (Admin only - use with caution!)
export async function deleteAllGoals(): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    if (!db) {
      return { success: false, deleted: 0, error: 'Firestore is not initialized' };
    }

    // Get all goals
    const querySnapshot = await getDocs(collection(db, GOALS_COLLECTION));
    
    if (querySnapshot.empty) {
      return { success: true, deleted: 0 };
    }

    // Delete in batches (Firestore batch limit is 500)
    const batchSize = 500;
    let deleted = 0;
    const docs = querySnapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + batchSize);
      
      batchDocs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      deleted += batchDocs.length;
    }

    return { success: true, deleted };
  } catch (error) {
    console.error('Error deleting all goals:', error);
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Failed to delete goals',
    };
  }
}

// Delete all strategic planning goals for a specific agency
export async function deleteAgencyGoals(agencyName: string): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    if (!db) {
      return { success: false, deleted: 0, error: 'Firestore is not initialized' };
    }

    const goalsQuery = query(
      collection(db, GOALS_COLLECTION),
      where('agencyName', '==', agencyName)
    );
    
    const goalsSnapshot = await getDocs(goalsQuery);
    
    if (goalsSnapshot.empty) {
      return { success: true, deleted: 0 };
    }

    // Delete in batches (Firestore batch limit is 500)
    const batchSize = 500;
    let deleted = 0;
    const docs = goalsSnapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + batchSize);
      
      batchDocs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      deleted += batchDocs.length;
    }

    return { success: true, deleted };
  } catch (error) {
    console.error('Error deleting agency goals:', error);
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Failed to delete agency goals',
    };
  }
}

// Sync all goals' agency names from Users collection
export async function syncAllGoalsAgencyFromUsers(): Promise<{ success: boolean; updated: number; skipped: number; errors: string[] }> {
  try {
    if (!db) {
      return { success: false, updated: 0, skipped: 0, errors: ['Firestore is not initialized'] };
    }

    // Use dynamic imports to avoid circular dependencies
    const userService = await import('@/lib/user-service');
    const agencyNormalizer = await import('@/lib/utils/agency-name-normalizer');
    const nameCanonicalizer = await import('@/lib/utils/name-canonicalizer');

    const allUsers = await userService.getAllUsers();
    const allGoals = await getAllGoals();

    // Create user map for quick lookup
    const userMap = new Map<string, { uid: string; agencyName: string; name: string }>();
    allUsers.forEach(u => {
      if (u.agencyName) {
        userMap.set(u.uid, { uid: u.uid, agencyName: u.agencyName, name: u.name });
      }
    });

    const batch = writeBatch(db);
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const goal of allGoals) {
      if (!goal.id) {
        skipped++;
        continue;
      }

      // Find matching user
      let matchingUser = userMap.get(goal.userId);
      
      // If not found by UID, try flexible name matching
      if (!matchingUser) {
        const foundUser = allUsers.find(u => 
          nameCanonicalizer.areNamesLikelySamePerson(u.name, goal.userName) && u.agencyName
        );
        if (foundUser) {
          matchingUser = { uid: foundUser.uid, agencyName: foundUser.agencyName, name: foundUser.name };
        }
      }

      if (!matchingUser) {
        skipped++;
        continue;
      }

      const canonicalAgency = agencyNormalizer.getCanonicalAgencyName(matchingUser.agencyName);
      const goalCanonicalAgency = agencyNormalizer.getCanonicalAgencyName(goal.agencyName);

      if (canonicalAgency !== goalCanonicalAgency) {
        const goalRef = doc(db, GOALS_COLLECTION, goal.id);
        batch.update(goalRef, {
          agencyName: canonicalAgency,
        });
        updated++;
      }
    }

    if (updated > 0) {
      await batch.commit();
    }

    return { success: true, updated, skipped, errors };
  } catch (error) {
    console.error('Error syncing goals agency from users:', error);
    return {
      success: false,
      updated: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : 'Failed to sync goals agency from users'],
    };
  }
}

// Update goals agency for specific users
export async function updateGoalsAgencyForUsers(userAgencyMap: Map<string, string>): Promise<{ success: boolean; updated: number; errors: string[] }> {
  try {
    if (!db) {
      return { success: false, updated: 0, errors: ['Firestore is not initialized'] };
    }

    const { getCanonicalAgencyName } = await import('@/lib/utils/agency-name-normalizer');
    const allGoals = await getAllGoals();

    const batch = writeBatch(db);
    let updated = 0;
    const errors: string[] = [];

    for (const goal of allGoals) {
      if (!goal.id) continue;

      const newAgency = userAgencyMap.get(goal.userId);
      if (!newAgency) continue;

      const canonicalAgency = getCanonicalAgencyName(newAgency);
      const goalCanonicalAgency = getCanonicalAgencyName(goal.agencyName);

      if (canonicalAgency !== goalCanonicalAgency) {
        const goalRef = doc(db, GOALS_COLLECTION, goal.id);
        batch.update(goalRef, {
          agencyName: canonicalAgency,
        });
        updated++;
      }
    }

    if (updated > 0) {
      await batch.commit();
    }

    return { success: true, updated, errors };
  } catch (error) {
    console.error('Error updating goals agency for users:', error);
    return {
      success: false,
      updated: 0,
      errors: [error instanceof Error ? error.message : 'Failed to update goals agency for users'],
    };
  }
}

// Update goals agency for a single user
export async function updateGoalsAgencyByUser(userId: string, newAgency: string): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    if (!db) {
      return { success: false, updated: 0, error: 'Firestore is not initialized' };
    }

    const { getCanonicalAgencyName } = await import('@/lib/utils/agency-name-normalizer');
    const canonicalAgency = getCanonicalAgencyName(newAgency);

    const goalsQuery = query(
      collection(db, GOALS_COLLECTION),
      where('userId', '==', userId)
    );
    
    const goalsSnapshot = await getDocs(goalsQuery);
    
    if (goalsSnapshot.empty) {
      return { success: true, updated: 0 };
    }

    const batch = writeBatch(db);
    let updated = 0;

    goalsSnapshot.forEach((docSnap) => {
      const goalData = docSnap.data();
      const goalCanonicalAgency = getCanonicalAgencyName(goalData.agencyName);

      if (canonicalAgency !== goalCanonicalAgency) {
        batch.update(docSnap.ref, {
          agencyName: canonicalAgency,
        });
        updated++;
      }
    });

    if (updated > 0) {
      await batch.commit();
    }

    return { success: true, updated };
  } catch (error) {
    console.error('Error updating goals agency by user:', error);
    return {
      success: false,
      updated: 0,
      error: error instanceof Error ? error.message : 'Failed to update goals agency by user',
    };
  }
}

