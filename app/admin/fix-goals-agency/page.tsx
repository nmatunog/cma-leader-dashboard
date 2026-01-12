'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { canAccessAdminPages } from '@/lib/permissions';
import { updateGoalsAgencyByUser, updateGoalsAgencyForUsers, syncAllGoalsAgencyFromUsers } from '@/services/strategic-planning-service';
import { getAllUsers } from '@/lib/user-service';
import { getCanonicalAgencyName } from '@/lib/utils/agency-name-normalizer';
import type { User } from '@/types/user';

export default function FixGoalsAgencyPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    }
  };

  // Load users on mount (must be called before any conditional returns)
  useEffect(() => {
    if (!authLoading && currentUser && canAccessAdminPages(currentUser)) {
      loadUsers();
    }
  }, [authLoading, currentUser]);

  // Early returns after all hooks
  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!currentUser || !canAccessAdminPages(currentUser)) {
    router.push('/login');
    return null;
  }

  const checkUsers = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Load users first
      if (users.length === 0) {
        await loadUsers();
      }

      const usersToCheck = [
        { name: 'JESSICA G. BACULAN', agency: 'CEBU-EZ MATUNOG AGENCY' },
        { name: 'MARIA ESTRELLA C. MATUNOG', agency: 'CEBU-EZ MATUNOG AGENCY' },
        { name: 'RANET L. CANU-OG', agency: 'CEBU-EZ MATUNOG AGENCY' },
      ];

      const checkResults: any[] = [];

      for (const { name, agency } of usersToCheck) {
        const user = users.find(u => 
          u.name.toUpperCase().trim() === name.toUpperCase().trim()
        );

        if (!user) {
          checkResults.push({
            name,
            found: false,
            error: 'User not found',
          });
          continue;
        }

        const canonicalAgency = getCanonicalAgencyName(agency);
        const userAgencyNormalized = getCanonicalAgencyName(user.agencyName);
        const userMatches = userAgencyNormalized === canonicalAgency;

        // Check goals
        const { getAllGoals } = await import('@/services/strategic-planning-service');
        const allGoals = await getAllGoals();
        const userGoals = allGoals.filter(g => g.userId === user.uid);
        
        const goalsWithWrongAgency = userGoals.filter(g => {
          const goalAgencyNormalized = getCanonicalAgencyName(g.agencyName);
          return goalAgencyNormalized !== canonicalAgency;
        });

        // Check hierarchy entry
        const { getHierarchyByAgency } = await import('@/services/organizational-hierarchy-service');
        const hierarchyEntries = await getHierarchyByAgency(canonicalAgency);
        const hierarchyEntry = hierarchyEntries.find(e => 
          e.name.toUpperCase().trim() === name.toUpperCase().trim()
        );
        
        const hierarchyMatches = hierarchyEntry 
          ? getCanonicalAgencyName(hierarchyEntry.agencyName) === canonicalAgency
          : false;

        checkResults.push({
          name,
          found: true,
          userId: user.uid,
          userAgency: user.agencyName,
          expectedAgency: canonicalAgency,
          userMatches,
          totalGoals: userGoals.length,
          goalsWithWrongAgency: goalsWithWrongAgency.length,
          wrongGoalAgencies: [...new Set(goalsWithWrongAgency.map(g => g.agencyName))],
          hierarchyFound: !!hierarchyEntry,
          hierarchyAgency: hierarchyEntry?.agencyName || 'Not found',
          hierarchyMatches,
        });
      }

      setResult({
        success: true,
        checks: checkResults,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const syncAllGoals = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const syncResult = await syncAllGoalsAgencyFromUsers();

      setResult({
        success: syncResult.success,
        updated: syncResult.updated,
        skipped: syncResult.skipped,
        errors: syncResult.errors,
        type: 'sync-all',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fixSpecificUsers = async () => {
    // Fix the three users mentioned: Jessica Baculan, Maria Estrella Matunog, Ranet Canu-OG
    const usersToFix = [
      { name: 'JESSICA G. BACULAN', agency: 'CEBU-EZ MATUNOG AGENCY' },
      { name: 'MARIA ESTRELLA C. MATUNOG', agency: 'CEBU-EZ MATUNOG AGENCY' },
      { name: 'RANET L. CANU-OG', agency: 'CEBU-EZ MATUNOG AGENCY' },
    ];

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Load users first
      if (users.length === 0) {
        await loadUsers();
      }

      const userAgencyMap = new Map<string, string>();
      const notFound: string[] = [];

      // Find users by name (case-insensitive)
      usersToFix.forEach(({ name, agency }) => {
        const user = users.find(u => 
          u.name.toUpperCase().trim() === name.toUpperCase().trim()
        );
        
        if (user) {
          const canonicalAgency = getCanonicalAgencyName(agency);
          userAgencyMap.set(user.uid, canonicalAgency);
        } else {
          notFound.push(name);
        }
      });

      if (notFound.length > 0) {
        setError(`Users not found: ${notFound.join(', ')}`);
        setLoading(false);
        return;
      }

      if (userAgencyMap.size === 0) {
        setError('No users found to fix');
        setLoading(false);
        return;
      }

      const fixResult = await updateGoalsAgencyForUsers(userAgencyMap);

      setResult({
        success: fixResult.success,
        updated: fixResult.updated,
        errors: fixResult.errors,
        usersFixed: Array.from(userAgencyMap.keys()).length,
      });
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
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Fix Goals Agency Names</h1>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Check Users</h2>
            <p className="text-slate-600 mb-4">
              Check the current agency assignments for:
            </p>
            <ul className="list-disc list-inside text-slate-700 mb-6 space-y-1">
              <li>Jessica G. Baculan</li>
              <li>Maria Estrella C. Matunog</li>
              <li>Ranet L. Canu-OG</li>
            </ul>

            <button
              onClick={checkUsers}
              disabled={loading}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? 'Checking...' : 'Check Users'}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Sync All Goals to User Records</h2>
            <p className="text-slate-600 mb-4">
              This will update ALL goals' agency names to match their user records. 
              This is the recommended way to fix agency mismatches after updating hierarchy or user records.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              <strong>Note:</strong> This uses user records as the source of truth. Make sure user records are correct first.
            </p>

            <button
              onClick={syncAllGoals}
              disabled={loading}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {loading ? 'Syncing...' : 'Sync All Goals to User Records'}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Fix Specific Users</h2>
            <p className="text-slate-600 mb-4">
              This will update all goals for the following users to use the correct agency name:
            </p>
            <ul className="list-disc list-inside text-slate-700 mb-6 space-y-1">
              <li>Jessica G. Baculan → CEBU-EZ MATUNOG AGENCY</li>
              <li>Maria Estrella C. Matunog → CEBU-EZ MATUNOG AGENCY</li>
              <li>Ranet L. Canu-OG → CEBU-EZ MATUNOG AGENCY</li>
            </ul>

            <button
              onClick={fixSpecificUsers}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Fixing...' : 'Fix Goals for These Users'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-semibold">Error:</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && result.checks && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Check Results</h2>
              
              {result.checks.map((check: any, idx: number) => (
                <div key={idx} className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">{check.name}</h3>
                  
                  {!check.found ? (
                    <p className="text-red-600">❌ User not found</p>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>User Record:</strong>
                        <span className={`ml-2 ${check.userMatches ? 'text-green-600' : 'text-red-600'}`}>
                          {check.userMatches ? '✅' : '❌'} {check.userAgency}
                        </span>
                        {!check.userMatches && (
                          <span className="ml-2 text-slate-600">
                            (Expected: {check.expectedAgency})
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <strong>Goals:</strong>
                        <span className="ml-2">
                          {check.totalGoals} total, {check.goalsWithWrongAgency} with wrong agency
                        </span>
                        {check.goalsWithWrongAgency > 0 && (
                          <div className="ml-4 mt-1 text-red-600">
                            Wrong agencies: {check.wrongGoalAgencies.join(', ')}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <strong>Hierarchy:</strong>
                        <span className={`ml-2 ${check.hierarchyMatches ? 'text-green-600' : 'text-red-600'}`}>
                          {check.hierarchyFound 
                            ? (check.hierarchyMatches ? '✅' : '❌') + ` ${check.hierarchyAgency}`
                            : '⚠️ Not found in hierarchy'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {result && result.type === 'sync-all' && (
            <div className={`bg-${result.success ? 'green' : 'yellow'}-50 border border-${result.success ? 'green' : 'yellow'}-200 rounded-lg p-6`}>
              <h2 className={`text-xl font-bold text-${result.success ? 'green' : 'yellow'}-900 mb-4`}>
                {result.success ? '✅ Sync Complete' : '⚠️ Sync Completed with Errors'}
              </h2>

              <div className="mb-4">
                <p className="text-slate-700">
                  <strong>Goals Updated:</strong> {result.updated}
                </p>
                <p className="text-slate-700">
                  <strong>Goals Skipped (already correct):</strong> {result.skipped}
                </p>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Errors:</h3>
                  <ul className="list-disc list-inside space-y-1 text-red-800">
                    {result.errors.map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {result && result.usersFixed !== undefined && (
            <div className={`bg-${result.success ? 'green' : 'yellow'}-50 border border-${result.success ? 'green' : 'yellow'}-200 rounded-lg p-6`}>
              <h2 className={`text-xl font-bold text-${result.success ? 'green' : 'yellow'}-900 mb-4`}>
                {result.success ? '✅ Fix Complete' : '⚠️ Fix Completed with Errors'}
              </h2>

              <div className="mb-4">
                <p className="text-slate-700">
                  <strong>Users Fixed:</strong> {result.usersFixed}
                </p>
                <p className="text-slate-700">
                  <strong>Goals Updated:</strong> {result.updated}
                </p>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Errors:</h3>
                  <ul className="list-disc list-inside space-y-1 text-red-800">
                    {result.errors.map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

