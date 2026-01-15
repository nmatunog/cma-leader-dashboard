'use client';

import { formatNumberWithCommas } from '@/components/strategic-planning/utils/number-format';
import type { AgencyComparison } from '@/services/goal-comparison-service';

interface AgencyComparisonTableProps {
  comparison: AgencyComparison;
}

export function AgencyComparisonTable({ comparison }: AgencyComparisonTableProps) {
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
          Agency: {comparison.agencyName}
        </h3>
        {comparison.addName && (
          <p className="text-sm text-slate-600">ADD: {comparison.addName}</p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* FYP Comparison */}
        <div className="border-2 border-slate-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Annual FYP</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Top-Down:</span>
              <span className="font-semibold text-xs">₱{formatNumberWithCommas(Math.round(comparison.topDownFYP))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Bottom-Up:</span>
              <span className="font-semibold text-xs">₱{formatNumberWithCommas(Math.round(comparison.bottomUpFYP))}</span>
            </div>
            <div className={`flex justify-between items-center pt-2 border-t border-slate-200 ${getVarianceColor(comparison.varianceFYP, comparison.varianceFYPPct)} rounded px-2 py-1`}>
              <span className="text-xs font-semibold">Var:</span>
              <span className="font-bold text-xs">
                {getVarianceIcon(comparison.varianceFYP, comparison.varianceFYPPct)} 
                ₱{formatNumberWithCommas(Math.round(Math.abs(comparison.varianceFYP)))}
              </span>
            </div>
          </div>
        </div>

        {/* FYC Comparison */}
        <div className="border-2 border-slate-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Annual FYC</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Top-Down:</span>
              <span className="font-semibold text-xs">₱{formatNumberWithCommas(Math.round(comparison.topDownFYC))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Bottom-Up:</span>
              <span className="font-semibold text-xs">₱{formatNumberWithCommas(Math.round(comparison.bottomUpFYC))}</span>
            </div>
            <div className={`flex justify-between items-center pt-2 border-t border-slate-200 ${getVarianceColor(comparison.varianceFYC, comparison.varianceFYCPct)} rounded px-2 py-1`}>
              <span className="text-xs font-semibold">Var:</span>
              <span className="font-bold text-xs">
                {getVarianceIcon(comparison.varianceFYC, comparison.varianceFYCPct)} 
                ₱{formatNumberWithCommas(Math.round(Math.abs(comparison.varianceFYC)))}
              </span>
            </div>
          </div>
        </div>

        {/* Case Count Comparison */}
        <div className="border-2 border-slate-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Annual Cases</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Top-Down:</span>
              <span className="font-semibold text-xs">{formatNumberWithCommas(Math.round(comparison.topDownCases))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Bottom-Up:</span>
              <span className="font-semibold text-xs">{formatNumberWithCommas(Math.round(comparison.bottomUpCases))}</span>
            </div>
            <div className={`flex justify-between items-center pt-2 border-t border-slate-200 ${getVarianceColor(comparison.varianceCases, comparison.varianceCasesPct)} rounded px-2 py-1`}>
              <span className="text-xs font-semibold">Var:</span>
              <span className="font-bold text-xs">
                {getVarianceIcon(comparison.varianceCases, comparison.varianceCasesPct)} 
                {formatNumberWithCommas(Math.round(Math.abs(comparison.varianceCases)))}
              </span>
            </div>
          </div>
        </div>

        {/* Recruits Comparison */}
        <div className="border-2 border-slate-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">New Recruits</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Top-Down:</span>
              <span className="font-semibold text-xs">{formatNumberWithCommas(Math.round(comparison.topDownRecruits))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Bottom-Up:</span>
              <span className="font-semibold text-xs">{formatNumberWithCommas(Math.round(comparison.bottomUpRecruits))}</span>
            </div>
            <div className={`flex justify-between items-center pt-2 border-t border-slate-200 ${getVarianceColor(comparison.varianceRecruits, comparison.varianceRecruitsPct)} rounded px-2 py-1`}>
              <span className="text-xs font-semibold">Var:</span>
              <span className="font-bold text-xs">
                {getVarianceIcon(comparison.varianceRecruits, comparison.varianceRecruitsPct)} 
                {formatNumberWithCommas(Math.round(Math.abs(comparison.varianceRecruits)))}
              </span>
            </div>
          </div>
        </div>

        {/* End Manpower Comparison */}
        <div className="border-2 border-slate-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">End Manpower</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Top-Down:</span>
              <span className="font-semibold text-xs">{formatNumberWithCommas(Math.round(comparison.topDownEndManpower))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Bottom-Up:</span>
              <span className="font-semibold text-xs">{formatNumberWithCommas(Math.round(comparison.bottomUpEndManpower))}</span>
            </div>
            <div className={`flex justify-between items-center pt-2 border-t border-slate-200 ${getVarianceColor(comparison.varianceEndManpower, comparison.varianceEndManpowerPct)} rounded px-2 py-1`}>
              <span className="text-xs font-semibold">Var:</span>
              <span className="font-bold text-xs">
                {getVarianceIcon(comparison.varianceEndManpower, comparison.varianceEndManpowerPct)} 
                {formatNumberWithCommas(Math.round(Math.abs(comparison.varianceEndManpower)))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Unit Breakdown Table */}
      <div className="mt-6">
        <h4 className="text-lg font-semibold text-slate-900 mb-3">Per-Unit Contribution Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50">
                <th className="text-left p-3 font-semibold text-slate-700">Unit Manager</th>
                <th className="text-right p-3 font-semibold text-slate-700">FYP</th>
                <th className="text-right p-3 font-semibold text-slate-700">FYC</th>
                <th className="text-right p-3 font-semibold text-slate-700">Cases</th>
                <th className="text-right p-3 font-semibold text-slate-700">Recruits</th>
                <th className="text-right p-3 font-semibold text-slate-700">End Manpower</th>
              </tr>
            </thead>
            <tbody>
              {comparison.unitVariances.map((unit, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-medium">{unit.unitManager}</td>
                  <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(unit.unitFYP))}</td>
                  <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(unit.unitFYC))}</td>
                  <td className="p-3 text-right">{formatNumberWithCommas(Math.round(unit.unitCases))}</td>
                  <td className="p-3 text-right">{formatNumberWithCommas(Math.round(unit.unitRecruits))}</td>
                  <td className="p-3 text-right">{formatNumberWithCommas(Math.round(unit.unitEndManpower))}</td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                <td className="p-3">Total (Bottom-Up)</td>
                <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(comparison.bottomUpFYP))}</td>
                <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(comparison.bottomUpFYC))}</td>
                <td className="p-3 text-right">{formatNumberWithCommas(Math.round(comparison.bottomUpCases))}</td>
                <td className="p-3 text-right">{formatNumberWithCommas(Math.round(comparison.bottomUpRecruits))}</td>
                <td className="p-3 text-right">{formatNumberWithCommas(Math.round(comparison.bottomUpEndManpower))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}







