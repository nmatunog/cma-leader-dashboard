'use client';

/**
 * ACS 3.0 Strategic Planning - Overview Tab
 * 
 * Based on: ACS 3.0 Structure 20251101 V2.0.pdf
 * 
 * Key Changes:
 * - FYC Bonus: Up to 40% (from 35%), now FYC-based instead of ANP-based
 * - Case Count Bonus: Up to 20% (from 15%), requires 2 months active
 * - Persistency Multiplier: Starts at 75% (80% multiplier), 82.5%+ gets 100%, 90%+ gets 110%
 *   For Leaders: Applied to (Base DPI + QPB Bonus) using Team Persistency
 * - DPI Rates: Tiered by rank (UM/SUM/AD) and recruit type (Tenured/New)
 * - Self-Override: New benefit based on Active New Recruits (3+ = 10%)
 * - QPB: Quarterly Production Bonus (10% of Direct Advisor FYC)
 */

import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';

export function OverviewTab() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: ['Base', 'Std Bonus', 'High Prod'],
        datasets: [
          {
            label: 'Old',
            data: [100, 110, 135],
            borderColor: '#94A3B8',
          },
          {
            label: 'ACS 3.0',
            data: [100, 120, 160],
            borderColor: '#D31145',
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
  }, []);

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-[#D31145]">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Welcome to ACS 3.0</h2>
        <p className="text-sm sm:text-base text-slate-600">
          Compensation is now driven by <span className="font-bold text-[#D31145]">Productivity</span> and{' '}
          <span className="font-bold text-[#D31145]">Active Recruitment</span>.
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-white to-red-50/30 p-4 sm:p-5 rounded-xl shadow-md border-2 border-red-100 hover:shadow-lg hover:scale-[1.02] transition-all">
          <div className="text-2xl sm:text-3xl font-bold text-[#D31145] mb-1 sm:mb-2">40%</div>
          <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Max FYC Bonus</div>
          <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">Up from 35%. Threshold: ₱350k Quarterly FYC. Now FYC-based (not ANP).</p>
        </div>
        <div className="bg-gradient-to-br from-white to-green-50/30 p-4 sm:p-5 rounded-xl shadow-md border-2 border-green-100 hover:shadow-lg hover:scale-[1.02] transition-all">
          <div className="text-2xl sm:text-3xl font-bold text-[#D31145] mb-1 sm:mb-2">20%</div>
          <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Case Count Bonus</div>
          <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">Up from 15%. Requires 2 months active (was: no zero month).</p>
        </div>
        <div className="bg-gradient-to-br from-white to-blue-50/30 p-4 sm:p-5 rounded-xl shadow-md border-2 border-blue-100 hover:shadow-lg hover:scale-[1.02] transition-all">
          <div className="text-2xl sm:text-3xl font-bold text-[#D31145] mb-1 sm:mb-2">75%</div>
          <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Persistency Starts</div>
          <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">Multiplier starts at 75% (80% bonus). 82.5%+ gets 100%.</p>
        </div>
        <div className="bg-gradient-to-br from-white to-purple-50/30 p-4 sm:p-5 rounded-xl shadow-md border-2 border-purple-100 hover:shadow-lg hover:scale-[1.02] transition-all">
          <div className="text-2xl sm:text-3xl font-bold text-[#D31145] mb-1 sm:mb-2">10%</div>
          <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Self-Override</div>
          <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">New benefit! 3+ Active Recruits = 10% override on personal FYC.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-white p-4 sm:p-5 rounded-xl shadow-md border-2 border-blue-200 hover:shadow-lg hover:scale-[1.02] transition-all">
          <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1 sm:mb-2">DPI Rates</div>
          <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Tiered by Rank</div>
          <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">UM: 20%/30% • SUM: 22.5%/32.5% • AD: 25%/35%<br/>(Tenured/New)</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-white p-4 sm:p-5 rounded-xl shadow-md border-2 border-green-200 hover:shadow-lg hover:scale-[1.02] transition-all">
          <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1 sm:mb-2">QPB</div>
          <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Quarterly Production Bonus</div>
          <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">Tiered 10-30% override on Team Quarterly FYC. Performance-based by Team FYC total.</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-white p-4 sm:p-5 rounded-xl shadow-md border-2 border-purple-200 hover:shadow-lg hover:scale-[1.02] transition-all">
          <div className="text-xl sm:text-2xl font-bold text-purple-600 mb-1 sm:mb-2">Segmentation</div>
          <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Leader Tiers</div>
          <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">Standard • Executive • Premier<br/>Based on ANP, Recruits & Persistency</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">ACS 3.0 Impact Projection</h3>
        <div className="relative w-full h-[250px] sm:h-[300px] lg:h-[350px]">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </section>
  );
}

