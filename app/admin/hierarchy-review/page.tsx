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
  syncHierarchyFromData,
  type OrganizationalHierarchyEntry
} from '@/services/organizational-hierarchy-service';
import type { User, UserRank } from '@/types/user';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeAgencyName, areAgencyNamesEqual, getAgencyNameVariations, getCanonicalAgencyName } from '@/lib/utils/agency-name-normalizer';

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

      // Check for mismatches using normalized agency name comparison
      const wrongAgency = !areAgencyNamesEqual(hierarchyEntry.agencyName, user.agencyName);
      
      // For UMs, SUMs, and ADDs: their unitManager in users collection is always themselves
      // The hierarchy collection's unitManager tracks reporting relationships (different purpose)
      // So we should NOT compare unitManager for leaders (UM, SUM, ADD) - they always have themselves
      const isLeader = user.rank === 'UM' || user.rank === 'SUM' || user.rank === 'ADD';
      const wrongUnitManager = !isLeader && normalizeName(hierarchyEntry.unitManager || '') !== normalizeName(user.unitManager || '');
      
      const wrongRank = hierarchyEntry.rank !== user.rank;

      if (wrongAgency) {
        issues.push({
          user,
          issue: 'wrong_agency',
          expectedAgency: hierarchyEntry.agencyName,
          hierarchyEntry,
        });
      }

      // Only check unitManager for non-leaders (advisors, AUMs)
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
      // Get unique agencies (normalized) to avoid duplicate queries
      const agencyMap = new Map<string, string>(); // normalized -> original
      allUsers.forEach(user => {
        if (user.agencyName) {
          const normalized = normalizeAgencyName(user.agencyName);
          if (!agencyMap.has(normalized)) {
            agencyMap.set(normalized, user.agencyName);
          }
        }
      });
      
      const allHierarchyEntries: OrganizationalHierarchyEntry[] = [];
      const processedEntries = new Set<string>(); // Track by entry ID to avoid duplicates
      
      // Query hierarchy for each unique agency (using original name, but getHierarchyByAgency handles normalization)
      for (const [normalized, originalAgency] of agencyMap.entries()) {
        // Try the original agency name first
        const entries = await getHierarchyByAgency(originalAgency);
        entries.forEach(entry => {
          // Use entry ID or create a unique key to avoid duplicates
          const entryKey = entry.id || `${entry.name}_${normalizeAgencyName(entry.agencyName)}`;
          if (!processedEntries.has(entryKey)) {
            processedEntries.add(entryKey);
            allHierarchyEntries.push(entry);
          }
        });
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

  const handleFixUser = async (mismatch: HierarchyMismatch, fixHierarchy = false) => {
    if (fixHierarchy) {
      // Fix hierarchy entry to match user record
      if (!confirm(`Fix hierarchy entry for ${formatDisplayName(mismatch.user.name)}? This will update the hierarchy entry to match the user's current data.`)) {
        return;
      }

      try {
        setActionLoading(`fix-hierarchy-${mismatch.user.uid}`);
        
        if (mismatch.hierarchyEntry) {
          const result = await saveHierarchyEntry({
            name: mismatch.user.name,
            displayName: mismatch.user.name,
            rank: mismatch.user.rank,
            agencyName: mismatch.user.agencyName,
            unitManager: mismatch.user.unitManager || undefined,
            code: mismatch.user.code,
          });
          
          if (result.success) {
            setFixedCount(prev => prev + 1);
            await loadData();
          } else {
            alert(result.error || 'Failed to fix hierarchy entry');
          }
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to fix hierarchy entry');
      } finally {
        setActionLoading(null);
      }
      return;
    }

    // Fix user record to match hierarchy entry
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
        // Use normalized comparison for agency name
        if (!areAgencyNamesEqual(mismatch.user.agencyName, mismatch.hierarchyEntry.agencyName)) {
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

  const handleSyncHierarchyFromData = async () => {
    if (!confirm('Sync hierarchy from corrected data? This will update all hierarchy entries in Firestore to match the corrected hierarchy-data.ts file. This may take a few moments.')) {
      return;
    }

    try {
      setActionLoading('sync-hierarchy');
      const result = await syncHierarchyFromData();
      
      if (result.success) {
        alert(`Successfully synced ${result.updated} hierarchy entries. ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}`);
      } else {
        alert(`Sync completed with errors. ${result.errors.length} errors occurred.`);
      }
      
      if (result.errors.length > 0) {
        console.error('Sync errors:', result.errors);
      }
      
      await loadData(); // Reload to refresh mismatches
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to sync hierarchy');
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
          // Auto-assign unitManager for leaders (except AUMs):
          // - UMs, SUMs, and ADDs should have themselves as unitManager
          // - AUMs keep their actual unitManager
          let finalUnitManager = user.unitManager;
          if (user.role === 'leader' && user.rank !== 'AUM') {
            if (user.rank === 'UM' || user.rank === 'SUM' || user.rank === 'ADD') {
              finalUnitManager = user.name; // Leaders manage their own units
            }
          }

          // Normalize agency name before syncing to hierarchy (same logic as syncUserToHierarchy)
          const normalizedAgencyName = getCanonicalAgencyName(user.agencyName);

          await saveHierarchyEntry({
            name: user.name,
            displayName: user.name,
            rank: user.rank,
            agencyName: normalizedAgencyName, // Use normalized agency name
            unitManager: finalUnitManager,
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

  const handleFixHierarchyToMatchUsers = async () => {
    const fixableMismatches = mismatches.filter(m => 
      m.issue !== 'missing_from_hierarchy' && m.hierarchyEntry
    );

    if (fixableMismatches.length === 0) {
      alert('No fixable mismatches found.');
      return;
    }

    if (!confirm(`Fix all ${fixableMismatches.length} hierarchy entries to match user records? This will update hierarchy entries to match the user's current agency, unit manager, and rank.`)) {
      return;
    }

    try {
      setActionLoading('fix-hierarchy');
      let fixed = 0;
      let errors = 0;

      for (const mismatch of fixableMismatches) {
        try {
          if (mismatch.hierarchyEntry) {
            // Update hierarchy entry to match user record
            const result = await saveHierarchyEntry({
              name: mismatch.user.name,
              displayName: mismatch.user.name,
              rank: mismatch.user.rank,
              agencyName: mismatch.user.agencyName, // Use user's agency (correct)
              unitManager: mismatch.user.unitManager || undefined,
              code: mismatch.user.code,
            });
            
            if (result.success) {
              fixed++;
            } else {
              errors++;
            }
          }
        } catch (err) {
          console.error(`Error fixing hierarchy for ${mismatch.user.name}:`, err);
          errors++;
        }
      }

      setFixedCount(fixed);
      alert(`Fixed ${fixed} hierarchy entries. ${errors > 0 ? `${errors} errors occurred.` : ''}`);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fix hierarchy entries');
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
            // Use normalized comparison for agency name
            if (!areAgencyNamesEqual(mismatch.user.agencyName, mismatch.hierarchyEntry.agencyName)) {
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

  // Filter mismatches by agency (using normalized comparison)
  const filteredMismatches = selectedAgency === 'all' 
    ? mismatches 
    : mismatches.filter(m => areAgencyNamesEqual(m.user.agencyName, selectedAgency));

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
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={loadData}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
              >
                🔄 Refresh
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Update hierarchy placements for Cebu-Ez Matunog Agency:\n- Jessica G. Baculan → Reports to SUM (Ma Emelyn D. Tan)\n- All other UMs → Report to ADD (Maria Estrella C. Matunog)\n\nThis includes:\n- Evelyn C. Mondero\n- Darlyn L. Perez\n- Mary Kate M. Academia\n- Archie S. Bigno\n- Virginia B. Iway\n\nUMs under SUMs (like Ranet L. Canu-OG under Hermelyn V. Simene) will not be changed.\n\nThis will update the organizational hierarchy entries.')) {
                    return;
                  }
                  try {
                    setActionLoading('update-placements');
                    const response = await fetch('/api/admin/update-hierarchy-placement', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        updates: [
                          // Jessica Baculan reports to SUM Ma Emelyn D. Tan
                          {
                            name: 'JESSICA G. BACULAN',
                            agencyName: 'CEBU-EZ MATUNOG AGENCY',
                            reportsTo: 'MA EMELYN D. TAN'
                          },
                          // All other UMs report to ADD Maria Estrella C. Matunog
                          {
                            name: 'EVELYN C. MONDERO',
                            agencyName: 'CEBU-EZ MATUNOG AGENCY',
                            reportsTo: 'MARIA ESTRELLA C. MATUNOG'
                          },
                          {
                            name: 'DARLYN L. PEREZ',
                            agencyName: 'CEBU-EZ MATUNOG AGENCY',
                            reportsTo: 'MARIA ESTRELLA C. MATUNOG'
                          },
                          {
                            name: 'MARY KATE M. ACADEMIA',
                            agencyName: 'CEBU-EZ MATUNOG AGENCY',
                            reportsTo: 'MARIA ESTRELLA C. MATUNOG'
                          },
                          {
                            name: 'ARCHIE S. BIGNO',
                            agencyName: 'CEBU-EZ MATUNOG AGENCY',
                            reportsTo: 'MARIA ESTRELLA C. MATUNOG'
                          },
                          {
                            name: 'VIRGINIA B. IWAY',
                            agencyName: 'CEBU-EZ MATUNOG AGENCY',
                            reportsTo: 'MARIA ESTRELLA C. MATUNOG'
                          },
                          // Ranet Canu-OG reports to SUM Hermelyn V. Simene (already set, but include for clarity)
                          {
                            name: 'RANET L. CANU-OG',
                            agencyName: 'CEBU-EZ MATUNOG AGENCY',
                            reportsTo: 'HERMELYN V. SIMENE'
                          }
                        ]
                      })
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert(`Successfully updated ${result.summary.successful} hierarchy placements.`);
                      await loadData();
                    } else {
                      alert(`Failed to update some placements. ${result.summary.failed} failed, ${result.summary.successful} succeeded. Check console for details.`);
                      console.error('Update results:', result);
                    }
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to update hierarchy placements');
                  } finally {
                    setActionLoading(null);
                  }
                }}
                disabled={actionLoading === 'update-placements'}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                title="Update hierarchy placements for Cebu-Ez Matunog Agency UMs"
              >
                {actionLoading === 'update-placements' ? 'Updating...' : 'Fix UM Hierarchy Placements'}
              </button>
              <button
                onClick={handleSyncHierarchyFromData}
                disabled={actionLoading === 'sync-hierarchy'}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync hierarchy entries from corrected hierarchy-data.ts file"
              >
                {actionLoading === 'sync-hierarchy' ? 'Syncing...' : 'Sync Hierarchy from Data'}
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
                <>
                  <button
                    onClick={handleFixHierarchyToMatchUsers}
                    disabled={actionLoading === 'fix-hierarchy'}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Update hierarchy entries to match user records (recommended if users are correct)"
                  >
                    {actionLoading === 'fix-hierarchy' ? 'Fixing...' : 'Fix Hierarchy to Match Users'}
                  </button>
                  <button
                    onClick={handleFixAll}
                    disabled={actionLoading === 'fix-all'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Update user records to match hierarchy entries"
                  >
                    {actionLoading === 'fix-all' ? 'Fixing...' : 'Fix Users to Match Hierarchy'}
                  </button>
                </>
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
                            {mismatch.issue === 'missing_from_hierarchy' ? (
                              <div className="text-red-600 italic">User not found in organizational hierarchy</div>
                            ) : (
                              <>
                                <div className="text-xs text-slate-500 mb-1">(From Hierarchy Entry - may be outdated)</div>
                                {mismatch.expectedAgency && (
                                  <div>
                                    Agency: <span className="font-semibold">{mismatch.expectedAgency}</span>
                                    {!areAgencyNamesEqual(mismatch.user.agencyName, mismatch.expectedAgency) && (
                                      <span className="ml-2 text-xs text-slate-500">
                                        (User has: {mismatch.user.agencyName})
                                      </span>
                                    )}
                                  </div>
                                )}
                                {mismatch.expectedUnitManager !== undefined && (
                                  <div>
                                    Unit Mgr: <span className="font-semibold">{formatDisplayName(mismatch.expectedUnitManager) || 'None'}</span>
                                    {normalizeName(mismatch.user.unitManager || '') !== normalizeName(mismatch.expectedUnitManager || '') && (
                                      <span className="ml-2 text-xs text-slate-500">
                                        (User has: {formatDisplayName(mismatch.user.unitManager) || 'None'})
                                      </span>
                                    )}
                                  </div>
                                )}
                                {mismatch.expectedRank && (
                                  <div>
                                    Rank: <span className="font-semibold">{mismatch.expectedRank}</span>
                                    {mismatch.user.rank !== mismatch.expectedRank && (
                                      <span className="ml-2 text-xs text-slate-500">
                                        (User has: {mismatch.user.rank})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </>
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
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleFixUser(mismatch, true)}
                                disabled={actionLoading !== null}
                                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Fix hierarchy entry to match user record"
                              >
                                {actionLoading === `fix-hierarchy-${mismatch.user.uid}` ? 'Fixing...' : 'Fix Hierarchy'}
                              </button>
                              <button
                                onClick={() => handleFixUser(mismatch, false)}
                                disabled={actionLoading !== null}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Fix user record to match hierarchy entry"
                              >
                                {actionLoading === `fix-${mismatch.user.uid}` ? 'Fixing...' : 'Fix User'}
                              </button>
                            </div>
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

