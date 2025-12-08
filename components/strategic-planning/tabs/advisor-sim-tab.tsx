'use client';

import { useState, useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { formatNumberWithCommas, parseCommaNumber, handleNumberInputChange } from '../utils/number-format';
import {
  getFYCBonusRate,
  getCaseCountBonusRate,
  getPersistencyMultiplier,
} from '../utils/bonus-calculations';

export function AdvisorSimTab() {
  // Load from localStorage or use defaults
  const [fyc, setFYC] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('advisor_sim_fyc');
      return saved ? parseInt(saved) : 150000;
    }
    return 150000;
  });
  const [cases, setCases] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('advisor_sim_cases');
      return saved ? parseInt(saved) : 5;
    }
    return 5;
  });
  const [persistency, setPersistency] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('advisor_sim_persistency');
      return saved ? parseFloat(saved) : 82.5;
    }
    return 82.5;
  });
  const [isNewAdvisor, setIsNewAdvisor] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('advisor_sim_is_new');
      return saved === 'true';
    }
    return false;
  });
  const [totalIncome, setTotalIncome] = useState(0);
  const [fycBonus, setFYCBonus] = useState(0);
  const [caseBonus, setCaseBonus] = useState(0);
  const [totalBonus, setTotalBonus] = useState(0);
  
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Save to localStorage when values change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('advisor_sim_fyc', fyc.toString());
    }
  }, [fyc]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('advisor_sim_cases', cases.toString());
    }
  }, [cases]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('advisor_sim_persistency', persistency.toString());
    }
  }, [persistency]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('advisor_sim_is_new', isNewAdvisor.toString());
    }
  }, [isNewAdvisor]);

  useEffect(() => {
    // ACS 3.0 Calculation
    const persMultiplier = getPersistencyMultiplier(persistency);
    
    // FYC Bonus (requires persistency >= 75%)
    const fycBonusRate = getFYCBonusRate(fyc, isNewAdvisor);
    const fycBonusAmount = fyc * fycBonusRate * persMultiplier;
    
    // Case Count Bonus (requires FYC bonus qualification first)
    const caseBonusRate = fycBonusRate > 0 ? getCaseCountBonusRate(cases) : 0;
    const caseBonusAmount = fyc * caseBonusRate * persMultiplier;
    
    const totalBonusAmount = fycBonusAmount + caseBonusAmount;
    const total = fyc + totalBonusAmount;
    
    setFYCBonus(fycBonusAmount);
    setCaseBonus(caseBonusAmount);
    setTotalBonus(totalBonusAmount);
    setTotalIncome(total);
  }, [fyc, cases, persistency, isNewAdvisor]);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const persMultiplier = getPersistencyMultiplier(persistency);
    const fycBonusRate = getFYCBonusRate(fyc, isNewAdvisor);
    const fycBonusAmount = fyc * fycBonusRate * persMultiplier;
    const caseBonusRate = fycBonusRate > 0 ? getCaseCountBonusRate(cases) : 0;
    const caseBonusAmount = fyc * caseBonusRate * persMultiplier;
    const totalBonusAmount = fycBonusAmount + caseBonusAmount;
    const total = fyc + totalBonusAmount;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: ['Base FYC', 'FYC Bonus', 'Case Bonus', 'Total'],
        datasets: [
          {
            label: 'Income Breakdown',
            data: [fyc, fycBonusAmount, caseBonusAmount, total],
            backgroundColor: ['#CBD5E1', '#D31145', '#10B981', '#3B82F6'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    };

    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [fyc, cases, persistency, isNewAdvisor]);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-xl text-[#D31145] mb-4">Advisor Calculator</h2>
          <div className="space-y-4">
            <label className="block text-xs font-bold">Quarterly FYC Target</label>
            <input
              type="range"
              min="10000"
              max="500000"
              step="5000"
              value={fyc}
              onChange={(e) => setFYC(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs font-bold text-[#D31145]">
              <span>{fyc.toLocaleString()}</span>
            </div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Net Case Count</label>
            <input
              type="number"
              value={cases}
              onChange={(e) => setCases(parseInt(e.target.value) || 0)}
              className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm"
            />
            <label className="block text-xs font-bold text-slate-700 mb-2 mt-4">2-Yr Persistency (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={persistency}
              onChange={(e) => setPersistency(parseFloat(e.target.value) || 82.5)}
              className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm"
              placeholder="82.5"
            />
            <div className="text-xs text-slate-500">
              {persistency >= 82.5 ? '✓ 100% multiplier' : persistency >= 75 ? '✓ 80% multiplier' : '⚠️ No bonus (below 75%)'}
            </div>
            <label className="flex items-center gap-2 mt-4 p-3 bg-slate-50 rounded-lg border-2 border-slate-200 hover:border-[#D31145]/30 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={isNewAdvisor}
                onChange={(e) => setIsNewAdvisor(e.target.checked)}
                className="w-4 h-4 text-[#D31145] border-2 border-slate-300 rounded focus:ring-2 focus:ring-[#D31145]/20"
              />
              <span className="text-xs font-semibold text-slate-700">
                1st or 2nd Year Advisor (20k-29k gets 10%)
              </span>
            </label>
          </div>
        </div>
        <div className="lg:col-span-8 bg-white rounded-xl p-6 shadow-sm">
          <div className="bg-gradient-to-br from-slate-50 to-red-50/30 rounded-xl p-5 mb-4 border-2 border-slate-200">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Est. Income</h3>
                <div className="text-3xl font-bold text-slate-800">₱{totalIncome.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-[#D31145] font-bold text-sm">+₱{fycBonus.toLocaleString()}</div>
                <div className="text-xs text-slate-500">FYC Bonus</div>
                {caseBonus > 0 && (
                  <>
                    <div className="text-[#10B981] font-bold text-sm mt-1">+₱{caseBonus.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Case Bonus</div>
                  </>
                )}
                <div className="text-slate-700 font-bold text-xs mt-2 pt-2 border-t border-slate-300">
                  Total Bonus: ₱{totalBonus.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          <div className="relative w-full h-[300px]">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>
      </div>
    </section>
  );
}

