import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUnitsUnderSUM, getDirectAdvisorsUnderSUM, getUnitsUnderADD, getDirectAdvisorsUnderADD, getAllSUMsInAgency } from '@/services/organizational-hierarchy-service';
import { normalizeAgencyName, areAgencyNamesEqual, getAgencyNameVariations, getCanonicalAgencyName } from '@/lib/utils/agency-name-normalizer';

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
export async function saveStrategicPlanningGoal(goal: StrategicPlanningGoal): Promise<{ success: boolean; error?: string }> {
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
    
    // Normalize agency name to canonical form for consistency
    const canonicalAgencyName = getCanonicalAgencyName(goal.agencyName);
    
    // Create a unique ID based on user and agency (use normalized name)
    const goalId = `${goal.userId}_${canonicalAgencyName}_${Date.now()}`;
    
    // Create normalized unit identifier (unitManager name + agencyName)
    // This helps prevent double counting when aggregating at unit/agency level
    const unitName = goal.unitName || `${goal.unitManager}_${canonicalAgencyName}`;
    
    const goalData = {
      ...goal,
      id: goalId,
      agencyName: canonicalAgencyName, // Use canonical agency name
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
    
    const savePromise = setDoc(docRef, goalData, { merge: true });
    
    await Promise.race([savePromise, timeoutPromise]);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving strategic planning goal:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Get all goals for an agency (handles case-insensitive matching)
export async function getAgencyGoals(agencyName: string): Promise<StrategicPlanningGoal[]> {
  try {
    console.log(`[getAgencyGoals] Querying goals for agency: "${agencyName}"`);
    
    if (!db) {
      console.error('[getAgencyGoals] Firestore db is not initialized');
      return [];
    }
    
    // Normalize the input agency name
    const normalizedAgencyName = normalizeAgencyName(agencyName);
    const canonicalAgencyName = getCanonicalAgencyName(agencyName);
    
    // Get all possible variations to query (since Firestore queries are case-sensitive)
    const variations = getAgencyNameVariations(agencyName);
    variations.push(canonicalAgencyName, normalizedAgencyName);
    
    console.log(`[getAgencyGoals] Querying with variations:`, variations);
    
    // Query all variations and combine results
    const allGoals: StrategicPlanningGoal[] = [];
    const seenGoalIds = new Set<string>();
    
    for (const variation of [...new Set(variations)]) { // Remove duplicates
      try {
        const q = query(
          collection(db, GOALS_COLLECTION),
          where('agencyName', '==', variation)
        );
        
        const querySnapshot = await getDocs(q);
        console.log(`[getAgencyGoals] Variation "${variation}" returned ${querySnapshot.size} documents`);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const goalId = doc.id || data.id;
          
          // Skip duplicates
          if (goalId && seenGoalIds.has(goalId)) {
            return;
          }
          if (goalId) {
            seenGoalIds.add(goalId);
          }
          
          // Only include if agency name matches (normalized comparison)
          const goalAgencyName = data.agencyName;
          if (areAgencyNamesEqual(goalAgencyName || '', agencyName)) {
            console.log(`[getAgencyGoals] Found goal for user: ${data.userName}, agency: "${goalAgencyName}"`);
            allGoals.push({
              ...data,
              submittedAt: data.submittedAt?.toDate() || new Date(),
            } as StrategicPlanningGoal);
          }
        });
      } catch (queryError) {
        console.warn(`[getAgencyGoals] Error querying variation "${variation}":`, queryError);
      }
    }
    
    // Sort by submitted date (newest first)
    const sortedGoals = allGoals.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    console.log(`[getAgencyGoals] Returning ${sortedGoals.length} unique goals for agency "${agencyName}"`);
    return sortedGoals;
  } catch (error) {
    console.error('[getAgencyGoals] Error loading agency goals:', error);
    if (error instanceof Error) {
      console.error('[getAgencyGoals] Error message:', error.message);
      console.error('[getAgencyGoals] Error stack:', error.stack);
    }
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
    const normalizedAgencyName = normalizeAgencyName(agencyName);
    
    // 1. Get all UMs under this SUM
    const umNames = await getUnitsUnderSUM(sumName, normalizedAgencyName);
    console.log(`[getGoalsForSUM] SUM "${sumName}" has ${umNames.length} UMs:`, umNames);
    
    // Also get all UM goals in the agency first, then filter by matching unitManager or userName
    const variations = getAgencyNameVariations(normalizedAgencyName);
    const normalizedSumName = sumName.toUpperCase().trim();
    const normalizedUMNames = umNames.map(name => name.toUpperCase().trim());
    
    // 2. Get goals for each UM
    // Strategy: Query all UM goals in the agency, then filter by:
    // - unitManager matches SUM name (for UMs who have SUM as unitManager)
    // - OR userName matches one of the UM names under the SUM
    for (const agencyVar of variations) {
      try {
        // Query all UM goals in this agency
        const q = query(
          collection(db, GOALS_COLLECTION),
          where('agencyName', '==', agencyVar),
          where('userRank', '==', 'UM')
        );
        
        const querySnapshot = await getDocs(q);
        console.log(`[getGoalsForSUM] Query for all UM goals in agency "${agencyVar}": Found ${querySnapshot.size} goals`);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Only include if agency name matches (normalized comparison)
          if (!areAgencyNamesEqual(data.agencyName || '', normalizedAgencyName)) {
            return;
          }
          
          const goalUserName = (data.userName || '').toUpperCase().trim();
          const goalUnitManager = (data.unitManager || '').toUpperCase().trim();
          
          // Include if:
          // 1. Goal's unitManager matches the SUM name (UM reports to this SUM)
          // 2. OR goal's userName matches one of the UMs under this SUM
          const matchesByUnitManager = goalUnitManager === normalizedSumName;
          const matchesByUserName = normalizedUMNames.includes(goalUserName);
          
          if (matchesByUnitManager || matchesByUserName) {
            console.log(`[getGoalsForSUM] Including goal for UM "${data.userName}": unitManager="${data.unitManager}" matches="${matchesByUnitManager}", userName matches="${matchesByUserName}"`);
            allGoals.push({
              ...data,
              submittedAt: data.submittedAt?.toDate() || new Date(),
            } as StrategicPlanningGoal);
          } else {
            console.log(`[getGoalsForSUM] Excluding goal for UM "${data.userName}": unitManager="${data.unitManager}" (normalized: "${goalUnitManager}") doesn't match SUM "${sumName}" (normalized: "${normalizedSumName}"), and userName "${data.userName}" (normalized: "${goalUserName}") not in UMs list:`, normalizedUMNames);
          }
        });
      } catch (queryError) {
        console.error(`[getGoalsForSUM] Error querying UM goals in agency "${agencyVar}":`, queryError);
      }
    }
    
    // 3. Get goals from direct advisors under SUM
    const directAdvisors = await getDirectAdvisorsUnderSUM(sumName, normalizedAgencyName);
    console.log(`[getGoalsForSUM] SUM "${sumName}" has ${directAdvisors.length} direct advisors`);
    for (const advisor of directAdvisors) {
      // Query goals where userName matches the advisor
      const variations = getAgencyNameVariations(normalizedAgencyName);
      for (const agencyVar of variations) {
        const q = query(
          collection(db, GOALS_COLLECTION),
          where('agencyName', '==', agencyVar),
          where('userName', '==', advisor.name)
        );
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Only include if agency name matches (normalized comparison)
          if (areAgencyNamesEqual(data.agencyName || '', normalizedAgencyName)) {
            allGoals.push({
              ...data,
              submittedAt: data.submittedAt?.toDate() || new Date(),
            } as StrategicPlanningGoal);
          }
        });
      }
    }
    
    // 4. Also get the SUM's own goal
    const sumVariations = getAgencyNameVariations(normalizedAgencyName);
    for (const agencyVar of sumVariations) {
      const q = query(
        collection(db, GOALS_COLLECTION),
        where('agencyName', '==', agencyVar),
        where('userName', '==', sumName),
        where('userRank', '==', 'SUM')
      );
      
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (areAgencyNamesEqual(data.agencyName || '', normalizedAgencyName)) {
          allGoals.push({
            ...data,
            submittedAt: data.submittedAt?.toDate() || new Date(),
          } as StrategicPlanningGoal);
        }
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
    console.log(`[getGoalsForSUM] Returning ${uniqueGoals.length} unique goals for SUM "${sumName}"`);
    return uniqueGoals.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  } catch (error) {
    console.error('Error getting goals for SUM:', error);
    return [];
  }
}

