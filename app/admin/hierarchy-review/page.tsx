'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { formatDisplayName } from '@/lib/utils/name-formatter';
import { useAuth } from '@/contexts/auth-context';
import { canAccessAdminPages } from '@/lib/permissions';
import { getAllUsers, updateUser } from '@/lib/user-service';
import { 
  getHierarchyByAgency, 
  saveHierarchyEntry,
  type OrganizationalHierarchyEntry
} from '@/services/organizational-hierarchy-service';
import type { User, UserRank } from '@/types/user';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface HierarchyMismatch {
  user: User;
  issue: 'missing_from_hierarchy' | 'wrong_agency' | 'wrong_unit_manager' | 'wrong_rank';
  expectedAgency?: string;
  expectedUnitManager?: string;
  expectedRank?: string;
  hierarchyEntry?: OrganizationalHierarchyEntry;
}

export default function HierarchyReviewPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [hierarchyEntries, setHierarchyEntries] = useState<OrganizationalHierarchyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mismatches, setMismatches] = useState<HierarchyMismatch[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fixedCount, setFixedCount] = useState(0);
  const [showAddToHierarchyModal, setShowAddToHierarchyModal] = useState(false);
  const [userToAdd, setUserToAdd] = useState<User | null>(null);
  const [newHierarchyUnitManager, setNewHierarchyUnitManager] = useState<string>('');
  const [availableUnitManagers, setAvailableUnitManagers] = useState<string[]>([]);

  // Check if user is admin or superuser
  useEffect(() => {
    if (!authLoading) {
      if (!canAccessAdminPages(currentUser)) {
        router.push('/login');
      }
    }
  }, [currentUser, authLoading, router]);

  const normalizeName = (name: string): string => {
    return name.toUpperCase().trim().replace(/\s+/g, ' ');
  };

  const findMismatches = (allUsers: User[], allHierarchy: OrganizationalHierarchyEntry[]) => {
    const issues: HierarchyMismatch[] = [];

    // Create a map of hierarchy entries by name (normalized)
    const hierarchyMap = new Map<string, OrganizationalHierarchyEntry>();
    allHierarchy.forEach(entry => {
      const normalizedName = normalizeName(entry.name);
      // Store both the normalized key and the original entry
      if (!hierarchyMap.has(normalizedName)) {
        hierarchyMap.set(normalizedName, entry);
      }
    });

    // Check each user
    allUsers.forEach(user => {
      // Skip admins and superusers
      if (user.role === 'admin' || user.role === 'superuser') return;

      const normalizedUserName = normalizeName(user.name);
      const hierarchyEntry = hierarchyMap.get(normalizedUserName);

      if (!hierarchyEntry) {
        // User not found in hierarchy
        issues.push({
          user,
          issue: 'missing_from_hierarchy',
        });
        return;
      }

      // Check for mismatches
      const wrongAgency = hierarchyEntry.agencyName !== user.agencyName;
      const wrongUnitManager = normalizeName(hierarchyEntry.unitManager || '') !== normalizeName(user.unitManager || '');
      const wrongRank = hierarchyEntry.rank !== user.rank;

      if (wrongAgency) {
        issues.push({
          user,
          issue: 'wrong_agency',
          expectedAgency: hierarchyEntry.agencyName,
          hierarchyEntry,
        });
      }

      if (wrongUnitManager) {
        issues.push({
          user,
          issue: 'wrong_unit_manager',
          expectedUnitManager: hierarchyEntry.unitManager,
          hierarchyEntry,
        });
      }

      if (wrongRank) {
        issues.push({
          user,
          issue: 'wrong_rank',
          expectedRank: hierarchyEntry.rank,
          hierarchyEntry,
        });
      }
    });

    setMismatches(issues);
  };

  const reloadHierarchyAndMismatches = async (allUsers: User[]) => {
    try {
      // Load all hierarchy entries
      const agencies = Array.from(new Set(allUsers.map(u => u.agencyName))).filter(Boolean);
      const allHierarchyEntries: OrganizationalHierarchyEntry[] = [];
      
      for (const agency of agencies) {
        const entries = await getHierarchyByAgency(agency);
        allHierarchyEntries.push(...entries);
      }
      
      setHierarchyEntries(allHierarchyEntries);

      // Find mismatches
      findMismatches(allUsers, allHierarchyEntries);
    } catch (err) {
      console.error('Error reloading hierarchy:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load all users
      const allUsers = await getAllUsers();
      setUsers(allUsers);

      // Load all hierarchy entries
      await reloadHierarchyAndMismatches(allUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data initially and set up real-time listeners
  useEffect(() => {
    if (!canAccessAdminPages(currentUser)) {
      return;
    }

    // Initial load
    loadData();

    // Set up real-time listeners for users and hierarchy
    let unsubscribeUsers: (() => void) | null = null;
    let unsubscribeHierarchy: (() => void) | null = null;

    const setupListeners = async () => {
      if (!db) return;

      try {
        // Listen to users collection
        const usersQuery = query(collection(db, 'users'));
        unsubscribeUsers = onSnapshot(
          usersQuery,
          async (snapshot) => {
            const updatedUsers: User[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              updatedUsers.push({
                uid: doc.id,
                ...data,
              } as User);
            });
            setUsers(updatedUsers);

            // Reload hierarchy and find mismatches
            await reloadHierarchyAndMismatches(updatedUsers);
          },
          (error) => {
            console.error('Error listening to users:', error);
          }
        );

        // Listen to organizational_hierarchy collection
        const hierarchyQuery = query(collection(db, 'organizational_hierarchy'));
        unsubscribeHierarchy = onSnapshot(
          hierarchyQuery,
          async (snapshot) => {
            const updatedHierarchy: OrganizationalHierarchyEntry[] = [];
            snapshot.forEach((doc) => {
              updatedHierarchy.push({
                id: doc.id,
                ...doc.data(),
              } as OrganizationalHierarchyEntry);
            });
            setHierarchyEntries(updatedHierarchy);

            // Reload users and find mismatches
            const currentUsers = await getAllUsers();
            setUsers(currentUsers);
            findMismatches(currentUsers, updatedHierarchy);
          },
          (error) => {
            console.error('Error listening to hierarchy:', error);
          }
        );
      } catch (error) {
        console.error('Error setting up listeners:', error);
        // Fallback to manual refresh if listeners fail
        loadData();
      }
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeHierarchy) unsubscribeHierarchy();
    };
  }, [currentUser, selectedAgency]);

  const handleFixUser = async (mismatch: HierarchyMismatch) => {
    if (!confirm(`Fix ${formatDisplayName(mismatch.user.name)}? This will update their agency, unit manager, and/or rank to match the organizational hierarchy.`)) {
      return;
    }

    try {
      setActionLoading(`fix-${mismatch.user.uid}`);
      
      const updates: any = {};
      
      if (mismatch.issue === 'wrong_agency' && mismatch.expectedAgency) {
        updates.agencyName = mismatch.expectedAgency;
      }
      
      if (mismatch.issue === 'wrong_unit_manager') {
        updates.unitManager = mismatch.expectedUnitManager || null;
      }
      
      if (mismatch.issue === 'wrong_rank' && mismatch.expectedRank) {
        updates.rank = mismatch.expectedRank;
      }

      // If multiple issues, fix all at once
      if (mismatch.hierarchyEntry) {
        if (mismatch.user.agencyName !== mismatch.hierarchyEntry.agencyName) {
          updates.agencyName = mismatch.hierarchyEntry.agencyName;
        }
        if ((mismatch.user.unitManager || '') !== (mismatch.hierarchyEntry.unitManager || '')) {
          updates.unitManager = mismatch.hierarchyEntry.unitManager || null;
        }
        if (mismatch.user.rank !== mismatch.hierarchyEntry.rank) {
          updates.rank = mismatch.hierarchyEntry.rank;
        }
      }

      const result = await updateUser(mismatch.user.uid, updates);
      
      if (result.success) {
        setFixedCount(prev => prev + 1);
        await loadData(); // Reload to refresh mismatches
      } else {
        alert(result.error || 'Failed to fix user');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fix user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncAllUsers = async () => {
    if (!confirm('Sync all users to organizational hierarchy? This will update or create hierarchy entries for all users (except admins).')) {
      return;
    }

    try {
      setActionLoading('sync-all');
      const allUsers = await getAllUsers();
      let synced = 0;
      let errors = 0;

      for (const user of allUsers) {
        // Skip admins and superusers
        if (user.role === 'admin' || user.role === 'superuser') continue;

        try {
          await saveHierarchyEntry({
            name: user.name,
            displayName: user.name,
            rank: user.rank,
            agencyName: user.agencyName,
            unitManager: user.unitManager,
            code: user.code,
          });
          synced++;
        } catch (err) {
          console.error(`Error syncing ${user.name}:`, err);
          errors++;
        }
      }

      alert(`Synced ${synced} users to hierarchy. ${errors > 0 ? `${errors} errors occurred.` : ''}`);
      await loadData(); // Reload to refresh mismatches
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sync users');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddToHierarchy = async (user: User) => {
    setUserToAdd(user);
    
    // Get available unit managers from hierarchy for this agency
    const agencyHierarchy = await getHierarchyByAgency(user.agencyName);
    const unitManagers = new Set<string>();
    
    // Get all potential unit managers (SUMs, UMs, ADDs)
    agencyHierarchy.forEach(entry => {
      if (['SUM', 'UM', 'ADD'].includes(entry.rank)) {
        unitManagers.add(entry.name);
      }
    });
    
    setAvailableUnitManagers(Array.from(unitManagers).sort());
    setNewHierarchyUnitManager(user.unitManager || '');
    setShowAddToHierarchyModal(true);
  };

  const handleSaveToHierarchy = async () => {
    if (!userToAdd) return;

    try {
      setActionLoading('add-to-hierarchy');
      
      const hierarchyEntry: Omit<OrganizationalHierarchyEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        name: userToAdd.name,
        displayName: userToAdd.name,
        rank: userToAdd.rank as UserRank,
        agencyName: userToAdd.agencyName,
        unitManager: newHierarchyUnitManager || undefined,
        code: userToAdd.code,
      };

      const result = await saveHierarchyEntry(hierarchyEntry);
      
      if (result.success) {
        setShowAddToHierarchyModal(false);
        setUserToAdd(null);
        setNewHierarchyUnitManager('');
        alert(`Successfully added ${formatDisplayName(userToAdd.name)} to organizational hierarchy.`);
        await loadData(); // Reload to refresh mismatches
      } else {
        alert(result.error || 'Failed to add user to hierarchy');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add user to hierarchy');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFixAll = async () => {
    const fixableMismatches = mismatches.filter(m => 
      m.issue !== 'missing_from_hierarchy' && m.hierarchyEntry
    );

    if (fixableMismatches.length === 0) {
      alert('No fixable mismatches found.');
      return;
    }

    if (!confirm(`Fix all ${fixableMismatches.length} fixable mismatches? This will update user records to match the organizational hierarchy.`)) {
      return;
    }

    try {
      setActionLoading('fix-all');
      let fixed = 0;
      let errors = 0;

      for (const mismatch of fixableMismatches) {
        try {
          const updates: any = {};
          
          if (mismatch.hierarchyEntry) {
            if (mismatch.user.agencyName !== mismatch.hierarchyEntry.agencyName) {
              updates.agencyName = mismatch.hierarchyEntry.agencyName;
            }
            if ((mismatch.user.unitManager || '') !== (mismatch.hierarchyEntry.unitManager || '')) {
              updates.unitManager = mismatch.hierarchyEntry.unitManager || null;
            }
            if (mismatch.user.rank !== mismatch.hierarchyEntry.rank) {
              updates.rank = mismatch.hierarchyEntry.rank;
            }

            if (Object.keys(updates).length > 0) {
              const result = await updateUser(mismatch.user.uid, updates);
              if (result.success) {
                fixed++;
              } else {
                errors++;
              }
            }
          }
        } catch (err) {
          console.error(`Error fixing ${mismatch.user.name}:`, err);
          errors++;
        }
      }

      setFixedCount(fixed);
      alert(`Fixed ${fixed} users. ${errors > 0 ? `${errors} errors occurred.` : ''}`);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fix all users');
    } finally {
      setActionLoading(null);
    }
  };

  const getIssueLabel = (issue: HierarchyMismatch['issue']): string => {
    switch (issue) {
      case 'missing_from_hierarchy':
        return 'Not in Hierarchy';
      case 'wrong_agency':
        return 'Wrong Agency';
      case 'wrong_unit_manager':
        return 'Wrong Unit Manager';
      case 'wrong_rank':
        return 'Wrong Rank';
      default:
        return issue;
    }
  };

  const getIssueColor = (issue: HierarchyMismatch['issue']): string => {
    switch (issue) {
      case 'missing_from_hierarchy':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'wrong_agency':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'wrong_unit_manager':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'wrong_rank':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Filter mismatches by agency
  const filteredMismatches = selectedAgency === 'all' 
    ? mismatches 
    : mismatches.filter(m => m.user.agencyName === selectedAgency);

  // Get unique agencies
  const agencies = Array.from(new Set([
    ...users.map(u => u.agencyName),
    ...hierarchyEntries.map(h => h.agencyName)
  ])).filter(Boolean).sort();

  if (authLoading || loading) {
    return (
      <div className="flex h-full min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D31145]"></div>
              <p className="mt-4 text-slate-600">Loading hierarchy review...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!canAccessAdminPages(currentUser)) {
    return null;
  }

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Organizational Hierarchy Review</h1>
              <p className="text-slate-600">Review and fix mismatches between users and organizational hierarchy</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadData}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleSyncAllUsers}
                disabled={actionLoading === 'sync-all'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync all users from User Management to Hierarchy"
              >
                {actionLoading === 'sync-all' ? 'Syncing...' : 'Sync All Users to Hierarchy'}
              </button>
              {mismatches.filter(m => m.issue !== 'missing_from_hierarchy' && m.hierarchyEntry).length > 0 && (
                <button
                  onClick={handleFixAll}
                  disabled={actionLoading === 'fix-all'}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'fix-all' ? 'Fixing...' : 'Fix All Fixable Issues'}
                </button>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-2xl font-bold text-slate-900">{users.length}</div>
              <div className="text-sm text-slate-600">Total Users</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-2xl font-bold text-red-600">{mismatches.length}</div>
              <div className="text-sm text-slate-600">Total Issues</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-2xl font-bold text-orange-600">
                {mismatches.filter(m => m.issue === 'missing_from_hierarchy').length}
              </div>
              <div className="text-sm text-slate-600">Not in Hierarchy</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-2xl font-bold text-green-600">{fixedCount}</div>
              <div className="text-sm text-slate-600">Fixed</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by Agency</label>
                <select
                  value={selectedAgency}
                  onChange={(e) => setSelectedAgency(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#D31145] focus:border-transparent"
                >
                  <option value="all">All Agencies</option>
                  {agencies.map(agency => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-800 p-4 rounded-lg mb-6">
              <p className="font-semibold">Error: {error}</p>
            </div>
          )}

          {/* Mismatches Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-700">User Name</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Current Agency</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Current Unit Manager</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Current Rank</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Issue</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Expected</th>
                    <th className="text-center p-4 font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMismatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        {mismatches.length === 0 
                          ? '✅ No mismatches found! All users are correctly assigned to their units and agencies.'
                          : 'No mismatches found for the selected agency.'}
                      </td>
                    </tr>
                  ) : (
                    filteredMismatches.map((mismatch, index) => (
                      <tr key={`${mismatch.user.uid}-${index}`} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-medium">{formatDisplayName(mismatch.user.name)}</td>
                        <td className="p-4">{mismatch.user.agencyName}</td>
                        <td className="p-4">{formatDisplayName(mismatch.user.unitManager) || '-'}</td>
                        <td className="p-4">{mismatch.user.rank}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${getIssueColor(mismatch.issue)}`}>
                            {getIssueLabel(mismatch.issue)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            {mismatch.expectedAgency && (
                              <div>Agency: <span className="font-semibold">{mismatch.expectedAgency}</span></div>
                            )}
                            {mismatch.expectedUnitManager !== undefined && (
                              <div>Unit Mgr: <span className="font-semibold">{formatDisplayName(mismatch.expectedUnitManager) || 'None'}</span></div>
                            )}
                            {mismatch.expectedRank && (
                              <div>Rank: <span className="font-semibold">{mismatch.expectedRank}</span></div>
                            )}
                            {mismatch.issue === 'missing_from_hierarchy' && (
                              <div className="text-red-600 italic">User not found in organizational hierarchy</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {mismatch.issue === 'missing_from_hierarchy' ? (
                            <button
                              onClick={() => handleAddToHierarchy(mismatch.user)}
                              disabled={actionLoading !== null}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Add to Hierarchy
                            </button>
                          ) : mismatch.hierarchyEntry ? (
                            <button
                              onClick={() => handleFixUser(mismatch)}
                              disabled={actionLoading !== null}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === `fix-${mismatch.user.uid}` ? 'Fixing...' : 'Fix'}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Manual review needed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add to Hierarchy Modal */}
          {showAddToHierarchyModal && userToAdd && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Add User to Hierarchy</h2>
                <p className="text-slate-600 mb-4">
                  Add <span className="font-semibold">{formatDisplayName(userToAdd.name)}</span> to the organizational hierarchy.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={userToAdd.name}
                      disabled
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Agency</label>
                    <input
                      type="text"
                      value={userToAdd.agencyName}
                      disabled
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Rank</label>
                    <input
                      type="text"
                      value={userToAdd.rank}
                      disabled
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Unit Manager (Optional)</label>
                    <select
                      value={newHierarchyUnitManager}
                      onChange={(e) => setNewHierarchyUnitManager(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#D31145] focus:border-transparent"
                    >
                      <option value="">None (Top Level)</option>
                      {availableUnitManagers.map(um => (
                        <option key={um} value={um}>{formatDisplayName(um)}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Select the unit manager this person reports to. Leave empty if they are a top-level leader (SUM/ADD).
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddToHierarchyModal(false);
                      setUserToAdd(null);
                      setNewHierarchyUnitManager('');
                    }}
                    disabled={actionLoading === 'add-to-hierarchy'}
                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveToHierarchy}
                    disabled={actionLoading === 'add-to-hierarchy'}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'add-to-hierarchy' ? 'Adding...' : 'Add to Hierarchy'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

