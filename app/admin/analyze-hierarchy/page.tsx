'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

interface Inconsistency {
  type: string;
  user: string;
  rank: string;
  agency: string;
  expected: string;
  actual: string;
  source: 'users' | 'goals';
}

interface AnalysisResult {
  success: boolean;
  summary: {
    total: number;
    byType: Record<string, number>;
    byAgency: Record<string, number>;
  };
  inconsistencies: Inconsistency[];
  stats: {
    totalUsers: number;
    leaders: number;
    advisors: number;
    totalGoals: number;
  };
}

export default function AnalyzeHierarchyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<{ success: boolean; message?: string; result?: any } | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== 'admin' && user.role !== 'superuser')) {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      setFixResult(null);
      
      const response = await fetch('/api/admin/analyze-hierarchy');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze hierarchy');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze hierarchy');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fixInconsistencies = async () => {
    if (!result || result.summary.total === 0) {
      return;
    }

    if (!confirm(`This will fix ${result.summary.total} inconsistencies. Continue?`)) {
      return;
    }

    try {
      setFixing(true);
      setError(null);
      
      const response = await fetch('/api/admin/fix-hierarchy', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fix hierarchy');
      }
      
      setFixResult(data);
      
      // Re-run analysis to show updated results
      await runAnalysis();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fix hierarchy');
      console.error('Error:', err);
    } finally {
      setFixing(false);
    }
  };

  if (authLoading || !user || (user.role !== 'admin' && user.role !== 'superuser')) {
    return null;
  }

  const typeLabels: Record<string, string> = {
    'LEADER_UNITMANAGER_NOT_SELF': 'Leader unitManager not set to self',
    'ADVISOR_UNITMANAGER_MISSING': 'Advisor unitManager missing',
    'ADVISOR_UNITMANAGER_NOT_FOUND': 'Advisor unitManager not found',
    'ADVISOR_UNITMANAGER_NOT_LEADER': 'Advisor unitManager is not a leader',
    'GOAL_LEADER_UNITMANAGER_MISMATCH': 'Goal unitManager mismatch (leader)',
    'GOAL_ADVISOR_UNITMANAGER_MISMATCH': 'Goal unitManager mismatch (advisor)'
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-8">
          <h1 className="text-3xl font-bold mb-6">Analyze Hierarchy Data</h1>
          <p className="text-gray-600 mb-6">
            This tool checks for inconsistencies in user records and goals data based on the unified hierarchy structure.
          </p>

          <div className="bg-white rounded-lg shadow p-6 mb-6 flex gap-4">
            <button
              onClick={runAnalysis}
              disabled={loading || fixing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
            {result && result.summary.total > 0 && (
              <button
                onClick={fixInconsistencies}
                disabled={fixing || loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {fixing ? 'Fixing...' : `Fix ${result.summary.total} Issues`}
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {fixResult && (
            <div className={`border rounded-lg p-4 mb-6 ${fixResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={fixResult.success ? 'text-green-800' : 'text-red-800'}>
                {fixResult.success ? '✅ ' : '❌ '}
                {fixResult.message || (fixResult.success ? 'Fixes applied successfully' : 'Failed to apply fixes')}
              </p>
              {fixResult.result && (
                <div className="mt-2 text-sm">
                  <p>Users fixed: {fixResult.result.usersFixed || 0}</p>
                  <p>Goals fixed: {fixResult.result.goalsFixed || 0}</p>
                  {fixResult.result.errors && fixResult.result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold">Errors:</p>
                      <ul className="list-disc list-inside">
                        {fixResult.result.errors.map((err: string, idx: number) => (
                          <li key={idx} className="text-red-700">{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-4">Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded">
                    <div className="text-sm text-gray-600">Total Inconsistencies</div>
                    <div className="text-2xl font-bold text-blue-600">{result.summary.total}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded">
                    <div className="text-sm text-gray-600">Total Users</div>
                    <div className="text-2xl font-bold text-green-600">{result.stats.totalUsers}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded">
                    <div className="text-sm text-gray-600">Leaders</div>
                    <div className="text-2xl font-bold text-purple-600">{result.stats.leaders}</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded">
                    <div className="text-sm text-gray-600">Advisors</div>
                    <div className="text-2xl font-bold text-orange-600">{result.stats.advisors}</div>
                  </div>
                </div>

                {result.summary.total === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-semibold">✅ No inconsistencies found! Data looks good.</p>
                  </div>
                ) : (
                  <>
                    {/* By Type */}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">By Type</h3>
                      <div className="space-y-2">
                        {Object.entries(result.summary.byType).map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span>{typeLabels[type] || type}</span>
                            <span className="font-semibold text-red-600">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* By Agency */}
                    <div>
                      <h3 className="text-lg font-semibold mb-2">By Agency</h3>
                      <div className="space-y-2">
                        {Object.entries(result.summary.byAgency).map(([agency, count]) => (
                          <div key={agency} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span>{agency}</span>
                            <span className="font-semibold text-red-600">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Detailed List */}
              {result.inconsistencies.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-4">Detailed Inconsistencies</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agency</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {result.inconsistencies.map((inc, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {typeLabels[inc.type] || inc.type}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{inc.user}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{inc.rank}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{inc.agency}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700">{inc.expected}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-red-700">{inc.actual}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${inc.source === 'users' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                {inc.source}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