/**
 * Get goals for an ADD (consolidated view: all SUMs under ADD + direct UMs + direct advisors)
 */
export async function getGoalsForADD(addName: string, agencyName: string): Promise<StrategicPlanningGoal[]> {
  try {
    console.log(`[getGoalsForADD] Starting for ADD: ${addName}, Agency: ${agencyName}`);
    const allGoals: StrategicPlanningGoal[] = [];
    
    // For ADD, ALL SUMs in the agency report to them (ADD is top-level for agency)
    // Get all SUMs in the agency and include all their goals
    const sums = await getAllSUMsInAgency(agencyName);
    console.log(`[getGoalsForADD] Found ${sums.length} SUMs in agency ${agencyName}`);
    
    for (const sum of sums) {
      try {
        const sumGoals = await getGoalsForSUM(sum.name, agencyName);
        console.log(`[getGoalsForADD] SUM ${sum.name} has ${sumGoals.length} goals`);
        allGoals.push(...sumGoals);
      } catch (error) {
        console.error(`[getGoalsForADD] Error getting goals for SUM ${sum.name}:`, error);
      }
    }
    
    // 2. Get all direct UMs under this ADD (not through SUM)
    try {
      const directUMs = await getUnitsUnderADD(addName, agencyName);
      console.log(`[getGoalsForADD] Found ${directUMs.length} direct UMs under ADD`);
      for (const umName of directUMs) {
        try {
          const unitGoals = await getUnitGoals(umName, agencyName);
          console.log(`[getGoalsForADD] Direct UM ${umName} has ${unitGoals.length} goals`);
          allGoals.push(...unitGoals);
        } catch (error) {
          console.error(`[getGoalsForADD] Error getting goals for direct UM ${umName}:`, error);
        }
      }
    } catch (error) {
      console.error(`[getGoalsForADD] Error getting direct UMs:`, error);
    }
    
    // 3. Get goals from direct advisors under ADD (not through SUM or UM)
    try {
      const directAdvisors = await getDirectAdvisorsUnderADD(addName, agencyName);
      console.log(`[getGoalsForADD] Found ${directAdvisors.length} direct advisors under ADD`);
      for (const advisor of directAdvisors) {
        try {
          // Query goals where userId or userName matches the advisor
          const q = query(
            collection(db, GOALS_COLLECTION),
            where('agencyName', '==', agencyName),
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
          console.log(`[getGoalsForADD] Direct advisor ${advisor.name} has ${querySnapshot.size} goals`);
        } catch (error) {
          console.error(`[getGoalsForADD] Error getting goals for direct advisor ${advisor.name}:`, error);
        }
      }
    } catch (error) {
      console.error(`[getGoalsForADD] Error getting direct advisors:`, error);
    }
    
    // If we didn't find any goals through the hierarchy, fallback to direct agency query
    // This handles cases where the hierarchy might not be set up correctly
    if (allGoals.length === 0) {
      console.log(`[getGoalsForADD] No goals found through hierarchy, falling back to direct agency query`);
      try {
        const agencyGoals = await getAgencyGoals(agencyName);
        console.log(`[getGoalsForADD] Direct agency query found ${agencyGoals.length} goals`);
        return agencyGoals;
      } catch (error) {
        console.error(`[getGoalsForADD] Error in fallback agency query:`, error);
      }
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
    const sortedGoals = uniqueGoals.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    console.log(`[getGoalsForADD] Returning ${sortedGoals.length} unique goals`);
    return sortedGoals;
  } catch (error) {
    console.error('[getGoalsForADD] Error getting goals for ADD:', error);
    // Final fallback: try direct agency query
    try {
      console.log(`[getGoalsForADD] Final fallback to direct agency query`);
      return await getAgencyGoals(agencyName);
    } catch (fallbackError) {
      console.error('[getGoalsForADD] Fallback also failed:', fallbackError);
      return [];
    }
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

// Delete all strategic planning goals for a specific agency
export async function deleteAgencyGoals(agencyName: string): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    if (!db) {
      return { success: false, deleted: 0, error: 'Firestore is not initialized' };
    }

    const normalizedAgencyName = normalizeAgencyName(agencyName);
    const variations = getAgencyNameVariations(agencyName);
    
    console.log(`[deleteAgencyGoals] Deleting goals for agency "${agencyName}" (normalized: "${normalizedAgencyName}")`);
    console.log(`[deleteAgencyGoals] Checking variations:`, variations);

    const allGoalDocs: Array<{ id: string; ref: any }> = [];
    
    // Query all variations of the agency name
    for (const variation of variations) {
      try {
        const q = query(
          collection(db, GOALS_COLLECTION),
          where('agencyName', '==', variation)
        );
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          // Avoid duplicates
          if (!allGoalDocs.find(g => g.id === doc.id)) {
            allGoalDocs.push({ id: doc.id, ref: doc.ref });
          }
        });
      } catch (queryError) {
        console.warn(`[deleteAgencyGoals] Error querying variation "${variation}":`, queryError);
      }
    }

    if (allGoalDocs.length === 0) {
      console.log(`[deleteAgencyGoals] No goals found for agency "${agencyName}"`);
      return { success: true, deleted: 0 };
    }

    console.log(`[deleteAgencyGoals] Found ${allGoalDocs.length} goals to delete`);

    // Delete in batches (Firestore batch limit is 500)
    const batchSize = 500;
    let deleted = 0;
    
    for (let i = 0; i < allGoalDocs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = allGoalDocs.slice(i, i + batchSize);
      
      batchDocs.forEach(({ ref }) => {
        batch.delete(ref);
      });
      
      await batch.commit();
      deleted += batchDocs.length;
      console.log(`[deleteAgencyGoals] Deleted batch: ${deleted}/${allGoalDocs.length}`);
    }

    console.log(`[deleteAgencyGoals] Successfully deleted ${deleted} goals for agency "${agencyName}"`);
    return { success: true, deleted };
  } catch (error) {
    console.error('[deleteAgencyGoals] Error deleting agency goals:', error);
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Failed to delete agency goals',
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

// Update agency names in existing goals based on user's current agency name
// This fixes cases where goals were saved with incorrect agency names
export async function updateGoalsAgencyByUser(
  userId: string,
  correctAgencyName: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    if (!db) {
      return { success: false, updated: 0, error: 'Firestore is not initialized' };
    }

    // Get all goals for this user
    const q = query(
      collection(db, GOALS_COLLECTION),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: true, updated: 0 };
    }

    // Normalize the correct agency name
    const canonicalAgencyName = getCanonicalAgencyName(correctAgencyName);
    
    // Update goals in batches
    const batchSize = 500;
    let updated = 0;
    const docs = querySnapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + batchSize);
      
      batchDocs.forEach((docSnap) => {
        const data = docSnap.data();
        const currentAgencyName = data.agencyName;
        
        // Only update if agency name is different (using normalized comparison)
        if (!areAgencyNamesEqual(currentAgencyName, canonicalAgencyName)) {
          // Recalculate unitName with new agency name
          const unitManager = data.unitManager || '';
          const newUnitName = `${unitManager}_${canonicalAgencyName}`;
          
          batch.update(docSnap.ref, {
            agencyName: canonicalAgencyName,
            unitName: newUnitName,
          });
          updated++;
        }
      });
      
      if (updated > 0) {
        await batch.commit();
      }
    }

    console.log(`[updateGoalsAgencyByUser] Updated ${updated} goals for user ${userId} to agency "${canonicalAgencyName}"`);
    return { success: true, updated };
  } catch (error) {
    console.error('[updateGoalsAgencyByUser] Error updating goals agency:', error);
    return {
      success: false,
      updated: 0,
      error: error instanceof Error ? error.message : 'Failed to update goals agency',
    };
  }
}

