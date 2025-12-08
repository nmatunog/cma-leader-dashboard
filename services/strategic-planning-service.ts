import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const GOALS_COLLECTION = 'strategic_planning_goals';

export interface StrategicPlanningGoal {
  id?: string;
  userId: string; // User's name or unique identifier
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
    // Create a unique ID based on user and agency
    const goalId = `${goal.userId}_${goal.agencyName}_${Date.now()}`;
    
    const goalData = {
      ...goal,
      id: goalId,
      submittedAt: goal.submittedAt || new Date(),
    };
    
    const docRef = doc(db, GOALS_COLLECTION, goalId);
    await setDoc(docRef, goalData, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error saving strategic planning goal:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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

