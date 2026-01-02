'use client';

import { useState, useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { UserState } from '../strategic-planning-app';
import { formatNumberWithCommas, parseCommaNumber, handleNumberInputChange } from '../utils/number-format';
import {
  getFYCBonusRate,
  getDPIRate,
  getSelfOverrideRate,
  getPersistencyMultiplier,
  getQPBRate,
} from '../utils/bonus-calculations';

interface LeaderHQTabProps {
  userState: UserState;
  onGenerateRecruitmentAd: () => void;
  onPushToGoals?: (data: {
    personalFYC: number;
    tenuredCount: number;
    tenuredProd: number;
    newCount: number;
    newProd: number;
  }) => void;
}

export function LeaderHQTab({ userState, onGenerateRecruitmentAd, onPushToGoals }: LeaderHQTabProps) {
  const [personalFYC, setPersonalFYC] = useState(50000);
  const [activeRecruits, setActiveRecruits] = useState(3);
  const [tenuredCount, setTenuredCount] = useState(4);
  const [tenuredProd, setTenuredProd] = useState(20000);
  const [newCount, setNewCount] = useState(2);
  const [newProd, setNewProd] = useState(30000);
  const [leaderRank, setLeaderRank] = useState<'ADD' | 'SUM' | 'UM' | 'AUM'>('UM');
  const [persistency, setPersistency] = useState(82.5);
  const [totalIncome, setTotalIncome] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  // Breakdown values for display
  const [breakdown, setBreakdown] = useState({
    personalFYC: 0,
    personalBonus: 0,
    personalTotal: 0,
    selfOverride: 0,
    dpiTenured: 0,
    dpiNew: 0,
    dpiTotal: 0,
    qpb: 0,
    totalDirectOverride: 0,
    // Additional details
    personalPersMultiplier: 1.0,
    teamPersMultiplier: 1.0,
    totalTeamQuarterlyFYC: 0,
    qpbRate: 0,
    baseQPBQuarterly: 0,
    baseQPBMonthly: 0,
    baseDPI: 0,
    baseDPITenured: 0,
    baseDPINew: 0,
  });
  
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    const pFYC = personalFYC || 0;
    const aRec = activeRecruits || 0;
    const tCount = tenuredCount || 0;
    const tProd = tenuredProd || 0;
    const nCount = newCount || 0;
    const nProd = newProd || 0;

    // Parse comma-separated values
    const pFYCNum = typeof pFYC === 'string' ? parseCommaNumber(pFYC) : pFYC;
    const tProdNum = typeof tProd === 'string' ? parseCommaNumber(tProd) : tProd;
    const nProdNum = typeof nProd === 'string' ? parseCommaNumber(nProd) : nProd;

    // Personal Production Bonus (Quarterly FYC = Monthly * 3)
    // Note: getFYCBonusRate expects QUARTERLY FYC, so we multiply monthly by 3
    const quarterlyFYC = pFYCNum * 3;
    const fycBonusRate = getFYCBonusRate(quarterlyFYC);
    // Personal bonuses use personal persistency (same as persistency input for now)
    const persMultiplierPersonal = getPersistencyMultiplier(persistency);
    const pBonus = pFYCNum * fycBonusRate * persMultiplierPersonal; // Apply persistency multiplier
    const pTotal = pFYCNum + pBonus;

    // ACS 3.0 Self-Override (based on Active New Recruits) - WITH persistency multiplier
    const sOverrideRate = getSelfOverrideRate(aRec);
    const sOverride = pFYCNum * sOverrideRate * persMultiplierPersonal; // Apply persistency multiplier

    // ACS 3.0 Direct Production Incentive (DPI) - Base rates by rank
    // Base DPI is paid monthly (FYC x DPI rate)
    const baseDPITenured = (tCount * tProdNum) * getDPIRate(leaderRank, false);
    const baseDPINew = (nCount * nProdNum) * getDPIRate(leaderRank, true);
    const baseDPI = baseDPITenured + baseDPINew;

    // ACS 3.0 Quarterly Production Bonus (QPB) - Tiered by Team's Quarterly FYC Total
    // QPB is calculated on the total Team FYC for the quarter, not per advisor
    const totalTeamQuarterlyFYC = (tCount * tProdNum * 3) + (nCount * nProdNum * 3); // Total quarterly Team FYC
    const qpbRate = getQPBRate(totalTeamQuarterlyFYC); // Get tiered rate based on total Team FYC
    const baseQPBQuarterly = totalTeamQuarterlyFYC * qpbRate; // Base QPB (quarterly amount) before persistency multiplier
    
    // Convert quarterly QPB to monthly for monthly income calculation
    const baseQPBMonthly = baseQPBQuarterly / 3; // Monthly portion of QPB

    // ACS 3.0 Persistency Multiplier for Leaders: Applied to (Base DPI + QPB Bonus)
    // Uses Team Persistency (2-Year Team Persistency)
    const teamPersMultiplier = getPersistencyMultiplier(persistency); // Team Persistency multiplier
    // DPI is monthly, QPB monthly portion is already calculated above
    const totalDirectOverride = (baseDPI + baseQPBMonthly) * teamPersMultiplier; // Total Direct Override with multiplier
    
    // Calculate DPI and QPB after multiplier (for display purposes)
    const dpiTenured = baseDPITenured * teamPersMultiplier;
    const dpiNew = baseDPINew * teamPersMultiplier;
    const qpb = baseQPBMonthly * teamPersMultiplier; // Monthly QPB after multiplier

    const total = pTotal + sOverride + totalDirectOverride;
    setTotalIncome(Math.round(total));
    
    // Store breakdown values for display
    setBreakdown({
      personalFYC: pFYCNum,
      personalBonus: pBonus,
      personalTotal: pTotal,
      selfOverride: sOverride,
      dpiTenured: dpiTenured,
      dpiNew: dpiNew,
      dpiTotal: dpiTenured + dpiNew,
      qpb: qpb,
      totalDirectOverride: totalDirectOverride,
      // Additional details
      personalPersMultiplier: persMultiplierPersonal,
      teamPersMultiplier: teamPersMultiplier,
      totalTeamQuarterlyFYC: totalTeamQuarterlyFYC,
      qpbRate: qpbRate,
      baseQPBQuarterly: baseQPBQuarterly,
      baseQPBMonthly: baseQPBMonthly,
      baseDPI: baseDPI,
      baseDPITenured: baseDPITenured,
      baseDPINew: baseDPINew,
    });

    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const config: ChartConfiguration = {
        type: 'doughnut',
        data: {
          labels: ['Personal', 'Self', 'DPI (T)', 'DPI (N)', 'QPB'],
          datasets: [
            {
              data: [pTotal, sOverride, dpiTenured, dpiNew, qpb],
              backgroundColor: ['#334155', '#10B981', '#94A3B8', '#D31145', '#3B82F6'],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      };

      chartInstanceRef.current = new Chart(ctx, config);
    }
  }, [personalFYC, activeRecruits, tenuredCount, tenuredProd, newCount, newProd, leaderRank, persistency]);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-slate-800">Unit Simulation</h3>
          
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Leader Rank</label>
            <select
              value={leaderRank}
              onChange={(e) => setLeaderRank(e.target.value as 'ADD' | 'SUM' | 'UM' | 'AUM')}
              className="w-full text-sm p-2 border rounded"
            >
              <option value="ADD">Agency/District Director (ADD)</option>
              <option value="SUM">Senior Unit Manager (SUM)</option>
              <option value="UM">Unit Manager (UM)</option>
              <option value="AUM">Associate Unit Manager (AUM)</option>
            </select>
            <div className="text-xs text-slate-500 mt-1">
              DPI Rates: Tenured {getDPIRate(leaderRank, false) * 100}% / New {getDPIRate(leaderRank, true) * 100}%
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Personal</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400">Monthly FYC</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(personalFYC.toString())}
                    onChange={(e) => {
                      const parsed = parseCommaNumber(e.target.value);
                      if (!isNaN(parsed) && parsed >= 0) {
                        setPersonalFYC(parsed);
                      }
                    }}
                    className="w-full text-sm p-2.5 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Active Recruits</label>
                  <input
                    type="number"
                    value={activeRecruits}
                    onChange={(e) => setActiveRecruits(parseInt(e.target.value) || 0)}
                    className="w-full text-sm p-2.5 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tenured Team</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400">Count</label>
                  <input
                    type="number"
                    value={tenuredCount}
                    onChange={(e) => setTenuredCount(parseInt(e.target.value) || 0)}
                    className="w-full text-sm p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Avg FYC/Mo</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(tenuredProd.toString())}
                    onChange={(e) => {
                      const parsed = parseCommaNumber(e.target.value);
                      if (!isNaN(parsed) && parsed >= 0) {
                        setTenuredProd(parsed);
                      }
                    }}
                    className="w-full text-sm p-2 border rounded"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <label className="block text-xs font-bold text-[#D31145] uppercase mb-2">New Recruits</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">Count</label>
                  <input
                    type="number"
                    value={newCount}
                    onChange={(e) => setNewCount(parseInt(e.target.value) || 0)}
                    className="w-full text-sm p-2 border rounded border-red-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Avg FYC/Mo</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(newProd.toString())}
                    onChange={(e) => {
                      const parsed = parseCommaNumber(e.target.value);
                      if (!isNaN(parsed) && parsed >= 0) {
                        setNewProd(parsed);
                      }
                    }}
                    className="w-full text-sm p-2 border rounded border-red-200"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-xs font-bold text-blue-700 uppercase mb-2">2-Yr Team Persistency (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={persistency}
                onChange={(e) => setPersistency(parseFloat(e.target.value) || 82.5)}
                className="w-full text-sm p-2.5 border-2 border-blue-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm font-bold"
              />
              <div className="text-xs text-blue-600 mt-1">
                {persistency >= 90 ? '✓ 110% multiplier (Max!)' : persistency >= 82.5 ? '✓ 100% multiplier' : persistency >= 75 ? '✓ 80% multiplier' : '⚠️ No bonus (below 75%)'}
              </div>
            </div>
            {onPushToGoals && (
              <button
                onClick={() => {
                  const personalFYCNum = typeof personalFYC === 'string' ? parseCommaNumber(personalFYC) : personalFYC;
                  const tenuredProdNum = typeof tenuredProd === 'string' ? parseCommaNumber(tenuredProd) : tenuredProd;
                  const newProdNum = typeof newProd === 'string' ? parseCommaNumber(newProd) : newProd;
                  
                  onPushToGoals({
                    personalFYC: personalFYCNum || 0,
                    tenuredCount: tenuredCount || 0,
                    tenuredProd: tenuredProdNum || 0,
                    newCount: newCount || 0,
                    newProd: newProdNum || 0,
                  });
                }}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all shadow-md flex items-center justify-center gap-2 text-sm mb-3"
              >
                <span className="text-lg">📊</span> Push to Goal Setting
              </button>
            )}
            <button
              onClick={onGenerateRecruitmentAd}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all shadow-md flex items-center justify-center gap-2 text-sm"
            >
              <span className="text-lg">✨</span> Draft Recruitment Post
            </button>
          </div>
        </div>
        <div className="lg:col-span-8 bg-white rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-red-50/30 rounded-xl p-5 border-2 border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide">Total Monthly Income</h3>
              <div className="text-3xl font-black text-slate-900">₱{totalIncome.toLocaleString()}</div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="relative w-full h-[200px]">
                <canvas ref={chartRef}></canvas>
              </div>
            </div>
          </div>
          
          {/* Calculation Breakdown Card */}
          <div className="mt-4 bg-slate-50 rounded-xl border-2 border-slate-200 overflow-hidden">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 transition-colors"
            >
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span>📊</span>
                Income Calculation Breakdown
              </span>
              <svg
                className={`w-5 h-5 text-slate-600 transition-transform ${showBreakdown ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showBreakdown && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-200 pt-3">
                {/* Personal Production */}
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Personal Production</h4>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Personal Monthly FYC</span>
                      <span className="font-semibold text-slate-800">₱{breakdown.personalFYC.toLocaleString()}</span>
                    </div>
                    <div className="bg-blue-50 rounded p-2 mt-2">
                      <div className="flex justify-between items-center text-blue-700 text-xs">
                        <span>+ Personal FYC Bonus</span>
                        <span className="font-semibold">₱{Math.round(breakdown.personalBonus).toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-blue-600 mt-1">
                        (Applied Persistency Multiplier: {Math.round(breakdown.personalPersMultiplier * 100)}%)
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                      <span className="font-semibold text-slate-700">Personal Total</span>
                      <span className="font-bold text-slate-900">₱{Math.round(breakdown.personalTotal).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Self-Override */}
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Self-Override</h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Self-Override Bonus</span>
                    <span className="font-bold text-green-700">₱{Math.round(breakdown.selfOverride).toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-green-600 mt-1">
                    (Applied Persistency Multiplier: {Math.round(breakdown.personalPersMultiplier * 100)}%)
                  </div>
                </div>
                
                {/* Team Override */}
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Team Override (Direct Override)</h4>
                  <div className="space-y-2 text-sm">
                    {/* DPI Section */}
                    <div className="bg-slate-50 rounded p-2">
                      <div className="text-xs font-semibold text-slate-700 mb-1.5">Direct Production Incentive (DPI)</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Base DPI - Tenured</span>
                          <span className="text-slate-700">₱{Math.round(breakdown.baseDPITenured).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Base DPI - New</span>
                          <span className="text-slate-700">₱{Math.round(breakdown.baseDPINew).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-300">
                          <span className="font-medium text-slate-700">Base DPI Total</span>
                          <span className="font-semibold text-slate-800">₱{Math.round(breakdown.baseDPI).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* QPB Section */}
                    <div className="bg-blue-50 rounded p-2">
                      <div className="text-xs font-semibold text-blue-700 mb-1.5">Quarterly Production Bonus (QPB)</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-700">Team Quarterly FYC</span>
                          <span className="font-semibold text-blue-800">₱{Math.round(breakdown.totalTeamQuarterlyFYC).toLocaleString()}</span>
                        </div>
                        <div className="bg-blue-100 rounded px-2 py-1 mt-1">
                          <div className="flex justify-between items-center">
                            <span className="text-blue-800 font-medium">QPB Tier Rate</span>
                            <span className="font-bold text-blue-900">{Math.round(breakdown.qpbRate * 100)}%</span>
                          </div>
                          <div className="text-[10px] text-blue-700 mt-0.5">
                            {breakdown.totalTeamQuarterlyFYC >= 350000 ? 'Tier: 350k+ (30%)' :
                             breakdown.totalTeamQuarterlyFYC >= 200000 ? 'Tier: 200k-349k (25%)' :
                             breakdown.totalTeamQuarterlyFYC >= 150000 ? 'Tier: 150k-199k (20%)' :
                             breakdown.totalTeamQuarterlyFYC >= 80000 ? 'Tier: 80k-149k (15%)' :
                             breakdown.totalTeamQuarterlyFYC >= 50000 ? 'Tier: 50k-79k (12.5%)' :
                             breakdown.totalTeamQuarterlyFYC >= 30000 ? 'Tier: 30k-49k (10%)' :
                             'Below 30k (No QPB)'}
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-blue-300">
                          <span className="text-blue-700">Base QPB (Quarterly)</span>
                          <span className="font-semibold text-blue-800">₱{Math.round(breakdown.baseQPBQuarterly).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-700">Base QPB (Monthly)</span>
                          <span className="font-semibold text-blue-800">₱{Math.round(breakdown.baseQPBMonthly).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* After Persistency Multiplier */}
                    <div className="bg-green-50 rounded p-2 border border-green-200">
                      <div className="text-xs font-semibold text-green-800 mb-1.5">After Persistency Multiplier ({Math.round(breakdown.teamPersMultiplier * 100)}%)</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">DPI - Tenured Advisors</span>
                          <span className="font-semibold text-green-800">₱{Math.round(breakdown.dpiTenured).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">DPI - New Advisors</span>
                          <span className="font-semibold text-green-800">₱{Math.round(breakdown.dpiNew).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-700">QPB (Monthly)</span>
                          <span className="font-semibold text-green-800">₱{Math.round(breakdown.qpb).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-green-300">
                          <span className="font-bold text-green-800">Total Direct Override</span>
                          <span className="font-black text-green-900 text-sm">₱{Math.round(breakdown.totalDirectOverride).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Grand Total */}
                <div className="bg-gradient-to-r from-slate-100 to-red-50/50 rounded-lg p-3 border-2 border-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700 uppercase">Total Monthly Income</span>
                    <span className="text-2xl font-black text-[#D31145]">₱{totalIncome.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

