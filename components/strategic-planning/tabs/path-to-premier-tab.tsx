'use client';

import { useState, useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { UserState } from '../strategic-planning-app';
import { formatNumberWithCommas, parseCommaNumber, handleNumberInputChange } from '../utils/number-format';

interface PathToPremierTabProps {
  userState: UserState;
}

// Leader Segmentation Tiers (ACS 3.0)
interface SegmentationTier {
  name: string;
  anp: number; // Annual ANP requirement
  recruits: number; // Annual recruits requirement
  persistency: number; // Persistency requirement (%)
  color: string;
  bgColor: string;
}

const TIERS: SegmentationTier[] = [
  {
    name: 'Standard',
    anp: 0, // Base tier
    recruits: 0,
    persistency: 0,
    color: '#64748B',
    bgColor: 'from-slate-50 to-slate-100',
  },
  {
    name: 'Executive',
    anp: 5000000, // 5M ANP
    recruits: 12, // 12 recruits/year
    persistency: 80,
    color: '#3B82F6',
    bgColor: 'from-blue-50 to-blue-100',
  },
  {
    name: 'Premier',
    anp: 10000000, // 10M ANP
    recruits: 24, // 24 recruits/year
    persistency: 85,
    color: '#D31145',
    bgColor: 'from-red-50 to-pink-100',
  },
];

export function PathToPremierTab({ userState }: PathToPremierTabProps) {
  // Only show for Leaders
  if (userState.role !== 'leader') {
    return (
      <section className="space-y-4 sm:space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 border-l-4 border-red-500 text-center">
          <div className="text-4xl sm:text-5xl mb-4">🔒</div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Leader Access Only</h2>
          <p className="text-sm sm:text-base text-slate-600">
            This section is available only for Leaders. Please switch to Leader view to access Path to Premier.
          </p>
        </div>
      </section>
    );
  }

  const [currentANP, setCurrentANP] = useState(3000000);
  const [currentRecruits, setCurrentRecruits] = useState(6);
  const [currentPersistency, setCurrentPersistency] = useState(82);
  const [currentTier, setCurrentTier] = useState<SegmentationTier>(TIERS[0]);
  const [nextTier, setNextTier] = useState<SegmentationTier | null>(TIERS[1]);
  const [gaps, setGaps] = useState({ anp: 0, recruits: 0, persistency: 0 });
  
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    // Determine current tier based on ALL requirements (must meet ALL criteria)
    let tierIndex = 0;
    
    // Check Premier tier (all requirements must be met)
    if (currentANP >= TIERS[2].anp && currentRecruits >= TIERS[2].recruits && currentPersistency >= TIERS[2].persistency) {
      tierIndex = 2; // Premier
    } 
    // Check Executive tier (all requirements must be met)
    else if (currentANP >= TIERS[1].anp && currentRecruits >= TIERS[1].recruits && currentPersistency >= TIERS[1].persistency) {
      tierIndex = 1; // Executive
    }
    // Otherwise, Standard tier
    else {
      tierIndex = 0; // Standard
    }
    
    const currentTierValue = TIERS[tierIndex];
    const nextTierValue = tierIndex < TIERS.length - 1 ? TIERS[tierIndex + 1] : null;
    
    setCurrentTier(currentTierValue);
    setNextTier(nextTierValue);

    // Calculate gaps to next tier (use nextTierValue directly, not state)
    if (nextTierValue) {
      setGaps({
        anp: Math.max(0, nextTierValue.anp - currentANP),
        recruits: Math.max(0, nextTierValue.recruits - currentRecruits),
        persistency: Math.max(0, nextTierValue.persistency - currentPersistency),
      });
    } else {
      // Already at highest tier
      setGaps({ anp: 0, recruits: 0, persistency: 0 });
    }

    // Update chart
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const progressData = [
        Math.min(100, (currentANP / TIERS[2].anp) * 100), // ANP progress
        Math.min(100, (currentRecruits / TIERS[2].recruits) * 100), // Recruits progress
        Math.min(100, (currentPersistency / TIERS[2].persistency) * 100), // Persistency progress
      ];

      const config: ChartConfiguration = {
        type: 'bar',
        data: {
          labels: ['ANP', 'Recruits', 'Persistency'],
          datasets: [
            {
              label: 'Current Progress',
              data: progressData,
              backgroundColor: [
                currentANP >= TIERS[2].anp ? '#10B981' : currentANP >= TIERS[1].anp ? '#3B82F6' : '#64748B',
                currentRecruits >= TIERS[2].recruits ? '#10B981' : currentRecruits >= TIERS[1].recruits ? '#3B82F6' : '#64748B',
                currentPersistency >= TIERS[2].persistency ? '#10B981' : currentPersistency >= TIERS[1].persistency ? '#3B82F6' : '#64748B',
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return value + '%';
                },
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      };

      chartInstanceRef.current = new Chart(ctx, config);
    }
  }, [currentANP, currentRecruits, currentPersistency]);

  return (
    <section className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-[#D31145]">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">Path to Premier</h2>
        <p className="text-sm sm:text-base text-slate-600">
          Track your progress toward Executive and Premier segmentation tiers. Based on ANP, Recruits, and Persistency.
        </p>
      </div>

      {/* Current Status */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 rounded-xl shadow-md p-4 sm:p-6 border-2 border-blue-200">
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Current Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Annual ANP</label>
            <input
              type="number"
              value={currentANP}
              onChange={(e) => setCurrentANP(parseInt(e.target.value) || 0)}
              className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm font-bold"
            />
            <p className="text-xs text-slate-500 mt-1">Current: ₱{(currentANP / 1000000).toFixed(2)}M</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Annual Recruits</label>
            <input
              type="number"
              value={currentRecruits}
              onChange={(e) => setCurrentRecruits(parseInt(e.target.value) || 0)}
              className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm font-bold"
            />
            <p className="text-xs text-slate-500 mt-1">Current: {currentRecruits} recruits</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">Persistency (%)</label>
            <input
              type="number"
              value={currentPersistency}
              onChange={(e) => setCurrentPersistency(parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.1"
              className="w-full p-2.5 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm font-bold"
            />
            <p className="text-xs text-slate-500 mt-1">Current: {currentPersistency}%</p>
          </div>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {TIERS.map((tier, index) => {
          const isCurrent = tier.name === currentTier.name;
          const isAchieved = 
            currentANP >= tier.anp && 
            currentRecruits >= tier.recruits && 
            currentPersistency >= tier.persistency;
          
          return (
            <div
              key={tier.name}
              className={`bg-gradient-to-br ${tier.bgColor} rounded-xl shadow-md p-4 sm:p-6 border-2 ${
                isCurrent ? 'border-[#D31145] ring-2 ring-[#D31145]/20' : 'border-slate-200'
              } transition-all hover:shadow-lg`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-lg sm:text-xl font-bold ${isCurrent ? 'text-[#D31145]' : ''}`}>
                  {tier.name}
                </h3>
                {isCurrent && (
                  <span className="text-xs font-bold bg-[#D31145] text-white px-2 py-1 rounded-full">
                    CURRENT
                  </span>
                )}
                {isAchieved && !isCurrent && (
                  <span className="text-xs font-bold bg-green-500 text-white px-2 py-1 rounded-full">
                    ✓ ACHIEVED
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">ANP:</span>
                  <span className="font-bold text-slate-800">
                    {tier.anp === 0 ? 'Base' : `₱${(tier.anp / 1000000).toFixed(0)}M`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Recruits:</span>
                  <span className="font-bold text-slate-800">
                    {tier.recruits === 0 ? 'Base' : `${tier.recruits}/year`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Persistency:</span>
                  <span className="font-bold text-slate-800">
                    {tier.persistency === 0 ? 'Base' : `${tier.persistency}%+`}
                  </span>
                </div>
              </div>
              {isCurrent && (
                <div className="mt-4 pt-4 border-t border-slate-300">
                  <div className="text-xs font-bold text-slate-700 uppercase mb-2">Progress</div>
                  <div className="space-y-1.5">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>ANP</span>
                        <span>{Math.min(100, Math.round((currentANP / (TIERS[2].anp || 1)) * 100))}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            currentANP >= TIERS[2].anp ? 'bg-green-500' :
                            currentANP >= TIERS[1].anp ? 'bg-blue-500' : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.min(100, (currentANP / (TIERS[2].anp || 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Recruits</span>
                        <span>{Math.min(100, Math.round((currentRecruits / (TIERS[2].recruits || 1)) * 100))}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            currentRecruits >= TIERS[2].recruits ? 'bg-green-500' :
                            currentRecruits >= TIERS[1].recruits ? 'bg-blue-500' : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.min(100, (currentRecruits / (TIERS[2].recruits || 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Persistency</span>
                        <span>{Math.min(100, Math.round((currentPersistency / (TIERS[2].persistency || 1)) * 100))}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            currentPersistency >= TIERS[2].persistency ? 'bg-green-500' :
                            currentPersistency >= TIERS[1].persistency ? 'bg-blue-500' : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.min(100, (currentPersistency / (TIERS[2].persistency || 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gap Analysis */}
      {nextTier && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl shadow-md p-4 sm:p-6 border-2 border-amber-300">
          <h3 className="text-lg sm:text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Gap to {nextTier.name} Tier
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
              <div className="text-xs font-bold text-amber-800 uppercase mb-1">ANP Gap</div>
              <div className="text-xl sm:text-2xl font-bold text-amber-900">
                ₱{(gaps.anp / 1000000).toFixed(2)}M
              </div>
              {gaps.anp > 0 && (
                <div className="text-xs text-amber-700 mt-1">
                  Need: ₱{((gaps.anp / 4) / 1000000).toFixed(2)}M per quarter
                </div>
              )}
              {gaps.anp === 0 && (
                <div className="text-xs text-green-700 font-bold mt-1">✓ Qualified!</div>
              )}
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
              <div className="text-xs font-bold text-amber-800 uppercase mb-1">Recruits Gap</div>
              <div className="text-xl sm:text-2xl font-bold text-amber-900">
                {gaps.recruits} recruits
              </div>
              {gaps.recruits > 0 && (
                <div className="text-xs text-amber-700 mt-1">
                  Need: {Math.ceil(gaps.recruits / 4)} per quarter
                </div>
              )}
              {gaps.recruits === 0 && (
                <div className="text-xs text-green-700 font-bold mt-1">✓ Qualified!</div>
              )}
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
              <div className="text-xs font-bold text-amber-800 uppercase mb-1">Persistency Gap</div>
              <div className="text-xl sm:text-2xl font-bold text-amber-900">
                {gaps.persistency.toFixed(1)}%
              </div>
              {gaps.persistency > 0 && (
                <div className="text-xs text-amber-700 mt-1">
                  Need: {gaps.persistency.toFixed(1)}% more
                </div>
              )}
              {gaps.persistency === 0 && (
                <div className="text-xs text-green-700 font-bold mt-1">✓ Qualified!</div>
              )}
            </div>
          </div>
          {gaps.anp === 0 && gaps.recruits === 0 && gaps.persistency === 0 && (
            <div className="mt-4 p-4 bg-green-100 border-2 border-green-400 rounded-lg text-center">
              <div className="text-2xl mb-2">🎉</div>
              <div className="text-lg font-bold text-green-900">
                Congratulations! You've qualified for {nextTier.name} Tier!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-4">Progress Visualization</h3>
        <div className="relative w-full h-[250px] sm:h-[300px] lg:h-[350px]">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </section>
  );
}

