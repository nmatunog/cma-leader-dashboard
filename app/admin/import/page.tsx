'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { convertWorksheetNameToDisplay, parseWorksheetName } from '@/lib/utils/name-formatter';
import { getAgencies } from '@/services/agency-service';
import { batchSaveHierarchyEntries, clearHierarchyForAgency, initializeHardcodedHierarchy } from '@/services/organizational-hierarchy-service';
import { deleteAllGoals, deleteUserGoalsByEmail } from '@/services/strategic-planning-service';
import type { UserRank } from '@/types/user';

interface WorksheetRow {
  leaderUMName: string;
  supName: string;
  agentName: string;
}

interface ParsedRow {
  leaderUMName: string;
  leaderUMDisplayName: string;
  supName: string;
  supDisplayName: string;
  agentName: string;
  agentDisplayName: string;
}

export default function ImportPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [csvData, setCsvData] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [agencies, setAgencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{
    saved: number;
    errors: string[];
  } | null>(null);
  const [showClearGoalsConfirm, setShowClearGoalsConfirm] = useState(false);
  const [clearGoalsResult, setClearGoalsResult] = useState<{ success: boolean; deleted: number; error?: string } | null>(null);
  const [userEmailToDelete, setUserEmailToDelete] = useState<string>('');
  const [showDeleteUserGoalsConfirm, setShowDeleteUserGoalsConfirm] = useState(false);
  const [deleteUserGoalsResult, setDeleteUserGoalsResult] = useState<{ success: boolean; deleted: number; error?: string } | null>(null);

  // Check if user is admin - redirect if not
  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/login');
    }
  }, [authLoading, currentUser, router]);

  // Don't render if not admin or still loading
  if (authLoading) {
    return null;
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  // Load agencies
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        const agencyList = await getAgencies();
        setAgencies(agencyList);
        if (agencyList.length > 0 && !selectedAgency) {
          setSelectedAgency(agencyList[0]);
        }
      } catch (error) {
        console.error('Error loading agencies:', error);
      }
    };
    if (currentUser && currentUser.role === 'admin') {
      loadAgencies();
    }
  }, [currentUser, selectedAgency]);

  const parseCSV = (csv: string): ParsedRow[] => {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    // Find header row (look for LEADER_UM_NAME, SUP_NAME, AGENT_NAME)
    let headerIndex = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const upperLine = lines[i].toUpperCase();
      if (upperLine.includes('LEADER_UM_NAME') || upperLine.includes('UM_NAME') || 
          upperLine.includes('SUP_NAME') || upperLine.includes('AGENT_NAME')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      throw new Error('Could not find header row with LEADER_UM_NAME, SUP_NAME, or AGENT_NAME');
    }

    const headerLine = lines[headerIndex].toUpperCase();
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));

    // Find column indices
    const leaderUMIndex = headers.findIndex(h => 
      h.includes('LEADER_UM') || h.includes('UM_NAME')
    );
    const supIndex = headers.findIndex(h => 
      h.includes('SUP_NAME') || h.includes('SUPERVISOR')
    );
    const agentIndex = headers.findIndex(h => 
      h.includes('AGENT_NAME') || h.includes('AGENT')
    );

    if (leaderUMIndex === -1 || supIndex === -1 || agentIndex === -1) {
      throw new Error('Missing required columns: LEADER_UM_NAME, SUP_NAME, AGENT_NAME');
    }

    const parsedRows: ParsedRow[] = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length > Math.max(leaderUMIndex, supIndex, agentIndex)) {
        const leaderUMName = values[leaderUMIndex];
        const supName = values[supIndex];
        const agentName = values[agentIndex];

        if (leaderUMName && supName && agentName) {
          parsedRows.push({
            leaderUMName,
            leaderUMDisplayName: convertWorksheetNameToDisplay(leaderUMName),
            supName,
            supDisplayName: convertWorksheetNameToDisplay(supName),
            agentName,
            agentDisplayName: convertWorksheetNameToDisplay(agentName),
          });
        }
      }
    }
    return parsedRows;
  };


  const handleParseCSV = () => {
    try {
      setError(null);
      setSuccess(null);
      setImportResults(null);

      if (!csvData.trim()) {
        setError('Please paste CSV data');
        return;
      }

      if (!selectedAgency) {
        setError('Please select an agency');
        return;
      }

      const parsed = parseCSV(csvData);
      setParsedData(parsed);
      setSuccess(`Parsed ${parsed.length} rows successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
      setParsedData([]);
    }
  };

  const handleImport = async () => {
    if (!selectedAgency) {
      setError('Please select an agency');
      return;
    }

    if (parsedData.length === 0) {
      setError('No data to import. Please parse the CSV first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Clear existing hierarchy for this agency (allows re-import)
      await clearHierarchyForAgency(selectedAgency);

      // Build name relationship map
      const nameRelationships = new Map<string, { 
        isLeader: boolean; 
        isSupervisor: boolean; 
        agents: string[];
        hasUMsUnder: boolean;
      }>();
      
      // First pass: collect all relationships
      parsedData.forEach(row => {
        const leaderName = row.leaderUMDisplayName.toUpperCase();
        const supName = row.supDisplayName.toUpperCase();
        const agentName = row.agentDisplayName.toUpperCase();

        // Track leader (UM_NAME column)
        if (!nameRelationships.has(leaderName)) {
          nameRelationships.set(leaderName, { isLeader: true, isSupervisor: false, agents: [], hasUMsUnder: false });
        } else {
          nameRelationships.get(leaderName)!.isLeader = true;
        }

        // Track supervisor (SUP_NAME column)
        if (!nameRelationships.has(supName)) {
          nameRelationships.set(supName, { isLeader: false, isSupervisor: true, agents: [], hasUMsUnder: false });
        } else {
          nameRelationships.get(supName)!.isSupervisor = true;
        }

        // Track agent
        if (!nameRelationships.has(agentName)) {
          nameRelationships.set(agentName, { isLeader: false, isSupervisor: false, agents: [], hasUMsUnder: false });
        }

        // Add agent to supervisor's list
        const supInfo = nameRelationships.get(supName);
        if (supInfo && !supInfo.agents.includes(agentName)) {
          supInfo.agents.push(agentName);
        }
      });

      // Second pass: determine if supervisors have UMs under them
      nameRelationships.forEach((info, name) => {
        if (info.isSupervisor) {
          const hasUMs = parsedData.some(row => {
            const rowSupName = row.supDisplayName.toUpperCase();
            const rowLeaderName = row.leaderUMDisplayName.toUpperCase();
            return rowSupName === name && rowLeaderName !== name && 
                   nameRelationships.get(rowLeaderName)?.isLeader;
          });
          info.hasUMsUnder = hasUMs;
        }
      });

      // Build hierarchy entries from parsed data
      const hierarchyEntries: Array<{
        name: string;
        displayName: string;
        rank: UserRank;
        unitManager?: string;
        agencyName: string;
      }> = [];

      // Process each unique person
      for (const [name, info] of nameRelationships.entries()) {
        try {
          const rank = determineRank(name, nameRelationships);

          // Find the display name from parsedData
          let displayNameToUse: string = '';
          for (const row of parsedData) {
            if (row.agentDisplayName.toUpperCase() === name) {
              displayNameToUse = row.agentDisplayName;
              break;
            } else if (row.leaderUMDisplayName.toUpperCase() === name) {
              displayNameToUse = row.leaderUMDisplayName;
              break;
            } else if (row.supDisplayName.toUpperCase() === name) {
              displayNameToUse = row.supDisplayName;
              break;
            }
          }

          // Fallback: if not found, format the uppercase name
          if (!displayNameToUse) {
            displayNameToUse = name.split(' ').map(n => {
              const trimmed = n.trim();
              if (trimmed.length === 0) return '';
              return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
            }).filter(n => n).join(' ');
          }

          // Determine unitManager based on hierarchy
          let unitManager: string | undefined;
          if (rank === 'ADV' || rank === 'AUM') {
            for (const row of parsedData) {
              if (row.agentDisplayName.toUpperCase() === name) {
                unitManager = row.supDisplayName;
                break;
              }
            }
          } else if (rank === 'UM') {
            for (const row of parsedData) {
              if (row.leaderUMDisplayName.toUpperCase() === name) {
                unitManager = row.supDisplayName;
                break;
              }
            }
          } else if (rank === 'SUM') {
            for (const row of parsedData) {
              if (row.supDisplayName.toUpperCase() === name) {
                const supervisorRow = parsedData.find(r => 
                  r.agentDisplayName.toUpperCase() === name || 
                  r.leaderUMDisplayName.toUpperCase() === name
                );
                if (supervisorRow && supervisorRow.supDisplayName.toUpperCase() !== name) {
                  unitManager = supervisorRow.supDisplayName;
                }
                break;
              }
            }
          }

          hierarchyEntries.push({
            name: displayNameToUse,
            displayName: displayNameToUse,
            rank,
            unitManager,
            agencyName: selectedAgency,
          });
        } catch (err) {
          // Error will be caught in batch save
        }
      }

      // Batch save all hierarchy entries
      const result = await batchSaveHierarchyEntries(hierarchyEntries);

      setImportResults({
        saved: result.saved,
        errors: result.errors,
      });

      if (result.success) {
        setSuccess(`Hierarchy imported: ${result.saved} entries saved. Users can now sign up and select their unit.`);
      } else {
        setError(`Import completed with errors. ${result.saved} entries saved.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Import Organizational Data</h1>
            <p className="text-slate-600">Import worksheet data or initialize from hardcoded hierarchy data</p>
          </div>

          {/* Initialize from Hardcoded Data */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Initialize from Hardcoded Data</h2>
            <p className="text-sm text-slate-600 mb-4">
              Initialize the organizational hierarchy from the hardcoded data in <code className="bg-slate-100 px-2 py-1 rounded text-xs">lib/hierarchy-data.ts</code>
            </p>
            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                setSuccess(null);
                try {
                  const result = await initializeHardcodedHierarchy();
                  if (result.success) {
                    setSuccess(`Initialized ${result.saved} hierarchy entries from hardcoded data.`);
                    setImportResults({
                      saved: result.saved,
                      errors: result.errors,
                    });
                  } else {
                    setError(`Initialization completed with errors. ${result.saved} entries saved.`);
                    setImportResults({
                      saved: result.saved,
                      errors: result.errors,
                    });
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to initialize hierarchy');
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Initializing...' : 'Initialize from Hardcoded Data'}
            </button>
          </div>

          {/* Delete Goals for Specific User */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-orange-200">
            <h2 className="text-xl font-semibold text-orange-800 mb-4">🗑️ Delete Goals for Specific User</h2>
            <p className="text-sm text-slate-600 mb-4">
              Delete all strategic planning goal submissions for a specific user by email address.
            </p>
            <div className="mb-4">
              <label htmlFor="userEmail" className="block text-sm font-medium text-slate-700 mb-2">
                User Email Address
              </label>
              <input
                id="userEmail"
                type="email"
                value={userEmailToDelete}
                onChange={(e) => setUserEmailToDelete(e.target.value)}
                placeholder="e.g., nmatunog@gmail.com"
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                disabled={loading}
              />
            </div>
            {!showDeleteUserGoalsConfirm ? (
              <button
                onClick={() => {
                  if (!userEmailToDelete.trim()) {
                    setError('Please enter an email address');
                    return;
                  }
                  setShowDeleteUserGoalsConfirm(true);
                }}
                className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !userEmailToDelete.trim()}
              >
                Delete Goals for This User
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <p className="font-semibold text-yellow-800 mb-2">Are you sure?</p>
                  <p className="text-sm text-yellow-700">
                    This will delete all strategic planning goals for: <strong>{userEmailToDelete}</strong>
                  </p>
                  <p className="text-xs text-yellow-600 mt-2">This action cannot be undone.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      setDeleteUserGoalsResult(null);
                      setError(null);
                      try {
                        const result = await deleteUserGoalsByEmail(userEmailToDelete);
                        setDeleteUserGoalsResult(result);
                        if (result.success) {
                          setSuccess(`Successfully deleted ${result.deleted} goal(s) for ${userEmailToDelete}.`);
                          setUserEmailToDelete('');
                        } else {
                          setError(result.error || 'Failed to delete user goals');
                        }
                        setShowDeleteUserGoalsConfirm(false);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to delete user goals');
                        setShowDeleteUserGoalsConfirm(false);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? 'Deleting...' : 'Yes, Delete Goals'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteUserGoalsConfirm(false);
                      setDeleteUserGoalsResult(null);
                    }}
                    className="flex-1 bg-slate-300 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-400 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {deleteUserGoalsResult && deleteUserGoalsResult.success && (
              <div className="mt-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg">
                <p className="font-semibold">Success!</p>
                <p>Deleted {deleteUserGoalsResult.deleted} goal submission(s) for {userEmailToDelete}.</p>
              </div>
            )}
            {deleteUserGoalsResult && !deleteUserGoalsResult.success && (
              <div className="mt-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg">
                <p className="font-semibold">Error:</p>
                <p>{deleteUserGoalsResult.error}</p>
              </div>
            )}
          </div>

          {/* Clear All Strategic Planning Goals */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-red-200">
            <h2 className="text-xl font-semibold text-red-800 mb-4">⚠️ Clear All Strategic Planning Goals</h2>
            <p className="text-sm text-slate-600 mb-4">
              <strong className="text-red-700">Warning:</strong> This will permanently delete ALL strategic planning goal submissions from all users. 
              This action cannot be undone. Use this to reset all encoded data so you can create new submissions.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Note: This only deletes goal submissions. User accounts and hierarchy data will remain intact.
            </p>
            {!showClearGoalsConfirm ? (
              <button
                onClick={() => setShowClearGoalsConfirm(true)}
                className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                Clear All Goals
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <p className="font-semibold text-yellow-800 mb-2">Are you sure?</p>
                  <p className="text-sm text-yellow-700">
                    This will delete ALL strategic planning goals. This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      setClearGoalsResult(null);
                      setError(null);
                      try {
                        const result = await deleteAllGoals();
                        setClearGoalsResult(result);
                        if (result.success) {
                          setSuccess(`Successfully deleted ${result.deleted} goal(s).`);
                        } else {
                          setError(result.error || 'Failed to delete goals');
                        }
                        setShowClearGoalsConfirm(false);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to delete goals');
                        setShowClearGoalsConfirm(false);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="flex-1 bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? 'Deleting...' : 'Yes, Delete All Goals'}
                  </button>
                  <button
                    onClick={() => {
                      setShowClearGoalsConfirm(false);
                      setClearGoalsResult(null);
                    }}
                    className="flex-1 bg-slate-300 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-400 transition-colors"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {clearGoalsResult && clearGoalsResult.success && (
              <div className="mt-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg">
                <p className="font-semibold">Success!</p>
                <p>Deleted {clearGoalsResult.deleted} goal submission(s).</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg">
              {success}
            </div>
          )}

          {importResults && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Import Summary:</h3>
              <p>Hierarchy Entries Saved: <span className="font-bold text-blue-700">{importResults.saved}</span></p>
              <p className="text-sm text-blue-600 mt-2">Users can now sign up and select their agency/unit from the imported hierarchy.</p>
              {importResults.errors.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold text-red-700">Errors ({importResults.errors.length}):</p>
                  <ul className="list-disc list-inside text-red-600 text-sm">
                    {importResults.errors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">1. Select Agency & Paste Hierarchy Data</h2>
            <p className="text-sm text-slate-600 mb-4">
              This will import the organizational hierarchy only. Users will sign up later and select their agency/unit.
            </p>
            <div className="mb-4">
              <label htmlFor="agencySelect" className="block text-sm font-medium text-slate-700 mb-2">Select Agency *</label>
              <select
                id="agencySelect"
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                disabled={loading}
              >
                <option value="">-- Select an Agency --</option>
                {agencies.map(agency => (
                  <option key={agency} value={agency}>{agency}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="csvData" className="block text-sm font-medium text-slate-700 mb-2">Paste CSV Data Here (LEADER_UM_NAME, SUP_NAME, AGENT_NAME)</label>
              <textarea
                id="csvData"
                rows={10}
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-sm"
                placeholder={`Example:\n"LEADER_UM_NAME","SUP_NAME","AGENT_NAME"\n"I/GONZALES/ANALYN/D@","I/AGUA/MARIBEL/B@","I/ABANILLA/ANNIE ROSE/P@"\n"I/GONZALES/ANALYN/D@","I/AGUA/MARIBEL/B@","I/GONZALES/ANALYN/D@"`}
                disabled={loading}
              ></textarea>
            </div>
            <button
              onClick={handleParseCSV}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !csvData.trim() || !selectedAgency}
            >
              {loading ? 'Parsing...' : 'Parse CSV'}
            </button>
          </div>

          {parsedData.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">2. Review Parsed Data</h2>
              <div className="overflow-x-auto mb-4 max-h-60">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Leader (Worksheet)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Leader (Display)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Supervisor (Worksheet)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Supervisor (Display)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Agent (Worksheet)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Agent (Display)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {parsedData.map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-800">{row.leaderUMName}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-800">{row.leaderUMDisplayName}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-800">{row.supName}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-800">{row.supDisplayName}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-800">{row.agentName}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-800">{row.agentDisplayName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={handleImport}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || parsedData.length === 0}
              >
                {loading ? 'Importing...' : '3. Import Hierarchy'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
