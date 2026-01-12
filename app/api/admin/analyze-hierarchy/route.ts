/**
 * API Route: Analyze Hierarchy Data
 * Checks for inconsistencies in user records and goals data
 */

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import type { User } from '@/types/user';
import type { StrategicPlanningGoal } from '@/services/strategic-planning-service';
import { getCanonicalName } from '@/lib/utils/name-canonicalizer';

interface Inconsistency {
  type: string;
  user: string;
  rank: string;
  agency: string;
  expected: string;
  actual: string;
  source: 'users' | 'goals';
}

// Server-side helper to get all users using Admin SDK
async function getAllUsersServer(): Promise<User[]> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Firestore Admin is not initialized');
  }
  
  const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
  const users: User[] = [];
  
  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    // Convert Firestore Timestamps to Date objects
    const userData: any = {
      uid: doc.id,
      ...data,
    };
    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
      userData.createdAt = data.createdAt.toDate();
    }
    if (data.updatedAt && typeof data.updatedAt.toDate === 'function') {
      userData.updatedAt = data.updatedAt.toDate();
    }
    users.push(userData as User);
  });
  
  return users;
}

// Server-side helper to get all goals using Admin SDK
async function getAllGoalsServer(): Promise<StrategicPlanningGoal[]> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Firestore Admin is not initialized');
  }
  
  const goalsSnapshot = await db.collection('strategic_planning_goals').get();
  const goals: StrategicPlanningGoal[] = [];
  
  goalsSnapshot.forEach((doc) => {
    const data = doc.data();
    goals.push({
      ...data,
      submittedAt: data.submittedAt?.toDate() || new Date(),
    } as StrategicPlanningGoal);
  });
  
  return goals.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