// Update agency names for multiple users at once
export async function updateGoalsAgencyForUsers(
  userAgencyMap: Map<string, string> // userId -> correctAgencyName
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const results = {
    success: true,
    updated: 0,
    errors: [] as string[],
  };

  for (const [userId, agencyName] of userAgencyMap.entries()) {
    try {
      const result = await updateGoalsAgencyByUser(userId, agencyName);
      if (result.success) {
        results.updated += result.updated;
      } else {
        results.success = false;
        results.errors.push(`User ${userId}: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      results.success = false;
      results.errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return results;
}

/**
 * Sync all goals' agency names to match their user records
 * This ensures goals are always in sync with user records (source of truth)
 */
export async function syncAllGoalsAgencyFromUsers(): Promise<{
  success: boolean;
  updated: number;
  skipped: number;
  errors: string[];
}> {
  try {
    if (!db) {
      return {
        success: false,
        updated: 0,
        skipped: 0,
        errors: ['Firestore is not initialized'],
      };
    }

    const { getAllUsers } = await import('@/lib/user-service');
    const allUsers = await getAllUsers();
    
    const results = {
      success: true,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    console.log(`[syncAllGoalsAgencyFromUsers] Starting sync for ${allUsers.length} users`);

    // Create a map of userId -> user for quick lookup
    const userMap = new Map<string, typeof allUsers[0]>();
    allUsers.forEach(user => {
      userMap.set(user.uid, user);
    });

    // Query all goals from Firestore (to get document references)
    const goalsQuery = query(collection(db, GOALS_COLLECTION));
    const goalsSnapshot = await getDocs(goalsQuery);
    
    console.log(`[syncAllGoalsAgencyFromUsers] Found ${goalsSnapshot.size} total goals in Firestore`);

    // Process in batches
    const batchSize = 500;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const docSnap of goalsSnapshot.docs) {
      const data = docSnap.data();
      const userId = data.userId;
      const currentAgencyName = data.agencyName || '';
      
      const user = userMap.get(userId);
      
      if (!user) {
        results.errors.push(`User ${userId} not found in user records (goal ID: ${docSnap.id})`);
        continue;
      }

      const userAgencyName = getCanonicalAgencyName(user.agencyName);
      
      // Check if agency name needs updating
      if (!areAgencyNamesEqual(currentAgencyName, userAgencyName)) {
        // Recalculate unitName with new agency name
        const unitManager = data.unitManager || '';
        const newUnitName = `${unitManager}_${userAgencyName}`;

        batch.update(docSnap.ref, {
          agencyName: userAgencyName,
          unitName: newUnitName,
        });

        batchCount++;
        results.updated++;

        // Commit batch if it reaches batch size
        if (batchCount >= batchSize) {
          await batch.commit();
          console.log(`[syncAllGoalsAgencyFromUsers] Committed batch: ${batchCount} updates`);
          batch = writeBatch(db);
          batchCount = 0;
        }
      } else {
        results.skipped++;
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`[syncAllGoalsAgencyFromUsers] Committed final batch: ${batchCount} updates`);
    }

    console.log(`[syncAllGoalsAgencyFromUsers] Sync complete: ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`);
    results.success = results.errors.length === 0;
    return results;
  } catch (error) {
    console.error('[syncAllGoalsAgencyFromUsers] Error syncing goals agency:', error);
    return {
      success: false,
      updated: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

