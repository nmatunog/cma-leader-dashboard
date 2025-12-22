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
import { getPPBComparisonData } from '../utils/bonus-calculations';
import { UserState } from '../strategic-planning-app';

interface OverviewTabProps {
  userState: UserState;
}

export function OverviewTab({ userState }: OverviewTabProps) {
  const isLeader = userState.role === 'leader';
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
      
      {isLeader ? (
        /* Leader View Cards */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-white to-blue-50/30 p-4 sm:p-5 rounded-xl shadow-md border-2 border-blue-100 hover:shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">20-35%</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">DPI Rates</div>
              <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">Tiered by rank: UM 20%/30% • SUM 22.5%/32.5% • AD 25%/35%<br/>(Tenured/New Recruits)</p>
            </div>
            <div className="bg-gradient-to-br from-white to-green-50/30 p-4 sm:p-5 rounded-xl shadow-md border-2 border-green-100 hover:shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">10-30%</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">QPB Bonus</div>
              <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">Quarterly Production Bonus. Tiered by Team Quarterly FYC total. Applied to (Base DPI + QPB) with Team Persistency multiplier.</p>
            </div>
            <div className="bg-gradient-to-br from-white to-purple-50/30 p-4 sm:p-5 rounded-xl shadow-md border-2 border-purple-100 hover:shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1 sm:mb-2">75%</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Team Persistency</div>
              <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">Multiplier starts at 75% (80% bonus). 82.5%+ gets 100%. 90%+ gets 110%! Applied to (Base DPI + QPB).</p>
            </div>
            <div className="bg-gradient-to-br from-white to-orange-50/30 p-4 sm:p-5 rounded-xl shadow-md border-2 border-orange-100 hover:shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-1 sm:mb-2">3 Tiers</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Segmentation</div>
              <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">Standard • Executive • Premier<br/>Based on Team ANP, Active Recruits & Team Persistency.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-red-50 to-white p-4 sm:p-5 rounded-xl shadow-md border-2 border-red-200 hover:shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-xl sm:text-2xl font-bold text-red-600 mb-1 sm:mb-2">Personal Production</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Your Own FYC</div>
              <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">Earn FYC Bonus (up to 40%) on your personal production. Plus Self-Override (10%) with 3+ Active Recruits.</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-white p-4 sm:p-5 rounded-xl shadow-md border-2 border-indigo-200 hover:shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-xl sm:text-2xl font-bold text-indigo-600 mb-1 sm:mb-2">Team Override</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Direct Production</div>
              <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">DPI on Tenured & New Recruits. QPB on Team Quarterly FYC. Both multiplied by Team Persistency.</p>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-white p-4 sm:p-5 rounded-xl shadow-md border-2 border-teal-200 hover:shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-xl sm:text-2xl font-bold text-teal-600 mb-1 sm:mb-2">Recruitment Focus</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1 sm:mb-2">Active Recruits</div>
              <p className="text-[10px] sm:text-xs text-slate-600 leading-relaxed">New Recruits get higher DPI rates. Active recruitment drives Self-Override and segmentation tiers.</p>
            </div>
          </div>
        </>
      ) : (
        /* Advisor View Cards - Only Personal Production Bonuses */
        <>
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
        </>
      )}
      
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">ACS 3.0 Impact Projection</h3>
        <div className="relative w-full h-[250px] sm:h-[300px] lg:h-[350px]">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>

      {/* PPB Enhancement Comparison Tables */}
      <PPBComparisonSection />
    </section>
  );
}

function PPBComparisonSection() {
  const comparisonData = getPPBComparisonData();

  return (
    <div className="bg-gradient-to-br from-white via-red-50/20 to-pink-50/20 rounded-xl shadow-lg p-4 sm:p-6 border-2 border-[#D31145]/20">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-2">
          PPB ENHANCEMENT 1: FYC BONUS
        </h2>
        <p className="text-sm sm:text-base font-bold text-slate-700">
          MORE qualifiers & BIGGER rewards up to 40%!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* BEFORE Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 border-2 border-slate-200">
          <div className="mb-3 sm:mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">{comparisonData.before.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 italic">{comparisonData.before.subtitle}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300">
                  <th className="text-left p-2 sm:p-3 font-semibold text-slate-700">Quarterly Net ANP</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-slate-700">Bonus Rate</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.before.tiers.map((tier, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 sm:p-3 font-medium text-slate-800">{tier.label}</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900">
                      {Math.round(tier.rate * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AFTER Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 border-2 border-[#D31145]/30 relative">
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            NEW
          </div>
          <div className="mb-3 sm:mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-[#D31145] mb-1">{comparisonData.after.title}</h3>
            <p className="text-xs sm:text-sm text-slate-600 italic">{comparisonData.after.subtitle}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-[#D31145]/10 to-red-100 border-b-2 border-[#D31145]/30">
                  <th className="text-left p-2 sm:p-3 font-semibold text-slate-700">Quarterly FYC</th>
                  <th className="text-right p-2 sm:p-3 font-semibold text-slate-700">Bonus Rate</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.after.tiers.map((tier, index) => {
                  const isMaxRate = tier.rate === comparisonData.after.maxRate;
                  const isNewAdvisor = tier.label.includes('1st & 2nd year');
                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-slate-100 hover:bg-red-50/50 ${
                        isMaxRate ? 'bg-green-50/50' : ''
                      }`}
                    >
                      <td className="p-2 sm:p-3 font-medium text-slate-800">
                        {tier.label}
                        {isNewAdvisor && (
                          <span className="ml-1 text-[10px] text-blue-600 font-semibold">✨</span>
                        )}
                      </td>
                      <td className="p-2 sm:p-3 text-right">
                        <span className={`font-bold ${
                          isMaxRate ? 'text-green-600 text-base' : 'text-slate-900'
                        }`}>
                          {Math.round(tier.rate * 100)}%
                        </span>
                        {isMaxRate && (
                          <span className="ml-1 text-[10px] text-green-600 font-semibold">⭐</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Enhancements Highlights */}
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
            {comparisonData.after.enhancements.map((enhancement, index) => (
              <div 
                key={index}
                className="flex items-start gap-2 text-xs sm:text-sm bg-green-50/50 p-2 rounded border border-green-200"
              >
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-slate-700 font-medium">{enhancement.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

