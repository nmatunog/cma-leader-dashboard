'use client';

import { formatNumberWithCommas } from '@/components/strategic-planning/utils/number-format';
import type { UnitComparison } from '@/services/goal-comparison-service';

interface UnitComparisonTableProps {
  comparison: UnitComparison;
}

export function UnitComparisonTable({ comparison }: UnitComparisonTableProps) {
  const getVarianceColor = (variance: number, percentage: number) => {
    if (Math.abs(percentage) <= 5) return 'text-green-600 bg-green-50';
    if (variance < 0) return 'text-red-600 bg-red-50';
    return 'text-orange-600 bg-orange-50';
  };

  const getVarianceIcon = (variance: number, percentage: number) => {
    if (Math.abs(percentage) <= 5) return '✓';
    if (variance < 0) return '↓';
    return '↑';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-900">
          Unit: {comparison.unitManager}
        </h3>
        <p className="text-sm text-slate-600">Agency: {comparison.agencyName}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* FYP Comparison */}
        <div className="border-2 border-slate-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Annual FYP</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Top-Down (UM Team Goal):</span>
              <span className="font-semibold">₱{formatNumberWithCommas(Math.round(comparison.topDownFYP))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Bottom-Up (Advisors + UM):</span>
              <span className="font-semibold">₱{formatNumberWithCommas(Math.round(comparison.bottomUpFYP))}</span>
            </div>
            <div className={`flex justify-between items-center pt-2 border-t border-slate-200 ${getVarianceColor(comparison.varianceFYP, comparison.varianceFYPPct)} rounded px-2 py-1`}>
              <span className="text-xs font-semibold">Variance:</span>
              <span className="font-bold">
                {getVarianceIcon(comparison.varianceFYP, comparison.varianceFYPPct)} 
                ₱{formatNumberWithCommas(Math.round(Math.abs(comparison.varianceFYP)))}
                ({comparison.varianceFYPPct > 0 ? '+' : ''}{comparison.varianceFYPPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* FYC Comparison */}
        <div className="border-2 border-slate-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Annual FYC</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Top-Down (UM Team Goal):</span>
              <span className="font-semibold">₱{formatNumberWithCommas(Math.round(comparison.topDownFYC))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Bottom-Up (Advisors + UM):</span>
              <span className="font-semibold">₱{formatNumberWithCommas(Math.round(comparison.bottomUpFYC))}</span>
            </div>
            <div className={`flex justify-between items-center pt-2 border-t border-slate-200 ${getVarianceColor(comparison.varianceFYC, comparison.varianceFYCPct)} rounded px-2 py-1`}>
              <span className="text-xs font-semibold">Variance:</span>
              <span className="font-bold">
                {getVarianceIcon(comparison.varianceFYC, comparison.varianceFYCPct)} 
                ₱{formatNumberWithCommas(Math.round(Math.abs(comparison.varianceFYC)))}
                ({comparison.varianceFYCPct > 0 ? '+' : ''}{comparison.varianceFYCPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Case Count Comparison */}
        <div className="border-2 border-slate-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Annual Case Count</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Top-Down (UM Team Goal):</span>
              <span className="font-semibold">{formatNumberWithCommas(Math.round(comparison.topDownCases))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Bottom-Up (Advisors + UM):</span>
              <span className="font-semibold">{formatNumberWithCommas(Math.round(comparison.bottomUpCases))}</span>
            </div>
            <div className={`flex justify-between items-center pt-2 border-t border-slate-200 ${getVarianceColor(comparison.varianceCases, comparison.varianceCasesPct)} rounded px-2 py-1`}>
              <span className="text-xs font-semibold">Variance:</span>
              <span className="font-bold">
                {getVarianceIcon(comparison.varianceCases, comparison.varianceCasesPct)} 
                {formatNumberWithCommas(Math.round(Math.abs(comparison.varianceCases)))}
                ({comparison.varianceCasesPct > 0 ? '+' : ''}{comparison.varianceCasesPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-User Breakdown Table - Bottom-Up Calculation */}
      <div className="mt-6">
        <div className="mb-4">
          <h4 className="text-xl font-bold text-slate-900 mb-2">Bottom-Up Calculation Details</h4>
          <p className="text-sm text-slate-600">
            Individual contributions from all users in this unit (UM + Advisors) to the Bottom-Up totals
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <span className="text-slate-600 font-semibold">Total Users:</span>
              <span className="ml-2 font-bold text-slate-900">{comparison.advisorVariances.length}</span>
            </div>
            <div>
              <span className="text-slate-600 font-semibold">Unit Manager:</span>
              <span className="ml-2 font-bold text-slate-900">
                {comparison.advisorVariances.find(a => a.userRank === 'UM' || a.userRank === 'SUM')?.userName || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-600 font-semibold">Advisors:</span>
              <span className="ml-2 font-bold text-slate-900">
                {comparison.advisorVariances.filter(a => a.userRank === 'ADV' || a.userRank === 'AUM').length}
              </span>
            </div>
          </div>
          {/* List of All Users */}
          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">All Users in This Unit:</p>
            <div className="flex flex-wrap gap-2">
              {comparison.advisorVariances
                .sort((a, b) => {
                  // Sort: UM/SUM first, then advisors alphabetically
                  const aIsLeader = a.userRank === 'UM' || a.userRank === 'SUM';
                  const bIsLeader = b.userRank === 'UM' || b.userRank === 'SUM';
                  if (aIsLeader && !bIsLeader) return -1;
                  if (!aIsLeader && bIsLeader) return 1;
                  return a.userName.localeCompare(b.userName);
                })
                .map((user, index) => (
                  <span
                    key={index}
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      user.userRank === 'UM' || user.userRank === 'SUM'
                        ? 'bg-blue-200 text-blue-900 border border-blue-300'
                        : 'bg-green-200 text-green-900 border border-green-300'
                    }`}
                  >
                    {user.userName} ({user.userRank})
                  </span>
                ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto bg-white rounded-lg border-2 border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-gradient-to-r from-slate-100 to-slate-50">
                <th className="text-left p-4 font-bold text-slate-900">Name</th>
                <th className="text-left p-4 font-bold text-slate-900">Rank</th>
                <th className="text-right p-4 font-bold text-slate-900">Personal FYP</th>
                <th className="text-right p-4 font-bold text-slate-900">Personal FYC</th>
                <th className="text-right p-4 font-bold text-slate-900">Personal Cases</th>
              </tr>
            </thead>
            <tbody>
              {comparison.advisorVariances.map((advisor, index) => (
                <tr 
                  key={index} 
                  className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                    advisor.userRank === 'UM' || advisor.userRank === 'SUM' 
                      ? 'bg-blue-50 font-semibold border-l-4 border-l-blue-500' 
                      : ''
                  }`}
                >
                  <td className="p-4 font-medium">{advisor.userName}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      advisor.userRank === 'UM' || advisor.userRank === 'SUM'
                        ? 'bg-blue-100 text-blue-800'
                        : advisor.userRank === 'ADV' || advisor.userRank === 'AUM'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {advisor.userRank}
                    </span>
                  </td>
                  <td className="p-4 text-right font-semibold">₱{formatNumberWithCommas(Math.round(advisor.personalFYP))}</td>
                  <td className="p-4 text-right font-semibold">₱{formatNumberWithCommas(Math.round(advisor.personalFYC))}</td>
                  <td className="p-4 text-right font-semibold">{formatNumberWithCommas(Math.round(advisor.personalCases))}</td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="border-t-4 border-slate-400 bg-gradient-to-r from-slate-200 to-slate-300 font-bold">
                <td className="p-4" colSpan={2}>
                  <span className="text-slate-900">Total Bottom-Up</span>
                  <span className="ml-2 text-xs text-slate-600 font-normal">(UM + All Advisors)</span>
                </td>
                <td className="p-4 text-right text-lg">₱{formatNumberWithCommas(Math.round(comparison.bottomUpFYP))}</td>
                <td className="p-4 text-right text-lg">₱{formatNumberWithCommas(Math.round(comparison.bottomUpFYC))}</td>
                <td className="p-4 text-right text-lg">{formatNumberWithCommas(Math.round(comparison.bottomUpCases))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
          <p className="text-sm text-slate-700">
            <strong>Note:</strong> The Bottom-Up calculation is the sum of all individual personal goals set by the Unit Manager (UM/SUM) and all Advisors in this unit. 
            This represents the aggregate of bottom-up goal setting from all team members.
          </p>
        </div>
      </div>
    </div>
  );
}

