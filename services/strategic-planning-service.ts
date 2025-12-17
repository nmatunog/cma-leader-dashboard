import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const GOALS_COLLECTION = 'strategic_planning_goals';

export interface StrategicPlanningGoal {
  id?: string;
  userId: string; // User's UID (unique identifier from Firebase Auth)
  userName: string;
  userRank: string; // LA, UM, SUM, AD
  unitManager: string;
  agencyName: string;
  submittedAt: Date;
  
  // Dec 2025 Targets
  dec2025FYP: number;
  dec2025FYC: number;
  dec2025Cases: number;
  
  // 2026 Quarterly Goals
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
    // Check if Firebase is properly configured
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    ];
    
    const missingVars = requiredVars.filter(
      (varName) => !process.env[varName] || process.env[varName] === ''
    );
    
    if (missingVars.length > 0) {
      return {
        success: false,
        error: 'Firebase is not configured. Please check environment variables.',
      };
    }
    
    // Create a unique ID based on user and agency
    const goalId = `${goal.userId}_${goal.agencyName}_${Date.now()}`;
    
    const goalData = {
      ...goal,
      id: goalId,
      submittedAt: goal.submittedAt || new Date(),
    };
    
    // Add timeout to prevent hanging (15 seconds should be enough for Firestore)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Save operation timed out after 15 seconds. Please check your internet connection and Firebase configuration.')), 15000);
    });
    
    let docRef;
    try {
      docRef = doc(db, GOALS_COLLECTION, goalId);
    } catch (dbError) {
      console.error('Error getting Firestore doc reference:', dbError);
      return {
        success: false,
        error: 'Firestore is not available. Please check Firebase configuration.',
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

// Get goal by user ID
export async function getUserGoal(userId: string, agencyName: string): Promise<StrategicPlanningGoal | null> {
  try {
    const q = query(
      collection(db, GOALS_COLLECTION),
      where('userId', '==', userId),
      where('agencyName', '==', agencyName)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        ...data,
        submittedAt: data.submittedAt?.toDate() || new Date(),
      } as StrategicPlanningGoal;
    }
    return null;
  } catch (error) {
    console.error('Error loading user goal:', error);
    return null;
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

