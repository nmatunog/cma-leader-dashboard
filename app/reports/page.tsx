'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { getAllGoals, getAgencyGoals, type StrategicPlanningGoal } from '@/services/strategic-planning-service';
import { formatNumberWithCommas } from '@/components/strategic-planning/utils/number-format';
import { useAuth } from '@/contexts/auth-context';

interface QuarterlyData {
  baseManpower: number;
  newRecruits: number;
  fyp: number;
  fyc: number;
  cases: number;
}

interface AggregatedData {
  totalUsers: number;
  totalManpower: number;
  totalNewRecruits: number;
  totalFYP: number;
  totalFYC: number;
  totalIncome: number;
  avgMonthlyIncome: number;
  byAgency: Record<string, {
    count: number;
    manpower: number;
    newRecruits: number;
    fyp: number;
    fyc: number;
    income: number;
  }>;
  byUnit: Record<string, {
    unitManager: string;
    agencyName: string;
    count: number;
    manpower: number;
    newRecruits: number;
    fyp: number;
    fyc: number;
    income: number;
  }>;
  byRank: Record<string, {
    count: number;
    manpower: number;
    newRecruits: number;
    fyp: number;
    fyc: number;
    income: number;
  }>;
  quarterly: {
    q1: QuarterlyData;
    q2: QuarterlyData;
    q3: QuarterlyData;
    q4: QuarterlyData;
  };
}

