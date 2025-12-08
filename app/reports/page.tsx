'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { getAllGoals, getAgencyGoals, type StrategicPlanningGoal } from '@/services/strategic-planning-service';
import { formatNumberWithCommas } from '@/components/strategic-planning/utils/number-format';
import { isAdmin } from '@/lib/admin-config';

interface AggregatedData {
  totalUsers: number;
  totalManpower: number;
  totalFYP: number;
  totalFYC: number;
  totalIncome: number;
  avgMonthlyIncome: number;
  byAgency: Record<string, {
    count: number;
    manpower: number;
    fyp: number;
    fyc: number;
    income: number;
  }>;
  byRank: Record<string, {
    count: number;
    manpower: number;
    fyp: number;
    fyc: number;
    income: number;
  }>;
}

export default function ReportsPage() {
  const [goals, setGoals] = useState<StrategicPlanningGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [filterRank, setFilterRank] = useState<string>('all');
  const [aggregated, setAggregated] = useState<AggregatedData | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<StrategicPlanningGoal | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check admin authorization
    if (typeof window !== 'undefined') {
      const userRole = localStorage.getItem('sp_user_role');
      if (userRole === 'admin' || isAdmin()) {
        setIsAuthorized(true);
        loadGoals();
      } else {
        setIsAuthorized(false);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (goals.length > 0) {
      calculateAggregates();
    }
  }, [goals, filterAgency, filterRank]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const allGoals = await getAllGoals();
      setGoals(allGoals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAggregates = () => {
    const filtered = goals.filter(goal => {
      if (filterAgency !== 'all' && goal.agencyName !== filterAgency) return false;
      if (filterRank !== 'all' && goal.userRank !== filterRank) return false;
      return true;
    });

    const agg: AggregatedData = {
      totalUsers: filtered.length,
      totalManpower: 0,
      totalFYP: 0,
      totalFYC: 0,
      totalIncome: 0,
      avgMonthlyIncome: 0,
      byAgency: {},
      byRank: {},
    };

    filtered.forEach(goal => {
      // Overall totals
      agg.totalManpower += goal.annualManpower;
      agg.totalFYP += goal.annualFYP;
      agg.totalFYC += goal.annualFYC;
      agg.totalIncome += goal.annualIncome;

      // By agency
      if (!agg.byAgency[goal.agencyName]) {
        agg.byAgency[goal.agencyName] = {
          count: 0,
          manpower: 0,
          fyp: 0,
          fyc: 0,
          income: 0,
        };
      }
      agg.byAgency[goal.agencyName].count++;
      agg.byAgency[goal.agencyName].manpower += goal.annualManpower;
      agg.byAgency[goal.agencyName].fyp += goal.annualFYP;
      agg.byAgency[goal.agencyName].fyc += goal.annualFYC;
      agg.byAgency[goal.agencyName].income += goal.annualIncome;

      // By rank
      if (!agg.byRank[goal.userRank]) {
        agg.byRank[goal.userRank] = {
          count: 0,
          manpower: 0,
          fyp: 0,
          fyc: 0,
          income: 0,
        };
      }
      agg.byRank[goal.userRank].count++;
      agg.byRank[goal.userRank].manpower += goal.annualManpower;
      agg.byRank[goal.userRank].fyp += goal.annualFYP;
      agg.byRank[goal.userRank].fyc += goal.annualFYC;
      agg.byRank[goal.userRank].income += goal.annualIncome;
    });

    agg.avgMonthlyIncome = filtered.length > 0 
      ? agg.totalIncome / filtered.length / 12 
      : 0;

    setAggregated(agg);
  };

  const filteredGoals = goals.filter(goal => {
    if (filterAgency !== 'all' && goal.agencyName !== filterAgency) return false;
    if (filterRank !== 'all' && goal.userRank !== filterRank) return false;
    return true;
  });

  const agencies = Array.from(new Set(goals.map(g => g.agencyName))).sort();
  const ranks = Array.from(new Set(goals.map(g => g.userRank))).sort();

  const exportToCSV = () => {
    if (filteredGoals.length === 0) return;

    const headers = [
      'Name', 'Rank', 'Unit Manager', 'Agency', 'Submitted Date',
      'Dec 2025 FYP', 'Dec 2025 FYC', 'Dec 2025 Cases',
      'Q1 Base Manpower', 'Q1 New Recruits', 'Q1 FYP', 'Q1 FYC', 'Q1 Cases',
      'Q2 Base Manpower', 'Q2 New Recruits', 'Q2 FYP', 'Q2 FYC', 'Q2 Cases',
      'Q3 Base Manpower', 'Q3 New Recruits', 'Q3 FYP', 'Q3 FYC', 'Q3 Cases',
      'Q4 Base Manpower', 'Q4 New Recruits', 'Q4 FYP', 'Q4 FYC', 'Q4 Cases',
      'Annual Manpower', 'Annual FYP', 'Annual FYC', 'Annual Income', 'Avg Monthly Income'
    ];

    const rows = filteredGoals.map(goal => [
      goal.userName,
      goal.userRank,
      goal.unitManager,
      goal.agencyName,
      goal.submittedAt.toLocaleDateString(),
      goal.dec2025FYP,
      goal.dec2025FYC,
      goal.dec2025Cases,
      goal.q1.baseManpower,
      goal.q1.newRecruits,
      goal.q1.fyp,
      goal.q1.fyc,
      goal.q1.cases,
      goal.q2.baseManpower,
      goal.q2.newRecruits,
      goal.q2.fyp,
      goal.q2.fyc,
      goal.q2.cases,
      goal.q3.baseManpower,
      goal.q3.newRecruits,
      goal.q3.fyp,
      goal.q3.fyc,
      goal.q3.cases,
      goal.q4.baseManpower,
      goal.q4.newRecruits,
      goal.q4.fyp,
      goal.q4.fyc,
      goal.q4.cases,
      goal.annualManpower,
      goal.annualFYP,
      goal.annualFYC,
      goal.annualIncome,
      goal.avgMonthlyIncome,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `strategic_planning_reports_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show unauthorized message if not admin
  if (!isAuthorized) {
    return (
      <div className="flex h-full min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-red-500 text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Access Required</h2>
              <p className="text-slate-600 mb-4">
                This page is restricted to administrators only. Please log in with admin credentials.
              </p>
              <button
                onClick={() => {
                  localStorage.removeItem('sp_user_role');
                  window.location.href = '/strategic-planning';
                }}
                className="px-6 py-3 bg-gradient-to-r from-[#D31145] to-red-600 text-white font-bold rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
              >
                Go to Login
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Strategic Planning Reports</h1>
            <p className="text-slate-600">View and collate all submitted strategic planning goals</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by Agency</label>
                <select
                  value={filterAgency}
                  onChange={(e) => setFilterAgency(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                >
                  <option value="all">All Agencies</option>
                  {agencies.map(agency => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by Rank</label>
                <select
                  value={filterRank}
                  onChange={(e) => setFilterRank(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                >
                  <option value="all">All Ranks</option>
                  {ranks.map(rank => (
                    <option key={rank} value={rank}>{rank}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={loadGoals}
                  className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  disabled={filteredGoals.length === 0}
                >
                  📥 Export CSV
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D31145]"></div>
              <p className="mt-4 text-slate-600">Loading reports...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-800 p-4 rounded-lg mb-6">
              <p className="font-semibold">Error: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Summary Cards */}
              {aggregated && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 shadow-md border-2 border-blue-200">
                    <p className="text-sm text-blue-700 font-semibold mb-1">Total Submissions</p>
                    <p className="text-2xl font-bold text-blue-900">{aggregated.totalUsers}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 shadow-md border-2 border-green-200">
                    <p className="text-sm text-green-700 font-semibold mb-1">Total Annual FYP</p>
                    <p className="text-2xl font-bold text-green-900">₱{formatNumberWithCommas(Math.round(aggregated.totalFYP))}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 shadow-md border-2 border-purple-200">
                    <p className="text-sm text-purple-700 font-semibold mb-1">Total Annual FYC</p>
                    <p className="text-2xl font-bold text-purple-900">₱{formatNumberWithCommas(Math.round(aggregated.totalFYC))}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 shadow-md border-2 border-amber-200">
                    <p className="text-sm text-amber-700 font-semibold mb-1">Total Annual Income</p>
                    <p className="text-2xl font-bold text-amber-900">₱{formatNumberWithCommas(Math.round(aggregated.totalIncome))}</p>
                  </div>
                </div>
              )}

              {/* Aggregated by Agency */}
              {aggregated && Object.keys(aggregated.byAgency).length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Summary by Agency</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="text-left p-3 font-semibold text-slate-700">Agency</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Users</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Manpower</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Annual FYP</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Annual FYC</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Annual Income</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(aggregated.byAgency).map(([agency, data]) => (
                          <tr key={agency} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3 font-medium">{agency}</td>
                            <td className="p-3 text-right">{data.count}</td>
                            <td className="p-3 text-right">{Math.round(data.manpower)}</td>
                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.fyp))}</td>
                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.fyc))}</td>
                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.income))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Individual Reports Table */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  Individual Reports ({filteredGoals.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left p-3 font-semibold text-slate-700">Name</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Rank</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Unit Manager</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Agency</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Annual FYP</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Annual FYC</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Annual Income</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Submitted</th>
                        <th className="text-center p-3 font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGoals.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500">
                            No reports found. Users need to submit their strategic planning goals.
                          </td>
                        </tr>
                      ) : (
                        filteredGoals.map((goal) => (
                          <tr key={goal.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3 font-medium">{goal.userName}</td>
                            <td className="p-3">{goal.userRank}</td>
                            <td className="p-3">{goal.unitManager}</td>
                            <td className="p-3">{goal.agencyName}</td>
                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(goal.annualFYP))}</td>
                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(goal.annualFYC))}</td>
                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(goal.annualIncome))}</td>
                            <td className="p-3">{goal.submittedAt.toLocaleDateString()}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => setSelectedGoal(goal)}
                                className="px-3 py-1 bg-[#D31145] text-white rounded hover:bg-red-700 text-xs font-semibold"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Detail Modal */}
          {selectedGoal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedGoal(null)}>
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-[#D31145] text-white p-4 flex justify-between items-center">
                  <h3 className="text-xl font-bold">Report Details - {selectedGoal.userName}</h3>
                  <button
                    onClick={() => setSelectedGoal(null)}
                    className="text-white hover:text-gray-200 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-slate-600">Name</p>
                      <p className="font-semibold">{selectedGoal.userName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Rank</p>
                      <p className="font-semibold">{selectedGoal.userRank}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Unit Manager</p>
                      <p className="font-semibold">{selectedGoal.unitManager}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Agency</p>
                      <p className="font-semibold">{selectedGoal.agencyName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Submitted</p>
                      <p className="font-semibold">{selectedGoal.submittedAt.toLocaleString()}</p>
                    </div>
                  </div>

                  <h4 className="font-bold text-lg mb-3">December 2025 Targets</h4>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm text-blue-700">FYP</p>
                      <p className="font-bold text-blue-900">₱{formatNumberWithCommas(Math.round(selectedGoal.dec2025FYP))}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-sm text-green-700">FYC</p>
                      <p className="font-bold text-green-900">₱{formatNumberWithCommas(Math.round(selectedGoal.dec2025FYC))}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <p className="text-sm text-purple-700">Cases</p>
                      <p className="font-bold text-purple-900">{selectedGoal.dec2025Cases}</p>
                    </div>
                  </div>

                  <h4 className="font-bold text-lg mb-3">2026 Quarterly Goals</h4>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="p-2 text-left">Quarter</th>
                          <th className="p-2 text-right">Base Manpower</th>
                          <th className="p-2 text-right">New Recruits</th>
                          <th className="p-2 text-right">FYP</th>
                          <th className="p-2 text-right">FYC</th>
                          <th className="p-2 text-right">Cases</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { q: 'Q1', data: selectedGoal.q1 },
                          { q: 'Q2', data: selectedGoal.q2 },
                          { q: 'Q3', data: selectedGoal.q3 },
                          { q: 'Q4', data: selectedGoal.q4 },
                        ].map(({ q, data }) => (
                          <tr key={q} className="border-b">
                            <td className="p-2 font-medium">{q}</td>
                            <td className="p-2 text-right">{data.baseManpower}</td>
                            <td className="p-2 text-right">{data.newRecruits}</td>
                            <td className="p-2 text-right">₱{formatNumberWithCommas(Math.round(data.fyp))}</td>
                            <td className="p-2 text-right">₱{formatNumberWithCommas(Math.round(data.fyc))}</td>
                            <td className="p-2 text-right">{data.cases}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="font-bold text-lg mb-3">Annual Totals</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-sm text-slate-600">Manpower</p>
                      <p className="font-bold text-slate-900">{Math.round(selectedGoal.annualManpower)}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-sm text-slate-600">Annual FYP</p>
                      <p className="font-bold text-slate-900">₱{formatNumberWithCommas(Math.round(selectedGoal.annualFYP))}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-sm text-slate-600">Annual FYC</p>
                      <p className="font-bold text-slate-900">₱{formatNumberWithCommas(Math.round(selectedGoal.annualFYC))}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-sm text-slate-600">Annual Income</p>
                      <p className="font-bold text-slate-900">₱{formatNumberWithCommas(Math.round(selectedGoal.annualIncome))}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-sm text-slate-600">Avg Monthly Income</p>
                      <p className="font-bold text-slate-900">₱{formatNumberWithCommas(Math.round(selectedGoal.avgMonthlyIncome))}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

