'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { canAccessAdminPages } from '@/lib/permissions';
import { getAllGoals } from '@/services/strategic-planning-service';
import { collection, query, where, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeAgencyName } from '@/lib/utils/agency-name-normalizer';
import type { StrategicPlanningGoal } from '@/services/strategic-planning-service';

const GOALS_COLLECTION = 'strategic_planning_goals';

export default function ConsolidateUnitsPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateUnits, setDuplicateUnits] = useState<any[]>([]);

  // Load duplicate units on mount
  useEffect(() => {
    if (!authLoading && currentUser && canAccessAdminPages(currentUser)) {
      checkDuplicateUnits();
    }
  }, [authLoading, currentUser]);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!currentUser || !canAccessAdminPages(currentUser)) {
    router.push('/login');
    return null;
  }

  const checkDuplicateUnits = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const allGoals = await getAllGoals();
      
      // Find all goals for "Maria Rosario C Matunog" 
      // Include: 1) Goals where she is the unit manager (advisors reporting to her)
      //          2) Her own goals (where userName = Maria Rosario C Matunog)
      const mariaRosarioGoals = allGoals.filter(goal => {
        const unitManagerNormalized = goal.unitManager?.toUpperCase().trim();
        const userNameNormalized = goal.userName?.toUpperCase().trim();
        
        // Check if unit manager matches
        const isUnitManager = unitManagerNormalized === 'MARIA ROSARIO C. MATUNOG' || 
                             unitManagerNormalized === 'MARIA ROSARIO C MATUNOG' ||
                             unitManagerNormalized === 'MARIA ROSARIO C. MATUNOG';
        
        // Check if this is her own goal (userName matches)
        const isOwnGoal = userNameNormalized === 'MARIA ROSARIO C. MATUNOG' || 
                         userNameNormalized === 'MARIA ROSARIO C MATUNOG' ||
                         userNameNormalized === 'MARIA ROSARIO C. MATUNOG';
        
        return isUnitManager || isOwnGoal;
      });

      // Group by unitName to find duplicates
      // For UM's own goals, unitName should be `${userName}_${agencyName}`
      // For advisor goals, unitName should be `${unitManager}_${agencyName}`
      const unitGroups: Record<string, StrategicPlanningGoal[]> = {};
      mariaRosarioGoals.forEach(goal => {
        let unitName: string;
        if (goal.unitName) {
          unitName = goal.unitName;
        } else {
          // For UM's own goal, use userName; for advisor goals, use unitManager
          if (goal.userRank === 'UM' || goal.userRank === 'SUM') {
            unitName = `${goal.userName}_${goal.agencyName}`;
          } else {
            unitName = `${goal.unitManager}_${goal.agencyName}`;
          }
        }
        if (!unitGroups[unitName]) {
          unitGroups[unitName] = [];
        }
        unitGroups[unitName].push(goal);
      });
      
      console.log(`[ConsolidateUnits] Found ${Object.keys(unitGroups).length} unique unitName(s) for Maria Rosario C Matunog:`, Object.keys(unitGroups));
      console.log(`[ConsolidateUnits] Total goals found:`, mariaRosarioGoals.length);
      console.log(`[ConsolidateUnits] Goal details:`, mariaRosarioGoals.map(g => ({
        userName: g.userName,
        userRank: g.userRank,
        unitManager: g.unitManager,
        unitName: g.unitName || `${g.unitManager}_${g.agencyName}`,
        agencyName: g.agencyName,
      })));

      // Find units with same normalized unit manager name but different unitNames
      const unitManagerGroups: Record<string, StrategicPlanningGoal[]> = {};
      mariaRosarioGoals.forEach(goal => {
        const key = goal.unitManager?.toUpperCase().trim() || '';
        if (!unitManagerGroups[key]) {
          unitManagerGroups[key] = [];
        }
        unitManagerGroups[key].push(goal);
      });

      const duplicates: any[] = [];
      
      // Check for units with same manager name but different unitNames
      Object.entries(unitGroups).forEach(([unitName, goals]) => {
        if (goals.length > 0) {
          const firstGoal = goals[0];
          const latestSubmission = Math.max(...goals.map(g => g.submittedAt.getTime()));
          const goalCount = goals.length;
          
          // Count advisors (ADV, AUM) in this unit
          const advisorCount = goals.filter(g => g.userRank === 'ADV' || g.userRank === 'AUM').length;
          const umGoal = goals.find(g => g.userRank === 'UM' || g.userRank === 'SUM');
          
          duplicates.push({
            unitName,
            agencyName: firstGoal.agencyName,
            goalCount,
            advisorCount,
            hasUM: !!umGoal,
            latestSubmission: new Date(latestSubmission),
            goals: goals.map(g => ({
              id: g.id,
              userName: g.userName,
              userRank: g.userRank,
              submittedAt: g.submittedAt,
            })),
          });
        }
      });

      // Sort: Units with advisors first, then by latest submission
      duplicates.sort((a, b) => {
        // First priority: units with advisors come first
        if (a.advisorCount > 0 && b.advisorCount === 0) return -1;
        if (a.advisorCount === 0 && b.advisorCount > 0) return 1;
        // If both have advisors or both don't, sort by latest submission
        return b.latestSubmission.getTime() - a.latestSubmission.getTime();
      });

      setDuplicateUnits(duplicates);
      setResult({
        success: true,
        message: `Found ${duplicates.length} unit(s) for Maria Rosario C Matunog`,
        duplicates,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const consolidateUnits = async () => {
    if (duplicateUnits.length < 2) {
      setError('Need at least 2 units to consolidate');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // The first unit (most recent) is the one to keep
      const targetUnit = duplicateUnits[0];
      const unitsToMerge = duplicateUnits.slice(1);

      // Get all goals that need to be updated
      const allGoals = await getAllGoals();
      const goalsToUpdate: StrategicPlanningGoal[] = [];

      unitsToMerge.forEach(unit => {
        const unitGoals = allGoals.filter(goal => 
          (goal.unitName || `${goal.unitManager}_${goal.agencyName}`) === unit.unitName
        );
        goalsToUpdate.push(...unitGoals);
      });

      if (goalsToUpdate.length === 0) {
        setError('No goals found to update');
        setLoading(false);
        return;
      }

      // Update goals in batches
      let currentBatch = writeBatch(db);
      let batchCount = 0;
      const batchSize = 500;

      // Find target unit manager name (from target unit's UM goal)
      const targetUMGoal = allGoals.find(g => 
        (g.unitName || `${g.unitManager}_${g.agencyName}`) === targetUnit.unitName &&
        (g.userRank === 'UM' || g.userRank === 'SUM')
      );
      const targetUnitManager = targetUMGoal?.userName || 'MARIA ROSARIO C. MATUNOG';

      // Separate UM goals (to delete) from advisor goals (to update)
      const umGoalsToDelete: StrategicPlanningGoal[] = [];
      const advisorGoalsToUpdate: StrategicPlanningGoal[] = [];

      goalsToUpdate.forEach(goal => {
        if (goal.userRank === 'UM' || goal.userRank === 'SUM') {
          umGoalsToDelete.push(goal);
        } else {
          advisorGoalsToUpdate.push(goal);
        }
      });

      // Update advisor goals to point to target unit
      for (const goal of advisorGoalsToUpdate) {
        if (!goal.id) continue;

        const goalRef = doc(db, GOALS_COLLECTION, goal.id);
        const newUnitName = targetUnit.unitName;
        const targetAgencyName = targetUnit.agencyName;

        currentBatch.update(goalRef, {
          unitName: newUnitName,
          agencyName: targetAgencyName,
          unitManager: targetUnitManager, // Update unitManager for advisors
        });

        batchCount++;

        if (batchCount >= batchSize) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          batchCount = 0;
        }
      }

      // Commit any remaining updates
      if (batchCount > 0) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        batchCount = 0;
      }

      // Delete duplicate UM goals from merged units
      let deletedCount = 0;
      for (const umGoal of umGoalsToDelete) {
        if (!umGoal.id) continue;

        const goalRef = doc(db, GOALS_COLLECTION, umGoal.id);
        currentBatch.delete(goalRef);
        deletedCount++;
        batchCount++;

        if (batchCount >= batchSize) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          batchCount = 0;
        }
      }

      // Commit any remaining deletes
      if (batchCount > 0) {
        await currentBatch.commit();
      }

      setResult({
        success: true,
        message: `Successfully consolidated ${advisorGoalsToUpdate.length} advisor goal(s) from ${unitsToMerge.length} unit(s) into "${targetUnit.unitName}". Deleted ${deletedCount} duplicate UM goal(s).`,
        updated: advisorGoalsToUpdate.length,
        deleted: deletedCount,
        mergedUnits: unitsToMerge.length,
        targetUnit: targetUnit.unitName,
      });

      // Reload duplicate units
      await checkDuplicateUnits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Consolidate Duplicate Units</h1>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Check for Duplicate Units</h2>
            <p className="text-slate-600 mb-4">
              This will find duplicate units for "Maria Rosario C Matunog" and show which has the most recent data.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={checkDuplicateUnits}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Checking...' : 'Check for Duplicate Units'}
              </button>
              
              <button
                onClick={async () => {
                  if (!confirm('Delete duplicate "Maria Rosario C. Matunog" unit with no advisors?\n\nThis will find all goals for Maria Rosario C. Matunog, identify the unit with no advisors, and delete the UM goal from that unit.')) {
                    return;
                  }
                  setLoading(true);
                  setError(null);
                  try {
                    const allGoals = await getAllGoals();
                    
                    // Find all goals for Maria Rosario C. Matunog (case-insensitive)
                    const normalizeName = (name: string) => name.toUpperCase().trim().replace(/\s+/g, ' ');
                    const mariaRosarioName = 'MARIA ROSARIO C. MATUNOG';
                    
                    const mariaRosarioGoals = allGoals.filter(goal => {
                      const userNameNormalized = normalizeName(goal.userName || '');
                      const unitManagerNormalized = normalizeName(goal.unitManager || '');
                      return userNameNormalized === mariaRosarioName || unitManagerNormalized === mariaRosarioName;
                    });
                    
                    // Group by unitName to find duplicates
                    const unitGroups: Record<string, StrategicPlanningGoal[]> = {};
                    mariaRosarioGoals.forEach(goal => {
                      const unitName = goal.unitName || `${goal.unitManager}_${goal.agencyName}`;
                      if (!unitGroups[unitName]) {
                        unitGroups[unitName] = [];
                      }
                      unitGroups[unitName].push(goal);
                    });
                    
                    // Find unit with no advisors
                    let unitToDelete: { unitName: string; goals: StrategicPlanningGoal[] } | null = null;
                    Object.entries(unitGroups).forEach(([unitName, goals]) => {
                      const advisorCount = goals.filter(g => g.userRank === 'ADV' || g.userRank === 'AUM').length;
                      if (advisorCount === 0) {
                        unitToDelete = { unitName, goals };
                      }
                    });
                    
                    if (!unitToDelete) {
                      setError('No unit with no advisors found. All units have advisors.');
                      setLoading(false);
                      return;
                    }
                    
                    // Delete UM goals from the unit with no advisors
                    const umGoalsToDelete = unitToDelete.goals.filter(g => g.userRank === 'UM' || g.userRank === 'SUM');
                    
                    if (umGoalsToDelete.length === 0) {
                      setError('No UM goals found in the unit with no advisors.');
                      setLoading(false);
                      return;
                    }
                    
                    const batch = writeBatch(db);
                    let deletedCount = 0;
                    for (const goal of umGoalsToDelete) {
                      if (goal.id) {
                        const goalRef = doc(db, GOALS_COLLECTION, goal.id);
                        batch.delete(goalRef);
                        deletedCount++;
                      }
                    }
                    await batch.commit();
                    
                    setResult({
                      success: true,
                      message: `Successfully deleted ${deletedCount} UM goal(s) from unit "${unitToDelete.unitName}" (unit with no advisors)`,
                      deleted: deletedCount,
                    });
                    
                    await checkDuplicateUnits();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to delete duplicate unit');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting...' : 'Delete Duplicate Unit (No Advisors)'}
              </button>
            </div>
          </div>

          {result && result.duplicates && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Found Units</h2>
              <p className="text-slate-600 mb-4">
                Units are sorted by most recent submission. The first unit will be kept, others will be merged into it.
              </p>

              {result.duplicates.map((unit: any, idx: number) => (
                <div key={unit.unitName} className={`mb-4 p-4 rounded-lg border-2 ${idx === 0 ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">
                      {idx === 0 ? (unit.advisorCount > 0 ? '✅ KEEP (Has Advisors)' : '✅ KEEP (Most Recent)') : '⚠️ MERGE INTO ABOVE'}
                    </h3>
                    <span className="text-sm text-slate-600">
                      {unit.goalCount} goal(s) {unit.advisorCount > 0 && `(${unit.advisorCount} advisor${unit.advisorCount > 1 ? 's' : ''})`}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p><strong>Unit Name:</strong> {unit.unitName}</p>
                    <p><strong>Agency:</strong> {unit.agencyName}</p>
                    <p><strong>Advisors:</strong> {unit.advisorCount} {unit.advisorCount === 0 && <span className="text-red-600 font-semibold">(NO ADVISORS)</span>}</p>
                    <p><strong>Latest Submission:</strong> {unit.latestSubmission.toLocaleString()}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        View {unit.goals.length} goal(s)
                      </summary>
                      <ul className="mt-2 ml-4 space-y-1">
                        {unit.goals.map((g: any) => (
                          <li key={g.id} className="text-xs">
                            {g.userName} ({g.userRank}) - {g.submittedAt.toLocaleDateString()}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                </div>
              ))}

              {result.duplicates.length >= 2 && (
                <button
                  onClick={consolidateUnits}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {loading ? 'Consolidating...' : `Consolidate ${result.duplicates.length - 1} unit(s) into "${result.duplicates[0].unitName}"`}
                </button>
              )}
              
              {result.duplicates.length === 1 && result.duplicates[0].advisorCount === 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mt-4">
                  <p className="text-yellow-900 font-semibold mb-2">⚠️ Unit with No Advisors Found</p>
                  <p className="text-yellow-800 text-sm mb-4">
                    This unit has no advisors. If this is a duplicate unit that should be deleted, 
                    you can delete the UM goal from this unit using the button below.
                  </p>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete UM goal from unit "${result.duplicates[0].unitName}"?\n\nThis will permanently delete the UM goal. Advisors (if any) will NOT be affected.`)) {
                        return;
                      }
                      setLoading(true);
                      setError(null);
                      try {
                        const allGoals = await getAllGoals();
                        const unit = result.duplicates[0];
                        const umGoalsToDelete = allGoals.filter(goal => 
                          (goal.unitName || `${goal.unitManager}_${goal.agencyName}`) === unit.unitName &&
                          (goal.userRank === 'UM' || goal.userRank === 'SUM')
                        );
                        
                        if (umGoalsToDelete.length === 0) {
                          setError('No UM goals found to delete');
                          setLoading(false);
                          return;
                        }
                        
                        const batch = writeBatch(db);
                        let deletedCount = 0;
                        for (const goal of umGoalsToDelete) {
                          if (goal.id) {
                            const goalRef = doc(db, GOALS_COLLECTION, goal.id);
                            batch.delete(goalRef);
                            deletedCount++;
                          }
                        }
                        await batch.commit();
                        
                        setResult({
                          success: true,
                          message: `Successfully deleted ${deletedCount} UM goal(s) from unit "${unit.unitName}"`,
                          deleted: deletedCount,
                        });
                        
                        await checkDuplicateUnits();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to delete UM goal');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Deleting...' : `Delete UM Goal from This Unit`}
                  </button>
                </div>
              )}
            </div>
          )}

          {result && result.success && result.message && !result.duplicates && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-green-900 mb-4">✅ Consolidation Complete</h2>
              <p className="text-slate-700 mb-2">{result.message}</p>
              {result.updated && (
                <p className="text-slate-700">
                  <strong>Goals Updated:</strong> {result.updated}
                </p>
              )}
              {result.mergedUnits && (
                <p className="text-slate-700">
                  <strong>Units Merged:</strong> {result.mergedUnits}
                </p>
              )}
              {result.targetUnit && (
                <p className="text-slate-700">
                  <strong>Target Unit:</strong> {result.targetUnit}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-semibold">Error:</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