export default function ReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState<StrategicPlanningGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [filterRank, setFilterRank] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [aggregated, setAggregated] = useState<AggregatedData | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<StrategicPlanningGoal | null>(null);
  const [showQuarterlySummary, setShowQuarterlySummary] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push('/login');
      } else {
        loadGoals();
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (goals.length > 0) {
      calculateAggregates();
    }
  }, [goals, filterAgency, filterRank, filterUnit]);

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
      if (filterUnit !== 'all') {
        const goalUnitName = goal.unitName || `${goal.unitManager}_${goal.agencyName}`;
        if (goalUnitName !== filterUnit) return false;
      }
      return true;
    });

    const agg: AggregatedData = {
      totalUsers: filtered.length,
      totalManpower: 0,
      totalNewRecruits: 0,
      totalFYP: 0,
      totalFYC: 0,
      totalIncome: 0,
      avgMonthlyIncome: 0,
      byAgency: {},
      byUnit: {},
      byRank: {},
      quarterly: {
        q1: { baseManpower: 0, newRecruits: 0, fyp: 0, fyc: 0, cases: 0 },
        q2: { baseManpower: 0, newRecruits: 0, fyp: 0, fyc: 0, cases: 0 },
        q3: { baseManpower: 0, newRecruits: 0, fyp: 0, fyc: 0, cases: 0 },
        q4: { baseManpower: 0, newRecruits: 0, fyp: 0, fyc: 0, cases: 0 },
      },
    };

    // STEP 1: Group goals by unit first (unit-level consolidation)
    const unitGroups: Record<string, StrategicPlanningGoal[]> = {};
    filtered.forEach(goal => {
      const goalUnitName = goal.unitName || `${goal.unitManager}_${goal.agencyName}`;
      if (!unitGroups[goalUnitName]) {
        unitGroups[goalUnitName] = [];
      }
      unitGroups[goalUnitName].push(goal);
    });

    // Helper function to calculate annual new recruits from quarterly data
    const calculateAnnualNewRecruits = (goal: StrategicPlanningGoal): number => {
      return (goal.q1?.newRecruits || 0) + 
             (goal.q2?.newRecruits || 0) + 
             (goal.q3?.newRecruits || 0) + 
             (goal.q4?.newRecruits || 0);
    };

    // STEP 2: Calculate unit totals (consolidate goals within each unit)
    Object.entries(unitGroups).forEach(([unitName, unitGoals]) => {
      const unitTotal = unitGoals.reduce((acc, goal) => {
        const annualNewRecruits = calculateAnnualNewRecruits(goal);
        return {
          count: acc.count + 1,
          manpower: acc.manpower + goal.annualManpower,
          newRecruits: acc.newRecruits + annualNewRecruits,
          fyp: acc.fyp + goal.annualFYP,
          fyc: acc.fyc + goal.annualFYC,
          income: acc.income + goal.annualIncome,
        };
      }, { count: 0, manpower: 0, newRecruits: 0, fyp: 0, fyc: 0, income: 0 });

      // Store unit totals
      const firstGoal = unitGoals[0];
      agg.byUnit[unitName] = {
        unitManager: firstGoal.unitManager,
        agencyName: firstGoal.agencyName,
        count: unitTotal.count,
        manpower: unitTotal.manpower,
        newRecruits: unitTotal.newRecruits,
        fyp: unitTotal.fyp,
        fyc: unitTotal.fyc,
        income: unitTotal.income,
      };
    });

    // STEP 3: Calculate agency totals from unit totals (agency-level consolidation)
    Object.values(agg.byUnit).forEach(unitData => {
      const agencyName = unitData.agencyName;
      if (!agg.byAgency[agencyName]) {
        agg.byAgency[agencyName] = {
          count: 0,
          manpower: 0,
          newRecruits: 0,
          fyp: 0,
          fyc: 0,
          income: 0,
        };
      }
      // Sum unit totals (not individual goals) to get agency totals
      agg.byAgency[agencyName].count += unitData.count;
      agg.byAgency[agencyName].manpower += unitData.manpower;
      agg.byAgency[agencyName].newRecruits += unitData.newRecruits;
      agg.byAgency[agencyName].fyp += unitData.fyp;
      agg.byAgency[agencyName].fyc += unitData.fyc;
      agg.byAgency[agencyName].income += unitData.income;
    });

    // STEP 4: Calculate overall totals from agency totals
    Object.values(agg.byAgency).forEach(agencyData => {
      agg.totalManpower += agencyData.manpower;
      agg.totalNewRecruits += agencyData.newRecruits;
      agg.totalFYP += agencyData.fyp;
      agg.totalFYC += agencyData.fyc;
      agg.totalIncome += agencyData.income;
    });

    // STEP 5: Calculate by rank (still using individual goals for rank breakdown)
    filtered.forEach(goal => {
      if (!agg.byRank[goal.userRank]) {
        agg.byRank[goal.userRank] = {
          count: 0,
          manpower: 0,
          newRecruits: 0,
          fyp: 0,
          fyc: 0,
          income: 0,
        };
      }
      const annualNewRecruits = calculateAnnualNewRecruits(goal);
      agg.byRank[goal.userRank].count++;
      agg.byRank[goal.userRank].manpower += goal.annualManpower;
      agg.byRank[goal.userRank].newRecruits += annualNewRecruits;
      agg.byRank[goal.userRank].fyp += goal.annualFYP;
      agg.byRank[goal.userRank].fyc += goal.annualFYC;
      agg.byRank[goal.userRank].income += goal.annualIncome;
    });

    agg.avgMonthlyIncome = filtered.length > 0 
      ? agg.totalIncome / filtered.length / 12 
      : 0;

    // STEP 6: Calculate quarterly totals (sum all filtered goals' quarterly data)
    filtered.forEach(goal => {
      // Q1 totals
      agg.quarterly.q1.baseManpower += goal.q1?.baseManpower || 0;
      agg.quarterly.q1.newRecruits += goal.q1?.newRecruits || 0;
      agg.quarterly.q1.fyp += goal.q1?.fyp || 0;
      agg.quarterly.q1.fyc += goal.q1?.fyc || 0;
      agg.quarterly.q1.cases += goal.q1?.cases || 0;

      // Q2 totals
      agg.quarterly.q2.baseManpower += goal.q2?.baseManpower || 0;
      agg.quarterly.q2.newRecruits += goal.q2?.newRecruits || 0;
      agg.quarterly.q2.fyp += goal.q2?.fyp || 0;
      agg.quarterly.q2.fyc += goal.q2?.fyc || 0;
      agg.quarterly.q2.cases += goal.q2?.cases || 0;

      // Q3 totals
      agg.quarterly.q3.baseManpower += goal.q3?.baseManpower || 0;
      agg.quarterly.q3.newRecruits += goal.q3?.newRecruits || 0;
      agg.quarterly.q3.fyp += goal.q3?.fyp || 0;
      agg.quarterly.q3.fyc += goal.q3?.fyc || 0;
      agg.quarterly.q3.cases += goal.q3?.cases || 0;

      // Q4 totals
      agg.quarterly.q4.baseManpower += goal.q4?.baseManpower || 0;
      agg.quarterly.q4.newRecruits += goal.q4?.newRecruits || 0;
      agg.quarterly.q4.fyp += goal.q4?.fyp || 0;
      agg.quarterly.q4.fyc += goal.q4?.fyc || 0;
      agg.quarterly.q4.cases += goal.q4?.cases || 0;
    });

    setAggregated(agg);
  };

  const filteredGoals = goals.filter(goal => {
    if (filterAgency !== 'all' && goal.agencyName !== filterAgency) return false;
    if (filterRank !== 'all' && goal.userRank !== filterRank) return false;
    if (filterUnit !== 'all') {
      const goalUnitName = goal.unitName || `${goal.unitManager}_${goal.agencyName}`;
      if (goalUnitName !== filterUnit) return false;
    }
    return true;
  });

  const agencies = Array.from(new Set(goals.map(g => g.agencyName))).sort();
  const ranks = Array.from(new Set(goals.map(g => g.userRank))).sort();
  
  // Get unique units - filter by agency if an agency is selected
  const unitsForFilter = filterAgency !== 'all'
    ? goals.filter(g => g.agencyName === filterAgency)
    : goals;
  const units = Array.from(new Set(unitsForFilter.map(g => {
    const unitName = g.unitName || `${g.unitManager}_${g.agencyName}`;
    return unitName;
  }))).sort();
  
  // Reset unit filter if the selected unit is not in the filtered units
  useEffect(() => {
    if (filterUnit !== 'all' && !units.includes(filterUnit)) {
      setFilterUnit('all');
    }
  }, [filterAgency, units, filterUnit]);

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

  // Show loading state while checking auth
  if (authLoading || (loading && !error)) {
    return (
      <div className="flex h-full min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D31145]"></div>
              <p className="mt-4 text-slate-600">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If not admin, show nothing (will redirect)
  if (!user || user.role !== 'admin') {
    return null;
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by Agency</label>
                <select
                  value={filterAgency}
                  onChange={(e) => {
                    setFilterAgency(e.target.value);
                    setFilterUnit('all'); // Reset unit filter when agency changes
                  }}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                >
                  <option value="all">All Agencies</option>
                  {agencies.map(agency => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by Unit</label>
                <select
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                  disabled={units.length === 0}
                >
                  <option value="all">All Units</option>
                  {units.map(unitName => {
                    // Extract unit manager name from unitName format: "UnitManager_Agency"
                    const unitManagerName = unitName.split('_').slice(0, -1).join('_');
                    return (
                      <option key={unitName} value={unitName}>{unitManagerName}</option>
                    );
                  })}
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
                  <p className="text-sm text-slate-600 mb-4">
                    Agency totals are consolidated from unit totals (units are consolidated from individual advisor/leader goals).
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="text-left p-3 font-semibold text-slate-700">Agency</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Users</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Manpower</th>
                          <th className="text-right p-3 font-semibold text-slate-700">New Recruits</th>
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
                            <td className="p-3 text-right">{Math.round(data.newRecruits)}</td>
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

              {/* Aggregated by Unit */}
              {aggregated && Object.keys(aggregated.byUnit).length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Summary by Unit</h2>
                  <p className="text-sm text-slate-600 mb-4">
                    Unit totals are consolidated from individual advisor/leader goals within each unit.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="text-left p-3 font-semibold text-slate-700">Unit Manager</th>
                          <th className="text-left p-3 font-semibold text-slate-700">Agency</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Users</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Manpower</th>
                          <th className="text-right p-3 font-semibold text-slate-700">New Recruits</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Annual FYP</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Annual FYC</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Annual Income</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(aggregated.byUnit)
                          .sort(([, a], [, b]) => {
                            // Sort by agency first, then by unit manager name
                            if (a.agencyName !== b.agencyName) {
                              return a.agencyName.localeCompare(b.agencyName);
                            }
                            return a.unitManager.localeCompare(b.unitManager);
                          })
                          .map(([unitName, data]) => (
                            <tr key={unitName} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-3 font-medium">{data.unitManager}</td>
                              <td className="p-3">{data.agencyName}</td>
                              <td className="p-3 text-right">{data.count}</td>
                              <td className="p-3 text-right">{Math.round(data.manpower)}</td>
                              <td className="p-3 text-right">{Math.round(data.newRecruits)}</td>
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

              {/* Quarterly Summary Section */}
              {aggregated && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Quarterly Summary</h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Consolidated quarterly totals across all units and agencies
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          if (!aggregated) return;
                          const headers = ['Quarter', 'Base Manpower', 'New Recruits', 'FYP', 'FYC', 'Cases'];
                          const rows = [
                            ['Q1', aggregated.quarterly.q1.baseManpower, aggregated.quarterly.q1.newRecruits, aggregated.quarterly.q1.fyp, aggregated.quarterly.q1.fyc, aggregated.quarterly.q1.cases],
                            ['Q2', aggregated.quarterly.q2.baseManpower, aggregated.quarterly.q2.newRecruits, aggregated.quarterly.q2.fyp, aggregated.quarterly.q2.fyc, aggregated.quarterly.q2.cases],
                            ['Q3', aggregated.quarterly.q3.baseManpower, aggregated.quarterly.q3.newRecruits, aggregated.quarterly.q3.fyp, aggregated.quarterly.q3.fyc, aggregated.quarterly.q3.cases],
                            ['Q4', aggregated.quarterly.q4.baseManpower, aggregated.quarterly.q4.newRecruits, aggregated.quarterly.q4.fyp, aggregated.quarterly.q4.fyc, aggregated.quarterly.q4.cases],
                          ];
                          const csvContent = [
                            headers.join(','),
                            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                          ].join('\n');
                          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement('a');
                          const url = URL.createObjectURL(blob);
                          link.setAttribute('href', url);
                          link.setAttribute('download', `quarterly_summary_${new Date().toISOString().split('T')[0]}.csv`);
                          link.style.visibility = 'hidden';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
                      >
                        <span>📥</span>
                        <span>Download CSV</span>
                      </button>
                      <button
                        onClick={() => setShowQuarterlySummary(!showQuarterlySummary)}
                        className="px-4 py-2 bg-[#D31145] text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
                      >
                        <span>{showQuarterlySummary ? '▼' : '▶'}</span>
                        <span>{showQuarterlySummary ? 'Hide' : 'Show'} Summary</span>
                      </button>
                    </div>
                  </div>

                  {showQuarterlySummary && (
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-slate-200 bg-slate-50">
                            <th className="text-left p-3 font-semibold text-slate-700">Quarter</th>
                            <th className="text-right p-3 font-semibold text-slate-700">Base Manpower</th>
                            <th className="text-right p-3 font-semibold text-slate-700">New Recruits</th>
                            <th className="text-right p-3 font-semibold text-slate-700">Total Manpower</th>
                            <th className="text-right p-3 font-semibold text-slate-700">FYP</th>
                            <th className="text-right p-3 font-semibold text-slate-700">FYC</th>
                            <th className="text-right p-3 font-semibold text-slate-700">Cases</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(['q1', 'q2', 'q3', 'q4'] as const).map((q) => {
                            const data = aggregated.quarterly[q];
                            const totalManpower = data.baseManpower + data.newRecruits;
                            return (
                              <tr key={q} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3 font-bold text-[#D31145]">{q.toUpperCase()}</td>
                                <td className="p-3 text-right">{Math.round(data.baseManpower)}</td>
                                <td className="p-3 text-right">{Math.round(data.newRecruits)}</td>
                                <td className="p-3 text-right font-semibold">{Math.round(totalManpower)}</td>
                                <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.fyp))}</td>
                                <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.fyc))}</td>
                                <td className="p-3 text-right">{Math.round(data.cases)}</td>
                              </tr>
                            );
                          })}
                          {/* Total Row */}
                          <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                            <td className="p-3">TOTAL</td>
                            <td className="p-3 text-right">
                              {Math.round(aggregated.quarterly.q1.baseManpower + aggregated.quarterly.q2.baseManpower + aggregated.quarterly.q3.baseManpower + aggregated.quarterly.q4.baseManpower)}
                            </td>
                            <td className="p-3 text-right">
                              {Math.round(aggregated.quarterly.q1.newRecruits + aggregated.quarterly.q2.newRecruits + aggregated.quarterly.q3.newRecruits + aggregated.quarterly.q4.newRecruits)}
                            </td>
                            <td className="p-3 text-right">
                              {Math.round(
                                (aggregated.quarterly.q1.baseManpower + aggregated.quarterly.q1.newRecruits) +
                                (aggregated.quarterly.q2.baseManpower + aggregated.quarterly.q2.newRecruits) +
                                (aggregated.quarterly.q3.baseManpower + aggregated.quarterly.q3.newRecruits) +
                                (aggregated.quarterly.q4.baseManpower + aggregated.quarterly.q4.newRecruits)
                              )}
                            </td>
                            <td className="p-3 text-right">
                              ₱{formatNumberWithCommas(Math.round(aggregated.quarterly.q1.fyp + aggregated.quarterly.q2.fyp + aggregated.quarterly.q3.fyp + aggregated.quarterly.q4.fyp))}
                            </td>
                            <td className="p-3 text-right">
                              ₱{formatNumberWithCommas(Math.round(aggregated.quarterly.q1.fyc + aggregated.quarterly.q2.fyc + aggregated.quarterly.q3.fyc + aggregated.quarterly.q4.fyc))}
                            </td>
                            <td className="p-3 text-right">
                              {Math.round(aggregated.quarterly.q1.cases + aggregated.quarterly.q2.cases + aggregated.quarterly.q3.cases + aggregated.quarterly.q4.cases)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
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
                        <th className="text-right p-3 font-semibold text-slate-700">New Recruits</th>
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
                          <td colSpan={10} className="p-8 text-center text-slate-500">
                            No reports found. Users need to submit their strategic planning goals.
                          </td>
                        </tr>
                      ) : (
                        filteredGoals.map((goal) => {
                          const annualNewRecruits = (goal.q1?.newRecruits || 0) + 
                                                   (goal.q2?.newRecruits || 0) + 
                                                   (goal.q3?.newRecruits || 0) + 
                                                   (goal.q4?.newRecruits || 0);
                          return (
                            <tr key={goal.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-3 font-medium">{goal.userName}</td>
                              <td className="p-3">{goal.userRank}</td>
                              <td className="p-3">{goal.unitManager}</td>
                              <td className="p-3">{goal.agencyName}</td>
                              <td className="p-3 text-right">{Math.round(annualNewRecruits)}</td>
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
                          );
                        })
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

