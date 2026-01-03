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
 * - DPI Rates: Tiered by rank (ADD/SUM/UM/AUM) and recruit type (Tenured/New)
 * - Self-Override: New benefit based on Active New Recruits (3+ = 10%)
 * - QPB: Quarterly Production Bonus (10% of Direct Advisor FYC)
 */

import { useEffect, useRef, useState } from 'react';
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
  const [expandedCard, setExpandedCard] = useState<'fycBonus' | 'caseCountBonus' | 'persistencyMultiplier' | 'personalPersistencyMultiplier' | 'selfOverride' | 'dpiRates' | 'qpbBonus' | 'teamPersistency' | 'segmentation' | 'indirectOverride' | null>(null);

  const toggleCard = (card: 'fycBonus' | 'caseCountBonus' | 'persistencyMultiplier' | 'personalPersistencyMultiplier' | 'selfOverride' | 'dpiRates' | 'qpbBonus' | 'teamPersistency' | 'segmentation' | 'indirectOverride') => {
    setExpandedCard(prev => prev === card ? null : card);
  };

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
            tension: 0.4, // Smooth curve (0 = straight lines, 1 = very curved)
            fill: false,
          },
          {
            label: 'ACS 3.0',
            data: [100, 120, 160],
            borderColor: '#D31145',
            tension: 0.4, // Smooth curve
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
        },
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
    <section className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 md:p-6 lg:p-8 border-l-4 border-[#D31145]">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2 sm:mb-3 leading-tight">Welcome to ACS 3.0</h2>
        <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed">
          Compensation is now driven by <span className="font-bold text-[#D31145]">Productivity</span> and{' '}
          <span className="font-bold text-[#D31145]">Active Recruitment</span>.
        </p>
      </div>
      
      {isLeader ? (
        /* Leader View - Separate Cards for Each Feature */
        <>
          {/* Personal Production Features */}
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 leading-tight">Personal Production</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {/* FYC Bonus - Expandable Card */}
              <FYCBonusCard
                isExpanded={expandedCard === 'fycBonus'}
                onToggle={() => toggleCard('fycBonus')}
                isLeader={true}
              />
              {/* Self-Override - Expandable Card */}
              <SelfOverrideCard
                isExpanded={expandedCard === 'selfOverride'}
                onToggle={() => toggleCard('selfOverride')}
              />
              {/* Case Count Bonus - Expandable Card */}
              <CaseCountBonusCard
                isExpanded={expandedCard === 'caseCountBonus'}
                onToggle={() => toggleCard('caseCountBonus')}
              />
              {/* Personal Persistency Multiplier - Expandable Card */}
              <PersistencyMultiplierCard
                isExpanded={expandedCard === 'personalPersistencyMultiplier'}
                onToggle={() => toggleCard('personalPersistencyMultiplier')}
                isAdvisor={true}
              />
            </div>
            
            {/* Personal Production Expansion Content - Hidden by default, shown when a card is expanded */}
            {(expandedCard === 'fycBonus' || expandedCard === 'caseCountBonus' || expandedCard === 'personalPersistencyMultiplier' || expandedCard === 'selfOverride') && (
              <div className="mt-4 sm:mt-5 md:mt-6">
                {expandedCard === 'fycBonus' ? (
                  <PPBComparisonSection />
                ) : expandedCard === 'caseCountBonus' ? (
                  <CaseCountBonusExpansion />
                ) : expandedCard === 'personalPersistencyMultiplier' ? (
                  <PersistencyMultiplierExpansion isAdvisor={true} />
                ) : expandedCard === 'selfOverride' ? (
                  <SelfOverrideExpansion />
                ) : null}
              </div>
            )}
          </div>

          {/* Team Override Features - Hidden when Personal Production expansion is shown */}
          {!(expandedCard === 'fycBonus' || expandedCard === 'caseCountBonus' || expandedCard === 'personalPersistencyMultiplier' || expandedCard === 'selfOverride') && (
            <div className="space-y-3 sm:space-y-4 md:space-y-5">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 leading-tight">Team Override</h3>
                <p className="text-sm sm:text-base md:text-lg font-semibold text-[#D31145] mt-1 sm:mt-2 leading-relaxed">Team Override up to 71.5% for New Advisors!</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                {/* DPI Rates - Expandable Card */}
                <DPIRatesCard
                  isExpanded={expandedCard === 'dpiRates'}
                  onToggle={() => toggleCard('dpiRates')}
                />
                {/* QPB Bonus - Expandable Card */}
                <QPBBonusCard
                  isExpanded={expandedCard === 'qpbBonus'}
                  onToggle={() => toggleCard('qpbBonus')}
                />
                {/* Team Persistency Multiplier - Expandable Card */}
                <TeamPersistencyCard
                  isExpanded={expandedCard === 'teamPersistency'}
                  onToggle={() => toggleCard('teamPersistency')}
                />
              </div>
              
              {/* Team Override Expansion Content - Hidden by default, shown when a card is expanded */}
              {(expandedCard === 'dpiRates' || expandedCard === 'qpbBonus' || expandedCard === 'teamPersistency') && (
                <div className="mt-4 sm:mt-5 md:mt-6">
                  {expandedCard === 'dpiRates' ? (
                    <DPIRatesExpansion />
                  ) : expandedCard === 'qpbBonus' ? (
                    <QPBBonusExpansion />
                  ) : expandedCard === 'teamPersistency' ? (
                    <TeamPersistencyExpansion />
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Segmentation & Recruitment Features - Hidden when Personal Production or Team Override expansion is shown */}
          {!(expandedCard === 'fycBonus' || expandedCard === 'caseCountBonus' || expandedCard === 'personalPersistencyMultiplier' || expandedCard === 'selfOverride' || expandedCard === 'dpiRates' || expandedCard === 'qpbBonus' || expandedCard === 'teamPersistency') && (
            <div className="space-y-3 sm:space-y-4 md:space-y-5">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 leading-tight">Segmentation & Recruitment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                {/* Leader Segmentation - Expandable Card */}
                <LeaderSegmentationCard
                  isExpanded={expandedCard === 'segmentation'}
                  onToggle={() => toggleCard('segmentation')}
                />
                {/* Indirect Overrides - Expandable Card */}
                <IndirectOverrideCard
                  isExpanded={expandedCard === 'indirectOverride'}
                  onToggle={() => toggleCard('indirectOverride')}
                />
                <div className="bg-gradient-to-br from-white to-teal-50/30 p-4 sm:p-5 md:p-6 rounded-xl shadow-md border-2 border-teal-100 hover:shadow-lg hover:scale-[1.02] transition-all">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-teal-600 mb-2 sm:mb-3 leading-none">Higher Rates</div>
                  <div className="text-xs sm:text-sm md:text-base font-bold text-slate-800 uppercase mb-2 sm:mb-3 leading-tight">New Recruits</div>
                  <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">New Recruits get higher DPI rates (5% more than tenured). Active recruitment drives Self-Override and segmentation tiers.</p>
                </div>
              </div>
              
              {/* Segmentation & Recruitment Expansion Content - Hidden by default, shown when a card is expanded */}
              {(expandedCard === 'segmentation' || expandedCard === 'indirectOverride') && (
                <div className="mt-4 sm:mt-5 md:mt-6">
                  {expandedCard === 'segmentation' ? (
                    <LeaderSegmentationExpansion />
                  ) : expandedCard === 'indirectOverride' ? (
                    <IndirectOverrideExpansion />
                  ) : null}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Advisor View - Separate Cards for Each Feature */
        <>
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 leading-tight">Personal Production Bonuses</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {/* FYC Bonus - Expandable Card */}
              <FYCBonusCard
                isExpanded={expandedCard === 'fycBonus'}
                onToggle={() => toggleCard('fycBonus')}
              />
              {/* Case Count Bonus - Expandable Card */}
              <CaseCountBonusCard
                isExpanded={expandedCard === 'caseCountBonus'}
                onToggle={() => toggleCard('caseCountBonus')}
              />
              {/* Persistency Multiplier - Expandable Card */}
              <PersistencyMultiplierCard
                isExpanded={expandedCard === 'persistencyMultiplier'}
                onToggle={() => toggleCard('persistencyMultiplier')}
                isAdvisor={true}
              />
            </div>
            
            {/* Advisor View Expansion Content - Hidden by default, shown when a card is expanded */}
            {(expandedCard === 'fycBonus' || expandedCard === 'caseCountBonus' || expandedCard === 'persistencyMultiplier') && (
              <div className="mt-4 sm:mt-5 md:mt-6">
                {expandedCard === 'fycBonus' ? (
                  <PPBComparisonSection />
                ) : expandedCard === 'caseCountBonus' ? (
                  <CaseCountBonusExpansion />
                ) : expandedCard === 'persistencyMultiplier' ? (
                  <PersistencyMultiplierExpansion isAdvisor={true} />
                ) : null}
              </div>
            )}
          </div>
        </>
      )}

      {/* Chart moved to bottom */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 md:p-6 lg:p-8">
        <h3 className="font-bold text-base sm:text-lg md:text-xl mb-3 sm:mb-4 md:mb-5 leading-tight">ACS 3.0 Impact Projection</h3>
        <div className="relative w-full h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px]">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </section>
  );
}

function PPBComparisonSection() {
  const comparisonData = getPPBComparisonData();

  return (
    <div className="bg-gradient-to-br from-white via-red-50/20 to-pink-50/20 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8 border-2 border-[#D31145]/20">
      <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-2 sm:mb-3 leading-tight">
          PPB ENHANCEMENT 1: FYC BONUS
        </h2>
        <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 leading-relaxed">
          MORE qualifiers & BIGGER rewards up to 40%!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
        {/* BEFORE Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-slate-200">
          <div className="mb-3 sm:mb-4 md:mb-5">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 mb-2 sm:mb-3 leading-tight">{comparisonData.before.title}</h3>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 italic leading-relaxed">{comparisonData.before.subtitle}</p>
          </div>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-sm sm:text-base md:text-lg">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300">
                    <th className="text-left p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Quarterly Net ANP</th>
                    <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Bonus Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonData.before.tiers.map((tier, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">{tier.label}</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">
                        {Math.round(tier.rate * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AFTER Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-[#D31145]/30 relative">
          <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
            NEW
          </div>
          <div className="mb-3 sm:mb-4 md:mb-5 pr-12 sm:pr-16">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-[#D31145] mb-2 sm:mb-3 leading-tight">{comparisonData.after.title}</h3>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 italic leading-relaxed">{comparisonData.after.subtitle}</p>
          </div>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-sm sm:text-base md:text-lg">
                <thead>
                  <tr className="bg-gradient-to-r from-[#D31145]/10 to-red-100 border-b-2 border-[#D31145]/30">
                    <th className="text-left p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Quarterly FYC</th>
                    <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Bonus Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonData.after.tiers.map((tier, index) => {
                    const isMaxRate = tier.rate === comparisonData.after.maxRate;
                    const isNewAdvisor = tier.label.includes('1st & 2nd year');
                    return (
                      <tr 
                        key={index} 
                        className={`hover:bg-red-50/50 transition-colors ${
                          isMaxRate ? 'bg-green-50/50' : ''
                        }`}
                      >
                        <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">
                          {tier.label}
                          {isNewAdvisor && (
                            <span className="ml-1.5 sm:ml-2 text-sm sm:text-base text-blue-600 font-semibold">✨</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 md:p-5 text-right leading-relaxed">
                          <span className={`font-bold ${
                            isMaxRate ? 'text-green-600 text-base sm:text-lg md:text-xl' : 'text-slate-900'
                          }`}>
                            {Math.round(tier.rate * 100)}%
                          </span>
                          {isMaxRate && (
                            <span className="ml-1.5 sm:ml-2 text-sm sm:text-base text-green-600 font-semibold">⭐</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Enhancements Highlights */}
          <div className="mt-4 sm:mt-5 md:mt-6 pt-3 sm:pt-4 border-t border-slate-200 space-y-3 sm:space-y-4">
            {comparisonData.after.enhancements.map((enhancement, index) => (
              <div 
                key={index}
                className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 rounded-lg border border-green-200"
              >
                <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
                <span className="text-slate-700 font-medium leading-relaxed">{enhancement.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// FYC Bonus Expandable Card Component (Summary Only)
function FYCBonusCard({ 
  isExpanded, 
  onToggle,
  isLeader = false 
}: { 
  isExpanded: boolean; 
  onToggle: () => void;
  isLeader?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className="bg-gradient-to-br from-white to-red-50/30 p-4 sm:p-5 md:p-6 rounded-xl shadow-md border-2 border-red-100 hover:shadow-lg hover:scale-[1.02] transition-all text-left w-full flex items-center justify-between group min-h-[100px] sm:min-h-[120px]"
    >
      <div className="flex-1 min-w-0">
        <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#D31145] mb-2 sm:mb-3 leading-none">40%</div>
        <div className="text-xs sm:text-sm md:text-base font-bold text-slate-800 uppercase mb-2 sm:mb-3 leading-tight">
          {isLeader ? 'FYC Bonus' : 'Max FYC Bonus'}
        </div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">
          {isLeader 
            ? 'Earn up to 40% bonus on your personal FYC. Tiered by quarterly production with persistency multiplier.'
            : 'Up from 35%. Threshold: ₱350k Quarterly FYC. Now FYC-based (not ANP).'
          }
        </p>
      </div>
      <div className="ml-3 sm:ml-4 flex-shrink-0">
        <div className="text-slate-400 group-hover:text-[#D31145] transition-colors">
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// Case Count Bonus Expandable Card Component (Summary Only)
function CaseCountBonusCard({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="bg-gradient-to-br from-white to-green-50/30 p-4 sm:p-5 md:p-6 rounded-xl shadow-md border-2 border-green-100 hover:shadow-lg hover:scale-[1.02] transition-all text-left w-full flex items-center justify-between group min-h-[100px] sm:min-h-[120px]"
    >
      <div className="flex-1 min-w-0">
        <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#D31145] mb-2 sm:mb-3 leading-none">20%</div>
        <div className="text-xs sm:text-sm md:text-base font-bold text-slate-800 uppercase mb-2 sm:mb-3 leading-tight">Case Count Bonus</div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">Up from 15%. Requires 2 months active (was: no zero month).</p>
      </div>
      <div className="ml-3 sm:ml-4 flex-shrink-0">
        <div className="text-slate-400 group-hover:text-[#D31145] transition-colors">
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// Case Count Bonus Full Expansion Component
function CaseCountBonusExpansion() {
  return (
    <div className="bg-gradient-to-br from-white via-green-50/20 to-green-50/20 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8 border-2 border-green-100">
      <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-2 sm:mb-3 leading-tight">
          PPB ENHANCEMENT 2: CASE COUNT BONUS
        </h2>
        <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 leading-relaxed">
          Get up to 20% MORE with additional cases!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
        {/* BEFORE Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-slate-200">
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 mb-3 sm:mb-4 md:mb-5 leading-tight">BEFORE</h4>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-sm sm:text-base md:text-lg">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300">
                    <th className="text-left p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Quarterly Net Case Count</th>
                    <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Bonus Rates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">9 and up</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">15%</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">7-8</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">12%</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">5-6</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">8%</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">3-4</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">4%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 sm:mt-5 md:mt-6 pt-3 sm:pt-4 border-t border-slate-200">
            <p className="text-sm sm:text-base md:text-lg text-slate-600 font-medium leading-relaxed">
              <span className="font-bold">Requirement:</span> No Zero Month (should have at least 1 case count per month within the quarter)
            </p>
          </div>
        </div>

        {/* AFTER Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-[#D31145]/30 relative">
          <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
            NEW
          </div>
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-[#D31145] mb-3 sm:mb-4 md:mb-5 leading-tight pr-12 sm:pr-16">AFTER</h4>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-sm sm:text-base md:text-lg">
                <thead>
                  <tr className="bg-gradient-to-r from-[#D31145]/10 to-red-100 border-b-2 border-[#D31145]/30">
                    <th className="text-left p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Quarterly Net Case Count*</th>
                    <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Bonus Rates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-red-50/50 bg-green-50/50 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">9 and up</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-green-600 text-base sm:text-lg md:text-xl leading-relaxed">20% ⭐</td>
                  </tr>
                  <tr className="hover:bg-red-50/50 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">7-8</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">15%</td>
                  </tr>
                  <tr className="hover:bg-red-50/50 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">5-6</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">10%</td>
                  </tr>
                  <tr className="hover:bg-red-50/50 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">3-4</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">5%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 sm:mt-5 md:mt-6 pt-3 sm:pt-4 border-t border-slate-200 space-y-3 sm:space-y-4">
            <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 rounded-lg border border-green-200">
              <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
              <span className="text-slate-700 font-medium leading-relaxed">Higher Case Count Bonus Rates up to 20%!</span>
            </div>
            <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 rounded-lg border border-green-200">
              <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
              <span className="text-slate-700 font-medium leading-relaxed">Lower Activity Requirement!</span>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 font-medium leading-relaxed">
              <span className="font-bold">Requirement:</span> 2 Months Active (should have at least 1 case count for 2 months within the quarter)
            </p>
            <div className="space-y-1 sm:space-y-2 pt-2">
              <p className="text-xs sm:text-sm md:text-base text-slate-500 italic leading-relaxed">
                *Please refer to ACS module for net case count definition
              </p>
              <p className="text-xs sm:text-sm md:text-base text-slate-500 italic leading-relaxed">
                *Advisor needs to be qualified for FYC bonus first to get Case Count Bonus
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Persistency Multiplier Expandable Card Component (Summary Only)
function PersistencyMultiplierCard({ 
  isExpanded, 
  onToggle,
  isAdvisor = false 
}: { 
  isExpanded: boolean; 
  onToggle: () => void;
  isAdvisor?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`bg-gradient-to-br from-white ${isAdvisor ? 'to-blue-50/30 border-blue-100' : 'to-purple-50/30 border-purple-100'} p-4 sm:p-5 md:p-6 rounded-xl shadow-md border-2 hover:shadow-lg hover:scale-[1.02] transition-all text-left w-full flex items-center justify-between group min-h-[100px] sm:min-h-[120px]`}
    >
      <div className="flex-1 min-w-0">
        <div className={`text-2xl sm:text-3xl md:text-4xl font-bold ${isAdvisor ? 'text-[#D31145]' : 'text-purple-600'} mb-2 sm:mb-3 leading-none`}>
          75%
        </div>
        <div className="text-xs sm:text-sm md:text-base font-bold text-slate-800 uppercase mb-2 sm:mb-3 leading-tight">
          Persistency Multiplier
        </div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">
          Multiplier starts at 75% (80% bonus). 82.5%+ gets 100%. 90%+ gets 110%!
        </p>
      </div>
      <div className={`ml-4 text-slate-400 ${isAdvisor ? 'group-hover:text-[#D31145]' : 'group-hover:text-purple-600'} transition-colors`}>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>
  );
}

// Persistency Multiplier Full Expansion Component
function PersistencyMultiplierExpansion({ isAdvisor = false }: { isAdvisor?: boolean }) {
  return (
    <div className="bg-gradient-to-br from-white via-blue-50/20 to-blue-50/20 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8 border-2 border-blue-100">
      <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-2 sm:mb-3 leading-tight">
          PPB ENHANCEMENT 3: PERSISTENCY MULTIPLIER
        </h2>
        <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 flex items-center justify-center gap-2 sm:gap-3 leading-relaxed">
          <span className="text-lg sm:text-xl md:text-2xl">🎯</span>
          <span>Bonuses now start at 75% persistency!</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
        {/* BEFORE Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-slate-200">
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 mb-3 sm:mb-4 md:mb-5 leading-tight">BEFORE</h4>
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            <div>
              <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 mb-2 sm:mb-3 leading-tight">Bonus Requirement</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 leading-tight">82.5% Persistency</p>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 mt-2 sm:mt-3 leading-relaxed">to get the Premier Production Bonus</p>
            </div>
            <div className="pt-3 sm:pt-4 border-t border-slate-200 space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm md:text-base text-slate-500 italic leading-relaxed">
                *Based on 2-Yr Persistency Rate for the quarter
              </p>
              <p className="text-xs sm:text-sm md:text-base text-slate-500 italic leading-relaxed">
                *Those without recorded persistency rate will have a default persistency of 82.5%
              </p>
            </div>
          </div>
        </div>

        {/* AFTER Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-[#D31145]/30 relative">
          <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
            NEW
          </div>
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-[#D31145] mb-3 sm:mb-4 md:mb-5 leading-tight pr-12 sm:pr-16">AFTER</h4>
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div>
              <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 mb-3 sm:mb-4 leading-tight">Introducing the persistency multiplier!</p>
              
              {/* Bonus Calculation Formulas */}
              <div className="bg-gradient-to-br from-slate-50 to-red-50/30 rounded-lg p-3 sm:p-4 md:p-5 border border-slate-200 space-y-3 sm:space-y-4 mb-4 sm:mb-5">
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base flex-wrap">
                  <div className="bg-slate-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 font-mono font-bold text-slate-700">FYC Bonus</div>
                  <span className="text-slate-600 text-lg sm:text-xl">=</span>
                  <div className="bg-red-100 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700">FYC for the quarter</div>
                  <span className="text-slate-600 text-lg sm:text-xl">×</span>
                  <div className="bg-red-100 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700">FYC Bonus Rate</div>
                  <span className="text-slate-600 text-lg sm:text-xl">×</span>
                  <div className="bg-red-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#D31145]">Persistency Multiplier</div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base flex-wrap">
                  <div className="bg-slate-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 font-mono font-bold text-slate-700">Case Count Bonus</div>
                  <span className="text-slate-600 text-lg sm:text-xl">=</span>
                  <div className="bg-red-100 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700">FYC for the quarter</div>
                  <span className="text-slate-600 text-lg sm:text-xl">×</span>
                  <div className="bg-red-100 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700">Case Count Bonus Rate</div>
                  <span className="text-slate-600 text-lg sm:text-xl">×</span>
                  <div className="bg-red-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#D31145]">Persistency Multiplier</div>
                </div>
              </div>

              {/* Persistency Multiplier Table */}
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full text-sm sm:text-base md:text-lg">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#D31145]/10 to-red-100 border-b-2 border-[#D31145]/30">
                        <th className="text-left p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">
                          Personal 2-Yr Persistency
                        </th>
                        <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Persistency Multiplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-red-50/50 bg-green-50/50 transition-colors">
                        <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">82.50% and above</td>
                        <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-green-600 text-base sm:text-lg md:text-xl leading-relaxed">100% ⭐</td>
                      </tr>
                      <tr className="hover:bg-red-50/50 transition-colors">
                        <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">75% to 82.49%</td>
                        <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">80%</td>
                      </tr>
                      <tr className="hover:bg-red-50/50 bg-red-50/30 transition-colors">
                        <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">Below 75%</td>
                        <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-500 leading-relaxed">0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Enhancement Highlight */}
              <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 md:p-5 rounded-lg border border-green-200 mt-4 sm:mt-5 md:mt-6">
                <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
                <span className="text-slate-700 font-medium leading-relaxed">Now, even at 75% persistency, you qualify for 80% of the bonus!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Self-Override Expandable Card Component (Summary Only)
function SelfOverrideCard({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="bg-gradient-to-br from-white to-orange-50/30 p-4 sm:p-5 md:p-6 rounded-xl shadow-md border-2 border-orange-100 hover:shadow-lg hover:scale-[1.02] transition-all text-left w-full flex items-center justify-between group min-h-[100px] sm:min-h-[120px]"
    >
      <div className="flex-1 min-w-0">
        <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-600 mb-2 sm:mb-3 leading-none">10%</div>
        <div className="text-xs sm:text-sm md:text-base font-bold text-slate-800 uppercase mb-2 sm:mb-3 leading-tight">Self-Override</div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">Earn as much as 10% self-override by activating your New Recruits. Applied with persistency multiplier.</p>
      </div>
      <div className="ml-3 sm:ml-4 flex-shrink-0">
        <div className="text-slate-400 group-hover:text-orange-600 transition-colors">
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// Self-Override Full Expansion Component
function SelfOverrideExpansion() {
  return (
    <div className="bg-gradient-to-br from-white via-orange-50/20 to-orange-50/20 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8 border-2 border-orange-100">
      <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-2 sm:mb-3 leading-tight">
          SELF-OVERRIDE IS BACK!
        </h2>
        <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 flex items-center justify-center gap-2 sm:gap-3 leading-relaxed">
          <span className="text-green-600 font-bold text-lg sm:text-xl md:text-2xl">✓</span>
          <span>Earn as much as 10% self-override by <span className="text-[#D31145]">activating your New Recruits</span></span>
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-[#D31145]/30 relative">
        <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
          NEW
        </div>
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Self-Override Rate Table */}
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-sm sm:text-base md:text-lg">
                <thead>
                  <tr className="bg-gradient-to-r from-[#D31145]/10 to-red-100 border-b-2 border-[#D31145]/30">
                    <th className="text-left p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Active New Recruit</th>
                    <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Self-Override Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-red-50/50 bg-green-50/50 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">3 and up</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-green-600 text-base sm:text-lg md:text-xl leading-relaxed">10% ⭐</td>
                  </tr>
                  <tr className="hover:bg-red-50/50 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">2</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">7.5%</td>
                  </tr>
                  <tr className="hover:bg-red-50/50 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">1</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">5%</td>
                  </tr>
                  <tr className="hover:bg-red-50/50 bg-red-50/30 transition-colors">
                    <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">0</td>
                    <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-500 leading-relaxed">0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Formula */}
          <div className="bg-gradient-to-br from-slate-50 to-orange-50/30 rounded-lg p-3 sm:p-4 md:p-5 border border-slate-200">
            <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 mb-3 sm:mb-4 leading-tight">Formula</p>
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base flex-wrap">
              <div className="bg-slate-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 font-mono font-bold text-slate-700">Self-override</div>
              <span className="text-slate-600 text-lg sm:text-xl">=</span>
              <div className="bg-orange-100 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700">Leader's Personal FYC</div>
              <span className="text-slate-600 text-lg sm:text-xl">×</span>
              <div className="bg-orange-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#D31145]">Self-Override Rate</div>
            </div>
          </div>

          {/* Definition */}
          <div className="pt-3 sm:pt-4 border-t border-slate-200">
            <p className="text-xs sm:text-sm md:text-base text-slate-600 font-medium leading-relaxed">
              <span className="font-bold">Active New Recruit:</span> advisors coded within the calendar year and has produced at least 1 policy within the quarter in consideration.
            </p>
          </div>

          {/* Enhancement Highlight */}
          <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 md:p-5 rounded-lg border border-green-200">
            <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
            <span className="text-slate-700 font-medium leading-relaxed">Self-Override is back! Earn up to 10% based on your active new recruits.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// DPI Rates Expandable Card Component (Summary Only)
function DPIRatesCard({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="bg-gradient-to-br from-white to-blue-50/30 p-4 sm:p-5 md:p-6 rounded-xl shadow-md border-2 border-blue-100 hover:shadow-lg hover:scale-[1.02] transition-all text-left w-full flex items-center justify-between group min-h-[100px] sm:min-h-[120px]"
    >
      <div className="flex-1 min-w-0">
        <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600 mb-2 sm:mb-3 leading-none">20-35%</div>
        <div className="text-xs sm:text-sm md:text-base font-bold text-slate-800 uppercase mb-2 sm:mb-3 leading-tight">DPI Rates</div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">Tiered by rank: ADD 25%/35% • SUM 22.5%/32.5% • UM 20%/30% • AUM 18%/28%<br/>(Tenured/New Recruits)</p>
      </div>
      <div className="ml-3 sm:ml-4 flex-shrink-0">
        <div className="text-slate-400 group-hover:text-blue-600 transition-colors">
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// DPI Rates Full Expansion Component
function DPIRatesExpansion() {
  return (
    <div className="bg-gradient-to-br from-white via-blue-50/20 to-blue-50/20 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8 border-2 border-blue-100">
      <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-2 sm:mb-3 leading-tight">
          #1 DIRECT OVERRIDE: DIRECT PRODUCTION INCENTIVE (DPI)
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
        {/* BEFORE Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-slate-200">
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 mb-3 sm:mb-4 md:mb-5 leading-tight">BEFORE</h4>
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full text-sm sm:text-base md:text-lg table-fixed">
                  <colgroup>
                    <col className="w-auto" />
                    <col className="w-[30%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300">
                      <th className="text-left p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Direct Advisor Type</th>
                      <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">SUM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">Tenured</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 align-middle">30%</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">New</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 align-middle">40%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pt-4 sm:pt-5 md:pt-6 border-t-2 border-slate-200">
              <p className="text-sm sm:text-base md:text-lg text-slate-600 font-medium leading-relaxed">
                <span className="font-bold">Based on:</span> Team ANP
              </p>
              <p className="text-xs sm:text-sm md:text-base text-slate-500 italic mt-2 sm:mt-3 leading-relaxed">
                Flat rates across all leader levels – limited income growth
              </p>
            </div>
          </div>
        </div>

        {/* AFTER Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-[#D31145]/30 relative">
          <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
            NEW
          </div>
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-[#D31145] mb-3 sm:mb-4 md:mb-5 leading-tight pr-12 sm:pr-16">AFTER</h4>
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full text-sm sm:text-base md:text-lg table-fixed">
                  <colgroup>
                    <col className="w-auto" />
                    <col className="w-[20%]" />
                    <col className="w-[25%]" />
                    <col className="w-[25%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gradient-to-r from-[#D31145]/10 to-red-100 border-b-2 border-[#D31145]/30">
                      <th className="text-left p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Direct Advisor Type</th>
                      <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">UM</th>
                      <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">SUM</th>
                      <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">AD/DD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-red-50/50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">Tenured</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 align-middle">20%</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 align-middle">22.50%</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-green-600 align-middle">
                        <span className="inline-flex items-center justify-end gap-1">
                          <span>25%</span>
                          <span className="text-base sm:text-lg md:text-xl">⭐</span>
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-red-50/50 bg-green-50/50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">New</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 align-middle">30%</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 align-middle">32.50%</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-green-600 align-middle">
                        <span className="inline-flex items-center justify-end gap-1">
                          <span>35%</span>
                          <span className="text-base sm:text-lg md:text-xl">⭐</span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pt-4 sm:pt-5 md:pt-6 border-t-2 border-slate-200 space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base md:text-lg text-slate-600 font-medium leading-relaxed">
                <span className="font-bold">Based on:</span> Individual advisor's FYC performance
              </p>
              <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 md:p-5 rounded-lg border border-green-200">
                <span className="text-green-600 font-bold text-lg sm:text-xl md:text-2xl flex-shrink-0 mt-0.5">✓</span>
                <span className="text-slate-700 font-medium leading-relaxed flex-1">Tiered rates that reflect your leadership level – the higher you go, the bigger the reward.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// QPB Bonus Expandable Card Component (Summary Only)
function QPBBonusCard({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="bg-gradient-to-br from-white to-green-50/30 p-4 sm:p-5 md:p-6 rounded-xl shadow-md border-2 border-green-100 hover:shadow-lg hover:scale-[1.02] transition-all text-left w-full flex items-center justify-between group min-h-[100px] sm:min-h-[120px]"
    >
      <div className="flex-1 min-w-0">
        <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600 mb-2 sm:mb-3 leading-none">10-30%</div>
        <div className="text-xs sm:text-sm md:text-base font-bold text-slate-800 uppercase mb-2 sm:mb-3 leading-tight">QPB Bonus</div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">Quarterly Production Bonus tiered by Team Quarterly FYC total. Applied to (Base DPI + QPB) with Team Persistency multiplier.</p>
      </div>
      <div className="ml-3 sm:ml-4 flex-shrink-0">
        <div className="text-slate-400 group-hover:text-green-600 transition-colors">
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// QPB Bonus Full Expansion Component
function QPBBonusExpansion() {
  return (
    <div className="bg-gradient-to-br from-white via-green-50/20 to-green-50/20 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8 border-2 border-green-100">
      <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-2 sm:mb-3 leading-tight">
          #1 DIRECT OVERRIDE: QUARTERLY PRODUCTION BONUS (QPB)
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
        {/* BEFORE Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-slate-200">
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 mb-2 sm:mb-3 leading-tight">BEFORE</h4>
          <p className="text-sm sm:text-base md:text-lg font-semibold text-slate-700 mb-3 sm:mb-4 leading-tight">Quarterly Target Achievement Bonus (Entire Group)</p>
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full text-xs sm:text-sm md:text-base">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300">
                      <th className="text-left p-2 sm:p-3 font-semibold text-slate-700 leading-tight">UM</th>
                      <th className="text-left p-2 sm:p-3 font-semibold text-slate-700 leading-tight">SUM</th>
                      <th className="text-left p-2 sm:p-3 font-semibold text-slate-700 leading-tight">EUM</th>
                      <th className="text-left p-2 sm:p-3 font-semibold text-slate-700 leading-tight">AM</th>
                      <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">Bonus %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">-</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">-</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">-</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">50M</td>
                      <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">10.0%</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">6M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">8M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">10M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">25M</td>
                      <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">7.0%</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">4M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">5M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">6M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">20M</td>
                      <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">5.0%</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">3M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">4M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">5M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">15M</td>
                      <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">3.0%</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">2M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">3M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">4M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">10M</td>
                      <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">2.0%</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">1M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">2M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">3M</td>
                      <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">7.5M</td>
                      <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">1.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pt-3 sm:pt-4 border-t border-slate-200">
              <p className="text-sm sm:text-base md:text-lg text-slate-600 font-medium leading-relaxed">
                <span className="font-bold">Based on:</span> Team ANP
              </p>
            </div>
          </div>
        </div>

        {/* AFTER Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-[#D31145]/30 relative">
          <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
            NEW
          </div>
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-[#D31145] mb-2 sm:mb-3 leading-tight pr-12 sm:pr-16">AFTER</h4>
          <p className="text-sm sm:text-base md:text-lg font-semibold text-slate-700 mb-3 sm:mb-4 leading-tight">Performance-Based Override per Direct Advisor</p>
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full text-sm sm:text-base md:text-lg">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#D31145]/10 to-red-100 border-b-2 border-[#D31145]/30">
                      <th className="text-left p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Quarterly FYC</th>
                      <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Bonus Rates %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-red-50/50 bg-green-50/50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">350,000 & up</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-green-600 text-base sm:text-lg md:text-xl leading-relaxed">30% ⭐</td>
                    </tr>
                    <tr className="hover:bg-red-50/50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">200,000 – 349,999</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">25%</td>
                    </tr>
                    <tr className="hover:bg-red-50/50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">150,000 – 199,999</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">20%</td>
                    </tr>
                    <tr className="hover:bg-red-50/50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">80,000 – 149,999</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">15%</td>
                    </tr>
                    <tr className="hover:bg-red-50/50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">50,000 – 79,999</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">12.50%</td>
                    </tr>
                    <tr className="hover:bg-red-50/50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">30,000 – 49,999</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">10%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pt-3 sm:pt-4 border-t border-slate-200 space-y-3">
              <p className="text-sm sm:text-base md:text-lg text-slate-600 font-medium leading-relaxed">
                <span className="font-bold">Based on:</span> Individual advisor's FYC performance
              </p>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 rounded-lg border border-green-200">
                  <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
                  <span className="text-slate-700 font-medium leading-relaxed">Get up to 30% bonus vs low old rates!</span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 rounded-lg border border-green-200">
                  <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
                  <span className="text-slate-700 font-medium leading-relaxed">Each advisor's FYC drives your bonus – higher FYC, higher rate</span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 rounded-lg border border-green-200">
                  <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
                  <span className="text-slate-700 font-medium leading-relaxed">Rates are FYC based and by individual performance of direct advisors</span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 rounded-lg border border-green-200">
                  <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
                  <span className="text-slate-700 font-medium leading-relaxed">Easier to manage – simple FYC tracking per advisor</span>
                </div>
              </div>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200 space-y-1 sm:space-y-2">
                <p className="text-xs sm:text-sm md:text-base text-slate-600 font-medium leading-relaxed">
                  • FYC Requirements may change annually
                </p>
                <p className="text-xs sm:text-sm md:text-base text-slate-600 font-medium leading-relaxed">
                  • Self Production is not included in Performance Based Override
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Team Persistency Multiplier Expandable Card Component (Summary Only)
function TeamPersistencyCard({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="bg-gradient-to-br from-white to-purple-50/30 p-4 sm:p-5 md:p-6 rounded-xl shadow-md border-2 border-purple-100 hover:shadow-lg hover:scale-[1.02] transition-all text-left w-full flex items-center justify-between group min-h-[100px] sm:min-h-[120px]"
    >
      <div className="flex-1 min-w-0">
        <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-600 mb-2 sm:mb-3 leading-none">75%</div>
        <div className="text-xs sm:text-sm md:text-base font-bold text-slate-800 uppercase mb-2 sm:mb-3 leading-tight">Team Persistency</div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">Multiplier starts at 75% (80% bonus). 82.5%+ gets 100%. 90%+ gets 110%! Applied to (Base DPI + QPB).</p>
      </div>
      <div className="ml-3 sm:ml-4 flex-shrink-0">
        <div className="text-slate-400 group-hover:text-purple-600 transition-colors">
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// Team Persistency Multiplier Full Expansion Component
function TeamPersistencyExpansion() {
  return (
    <div className="bg-gradient-to-br from-white via-purple-50/20 to-purple-50/20 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8 border-2 border-purple-100">
      <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-2 sm:mb-3 leading-tight">
          #1 DIRECT OVERRIDE: PERSISTENCY MULTIPLIER
        </h2>
        <div className="flex items-center justify-center gap-2 sm:gap-3 mt-3 sm:mt-4">
          <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-2 sm:p-3 rounded-lg border border-green-200">
            <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
            <span className="text-slate-700 font-medium leading-relaxed">Higher rewards for higher persistency</span>
          </div>
          <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-2 sm:p-3 rounded-lg border border-green-200">
            <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
            <span className="text-slate-700 font-medium leading-relaxed">Lower requirement to receive bonus</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
        {/* BEFORE Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-slate-200">
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 mb-3 sm:mb-4 md:mb-5 leading-tight">BEFORE</h4>
          <div className="space-y-3 sm:space-y-4 md:space-y-5">
            <div>
              <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 mb-2 sm:mb-3 leading-tight">Bonus Requirement</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 leading-tight">82.5% Persistency</p>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 mt-2 sm:mt-3 leading-relaxed">to get Direct Override bonuses</p>
            </div>
            <div className="pt-3 sm:pt-4 border-t border-slate-200 space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm md:text-base text-slate-500 italic leading-relaxed">
                *Based on 2-Year Team Persistency Rate
              </p>
              <p className="text-xs sm:text-sm md:text-base text-slate-500 italic leading-relaxed">
                *Those below 82.5% did not receive bonuses
              </p>
            </div>
          </div>
        </div>

        {/* AFTER Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-[#D31145]/30 relative">
          <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
            NEW
          </div>
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-[#D31145] mb-3 sm:mb-4 md:mb-5 leading-tight pr-12 sm:pr-16">AFTER</h4>
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Formula */}
            <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-lg p-3 sm:p-4 md:p-5 border border-slate-200">
              <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 mb-3 sm:mb-4 leading-tight">Formula</p>
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base flex-wrap">
                <div className="bg-slate-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 font-mono font-bold text-slate-700">Total Direct Override</div>
                <span className="text-slate-600 text-lg sm:text-xl">=</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-slate-600">(</span>
                  <div className="bg-purple-100 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700">Base DPI</div>
                  <span className="text-slate-600 text-lg sm:text-xl">+</span>
                  <div className="bg-purple-100 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700">QPB Bonus</div>
                  <span className="text-slate-600">)</span>
                </div>
                <span className="text-slate-600 text-lg sm:text-xl">×</span>
                <div className="bg-purple-200 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#D31145]">Persistency Multiplier</div>
              </div>
            </div>

            {/* Persistency Multiplier Table */}
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full text-sm sm:text-base md:text-lg">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#D31145]/10 to-red-100 border-b-2 border-[#D31145]/30">
                      <th className="text-left p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">2-Year Team Persistency</th>
                      <th className="text-right p-3 sm:p-4 md:p-5 font-semibold text-slate-700 leading-tight">Persistency Multiplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-red-50/50 bg-green-50/50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">90% and up</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-green-600 text-base sm:text-lg md:text-xl leading-relaxed">110% ⭐</td>
                    </tr>
                    <tr className="hover:bg-red-50/50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">82.50% to 89.99%</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">100%</td>
                    </tr>
                    <tr className="hover:bg-red-50/50 transition-colors">
                      <td className="p-3 sm:p-4 md:p-5 font-medium text-slate-800 leading-relaxed">75% - 82.49%</td>
                      <td className="p-3 sm:p-4 md:p-5 text-right font-bold text-slate-900 leading-relaxed">80%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Enhancement Highlights */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-pink-50/50 p-3 sm:p-4 rounded-lg border border-pink-200">
                <span className="text-pink-600 font-bold text-lg sm:text-xl flex-shrink-0">💡</span>
                <span className="text-slate-700 font-medium leading-relaxed">Those with 90% & up persistency can receive additional bonus!</span>
              </div>
              <div className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-pink-50/50 p-3 sm:p-4 rounded-lg border border-pink-200">
                <span className="text-pink-600 font-bold text-lg sm:text-xl flex-shrink-0">🎯</span>
                <span className="text-slate-700 font-medium leading-relaxed">Now, even at 75% persistency, you qualify for bonuses!</span>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="pt-3 sm:pt-4 border-t border-slate-200 space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm md:text-base text-slate-600 font-medium leading-relaxed">
                • Base DPI is paid monthly (FYC × DPI rate)
              </p>
              <p className="text-xs sm:text-sm md:text-base text-slate-600 font-medium leading-relaxed">
                • Additional DPI from persistency multiplier will be paid quarterly together with QPB
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Leader Segmentation Expandable Card Component (Summary Only)
function LeaderSegmentationCard({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="bg-gradient-to-br from-white to-indigo-50/30 p-4 sm:p-5 md:p-6 rounded-xl shadow-md border-2 border-indigo-100 hover:shadow-lg hover:scale-[1.02] transition-all text-left w-full flex items-center justify-between group min-h-[100px] sm:min-h-[120px]"
    >
      <div className="flex-1 min-w-0">
        <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-600 mb-2 sm:mb-3 leading-none">3 Tiers</div>
        <div className="text-xs sm:text-sm md:text-base font-bold text-slate-800 uppercase mb-2 sm:mb-3 leading-tight">Segmentation</div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">Standard • Executive • Premier<br/>Based on Team ANP, Active Recruits & Team Persistency.</p>
      </div>
      <div className="ml-3 sm:ml-4 flex-shrink-0">
        <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// Leader Segmentation Full Expansion Component
function LeaderSegmentationExpansion() {
  return (
    <div className="bg-gradient-to-br from-white via-indigo-50/20 to-indigo-50/20 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8 border-2 border-indigo-100">
      <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-2 sm:mb-3 leading-tight">
          #3 AGENCY LEADER SEGMENTATION
        </h2>
        <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 leading-relaxed">
          Unlock <span className="text-[#D31145]">EXCLUSIVE BENEFITS</span> in each segment!
        </p>
      </div>

      {/* Three Tiers Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8">
        {/* Standard Leader */}
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-5 sm:p-6 md:p-7 border-2 border-slate-300 shadow-md relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 mb-2 leading-tight">Standard Leader</h3>
              <p className="text-sm sm:text-base md:text-lg text-slate-700 font-semibold leading-relaxed">Solid Foundation</p>
            </div>
            <div className="text-4xl sm:text-5xl flex-shrink-0">🌱</div>
          </div>
        </div>

        {/* Executive Leader */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 sm:p-6 md:p-7 border-2 border-red-700 shadow-xl relative transform -translate-y-2 sm:-translate-y-3 md:-translate-y-4">
          <div className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-10">
            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[12px] border-r-red-700"></div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white mb-2 leading-tight drop-shadow-sm">Executive Leader</h3>
              <p className="text-sm sm:text-base md:text-lg text-white font-semibold leading-relaxed drop-shadow-sm">High Achievers</p>
            </div>
            <div className="text-4xl sm:text-5xl flex-shrink-0 drop-shadow-md">🔥</div>
          </div>
        </div>

        {/* Premier Leader */}
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl p-5 sm:p-6 md:p-7 border-2 border-yellow-600 shadow-xl relative transform -translate-y-4 sm:-translate-y-6 md:-translate-y-8">
          <div className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-10">
            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[12px] border-r-yellow-600"></div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight drop-shadow-sm">Premier Leader</h3>
              <p className="text-sm sm:text-base md:text-lg text-slate-800 font-semibold leading-relaxed drop-shadow-sm">Top Performers</p>
            </div>
            <div className="text-4xl sm:text-5xl flex-shrink-0 drop-shadow-md">⭐</div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-slate-200">
        <h4 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 mb-3 sm:mb-4 leading-tight">Exclusive Benefits</h4>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="text-2xl sm:text-3xl flex-shrink-0">✅</div>
            <div>
              <p className="text-sm sm:text-base md:text-lg font-semibold text-slate-700 leading-relaxed">Differentiated benefits in Group Life and Group HMO</p>
            </div>
          </div>
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="text-2xl sm:text-3xl flex-shrink-0">📄</div>
            <div>
              <p className="text-sm sm:text-base md:text-lg font-semibold text-slate-700 leading-relaxed">Priority lane for underwriting services <span className="text-yellow-600 font-bold">(for Premier Leaders)</span></p>
            </div>
          </div>
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="text-2xl sm:text-3xl flex-shrink-0">💰</div>
            <div>
              <p className="text-sm sm:text-base md:text-lg font-semibold text-slate-700 leading-relaxed">Higher Indirect Overrides</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Indirect Override Expandable Card Component (Summary Only)
function IndirectOverrideCard({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="bg-gradient-to-br from-white to-amber-50/30 p-4 sm:p-5 md:p-6 rounded-xl shadow-md border-2 border-amber-100 hover:shadow-lg hover:scale-[1.02] transition-all text-left w-full flex items-center justify-between group min-h-[100px] sm:min-h-[120px]"
    >
      <div className="flex-1 min-w-0">
        <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-600 mb-2 sm:mb-3 leading-none">Tiered</div>
        <div className="text-xs sm:text-sm md:text-base font-bold text-slate-800 uppercase mb-2 sm:mb-3 leading-tight">Indirect Overrides</div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed">Rates tiered by leader segment. Higher segment = Higher override rates!</p>
      </div>
      <div className="ml-3 sm:ml-4 flex-shrink-0">
        <div className="text-slate-400 group-hover:text-amber-600 transition-colors">
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// Indirect Override Full Expansion Component
function IndirectOverrideExpansion() {
  return (
    <div className="bg-gradient-to-br from-white via-amber-50/20 to-amber-50/20 rounded-xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8 border-2 border-amber-100">
      <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-2 sm:mb-3 leading-tight">
          #4 INDIRECT OVERRIDE RATES
        </h2>
        <p className="text-sm sm:text-base md:text-lg font-bold text-slate-700 leading-relaxed">
          Tiered rates that reflect your leader segment – <span className="text-[#D31145]">the higher you go, the bigger the override</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8 mb-6 sm:mb-8">
        {/* BEFORE Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-slate-200">
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-slate-800 mb-3 sm:mb-4 md:mb-5 leading-tight">BEFORE</h4>
          <p className="text-sm sm:text-base md:text-lg font-semibold text-slate-700 mb-3 sm:mb-4 leading-tight">Flat rates across leaders</p>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-xs sm:text-sm md:text-base">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300">
                    <th className="text-left p-2 sm:p-3 font-semibold text-slate-700 leading-tight">Rank</th>
                    <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">2nd Gen</th>
                    <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">3rd Gen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">SUM</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">-</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">30%</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">EUM</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">30%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">15%</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">AM / DM</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">-</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">30%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AFTER Section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-[#D31145]/30 relative">
          <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg">
            NEW
          </div>
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-[#D31145] mb-3 sm:mb-4 md:mb-5 leading-tight pr-12 sm:pr-16">AFTER</h4>
          <p className="text-sm sm:text-base md:text-lg font-semibold text-slate-700 mb-4 sm:mb-5 leading-tight">Tiered rates by leader segment</p>
          
          {/* Leader Segment Headers */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="bg-slate-100 rounded p-2 text-center">
              <p className="text-xs sm:text-sm font-bold text-slate-700">Standard</p>
            </div>
            <div className="bg-red-100 rounded p-2 text-center">
              <p className="text-xs sm:text-sm font-bold text-red-700">Executive</p>
            </div>
            <div className="bg-yellow-100 rounded p-2 text-center">
              <p className="text-xs sm:text-sm font-bold text-yellow-700">Premier</p>
            </div>
          </div>
        </div>
      </div>

      {/* AFTER Tables - Highlighting Perpetual Indirect Overrides */}
      <div className="space-y-6 sm:space-y-8">
        {/* AD or DD Table */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-[#D31145]/30">
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-[#D31145] mb-3 sm:mb-4 leading-tight">AD or DD (Agency Director / District Director)</h4>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-xs sm:text-sm md:text-base">
                <thead>
                  <tr className="bg-gradient-to-r from-[#D31145]/10 to-red-100 border-b-2 border-[#D31145]/30">
                    <th className="text-left p-2 sm:p-3 font-semibold text-slate-700 leading-tight">IO</th>
                    <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">Standard</th>
                    <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">Executive</th>
                    <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">Premier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-red-50/50 transition-colors">
                    <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">IO1</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">15%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">25%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-green-600 text-base sm:text-lg leading-relaxed">30% ⭐</td>
                  </tr>
                  <tr className="hover:bg-red-50/50 transition-colors">
                    <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">IO2</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">10%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">17%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">20%</td>
                  </tr>
                  <tr className="hover:bg-red-50/50 bg-pink-50/50 transition-colors border-2 border-pink-200">
                    <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed font-bold">IO3 <span className="text-pink-600">(4th Gen)</span></td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">5%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">7.5%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-green-600 text-base sm:text-lg leading-relaxed">10% ⭐</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 rounded-lg border border-green-200">
            <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
            <span className="text-slate-700 font-medium leading-relaxed">Indirect override extended to 4th gen (IO3) for ADs!</span>
          </div>
        </div>

        {/* SUM Table */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-[#D31145]/30">
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-[#D31145] mb-3 sm:mb-4 leading-tight">SUM (Senior Unit Manager)</h4>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-xs sm:text-sm md:text-base">
                <thead>
                  <tr className="bg-gradient-to-r from-[#D31145]/10 to-red-100 border-b-2 border-[#D31145]/30">
                    <th className="text-left p-2 sm:p-3 font-semibold text-slate-700 leading-tight">IO</th>
                    <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">Standard</th>
                    <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">Executive</th>
                    <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">Premier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-red-50/50 transition-colors">
                    <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">IO1</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">10%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">17%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-green-600 text-base sm:text-lg leading-relaxed">20% ⭐</td>
                  </tr>
                  <tr className="hover:bg-red-50/50 transition-colors">
                    <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed">IO2</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">5%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">7.5%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">10%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* UM Table - Highlighting IO1 */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-5 md:p-6 border-2 border-[#D31145]/30">
          <h4 className="text-base sm:text-lg md:text-xl font-bold text-[#D31145] mb-3 sm:mb-4 leading-tight">UM (Unit Manager)</h4>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full text-xs sm:text-sm md:text-base">
                <thead>
                  <tr className="bg-gradient-to-r from-[#D31145]/10 to-red-100 border-b-2 border-[#D31145]/30">
                    <th className="text-left p-2 sm:p-3 font-semibold text-slate-700 leading-tight">IO</th>
                    <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">Standard</th>
                    <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">Executive</th>
                    <th className="text-right p-2 sm:p-3 font-semibold text-slate-700 leading-tight">Premier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-red-50/50 bg-pink-50/50 transition-colors border-2 border-pink-200">
                    <td className="p-2 sm:p-3 font-medium text-slate-800 leading-relaxed font-bold">IO1</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">7.5%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-slate-900 leading-relaxed">10%</td>
                    <td className="p-2 sm:p-3 text-right font-bold text-green-600 text-base sm:text-lg leading-relaxed">12.5% ⭐</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-start gap-2 sm:gap-3 text-sm sm:text-base md:text-lg bg-green-50/50 p-3 sm:p-4 rounded-lg border border-green-200">
            <span className="text-green-600 font-bold text-lg sm:text-xl flex-shrink-0">✓</span>
            <span className="text-slate-700 font-medium leading-relaxed">UMs can now earn indirect override!</span>
          </div>
        </div>
      </div>
    </div>
  );
}

