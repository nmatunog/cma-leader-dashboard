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
}

export function LeaderHQTab({ userState, onGenerateRecruitmentAd }: LeaderHQTabProps) {
  const [personalFYC, setPersonalFYC] = useState(50000);
  const [activeRecruits, setActiveRecruits] = useState(3);
  const [tenuredCount, setTenuredCount] = useState(4);
  const [tenuredProd, setTenuredProd] = useState(20000);
  const [newCount, setNewCount] = useState(2);
  const [newProd, setNewProd] = useState(30000);
  const [leaderRank, setLeaderRank] = useState<'UM' | 'SUM' | 'AD'>('UM');
  const [persistency, setPersistency] = useState(82.5);
  const [totalIncome, setTotalIncome] = useState(0);
  
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
    const baseQPB = totalTeamQuarterlyFYC * qpbRate; // Base QPB before persistency multiplier

    // ACS 3.0 Persistency Multiplier for Leaders: Applied to (Base DPI + QPB Bonus)
    // Uses Team Persistency (2-Year Team Persistency)
    const teamPersMultiplier = getPersistencyMultiplier(persistency); // Team Persistency multiplier
    const totalDirectOverride = (baseDPI + baseQPB) * teamPersMultiplier; // Total Direct Override with multiplier
    
    // Calculate DPI and QPB after multiplier (for display purposes)
    const dpiTenured = baseDPITenured * teamPersMultiplier;
    const dpiNew = baseDPINew * teamPersMultiplier;
    const qpb = baseQPB * teamPersMultiplier;

    const total = pTotal + sOverride + totalDirectOverride;
    setTotalIncome(Math.round(total));

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
              onChange={(e) => setLeaderRank(e.target.value as 'UM' | 'SUM' | 'AD')}
              className="w-full text-sm p-2 border rounded"
            >
              <option value="UM">Unit Manager (UM)</option>
              <option value="SUM">Senior Unit Manager (SUM)</option>
              <option value="AD">Agency Director (AD)</option>
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
        </div>
      </div>
    </section>
  );
}