export async function GET() {
  try {
    const inconsistencies: Inconsistency[] = [];
    
    // 1. Check user records (source of truth)
    const allUsers = await getAllUsersServer();
    
    // Check leaders (ADD, SUM, UM) - should have unitManager = their own name
    const leaders = allUsers.filter(u => u.rank === 'ADD' || u.rank === 'SUM' || u.rank === 'UM');
    
    leaders.forEach(leader => {
      const expectedUnitManager = leader.name; // Leaders should have unitManager = their own name
      const actualUnitManager = leader.unitManager || '(not set)';
      
      // Use canonical names (all caps) for UM/SUM/ADD for consistent comparison
      const canonicalExpected = getCanonicalName(expectedUnitManager);
      const canonicalActual = getCanonicalName(actualUnitManager);
      
      if (canonicalActual !== canonicalExpected) {
        inconsistencies.push({
          type: 'LEADER_UNITMANAGER_NOT_SELF',
          user: leader.name,
          rank: leader.rank,
          agency: leader.agencyName,
          expected: canonicalExpected, // Display in all caps format
          actual: canonicalActual, // Display in all caps format
          source: 'users'
        });
      }
    });
    
    // Check advisors - should have unitManager = whoever they report to (ADD, SUM, or UM)
    const advisors = allUsers.filter(u => u.rank === 'ADV' || u.rank === 'AUM');
    
    advisors.forEach(advisor => {
      const unitManager = advisor.unitManager;
      if (!unitManager) {
        inconsistencies.push({
          type: 'ADVISOR_UNITMANAGER_MISSING',
          user: advisor.name,
          rank: advisor.rank,
          agency: advisor.agencyName,
          expected: '(should be set to ADD, SUM, or UM name)',
          actual: '(not set)',
          source: 'users'
        });
      } else {
        // Verify the unitManager exists and is a valid leader
        // Use canonical name matching with very flexible comparison
        const canonicalUnitManager = getCanonicalName(unitManager);
        
        // Helper function to normalize names for comparison
        // Handles "MARIA" vs "MA." vs "MA" and removes middle initials
        const normalizeForComparison = (name: string): string => {
          let normalized = name
            .replace(/\bMARIA\s+/g, 'MA ')      // Normalize "MARIA " to "MA "
            .replace(/\bMA\.\s+/g, 'MA ')       // Normalize "MA. " to "MA "
            .replace(/\bMA\s+/g, 'MA ')         // Ensure "MA " format
            .replace(/\s+[A-Z]\.\s+/g, ' ')     // Remove middle initials like " C. " or " D. "
            .replace(/\s+/g, ' ')               // Normalize spaces
            .trim();
          
          // Remove any remaining single letter + period patterns
          normalized = normalized.replace(/\b[A-Z]\./g, '');
          
          return normalized.replace(/\s+/g, ' ').trim();
        };
        
        // First try exact match
        let unitManagerUser = allUsers.find(u => {
          const canonicalUserName = getCanonicalName(u.name);
          return canonicalUserName === canonicalUnitManager;
        });
        
        // If not found, try normalized comparison
        if (!unitManagerUser) {
          const normalizedUnitManager = normalizeForComparison(canonicalUnitManager);
          
          unitManagerUser = allUsers.find(u => {
            const canonicalUserName = getCanonicalName(u.name);
            const normalizedUserName = normalizeForComparison(canonicalUserName);
            
            // Check if normalized versions match exactly
            if (normalizedUserName === normalizedUnitManager) return true;
            
            // Check if one contains the other (more lenient than startsWith)
            // This handles cases where names might have slight variations
            if (normalizedUserName.includes(normalizedUnitManager) || 
                normalizedUnitManager.includes(normalizedUserName)) {
              // Ensure the match is substantial (at least 10 chars)
              const shorter = normalizedUnitManager.length < normalizedUserName.length 
                ? normalizedUnitManager : normalizedUserName;
              if (shorter.length >= 10) {
                return true;
              }
            }
            
            return false;
          });
        }
        
        // Final fallback: check if name matches ignoring all periods and extra spaces
        // This is a very lenient check for cases with manual Firebase Console edits
        if (!unitManagerUser) {
          const superNormalizedUnitManager = canonicalUnitManager
            .replace(/\./g, '')           // Remove all periods
            .replace(/\s+/g, ' ')         // Normalize spaces
            .trim();
          
          unitManagerUser = allUsers.find(u => {
            const canonicalUserName = getCanonicalName(u.name);
            const superNormalizedUserName = canonicalUserName
              .replace(/\./g, '')         // Remove all periods
              .replace(/\s+/g, ' ')       // Normalize spaces
              .trim();
            
            // Check if super-normalized versions match
            if (superNormalizedUserName === superNormalizedUnitManager) return true;
            
            // Check if last two words match (handles first name variations)
            const unitManagerParts = superNormalizedUnitManager.split(' ').filter(p => p.length > 1);
            const userNameParts = superNormalizedUserName.split(' ').filter(p => p.length > 1);
            
            if (unitManagerParts.length >= 2 && userNameParts.length >= 2) {
              const unitManagerLastTwo = unitManagerParts.slice(-2).join(' ');
              const userNameLastTwo = userNameParts.slice(-2).join(' ');
              if (unitManagerLastTwo === userNameLastTwo && unitManagerLastTwo.length >= 10) {
                return true;
              }
            }
            
            return false;
          });
        }
        
        if (!unitManagerUser) {
          inconsistencies.push({
            type: 'ADVISOR_UNITMANAGER_NOT_FOUND',
            user: advisor.name,
            rank: advisor.rank,
            agency: advisor.agencyName,
            expected: '(valid ADD, SUM, or UM name)',
            actual: canonicalUnitManager, // Display in all caps format
            source: 'users'
          });
        } else if (!['ADD', 'SUM', 'UM'].includes(unitManagerUser.rank)) {
          inconsistencies.push({
            type: 'ADVISOR_UNITMANAGER_NOT_LEADER',
            user: advisor.name,
            rank: advisor.rank,
            agency: advisor.agencyName,
            expected: '(ADD, SUM, or UM)',
            actual: `${canonicalUnitManager} (${unitManagerUser.rank})`, // Display in all caps format
            source: 'users'
          });
        }
      }
    });
    
    // 2. Check goals data - should match user records
    const allGoals = await getAllGoalsServer();
    
    // Compare goals with user records
    allGoals.forEach(goal => {
      const user = allUsers.find(u => u.name === goal.userName);
      if (!user) {
        return; // Skip if user not found
      }
      
      // For leaders, unitManager in goals should match user records (their own name)
      // Use canonical names (all caps) for UM/SUM/ADD for consistent comparison
      if (['ADD', 'SUM', 'UM'].includes(user.rank)) {
        const expectedUnitManager = user.name;
        const canonicalExpected = getCanonicalName(expectedUnitManager);
        const canonicalActual = getCanonicalName(goal.unitManager);
        
        if (canonicalActual !== canonicalExpected) {
          inconsistencies.push({
            type: 'GOAL_LEADER_UNITMANAGER_MISMATCH',
            user: goal.userName,
            rank: goal.userRank,
            agency: goal.agencyName,
            expected: canonicalExpected, // Display in all caps format
            actual: canonicalActual, // Display in all caps format
            source: 'goals'
          });
        }
      } else {
        // For advisors, unitManager in goals should match user records
        const expectedUnitManager = user.unitManager;
        const canonicalExpected = getCanonicalName(expectedUnitManager || '');
        const canonicalActual = getCanonicalName(goal.unitManager);
        
        if (canonicalActual !== canonicalExpected) {
          inconsistencies.push({
            type: 'GOAL_ADVISOR_UNITMANAGER_MISMATCH',
            user: goal.userName,
            rank: goal.userRank,
            agency: goal.agencyName,
            expected: canonicalExpected || '(not set)', // Display in all caps format
            actual: canonicalActual, // Display in all caps format
            source: 'goals'
          });
        }
      }
    });
    
    // Group inconsistencies by type
    const byType = new Map<string, Inconsistency[]>();
    inconsistencies.forEach(inc => {
      if (!byType.has(inc.type)) {
        byType.set(inc.type, []);
      }
      byType.get(inc.type)!.push(inc);
    });
    
    // Group by agency
    const byAgency = new Map<string, Inconsistency[]>();
    inconsistencies.forEach(inc => {
      if (!byAgency.has(inc.agency)) {
        byAgency.set(inc.agency, []);
      }
      byAgency.get(inc.agency)!.push(inc);
    });
    
    return NextResponse.json({
      success: true,
      summary: {
        total: inconsistencies.length,
        byType: Object.fromEntries(
          Array.from(byType.entries()).map(([type, items]) => [type, items.length])
        ),
        byAgency: Object.fromEntries(
          Array.from(byAgency.entries()).map(([agency, items]) => [agency, items.length])
        )
      },
      inconsistencies: inconsistencies,
      stats: {
        totalUsers: allUsers.length,
        leaders: leaders.length,
        advisors: advisors.length,
        totalGoals: allGoals.length
      }
    });
  } catch (error) {
    console.error('Error analyzing hierarchy data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze hierarchy data' 
      },
      { status: 500 }
    );
  }
}

