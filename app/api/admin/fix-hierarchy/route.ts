/**
 * API Route: Fix Hierarchy Data
 * Automatically fixes inconsistencies in user records and goals data
 */

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import type { User } from '@/types/user';
import type { StrategicPlanningGoal } from '@/services/strategic-planning-service';
import { getCanonicalName } from '@/lib/utils/name-canonicalizer';

interface FixResult {
  usersFixed: number;
  goalsFixed: number;
  errors: string[];
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
      id: doc.id, // Include document ID for updates
      ...data,
      submittedAt: data.submittedAt?.toDate() || new Date(),
    } as StrategicPlanningGoal);
  });
  
  return goals.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

export async function POST() {
  try {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firestore Admin is not initialized');
    }

    const result: FixResult = {
      usersFixed: 0,
      goalsFixed: 0,
      errors: [],
    };

    // 1. Fix user records
    const allUsers = await getAllUsersServer();
    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500; // Firestore limit

    // Fix leaders - set unitManager to their own name
    const leaders = allUsers.filter(u => u.rank === 'ADD' || u.rank === 'SUM' || u.rank === 'UM');
    
    for (const leader of leaders) {
      // Use canonical names (all caps) for UM/SUM/ADD for consistency
      const expectedUnitManager = getCanonicalName(leader.name);
      const actualUnitManager = getCanonicalName(leader.unitManager || '');
      
      if (actualUnitManager !== expectedUnitManager) {
        try {
          const userRef = db.collection('users').doc(leader.uid);
          batch.update(userRef, {
            unitManager: expectedUnitManager, // Store in all caps format
            updatedAt: new Date(),
          });
          batchCount++;
          result.usersFixed++;

          // Commit batch if we're approaching the limit
          if (batchCount >= MAX_BATCH_SIZE) {
            await batch.commit();
            batchCount = 0;
          }
        } catch (error) {
          result.errors.push(`Failed to fix user ${leader.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Commit remaining user updates
    if (batchCount > 0) {
      await batch.commit();
    }

    // 2. Fix goals data to match user records
    const allGoals = await getAllGoalsServer();
    const goalsBatch = db.batch();
    let goalsBatchCount = 0;

    for (const goal of allGoals) {
      const user = allUsers.find(u => u.name === goal.userName);
      if (!user) {
        continue; // Skip if user not found
      }

      let needsUpdate = false;
      const updates: any = {};

      // For leaders, unitManager in goals should match user records (their own name)
      // Use canonical names (all caps) for UM/SUM/ADD for consistency
      if (['ADD', 'SUM', 'UM'].includes(user.rank)) {
        const expectedUnitManager = getCanonicalName(user.name);
        const canonicalGoalUnitManager = getCanonicalName(goal.unitManager);
        if (canonicalGoalUnitManager !== expectedUnitManager) {
          updates.unitManager = expectedUnitManager; // Store in all caps format
          needsUpdate = true;
        }
      } else {
        // For advisors, unitManager in goals should match user records
        const expectedUnitManager = getCanonicalName(user.unitManager || '');
        const canonicalGoalUnitManager = getCanonicalName(goal.unitManager);
        if (canonicalGoalUnitManager !== expectedUnitManager) {
          updates.unitManager = expectedUnitManager || ''; // Store in all caps format
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        try {
          // Use the goal document ID if available (from getAllGoalsServer)
          let goalDocId = goal.id;
          
          if (!goalDocId) {
            // Fallback: query for the goal document by userId and userName
            const goalsQuery = await db.collection('strategic_planning_goals')
              .where('userId', '==', goal.userId)
              .where('userName', '==', goal.userName)
              .limit(1)
              .get();

            if (!goalsQuery.empty) {
              goalDocId = goalsQuery.docs[0].id;
            } else {
              result.errors.push(`Could not find goal document for ${goal.userName} (userId: ${goal.userId})`);
              continue;
            }
          }

          if (goalDocId) {
            const goalRef = db.collection('strategic_planning_goals').doc(goalDocId);
            goalsBatch.update(goalRef, updates);
            goalsBatchCount++;
            result.goalsFixed++;

            // Commit batch if we're approaching the limit
            if (goalsBatchCount >= MAX_BATCH_SIZE) {
              await goalsBatch.commit();
              goalsBatchCount = 0;
            }
          }
        } catch (error) {
          result.errors.push(`Failed to fix goal for ${goal.userName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Commit remaining goal updates
    if (goalsBatchCount > 0) {
      await goalsBatch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${result.usersFixed} user records and ${result.goalsFixed} goal records`,
      result,
    });
  } catch (error) {
    console.error('Error fixing hierarchy data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fix hierarchy data' 
      },
      { status: 500 }
    );
  }
}

