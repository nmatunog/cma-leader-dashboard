'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { canAccessAdminPages } from '@/lib/permissions';
import { getAllUsers, updateUser, getUsersByAgency, getUsersByUnitManager } from '@/lib/user-service';
import { getAllGoals, type StrategicPlanningGoal } from '@/services/strategic-planning-service';
import { getCanonicalName, areNamesLikelySamePerson, getComparablePersonKey } from '@/lib/utils/name-canonicalizer';
import { getCanonicalAgencyName } from '@/lib/utils/agency-name-normalizer';
import { formatDisplayName } from '@/lib/utils/name-formatter';
import { writeBatch, doc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/types/user';

const GOALS_COLLECTION = 'strategic_planning_goals';

interface OrphanedUser {
  userName: string;
  userRank: string;
  agencyName: string;
  unitManager?: string;
  goalCount: number;
  hasUserRecord: boolean;
  userId?: string;
}

interface UnitInfo {
  unitManager: string;
  agencyName: string;
  leader: User | null;
  advisors: User[];
  goalCount: number;
}

interface SubmissionStatus {
  userName: string;
  userRank: string;
  agencyName: string;
  unitManager?: string;
  goalCount: number;
  appearsInReports: boolean;
  reason: string;
  hasUserRecord: boolean;
  userAgencyMatches: boolean;
  userUnitManagerMatches: boolean;
  agencyExistsInUsers: boolean;
}

export default function ManageUnitsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [goals, setGoals] = useState<StrategicPlanningGoal[]>([]);
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [submissionStatuses, setSubmissionStatuses] = useState<SubmissionStatus[]>([]);
  const [selectedTab, setSelectedTab] = useState<'orphaned' | 'units' | 'advisors' | 'all-users' | 'submission-status'>('orphaned');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasMovedUsers, setHasMovedUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recalculatingFYP, setRecalculatingFYP] = useState(false);
  const [selectedUserForRecalc, setSelectedUserForRecalc] = useState<string>('');
  const [syncingGoals, setSyncingGoals] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!canAccessAdminPages(user)) {
      router.push('/');
      return;
    }
    
    loadData();
  }, [user, authLoading, router]);

  // Auto-move specific users when data is loaded (only once)
  useEffect(() => {
    if (users.length > 0 && goals.length > 0 && !hasMovedUsers) {
      moveUsersToCorrectAgency();
    }
  }, [users, goals, hasMovedUsers]);

  const moveUsersToCorrectAgency = async () => {
    if (!users.length || !goals.length || hasMovedUsers) return;
    
    setHasMovedUsers(true);
    
    const usersToMove = [
      { name: 'Maria Estrella C. Matunog', targetAgency: 'Cebu-Ez Matunog Agency' },
      { name: 'Janice I. Nunez', targetAgency: 'Cebu-Ez Matunog Agency' },
    ];
    
    for (const { name, targetAgency } of usersToMove) {
      try {
        // Find user by name (flexible matching)
        const userToMove = users.find(u => 
          areNamesLikelySamePerson(u.name, name)
        );
        
        if (!userToMove) {
          console.log(`User "${name}" not found in Users collection`);
          continue;
        }
        
        const currentAgency = getCanonicalAgencyName(userToMove.agencyName || '');
        const targetAgencyCanonical = getCanonicalAgencyName(targetAgency);
        
        // Check if already in correct agency
        if (currentAgency === targetAgencyCanonical) {
          console.log(`User "${name}" is already in correct agency: ${targetAgency}`);
          continue;
        }
        
        // Move user regardless of current agency (removed restriction to only move from Cebu Matunog Agency)
        console.log(`Moving user "${name}" from ${currentAgency} to ${targetAgencyCanonical}`);
        
        console.log(`Moving user "${name}" from ${currentAgency} to ${targetAgencyCanonical}`);
        
        // Move the user and their goals
        const batch = writeBatch(db);
        const canonicalTargetAgency = getCanonicalAgencyName(targetAgency);
        
        // Update user's agency
        const userRef = doc(db, 'users', userToMove.uid);
        batch.update(userRef, {
          agencyName: canonicalTargetAgency,
          updatedAt: serverTimestamp(),
        });
        
        // Update all goals for this user (move all goals regardless of current agency)
        const userGoals = goals.filter(g => 
          areNamesLikelySamePerson(g.userName, name)
        );
        
        userGoals.forEach(goal => {
          if (!goal.id) {
            console.warn(`Goal missing ID for user ${goal.userName}, skipping update`);
            return;
          }
          const goalRef = doc(db, GOALS_COLLECTION, goal.id);
          batch.update(goalRef, {
            agencyName: canonicalTargetAgency,
            unitName: `${goal.unitManager}_${canonicalTargetAgency}`,
          });
        });
        
        await batch.commit();
        console.log(`Successfully moved user "${name}" to ${canonicalTargetAgency}`);
        setSuccessMessage(`Successfully moved "${name}" to ${canonicalTargetAgency}`);
        
        // Reload data after moving
        await loadData();
        
      } catch (err) {
        console.error(`Error moving user "${name}":`, err);
        setError(`Error moving user "${name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [allUsers, allGoals] = await Promise.all([
        getAllUsers(),
        getAllGoals(),
      ]);
      
      setUsers(allUsers);
      setGoals(allGoals);
      
      // Get unique agencies from Users collection
      const agencySet = new Set<string>();
      allUsers.forEach(u => {
        if (u.agencyName) {
          agencySet.add(getCanonicalAgencyName(u.agencyName));
        }
      });
      setAgencies(Array.from(agencySet).sort());
      
      // Find orphaned users (users with goals but not properly assigned)
      const orphaned = findOrphanedUsers(allUsers, allGoals);
      setOrphanedUsers(orphaned);
      
      // Build units list
      const unitsList = buildUnitsList(allUsers, allGoals);
      setUnits(unitsList);
      
      // Analyze submission status
      const statuses = analyzeSubmissionStatus(allUsers, allGoals);
      setSubmissionStatuses(statuses);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const findOrphanedUsers = (allUsers: User[], allGoals: StrategicPlanningGoal[]): OrphanedUser[] => {
    // Create a map with both canonical and original names for flexible lookup
    const userMap = new Map<string, User>();
    allUsers.forEach(u => {
      const canonicalName = getCanonicalName(u.name);
      userMap.set(canonicalName, u);
      // Also store with original name for fallback
      userMap.set(u.name, u);
    });
    
    const orphaned: OrphanedUser[] = [];
    const seenUsers = new Set<string>();
    
    allGoals.forEach(goal => {
      const canonicalName = getCanonicalName(goal.userName);
      const key = `${canonicalName}_${getCanonicalAgencyName(goal.agencyName)}`;
      
      if (seenUsers.has(key)) return;
      seenUsers.add(key);
      
      // Try to find user record with flexible matching
      let userRecord = userMap.get(canonicalName) || userMap.get(goal.userName);
      
      // If not found, try flexible name matching
      if (!userRecord) {
        userRecord = allUsers.find(u => 
          areNamesLikelySamePerson(u.name, goal.userName)
        ) || undefined;
      }
      
      // A user is only considered "orphaned" if:
      // 1. They have NO user record in the Users collection, OR
      // 2. They have a user record but it's missing critical assignment info (no agency, or advisor with no unitManager)
      // If they have a user record with proper assignment, they're NOT orphaned (even if goal data doesn't match - that can be synced)
      
      let isOrphaned = false;
      
      if (!userRecord) {
        // No user record found at all - truly orphaned
        isOrphaned = true;
      } else {
        // User record exists - check if they're properly assigned in Users collection
        const hasAgency = !!userRecord.agencyName && userRecord.agencyName.trim() !== '';
        
        if (!hasAgency) {
          // User record exists but has no agency - considered orphaned
          isOrphaned = true;
        } else if (goal.userRank !== 'UM' && goal.userRank !== 'SUM' && goal.userRank !== 'ADD') {
          // For advisors, check if they have a unitManager assigned in Users collection
          // If they have a unitManager in Users collection, they're properly assigned (not orphaned)
          // Even if the goal has different/old data, that can be synced
          const hasUnitManager = !!userRecord.unitManager && userRecord.unitManager.trim() !== '' && userRecord.unitManager.toUpperCase() !== 'OTHERS';
          
          if (!hasUnitManager) {
            // Advisor has no unitManager assigned in Users collection - considered orphaned
            isOrphaned = true;
          }
          // If advisor has unitManager in Users collection, they're properly assigned (not orphaned)
          // Goal data mismatch doesn't make them orphaned - it just needs syncing
        }
        // For leaders (UM/SUM/ADD), if they have a user record with an agency, they're properly assigned
      }
      
      if (isOrphaned) {
        orphaned.push({
          userName: goal.userName,
          userRank: goal.userRank,
          agencyName: goal.agencyName,
          unitManager: goal.unitManager,
          goalCount: allGoals.filter(g => 
            getCanonicalName(g.userName) === canonicalName &&
            getCanonicalAgencyName(g.agencyName) === getCanonicalAgencyName(goal.agencyName)
          ).length,
          hasUserRecord: !!userRecord,
          userId: userRecord?.uid,
        });
      }
    });
    
    return orphaned.sort((a, b) => a.userName.localeCompare(b.userName));
  };

  const buildUnitsList = (allUsers: User[], allGoals: StrategicPlanningGoal[]): UnitInfo[] => {
    const unitsMap = new Map<string, UnitInfo>();
    
    // Group by unit manager and agency
    allUsers.forEach(user => {
      if (user.rank === 'UM' || user.rank === 'SUM' || user.rank === 'ADD') {
        const canonicalManager = getCanonicalName(user.name);
        const canonicalAgency = getCanonicalAgencyName(user.agencyName);
        const key = `${canonicalManager}_${canonicalAgency}`;
        
        if (!unitsMap.has(key)) {
          unitsMap.set(key, {
            unitManager: user.name,
            agencyName: user.agencyName,
            leader: user,
            advisors: [],
            goalCount: 0,
          });
        }
      }
    });
    
    // Add advisors to units
    allUsers.forEach(user => {
      if (user.rank === 'ADV' || user.rank === 'AUM') {
        const canonicalManager = getCanonicalName(user.unitManager || '');
        const canonicalAgency = getCanonicalAgencyName(user.agencyName);
        const key = `${canonicalManager}_${canonicalAgency}`;
        
        const unit = unitsMap.get(key);
        if (unit) {
          unit.advisors.push(user);
        }
      }
    });
    
    // Count goals for each unit
    unitsMap.forEach((unit, key) => {
      const [managerName, agencyName] = key.split('_');
      const unitGoals = allGoals.filter(g => {
        const isLeader = g.userRank === 'UM' || g.userRank === 'SUM' || g.userRank === 'ADD';
        if (isLeader) {
          return areNamesLikelySamePerson(g.userName, managerName) &&
                 getCanonicalAgencyName(g.agencyName) === agencyName;
        } else {
          return areNamesLikelySamePerson(g.unitManager || '', managerName) &&
                 getCanonicalAgencyName(g.agencyName) === agencyName;
        }
      });
      unit.goalCount = unitGoals.length;
    });
    
    return Array.from(unitsMap.values()).sort((a, b) => 
      a.unitManager.localeCompare(b.unitManager)
    );
  };

  const analyzeSubmissionStatus = (allUsers: User[], allGoals: StrategicPlanningGoal[]): SubmissionStatus[] => {
    // Get valid agency names from Users collection (same logic as reports)
    const validAgencyNames = new Set<string>();
    allUsers.forEach(u => {
      if (u.agencyName) {
        validAgencyNames.add(getCanonicalAgencyName(u.agencyName));
      }
    });

    // Create maps for quick lookup
    const userMap = new Map<string, User>();
    allUsers.forEach(u => {
      const canonicalName = getCanonicalName(u.name);
      userMap.set(canonicalName, u);
      // Also store with original name
      userMap.set(u.name, u);
    });

    // Group goals by user (get most recent goal per user)
    const userGoalMap = new Map<string, StrategicPlanningGoal>();
    allGoals.forEach(goal => {
      const canonicalName = getCanonicalName(goal.userName);
      const canonicalAgency = getCanonicalAgencyName(goal.agencyName);
      const key = `${canonicalName}_${canonicalAgency}`;
      
      // Keep the most recent goal
      const existing = userGoalMap.get(key);
      if (!existing || goal.submittedAt > existing.submittedAt) {
        userGoalMap.set(key, goal);
      }
    });

    const statuses: SubmissionStatus[] = [];
    const seenUsers = new Set<string>();

    allGoals.forEach(goal => {
      const canonicalName = getCanonicalName(goal.userName);
      const canonicalAgency = getCanonicalAgencyName(goal.agencyName);
      const key = `${canonicalName}_${canonicalAgency}`;
      
      if (seenUsers.has(key)) return;
      seenUsers.add(key);

      // Find user record
      const userRecord = userMap.get(canonicalName) || userMap.get(goal.userName);
      const hasUserRecord = !!userRecord;
      
      // Check if agency exists in Users collection
      const agencyExistsInUsers = validAgencyNames.has(canonicalAgency);
      
      // Check if user's agency matches goal's agency
      const userAgencyMatches = userRecord 
        ? getCanonicalAgencyName(userRecord.agencyName || '') === canonicalAgency
        : false;
      
      // Check if unit manager matches (for advisors)
      let userUnitManagerMatches = true;
      if (goal.userRank !== 'UM' && goal.userRank !== 'SUM' && goal.userRank !== 'ADD') {
        // This is an advisor - check if unit manager matches
        if (userRecord && userRecord.unitManager) {
          const canonicalGoalUnitManager = getCanonicalName(goal.unitManager || '');
          const canonicalUserUnitManager = getCanonicalName(userRecord.unitManager);
          userUnitManagerMatches = areNamesLikelySamePerson(canonicalGoalUnitManager, canonicalUserUnitManager);
        } else {
          userUnitManagerMatches = false;
        }
      }

      // Determine if goal appears in reports
      // A goal appears in reports if:
      // 1. Agency name exists in Users collection (validAgencyNames)
      const appearsInReports = agencyExistsInUsers;

      // Determine reason
      let reason = '';
      if (appearsInReports) {
        reason = 'Appears in Reports';
      } else {
        if (!agencyExistsInUsers) {
          reason = 'Agency name does not exist in Users collection';
        } else if (!hasUserRecord) {
          reason = 'No user record found in Users collection';
        } else if (!userAgencyMatches) {
          reason = `User agency mismatch: User has "${userRecord.agencyName || 'N/A'}", Goal has "${goal.agencyName}"`;
        } else if (!userUnitManagerMatches && goal.userRank !== 'UM' && goal.userRank !== 'SUM' && goal.userRank !== 'ADD') {
          reason = `Unit manager mismatch: User has "${userRecord.unitManager || 'N/A'}", Goal has "${goal.unitManager || 'N/A'}"`;
        } else {
          reason = 'Unknown reason';
        }
      }

      // Count goals for this user
      const goalCount = allGoals.filter(g => 
        getCanonicalName(g.userName) === canonicalName &&
        getCanonicalAgencyName(g.agencyName) === canonicalAgency
      ).length;

      statuses.push({
        userName: goal.userName,
        userRank: goal.userRank,
        agencyName: goal.agencyName,
        unitManager: goal.unitManager,
        goalCount,
        appearsInReports,
        reason,
        hasUserRecord,
        userAgencyMatches,
        userUnitManagerMatches,
        agencyExistsInUsers,
      });
    });

    return statuses.sort((a, b) => {
      // Sort by appearsInReports (missing first), then by name
      if (a.appearsInReports !== b.appearsInReports) {
        return a.appearsInReports ? 1 : -1;
      }
      return a.userName.localeCompare(b.userName);
    });
  };

  const moveUnitToAgency = async (unit: UnitInfo, newAgency: string) => {
    if (!user) return;
    
    try {
      setActionLoading(`moving-${unit.unitManager}`);
      setError(null);
      setSuccessMessage(null);
      
      const batch = writeBatch(db);
      const canonicalNewAgency = getCanonicalAgencyName(newAgency);
      
      // Update leader's agency
      if (unit.leader) {
        const userRef = doc(db, 'users', unit.leader.uid);
        batch.update(userRef, {
          agencyName: canonicalNewAgency,
          updatedAt: serverTimestamp(),
        });
      }
      
      // Update all advisors' agency
      unit.advisors.forEach(advisor => {
        const userRef = doc(db, 'users', advisor.uid);
        batch.update(userRef, {
          agencyName: canonicalNewAgency,
          updatedAt: serverTimestamp(),
        });
      });
      
      // Update all goals for this unit
      const unitGoals = goals.filter(g => {
        const isLeader = g.userRank === 'UM' || g.userRank === 'SUM' || g.userRank === 'ADD';
        if (isLeader) {
          return areNamesLikelySamePerson(g.userName, unit.unitManager) &&
                 getCanonicalAgencyName(g.agencyName) === getCanonicalAgencyName(unit.agencyName);
        } else {
          return areNamesLikelySamePerson(g.unitManager || '', unit.unitManager) &&
                 getCanonicalAgencyName(g.agencyName) === getCanonicalAgencyName(unit.agencyName);
        }
      });
      
      unitGoals.forEach(goal => {
        if (!goal.id) {
          console.warn(`Goal missing ID for user ${goal.userName}, skipping update`);
          return;
        }
        const goalRef = doc(db, GOALS_COLLECTION, goal.id);
        batch.update(goalRef, {
          agencyName: canonicalNewAgency,
          unitName: `${goal.unitManager}_${canonicalNewAgency}`,
        });
      });
      
      await batch.commit();
      
      setSuccessMessage(`Successfully moved unit "${unit.unitManager}" and ${unit.advisors.length} advisors to "${canonicalNewAgency}"`);
      await loadData();
      
    } catch (err) {
      console.error('Error moving unit:', err);
      setError(err instanceof Error ? err.message : 'Failed to move unit');
    } finally {
      setActionLoading(null);
    }
  };

  const moveAdvisorToUnit = async (advisor: User, newUnitManager: string, newAgency: string) => {
    if (!user) return;
    
    try {
      setActionLoading(`moving-${advisor.uid}`);
      setError(null);
      setSuccessMessage(null);
      
      const batch = writeBatch(db);
      const canonicalNewAgency = getCanonicalAgencyName(newAgency);
      const canonicalNewManager = getCanonicalName(newUnitManager);
      
      // Update advisor's unitManager and agency
      const userRef = doc(db, 'users', advisor.uid);
        batch.update(userRef, {
          unitManager: canonicalNewManager,
          agencyName: canonicalNewAgency,
          updatedAt: serverTimestamp(),
        });
      
      // Update all goals for this advisor
      const advisorGoals = goals.filter(g => 
        g.userId === advisor.uid ||
        (getCanonicalName(g.userName) === getCanonicalName(advisor.name) &&
         getCanonicalAgencyName(g.agencyName) === getCanonicalAgencyName(advisor.agencyName))
      );
      
      advisorGoals.forEach(goal => {
        if (!goal.id) {
          console.warn(`Goal missing ID for advisor ${goal.userName}, skipping update`);
          return;
        }
        const goalRef = doc(db, GOALS_COLLECTION, goal.id);
        batch.update(goalRef, {
          unitManager: canonicalNewManager,
          agencyName: canonicalNewAgency,
          unitName: `${canonicalNewManager}_${canonicalNewAgency}`,
        });
      });
      
      await batch.commit();
      
      setSuccessMessage(`Successfully moved advisor "${formatDisplayName(advisor.name)}" to unit "${canonicalNewManager}" in "${canonicalNewAgency}"`);
      await loadData();
      
    } catch (err) {
      console.error('Error moving advisor:', err);
      setError(err instanceof Error ? err.message : 'Failed to move advisor');
    } finally {
      setActionLoading(null);
    }
  };

  const assignOrphanedUser = async (orphaned: OrphanedUser, newAgency: string, newUnitManager?: string) => {
    if (!user || !orphaned.userId) return;
    
    try {
      setActionLoading(`assigning-${orphaned.userName}`);
      setError(null);
      setSuccessMessage(null);
      
      const batch = writeBatch(db);
      const canonicalNewAgency = getCanonicalAgencyName(newAgency);
      const canonicalNewManager = newUnitManager ? getCanonicalName(newUnitManager) : undefined;
      
      // Update user record
      const userRef = doc(db, 'users', orphaned.userId);
      const updates: any = {
        agencyName: canonicalNewAgency,
        updatedAt: serverTimestamp(),
      };
      if (canonicalNewManager) {
        updates.unitManager = canonicalNewManager;
      }
      batch.update(userRef, updates);
      
      // Update all goals for this user
      const userGoals = goals.filter(g => 
        getCanonicalName(g.userName) === getCanonicalName(orphaned.userName) &&
        getCanonicalAgencyName(g.agencyName) === getCanonicalAgencyName(orphaned.agencyName)
      );
      
      userGoals.forEach(goal => {
        if (!goal.id) {
          console.warn(`Goal missing ID for user ${goal.userName}, skipping update`);
          return;
        }
        const goalRef = doc(db, GOALS_COLLECTION, goal.id);
        const goalUpdates: any = {
          agencyName: canonicalNewAgency,
          unitName: `${canonicalNewManager || goal.unitManager}_${canonicalNewAgency}`,
        };
        if (canonicalNewManager) {
          goalUpdates.unitManager = canonicalNewManager;
        }
        batch.update(goalRef, goalUpdates);
      });
      
      await batch.commit();
      
      setSuccessMessage(`Successfully assigned "${formatDisplayName(orphaned.userName)}" to "${canonicalNewAgency}"`);
      await loadData();
      
    } catch (err) {
      console.error('Error assigning user:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign user');
    } finally {
      setActionLoading(null);
    }
  };

  const recalculateFYP = async (userName: string) => {
    try {
      setRecalculatingFYP(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/admin/recalculate-fyp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to recalculate FYP');
      }
      
      if (result.success) {
        setSuccessMessage(
          result.message || `Successfully recalculated FYP for ${userName}. ` +
          `Please refresh the Reports page to see the updated values.`
        );
        // Clear the input field
        setSelectedUserForRecalc('');
        // Reload data to show updated values
        await loadData();
      } else {
        throw new Error(result.error || 'Failed to recalculate FYP');
      }
    } catch (err) {
      console.error('Error recalculating FYP:', err);
      setError(err instanceof Error ? err.message : 'Failed to recalculate FYP');
    } finally {
      setRecalculatingFYP(false);
    }
  };

  const syncAllGoalsWithUsers = async () => {
    if (!user) return;
    
    try {
      setSyncingGoals(true);
      setError(null);
      setSuccessMessage(null);
      
      // Create a map of users by canonical name for quick lookup
      const userMap = new Map<string, User>();
      const userByPersonKey = new Map<string, User>();
      users.forEach(u => {
        const canonicalName = getCanonicalName(u.name);
        userMap.set(canonicalName, u);
        // Also store with original name
        userMap.set(u.name, u);

        // Also store by strict person-key (fast match across middle-name/initial variations)
        const personKey = getComparablePersonKey(u.name);
        if (personKey) {
          userByPersonKey.set(personKey, u);
        }
      });
      
      // Process goals in batches (Firestore batch limit is 500)
      const batchSize = 500;
      let totalUpdated = 0;
      let totalSkipped = 0;
      const skippedUsers: string[] = [];
      
      for (let i = 0; i < goals.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchGoals = goals.slice(i, i + batchSize);
        let batchUpdated = 0;
        
        batchGoals.forEach(goal => {
          if (!goal.id) {
            console.warn(`Goal missing ID for user ${goal.userName}, skipping`);
            totalSkipped++;
            return;
          }
          
          // Find matching user with flexible name matching
          const canonicalGoalName = getCanonicalName(goal.userName);
          let matchingUser = userMap.get(canonicalGoalName) || userMap.get(goal.userName);
          
          // If not found, try person-key match (fast), then fall back to flexible name matching
          if (!matchingUser) {
            const goalPersonKey = getComparablePersonKey(goal.userName);
            if (goalPersonKey) {
              matchingUser = userByPersonKey.get(goalPersonKey);
            }

            if (!matchingUser) {
              matchingUser = users.find(u => 
                areNamesLikelySamePerson(u.name, goal.userName)
              ) || undefined;
            }
          }
          
          if (!matchingUser) {
            // User not found in Users collection - skip this goal
            if (!skippedUsers.includes(goal.userName)) {
              skippedUsers.push(goal.userName);
            }
            totalSkipped++;
            return;
          }
          
          // Get canonical values from Users collection (source of truth)
          const canonicalAgency = getCanonicalAgencyName(matchingUser.agencyName || '');
          const canonicalUserName = matchingUser.name; // Use the name from Users collection (source of truth)
          let canonicalUnitManager: string;
          
          // For leaders (UM/SUM/ADD), unitManager is themselves
          if (matchingUser.rank === 'UM' || matchingUser.rank === 'SUM' || matchingUser.rank === 'ADD') {
            canonicalUnitManager = getCanonicalName(matchingUser.name);
          } else {
            // For advisors, get unitManager from Users collection
            canonicalUnitManager = matchingUser.unitManager 
              ? getCanonicalName(matchingUser.unitManager)
              : getCanonicalName(goal.unitManager || '');
          }
          
          // Update unitName based on unitManager and agency
          const updatedUnitName = `${canonicalUnitManager}_${canonicalAgency}`;
          
          // Check if updates are needed
          const goalCanonicalAgency = getCanonicalAgencyName(goal.agencyName);
          const goalCanonicalUnitManager = getCanonicalName(goal.unitManager || '');
          const goalCanonicalUnitName = goal.unitName ? goal.unitName.split('_').slice(0, -1).join('_') + '_' + goalCanonicalAgency : `${goalCanonicalUnitManager}_${goalCanonicalAgency}`;
          
          // Check if userName needs updating (compare canonical names to handle case variations)
          const goalCanonicalUserName = getCanonicalName(goal.userName);
          const matchingUserCanonicalName = getCanonicalName(matchingUser.name);
          const userNameNeedsUpdate = goalCanonicalUserName !== matchingUserCanonicalName || goal.userName !== canonicalUserName;
          
          if (goalCanonicalAgency !== canonicalAgency || 
              goalCanonicalUnitManager !== canonicalUnitManager ||
              goalCanonicalUnitName !== updatedUnitName ||
              userNameNeedsUpdate) {
            // Update the goal
            const goalRef = doc(db, GOALS_COLLECTION, goal.id);
            const updates: any = {
              agencyName: canonicalAgency,
              unitManager: canonicalUnitManager,
              unitName: updatedUnitName,
            };
            
            // Update userName if it has changed
            if (userNameNeedsUpdate) {
              updates.userName = canonicalUserName;
            }
            
            batch.update(goalRef, updates);
            batchUpdated++;
            totalUpdated++;
          }
        });
        
        // Commit this batch
        if (batchUpdated > 0) {
          await batch.commit();
          console.log(`Synced ${batchUpdated} goals in batch ${Math.floor(i / batchSize) + 1}`);
        }
      }
      
      let message = `Successfully synced ${totalUpdated} goal(s) with Users collection.`;
      if (totalSkipped > 0) {
        message += ` ${totalSkipped} goal(s) skipped (user not found in Users collection).`;
        if (skippedUsers.length > 0) {
          message += ` Users not found: ${skippedUsers.slice(0, 5).join(', ')}${skippedUsers.length > 5 ? '...' : ''}`;
        }
      }
      message += `\n\nPlease refresh the Reports page to see the updated data.`;
      
      setSuccessMessage(message);
      
      // Reload data to show updated values
      await loadData();
      
    } catch (err) {
      console.error('Error syncing goals with users:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync goals with Users collection');
    } finally {
      setSyncingGoals(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D31145]"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Manage Units & Agency Assignments</h1>
          
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by name (e.g., Janice I. Nunez)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
            />
          </div>
          
          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-800 p-4 rounded-lg mb-6">
              <p className="font-semibold">Error: {error}</p>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-100 border-2 border-green-300 text-green-800 p-4 rounded-lg mb-6">
              <p className="font-semibold">{successMessage}</p>
            </div>
          )}
          
          {/* Data Sync Utility */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-1">Data Sync Utility</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Sync all goal data (User Names, Agency Names, and Unit Managers) with the Users collection. This will update all goals to match the current information in User Management, including corrected names.
                </p>
                <p className="text-xs text-blue-600 italic mb-2">
                  Use this after making corrections in User Management to ensure goals reflect the latest agency and unit assignments. After syncing, please refresh the Reports page to see the updated data.
                </p>
                <p className="text-xs text-amber-700 font-medium">
                  ⚠️ Important: This will update all goals in the database. Make sure you have made all necessary corrections in User Management before running this sync.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={syncAllGoalsWithUsers}
                  disabled={syncingGoals || loading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shadow-md"
                >
                  {syncingGoals ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      <span>Sync All Goals with Users Collection</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* FYP Recalculation Utility */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-1">FYP Recalculation Utility</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Recalculate FYP values from FYC for any user. This will update all quarterly and annual FYP values based on the stored commission rate in their goal.
                </p>
                <p className="text-xs text-blue-600 italic">
                  Note: After recalculation, please refresh the Reports page to see the updated values.
                </p>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Select User to Recalculate
                  </label>
                  <input
                    type="text"
                    placeholder="Enter user name (e.g., Shelsea M. Alesna)..."
                    value={selectedUserForRecalc}
                    onChange={(e) => setSelectedUserForRecalc(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    list="user-names-list"
                  />
                  <datalist id="user-names-list">
                    {goals
                      .filter((goal, index, self) => 
                        index === self.findIndex(g => g.userName === goal.userName)
                      )
                      .slice(0, 50) // Limit to first 50 unique names for performance
                      .map((goal) => (
                        <option key={goal.userName} value={goal.userName} />
                      ))}
                  </datalist>
                </div>
                <button
                  onClick={() => {
                    if (selectedUserForRecalc.trim()) {
                      recalculateFYP(selectedUserForRecalc.trim());
                    }
                  }}
                  disabled={recalculatingFYP || !selectedUserForRecalc.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                  {recalculatingFYP ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Recalculating...</span>
                    </>
                  ) : (
                    <span>Recalculate FYP</span>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="border-b border-slate-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setSelectedTab('orphaned')}
                  className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
                    selectedTab === 'orphaned'
                      ? 'border-[#D31145] text-[#D31145]'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  Orphaned Users ({orphanedUsers.length})
                </button>
                <button
                  onClick={() => setSelectedTab('units')}
                  className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
                    selectedTab === 'units'
                      ? 'border-[#D31145] text-[#D31145]'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  Units ({units.length})
                </button>
                <button
                  onClick={() => setSelectedTab('advisors')}
                  className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
                    selectedTab === 'advisors'
                      ? 'border-[#D31145] text-[#D31145]'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  Advisors
                </button>
                <button
                  onClick={() => setSelectedTab('all-users')}
                  className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
                    selectedTab === 'all-users'
                      ? 'border-[#D31145] text-[#D31145]'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  All Users
                </button>
                <button
                  onClick={() => setSelectedTab('submission-status')}
                  className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
                    selectedTab === 'submission-status'
                      ? 'border-[#D31145] text-[#D31145]'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  Submission Status ({submissionStatuses.filter((s: SubmissionStatus) => !s.appearsInReports).length} missing)
                </button>
              </nav>
            </div>
          </div>
          
          {/* Orphaned Users Tab */}
          {selectedTab === 'orphaned' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Orphaned Users (Not Properly Assigned)
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                These users have goals but are not properly assigned to a unit/agency in the Users collection.
              </p>
              
              {orphanedUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No orphaned users found. All users are properly assigned.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-200 bg-slate-50">
                        <th className="text-left p-3 font-semibold text-slate-700">Name</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Rank</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Current Agency (from Goals)</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Unit Manager (from Goals)</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Has User Record</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Goal Count</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orphanedUsers
                        .filter(orphaned => 
                          !searchQuery || 
                          orphaned.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          formatDisplayName(orphaned.userName).toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((orphaned, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-medium">{formatDisplayName(orphaned.userName)}</td>
                          <td className="p-3">{orphaned.userRank}</td>
                          <td className="p-3">{orphaned.agencyName}</td>
                          <td className="p-3">{orphaned.unitManager || 'N/A'}</td>
                          <td className="p-3">{orphaned.hasUserRecord ? 'Yes' : 'No'}</td>
                          <td className="p-3">{orphaned.goalCount}</td>
                          <td className="p-3">
                            {orphaned.hasUserRecord ? (
                              <AssignUserModal
                                orphaned={orphaned}
                                agencies={agencies}
                                units={units}
                                onAssign={assignOrphanedUser}
                                loading={actionLoading === `assigning-${orphaned.userName}`}
                              />
                            ) : (
                              <span className="text-slate-400 text-xs">Create user first</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Units Tab */}
          {selectedTab === 'units' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Units by Agency</h2>
              
              {units.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No units found.</div>
              ) : (
                <div className="space-y-6">
                  {agencies.map(agency => {
                    let agencyUnits = units.filter(u => 
                      getCanonicalAgencyName(u.agencyName) === agency
                    );
                    
                    // Apply search filter if provided
                    if (searchQuery) {
                      agencyUnits = agencyUnits.filter(u =>
                        u.unitManager.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        formatDisplayName(u.unitManager).toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.advisors.some(a => 
                          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          formatDisplayName(a.name).toLowerCase().includes(searchQuery.toLowerCase())
                        )
                      );
                    }
                    
                    if (agencyUnits.length === 0) return null;
                    
                    return (
                      <div key={agency} className="border border-slate-200 rounded-lg p-4">
                        <h3 className="text-lg font-bold text-slate-800 mb-3">{agency}</h3>
                        <div className="space-y-3">
                          {agencyUnits.map((unit, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-semibold text-slate-900">
                                      {formatDisplayName(unit.unitManager)}
                                    </h4>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                      {unit.leader?.rank}
                                    </span>
                                    <span className="text-sm text-slate-600">
                                      {unit.advisors.length} {unit.advisors.length === 1 ? 'advisor' : 'advisors'}
                                    </span>
                                    <span className="text-sm text-slate-600">
                                      • {unit.goalCount} {unit.goalCount === 1 ? 'goal' : 'goals'}
                                    </span>
                                  </div>
                                  {unit.advisors.length > 0 && (
                                    <div className="text-xs text-slate-600 mt-1">
                                      Advisors: {unit.advisors.map(a => formatDisplayName(a.name)).join(', ')}
                                    </div>
                                  )}
                                </div>
                                <MoveUnitModal
                                  unit={unit}
                                  agencies={agencies}
                                  currentAgency={unit.agencyName}
                                  onMove={moveUnitToAgency}
                                  loading={actionLoading === `moving-${unit.unitManager}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Advisors Tab */}
          {selectedTab === 'advisors' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">All Advisors</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                      <th className="text-left p-3 font-semibold text-slate-700">Name</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Current Unit Manager</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Current Agency</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => u.rank === 'ADV' || u.rank === 'AUM')
                      .filter(advisor =>
                        !searchQuery ||
                        advisor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        formatDisplayName(advisor.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (advisor.unitManager && (
                          advisor.unitManager.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          formatDisplayName(advisor.unitManager).toLowerCase().includes(searchQuery.toLowerCase())
                        ))
                      )
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(advisor => (
                        <tr key={advisor.uid} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-medium">{formatDisplayName(advisor.name)}</td>
                          <td className="p-3">{advisor.unitManager || 'N/A'}</td>
                          <td className="p-3">{advisor.agencyName}</td>
                          <td className="p-3">
                            <MoveAdvisorModal
                              advisor={advisor}
                              agencies={agencies}
                              units={units}
                              onMove={moveAdvisorToUnit}
                              loading={actionLoading === `moving-${advisor.uid}`}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* All Users Tab */}
          {selectedTab === 'all-users' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">All Users</h2>
              <p className="text-sm text-slate-600 mb-4">
                Search and view all users in the system. Use this to find specific users like Janice I. Nunez.
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                      <th className="text-left p-3 font-semibold text-slate-700">Name</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Rank</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Agency</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Unit Manager</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(user =>
                        !searchQuery ||
                        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        formatDisplayName(user.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (user.unitManager && (
                          user.unitManager.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          formatDisplayName(user.unitManager).toLowerCase().includes(searchQuery.toLowerCase())
                        )) ||
                        (user.agencyName && user.agencyName.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(user => (
                        <tr key={user.uid} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-medium">{formatDisplayName(user.name)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              user.rank === 'UM' || user.rank === 'SUM' || user.rank === 'ADD' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {user.rank}
                            </span>
                          </td>
                          <td className="p-3">{user.agencyName || 'N/A'}</td>
                          <td className="p-3">{user.unitManager ? formatDisplayName(user.unitManager) : 'N/A'}</td>
                          <td className="p-3">
                            {(user.rank === 'UM' || user.rank === 'SUM' || user.rank === 'ADD') ? (
                              <MoveUnitModal
                                unit={{
                                  unitManager: user.name,
                                  agencyName: user.agencyName || '',
                                  leader: user,
                                  advisors: users.filter(u => 
                                    (u.rank === 'ADV' || u.rank === 'AUM') &&
                                    areNamesLikelySamePerson(u.unitManager || '', user.name)
                                  ),
                                  goalCount: goals.filter(g => 
                                    areNamesLikelySamePerson(g.userName, user.name)
                                  ).length,
                                }}
                                agencies={agencies}
                                currentAgency={user.agencyName || ''}
                                onMove={moveUnitToAgency}
                                loading={actionLoading === `moving-${user.name}`}
                              />
                            ) : (
                              <MoveAdvisorModal
                                advisor={user}
                                agencies={agencies}
                                units={units}
                                onMove={moveAdvisorToUnit}
                                loading={actionLoading === `moving-${user.uid}`}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submission Status Tab */}
          {selectedTab === 'submission-status' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Goal Submission Status</h2>
              <p className="text-sm text-slate-600 mb-4">
                All users who have submitted goals. Missing users are those not appearing in Reports and the reason why.
              </p>
              
              <div className="mb-4 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Missing from Reports:</strong> {submissionStatuses.filter((s: SubmissionStatus) => !s.appearsInReports).length} users
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  <strong>Appearing in Reports:</strong> {submissionStatuses.filter((s: SubmissionStatus) => s.appearsInReports).length} users
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                      <th className="text-left p-3 font-semibold text-slate-700">Name</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Rank</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Agency (from Goal)</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Unit Manager (from Goal)</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Goal Count</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Status</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionStatuses
                      .filter((status: SubmissionStatus) => 
                        !searchQuery || 
                        status.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        formatDisplayName(status.userName).toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((status: SubmissionStatus, idx: number) => (
                        <tr 
                          key={idx} 
                          className={`border-b border-slate-100 hover:bg-slate-50 ${
                            !status.appearsInReports ? 'bg-red-50' : ''
                          }`}
                        >
                          <td className="p-3 font-medium">{formatDisplayName(status.userName)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              status.userRank === 'UM' || status.userRank === 'SUM' || status.userRank === 'ADD' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {status.userRank}
                            </span>
                          </td>
                          <td className="p-3">{status.agencyName}</td>
                          <td className="p-3">{status.unitManager ? formatDisplayName(status.unitManager) : 'N/A'}</td>
                          <td className="p-3">{status.goalCount}</td>
                          <td className="p-3">
                            {status.appearsInReports ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                ✓ In Reports
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                ✗ Missing
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="max-w-md">
                              <p className={`text-xs ${
                                status.appearsInReports ? 'text-green-700' : 'text-red-700 font-medium'
                              }`}>
                                {status.reason}
                              </p>
                              {!status.appearsInReports && (
                                <div className="mt-1 text-xs text-slate-600">
                                  <p>Has User Record: {status.hasUserRecord ? 'Yes' : 'No'}</p>
                                  <p>Agency Exists: {status.agencyExistsInUsers ? 'Yes' : 'No'}</p>
                                  {status.hasUserRecord && (
                                    <>
                                      <p>Agency Matches: {status.userAgencyMatches ? 'Yes' : 'No'}</p>
                                      {status.userRank !== 'UM' && status.userRank !== 'SUM' && status.userRank !== 'ADD' && (
                                        <p>Unit Manager Matches: {status.userUnitManagerMatches ? 'Yes' : 'No'}</p>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal component for assigning orphaned users
function AssignUserModal({ 
  orphaned, 
  agencies, 
  units, 
  onAssign, 
  loading 
}: { 
  orphaned: OrphanedUser; 
  agencies: string[]; 
  units: UnitInfo[];
  onAssign: (orphaned: OrphanedUser, agency: string, unitManager?: string) => Promise<void>;
  loading: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState('');
  const [selectedUnitManager, setSelectedUnitManager] = useState('');
  
  const handleAssign = async () => {
    if (!selectedAgency) return;
    await onAssign(orphaned, selectedAgency, selectedUnitManager || undefined);
    setShowModal(false);
  };
  
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-semibold"
        disabled={loading}
      >
        Assign
      </button>
      
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Assign {formatDisplayName(orphaned.userName)}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Agency *</label>
                <select
                  value={selectedAgency}
                  onChange={(e) => setSelectedAgency(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                >
                  <option value="">Select Agency</option>
                  {agencies.map(agency => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>
              </div>
              
              {orphaned.userRank === 'ADV' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Unit Manager (Optional)</label>
                  <select
                    value={selectedUnitManager}
                    onChange={(e) => setSelectedUnitManager(e.target.value)}
                    className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                  >
                    <option value="">Select Unit Manager</option>
                    {units
                      .filter(u => getCanonicalAgencyName(u.agencyName) === selectedAgency || !selectedAgency)
                      .map(unit => (
                        <option key={unit.unitManager} value={unit.unitManager}>
                          {formatDisplayName(unit.unitManager)}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAssign}
                  disabled={!selectedAgency || loading}
                  className="flex-1 px-4 py-2 bg-[#D31145] text-white rounded-lg hover:bg-red-700 rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Assigning...' : 'Assign'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Modal component for moving units
function MoveUnitModal({
  unit,
  agencies,
  currentAgency,
  onMove,
  loading
}: {
  unit: UnitInfo;
  agencies: string[];
  currentAgency: string;
  onMove: (unit: UnitInfo, newAgency: string) => Promise<void>;
  loading: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState('');
  
  const handleMove = async () => {
    if (!selectedAgency) return;
    await onMove(unit, selectedAgency);
    setShowModal(false);
  };
  
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-3 py-1.5 bg-[#D31145] text-white rounded hover:bg-red-700 transition-colors text-sm font-semibold"
        disabled={loading}
      >
        Move Unit
      </button>
      
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Move Unit: {formatDisplayName(unit.unitManager)}
            </h3>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Current Agency:</strong> {currentAgency}
              </p>
              <p className="text-sm text-blue-900 mt-1">
                <strong>Advisors:</strong> {unit.advisors.length} will be moved with this unit
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">New Agency *</label>
                <select
                  value={selectedAgency}
                  onChange={(e) => setSelectedAgency(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                >
                  <option value="">Select Agency</option>
                  {agencies
                    .filter(a => getCanonicalAgencyName(a) !== getCanonicalAgencyName(currentAgency))
                    .map(agency => (
                      <option key={agency} value={agency}>{agency}</option>
                    ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleMove}
                  disabled={!selectedAgency || loading}
                  className="flex-1 px-4 py-2 bg-[#D31145] text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Moving...' : 'Move Unit'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Modal component for moving advisors
function MoveAdvisorModal({
  advisor,
  agencies,
  units,
  onMove,
  loading
}: {
  advisor: User;
  agencies: string[];
  units: UnitInfo[];
  onMove: (advisor: User, newUnitManager: string, newAgency: string) => Promise<void>;
  loading: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState('');
  const [selectedUnitManager, setSelectedUnitManager] = useState('');
  
  useEffect(() => {
    if (selectedAgency) {
      // Filter units by selected agency
      const agencyUnits = units.filter(u => 
        getCanonicalAgencyName(u.agencyName) === getCanonicalAgencyName(selectedAgency)
      );
      if (agencyUnits.length > 0 && !agencyUnits.find(u => u.unitManager === selectedUnitManager)) {
        setSelectedUnitManager('');
      }
    }
  }, [selectedAgency, units, selectedUnitManager]);
  
  const handleMove = async () => {
    if (!selectedAgency || !selectedUnitManager) return;
    await onMove(advisor, selectedUnitManager, selectedAgency);
    setShowModal(false);
  };
  
  const availableUnits = selectedAgency
    ? units.filter(u => getCanonicalAgencyName(u.agencyName) === getCanonicalAgencyName(selectedAgency))
    : [];
  
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-3 py-1.5 bg-[#D31145] text-white rounded hover:bg-red-700 transition-colors text-sm font-semibold"
        disabled={loading}
      >
        Move
      </button>
      
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Move Advisor: {formatDisplayName(advisor.name)}
            </h3>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Current Unit:</strong> {advisor.unitManager || 'N/A'}
              </p>
              <p className="text-sm text-blue-900 mt-1">
                <strong>Current Agency:</strong> {advisor.agencyName}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">New Agency *</label>
                <select
                  value={selectedAgency}
                  onChange={(e) => setSelectedAgency(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                >
                  <option value="">Select Agency</option>
                  {agencies.map(agency => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">New Unit Manager *</label>
                <select
                  value={selectedUnitManager}
                  onChange={(e) => setSelectedUnitManager(e.target.value)}
                  disabled={!selectedAgency}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Unit Manager</option>
                  {availableUnits.map(unit => (
                    <option key={unit.unitManager} value={unit.unitManager}>
                      {formatDisplayName(unit.unitManager)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleMove}
                  disabled={!selectedAgency || !selectedUnitManager || loading}
                  className="flex-1 px-4 py-2 bg-[#D31145] text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Moving...' : 'Move Advisor'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

