'use client';

import { useState, useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { UserState } from '../strategic-planning-app';
import { formatNumberWithCommas, parseCommaNumber, handleNumberInputChange } from '../utils/number-format';
import {
  getFYCBonusRate,
  getCaseCountBonusRate,
  getPersistencyMultiplier,
  getSelfOverrideRate,
  getDPIRate,
  getQPBRate,
} from '../utils/bonus-calculations';
import { saveStrategicPlanningGoal, type StrategicPlanningGoal } from '@/services/strategic-planning-service';
import { generateStrategicPlanningPDF } from '../utils/pdf-generator';

interface GoalSettingTabProps {
  userState: UserState;
  onShowAI: (title: string, content: string) => void;
}

// Get next bonus level threshold and rate
function getNextBonusLevel(currentFYC: number): { threshold: number; rate: number; gap: number } | null {
  if (currentFYC >= 350000) return null; // Already at max
  
  const thresholds = [
    { threshold: 30000, rate: 0.10 },
    { threshold: 50000, rate: 0.15 },
    { threshold: 80000, rate: 0.20 },
    { threshold: 120000, rate: 0.30 },
    { threshold: 200000, rate: 0.35 },
    { threshold: 350000, rate: 0.40 },
  ];
  
  for (const level of thresholds) {
    if (currentFYC < level.threshold) {
      return {
        threshold: level.threshold,
        rate: level.rate,
        gap: Math.max(0, level.threshold - currentFYC),
      };
    }
  }
  
  return null;
}

// Get bonus level message
function getBonusPrompt(currentFYC: number): { message: string; type: 'congrats' | 'prompt' | 'none' } {
  if (currentFYC === 0) return { message: '', type: 'none' };
  
  if (currentFYC >= 350000) {
    return {
      message: '🎉 Congratulations! You\'ve reached MAX BONUS (40%)!',
      type: 'congrats',
    };
  }
  
  const nextLevel = getNextBonusLevel(currentFYC);
  if (!nextLevel) {
    return { message: '', type: 'none' };
  }
  
  const ratePercent = Math.round(nextLevel.rate * 100);
  return {
    message: `Push +₱${nextLevel.gap.toLocaleString()} FYC for ${ratePercent}% bonus!`,
    type: 'prompt',
  };
}

export function GoalSettingTab({ userState, onShowAI }: GoalSettingTabProps) {
  const isLeader = userState.role === 'leader';
  const [decTarget, setDecTarget] = useState('');
  const [decCurrFYP, setDecCurrFYP] = useState('');
  const [decCurrRecruits, setDecCurrRecruits] = useState('');
  const [goal2025FYC, setGoal2025FYC] = useState('');
  const [goal2025FYP, setGoal2025FYP] = useState('');
  const [commRate, setCommRate] = useState(25);
  
  // Personal FYC (for advisor bonuses: PPB, Case Count, Persistency)
  const [q1PersonalFYC, setQ1PersonalFYC] = useState('');
  const [q2PersonalFYC, setQ2PersonalFYC] = useState('');
  const [q3PersonalFYC, setQ3PersonalFYC] = useState('');
  const [q4PersonalFYC, setQ4PersonalFYC] = useState('');
  
  // Team FYC (for leader bonuses: QPB, DPI)
  const [q1TeamFYC, setQ1TeamFYC] = useState('');
  const [q2TeamFYC, setQ2TeamFYC] = useState('');
  const [q3TeamFYC, setQ3TeamFYC] = useState('');
  const [q4TeamFYC, setQ4TeamFYC] = useState('');
  
  // For backward compatibility (Advisor view uses q1FYC, etc.)
  const [q1FYC, setQ1FYC] = useState('');
  const [q2FYC, setQ2FYC] = useState('');
  const [q3FYC, setQ3FYC] = useState('');
  const [q4FYC, setQ4FYC] = useState('');
  
  const [q1Recruits, setQ1Recruits] = useState('');
  const [q2Recruits, setQ2Recruits] = useState('');
  const [q3Recruits, setQ3Recruits] = useState('');
  const [q4Recruits, setQ4Recruits] = useState('');
  
  // Base Manpower (for leaders - existing team members)
  const [q1BaseManpower, setQ1BaseManpower] = useState('');
  const [q2BaseManpower, setQ2BaseManpower] = useState('');
  const [q3BaseManpower, setQ3BaseManpower] = useState('');
  const [q4BaseManpower, setQ4BaseManpower] = useState('');
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Case Count and Persistency for Personal FYC bonuses (both Advisor and Leader)
  const [q1Cases, setQ1Cases] = useState('');
  const [q2Cases, setQ2Cases] = useState('');
  const [q3Cases, setQ3Cases] = useState('');
  const [q4Cases, setQ4Cases] = useState('');
  const [persistency, setPersistency] = useState(82.5);
  
  const [totalFYC, setTotalFYC] = useState(0);
  const [totalPersonalFYC, setTotalPersonalFYC] = useState(0);
  const [totalTeamFYC, setTotalTeamFYC] = useState(0);
  const [totalFYP, setTotalFYP] = useState(0);
  const [totalBonus, setTotalBonus] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [avgMonthly, setAvgMonthly] = useState(0);
  
  // Leader income breakdown
  const [leaderPersonalFYC, setLeaderPersonalFYC] = useState(0);
  const [leaderPersonalBonuses, setLeaderPersonalBonuses] = useState(0);
  const [leaderDPI, setLeaderDPI] = useState(0);
  const [leaderQPB, setLeaderQPB] = useState(0);
  const [leaderTotalAnnual, setLeaderTotalAnnual] = useState(0);
  const [leaderAvgQuarterly, setLeaderAvgQuarterly] = useState(0);
  const [leaderAvgMonthly, setLeaderAvgMonthly] = useState(0);
  
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  
  // Leader rank state (default to UM, can be extended to allow selection)
  const [leaderRank] = useState<'UM' | 'SUM' | 'AD'>('UM');

  useEffect(() => {
    const dec = parseCommaNumber(goal2025FYC) || 0;
    const rate = commRate / 100;
    
    let total = 0;
    let totalPersonal = 0;
    let totalTeam = 0;
    let income = 0;
    let bonus = 0;
    const qData = [dec];
    
    const persMultiplier = getPersistencyMultiplier(persistency);
    
    // Leader income tracking
    let leaderTotalPersonalFYC = 0;
    let leaderTotalPersonalBonuses = 0;
    let leaderTotalDPI = 0;
    let leaderTotalQPB = 0;
    
    for (let q = 1; q <= 4; q++) {
      let qVal = 0;
      let qPersonalFYC = 0;
      let qTeamFYC = 0;
      let qCases = 0;
      
      if (isLeader) {
        // Leader: separate Personal and Team FYC
        if (q === 1) {
          qPersonalFYC = parseCommaNumber(q1PersonalFYC) || 0;
          qTeamFYC = parseCommaNumber(q1TeamFYC) || 0;
          qCases = parseInt(q1Cases) || 0;
        } else if (q === 2) {
          qPersonalFYC = parseCommaNumber(q2PersonalFYC) || 0;
          qTeamFYC = parseCommaNumber(q2TeamFYC) || 0;
          qCases = parseInt(q2Cases) || 0;
        } else if (q === 3) {
          qPersonalFYC = parseCommaNumber(q3PersonalFYC) || 0;
          qTeamFYC = parseCommaNumber(q3TeamFYC) || 0;
          qCases = parseInt(q3Cases) || 0;
        } else if (q === 4) {
          qPersonalFYC = parseCommaNumber(q4PersonalFYC) || 0;
          qTeamFYC = parseCommaNumber(q4TeamFYC) || 0;
          qCases = parseInt(q4Cases) || 0;
        }
        
        // Personal FYC bonuses (PPB, Case Count, Persistency, Self-Override)
        const personalFYCBonusRate = getFYCBonusRate(qPersonalFYC);
        const personalFYCBonus = qPersonalFYC * personalFYCBonusRate * persMultiplier;
        
        const caseBonusRate = personalFYCBonusRate > 0 ? getCaseCountBonusRate(qCases) : 0;
        const caseBonus = qPersonalFYC * caseBonusRate * persMultiplier;
        
        // Self-Override (based on Active New Recruits) - WITH persistency multiplier
        let qRec = 0;
        if (q === 1) qRec = parseInt(q1Recruits) || 0;
        else if (q === 2) qRec = parseInt(q2Recruits) || 0;
        else if (q === 3) qRec = parseInt(q3Recruits) || 0;
        else if (q === 4) qRec = parseInt(q4Recruits) || 0;
        
        const selfOverrideRate = getSelfOverrideRate(qRec);
        const selfOverride = qPersonalFYC * selfOverrideRate * persMultiplier; // Apply persistency multiplier
        
        // Team FYC bonuses (QPB: Tiered by Team Quarterly FYC, DPI: 20-30% based on rank)
        // ACS 3.0: Total Direct Override = (Base DPI + QPB Bonus) x Persistency Multiplier
        // Using getDPIRate with leaderRank (defaults to UM tenured = 20%)
        // Note: In Goal Setting, we assume all team FYC is from tenured advisors
        // For new recruits, would need separate tracking
        const dpiRate = getDPIRate(leaderRank, false); // Tenured rate
        const baseDPI = qTeamFYC * dpiRate; // Base DPI before persistency multiplier
        
        // QPB: Tiered rate based on Team's Quarterly FYC (qTeamFYC is already quarterly)
        const qpbRate = getQPBRate(qTeamFYC); // Get tiered rate based on Team quarterly FYC
        const baseQPB = qTeamFYC * qpbRate; // Base QPB before persistency multiplier
        
        // Apply Team Persistency Multiplier to (Base DPI + QPB Bonus)
        // Persistency multiplier uses Team Persistency (2-Year Team Persistency)
        const teamPersMultiplier = getPersistencyMultiplier(persistency); // Team Persistency multiplier
        const totalDirectOverride = (baseDPI + baseQPB) * teamPersMultiplier; // Total Direct Override
        
        // Calculate DPI and QPB after multiplier (for tracking purposes)
        const dpiAmount = baseDPI * teamPersMultiplier;
        const qpbAmount = baseQPB * teamPersMultiplier;
        
        const teamBonus = totalDirectOverride; // Total Direct Override = (Base DPI + QPB) x Multiplier
        
        // Track leader income sources (after persistency multiplier)
        leaderTotalPersonalFYC += qPersonalFYC;
        leaderTotalPersonalBonuses += (personalFYCBonus + caseBonus + selfOverride);
        leaderTotalDPI += dpiAmount;
        leaderTotalQPB += qpbAmount;
        
        const qPersonalIncome = qPersonalFYC + personalFYCBonus + caseBonus + selfOverride;
        const qTeamIncome = teamBonus;
        const qTotalIncome = qPersonalIncome + qTeamIncome;
        
        totalPersonal += qPersonalFYC;
        totalTeam += qTeamFYC;
        income += qTotalIncome;
        bonus += (personalFYCBonus + caseBonus + selfOverride + teamBonus);
        
        qData.push(qPersonalFYC + qTeamFYC); // Chart shows combined
      } else {
        // Advisor: single FYC with Case Count Bonus
        if (q === 1) {
          qVal = parseCommaNumber(q1FYC) || 0;
          qCases = parseInt(q1Cases) || 0;
        } else if (q === 2) {
          qVal = parseCommaNumber(q2FYC) || 0;
          qCases = parseInt(q2Cases) || 0;
        } else if (q === 3) {
          qVal = parseCommaNumber(q3FYC) || 0;
          qCases = parseInt(q3Cases) || 0;
        } else if (q === 4) {
          qVal = parseCommaNumber(q4FYC) || 0;
          qCases = parseInt(q4Cases) || 0;
        }
        
        qData.push(qVal);
        total += qVal;
        
        // FYC Bonus with Persistency Multiplier
        const fycBonusRate = getFYCBonusRate(qVal);
        const fycBonusAmount = qVal * fycBonusRate * persMultiplier;
        
        // Case Count Bonus (requires FYC bonus qualification first)
        const caseBonusRate = fycBonusRate > 0 ? getCaseCountBonusRate(qCases) : 0;
        const caseBonusAmount = qVal * caseBonusRate * persMultiplier;
        
        const qTotalBonus = fycBonusAmount + caseBonusAmount;
        bonus += qTotalBonus;
        income += (qVal + qTotalBonus);
      }
    }
    
    if (isLeader) {
      // Add Dec sprint to personal FYC
      leaderTotalPersonalFYC += dec;
      
      setTotalPersonalFYC(totalPersonal + dec);
      setTotalTeamFYC(totalTeam);
      setTotalFYC(totalPersonal + totalTeam + dec);
      setTotalFYP((totalPersonal + totalTeam + dec) / rate);
      
      // Calculate leader income totals
      const leaderAnnualTotal = leaderTotalPersonalFYC + leaderTotalPersonalBonuses + leaderTotalDPI + leaderTotalQPB;
      const leaderQuarterlyAvg = leaderAnnualTotal / 4;
      const leaderMonthlyAvg = leaderAnnualTotal / 12;
      
      setLeaderPersonalFYC(leaderTotalPersonalFYC);
      setLeaderPersonalBonuses(leaderTotalPersonalBonuses);
      setLeaderDPI(leaderTotalDPI);
      setLeaderQPB(leaderTotalQPB);
      setLeaderTotalAnnual(leaderAnnualTotal);
      setLeaderAvgQuarterly(leaderQuarterlyAvg);
      setLeaderAvgMonthly(leaderMonthlyAvg);
    } else {
      setTotalFYC(total + dec);
      setTotalFYP((total + dec) / rate);
    }
    
    setTotalBonus(bonus);
    setTotalIncome(income);
    setAvgMonthly(income / 12);

    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      let config: ChartConfiguration;
      
      if (isLeader) {
        // Leader: Show Personal and Team FYC separately
        const personalData = [dec];
        const teamData = [0];
        
        for (let q = 1; q <= 4; q++) {
          if (q === 1) {
            personalData.push(parseFloat(q1PersonalFYC) || 0);
            teamData.push(parseFloat(q1TeamFYC) || 0);
          } else if (q === 2) {
            personalData.push(parseFloat(q2PersonalFYC) || 0);
            teamData.push(parseFloat(q2TeamFYC) || 0);
          } else if (q === 3) {
            personalData.push(parseFloat(q3PersonalFYC) || 0);
            teamData.push(parseFloat(q3TeamFYC) || 0);
          } else if (q === 4) {
            personalData.push(parseFloat(q4PersonalFYC) || 0);
            teamData.push(parseFloat(q4TeamFYC) || 0);
          }
        }
        
        config = {
          type: 'line',
          data: {
            labels: ['Dec', 'Q1', 'Q2', 'Q3', 'Q4'],
            datasets: [
              {
                label: 'Personal FYC',
                data: personalData,
                borderColor: '#6366F1', // Indigo
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
              },
              {
                label: 'Team FYC',
                data: teamData,
                borderColor: '#A855F7', // Purple
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
              },
            },
          },
        };
      } else {
        // Advisor: Single FYC line
        config = {
          type: 'line',
          data: {
            labels: ['Dec', 'Q1', 'Q2', 'Q3', 'Q4'],
            datasets: [
              {
                label: 'Personal FYC',
                data: qData,
                borderColor: '#D31145',
                backgroundColor: 'rgba(211, 17, 69, 0.1)',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
          },
        };
      }

      chartInstanceRef.current = new Chart(ctx, config);
    }
  }, [
    goal2025FYC, commRate, isLeader, persistency,
    q1FYC, q2FYC, q3FYC, q4FYC, // Advisor FYC
    q1Cases, q2Cases, q3Cases, q4Cases, // Advisor & Leader Cases
    q1PersonalFYC, q2PersonalFYC, q3PersonalFYC, q4PersonalFYC, // Leader Personal
    q1TeamFYC, q2TeamFYC, q3TeamFYC, q4TeamFYC, // Leader Team
    q1Recruits, q2Recruits, q3Recruits, q4Recruits, // Leader Recruits
  ]);

  const syncDec = (isFYC: boolean) => {
    const rate = commRate / 100;
    if (isFYC) {
      const v = parseCommaNumber(goal2025FYC) || 0;
      setGoal2025FYP(formatNumberWithCommas((v / rate).toFixed(0)));
    } else {
      const v = parseCommaNumber(goal2025FYP) || 0;
      setGoal2025FYC(formatNumberWithCommas((v * rate).toFixed(0)));
    }
  };

  const updateDecSprint = () => {
    const type = decTarget;
    const curr = parseCommaNumber(decCurrFYP) || 0;
    const currRec = parseInt(decCurrRecruits) || 0;
    let target = 0;
    let isFYP = true;
    let recTarget = 0;
    let isTeamFYP = false; // Flag for leader Team FYP

    if (type === 'MDRT') target = 3300000;
    else if (type === 'Premier') {
      target = 1200000; // Updated to 1.2M FYP
      isTeamFYP = isLeader; // For leaders, Premier is Team FYP
    }
    else if (type === 'UM') { target = 1000000; recTarget = 6; }
    else if (type === 'AUM') { target = 60000; isFYP = false; }

    if (target > 0) {
      const gap = Math.max(0, target - curr);
      
      if (isTeamFYP && isLeader) {
        // For leaders, Premier sets Team FYP and Team FYC (at 25% of FYP)
        const teamFYP = gap;
        const teamFYC = teamFYP * 0.25; // FYC = 25% of FYP
        
        // Set Team FYP (use Q4 Team FYC field as Dec Team FYP target)
        // We'll need to update Q4 Team FYC to reflect this
        setGoal2025FYP(formatNumberWithCommas(teamFYP.toString()));
        setGoal2025FYC(formatNumberWithCommas(teamFYC.toString()));
      } else if (isFYP) {
        setGoal2025FYP(formatNumberWithCommas(gap.toString()));
        syncDec(false);
      } else {
        setGoal2025FYC(formatNumberWithCommas(gap.toString()));
        syncDec(true);
      }
    }
  };

  useEffect(() => {
    updateDecSprint();
  }, [decTarget, decCurrFYP, decCurrRecruits, isLeader, commRate]);

  // Load defaults from Advisor Sim when component mounts (for advisors)
  useEffect(() => {
    if (!isLeader && typeof window !== 'undefined') {
      const savedFYC = localStorage.getItem('advisor_sim_fyc');
      const savedCases = localStorage.getItem('advisor_sim_cases');
      const savedPersistency = localStorage.getItem('advisor_sim_persistency');
      
      // Only set defaults if fields are empty (one-time load)
      if (savedFYC && !q1FYC && !q2FYC && !q3FYC && !q4FYC) {
        const formatted = formatNumberWithCommas(savedFYC);
        setQ1FYC(formatted);
        setQ2FYC(formatted);
        setQ3FYC(formatted);
        setQ4FYC(formatted);
      }
      
      if (savedCases && !q1Cases && !q2Cases && !q3Cases && !q4Cases) {
        setQ1Cases(savedCases);
        setQ2Cases(savedCases);
        setQ3Cases(savedCases);
        setQ4Cases(savedCases);
      }
      
      if (savedPersistency) {
        const parsedPersistency = parseFloat(savedPersistency);
        if (!isNaN(parsedPersistency) && persistency === 82.5) {
          setPersistency(parsedPersistency);
        }
      }
    }
  }, []); // Only run once on mount

  const generateAdvisorStrategy = () => {
    onShowAI('AI Strategy Coach', 'Your personalized strategy has been generated based on your goals and current performance.');
  };

  const handleSubmitGoals = async () => {
    setIsSubmitting(true);
    setSubmitMessage(null);
    
    try {
      // Collect all data
      const dec2025FYP = parseCommaNumber(goal2025FYP) || 0;
      const dec2025FYC = parseCommaNumber(goal2025FYC) || 0;
      const dec2025Cases = parseInt(q4Cases) || 0; // Use Q4 cases as Dec target
      
      // Calculate quarterly data
      const rate = commRate / 100;
      const quarters = [
        {
          q: 1,
          baseManpower: parseInt(q1BaseManpower) || 0,
          newRecruits: parseInt(q1Recruits) || 0,
          fyc: isLeader ? (parseCommaNumber(q1PersonalFYC) || 0) + (parseCommaNumber(q1TeamFYC) || 0) : parseCommaNumber(q1FYC) || 0,
          fyp: 0, // Will calculate below
          cases: parseInt(q1Cases) || 0,
        },
        {
          q: 2,
          baseManpower: parseInt(q2BaseManpower) || 0,
          newRecruits: parseInt(q2Recruits) || 0,
          fyc: isLeader ? (parseCommaNumber(q2PersonalFYC) || 0) + (parseCommaNumber(q2TeamFYC) || 0) : parseCommaNumber(q2FYC) || 0,
          fyp: 0, // Will calculate below
          cases: parseInt(q2Cases) || 0,
        },
        {
          q: 3,
          baseManpower: parseInt(q3BaseManpower) || 0,
          newRecruits: parseInt(q3Recruits) || 0,
          fyc: isLeader ? (parseCommaNumber(q3PersonalFYC) || 0) + (parseCommaNumber(q3TeamFYC) || 0) : parseCommaNumber(q3FYC) || 0,
          fyp: 0, // Will calculate below
          cases: parseInt(q3Cases) || 0,
        },
        {
          q: 4,
          baseManpower: parseInt(q4BaseManpower) || 0,
          newRecruits: parseInt(q4Recruits) || 0,
          fyc: isLeader ? (parseCommaNumber(q4PersonalFYC) || 0) + (parseCommaNumber(q4TeamFYC) || 0) : parseCommaNumber(q4FYC) || 0,
          fyp: 0, // Will calculate below
          cases: parseInt(q4Cases) || 0,
        },
      ];
      
      // Calculate FYP for each quarter (FYP = FYC / commission rate)
      quarters.forEach((q) => {
        q.fyp = rate > 0 ? q.fyc / rate : 0;
      });
      
      // Calculate annual totals
      const annualManpower = quarters.reduce((sum, q) => sum + q.baseManpower + q.newRecruits, 0);
      const annualFYP = quarters.reduce((sum, q) => sum + q.fyp, 0);
      const annualFYC = quarters.reduce((sum, q) => sum + q.fyc, 0);
      
      // Use calculated income from state
      const annualIncome = totalIncome;
      const avgMonthlyIncome = avgMonthly;
      
      // Prepare goal data
      const goalData: StrategicPlanningGoal = {
        userId: userState.name,
        userName: userState.name,
        userRank: userState.rank,
        unitManager: userState.um,
        agencyName: userState.agency,
        submittedAt: new Date(),
        dec2025FYP,
        dec2025FYC,
        dec2025Cases,
        q1: quarters[0],
        q2: quarters[1],
        q3: quarters[2],
        q4: quarters[3],
        annualManpower,
        annualFYP,
        annualFYC,
        annualIncome,
        avgMonthlyIncome,
        persistency,
        commissionRate: commRate,
      };
      
      // Save to Firebase
      const saveResult = await saveStrategicPlanningGoal(goalData);
      
      if (saveResult.success) {
        setSubmitMessage({ type: 'success', text: 'Goals submitted successfully!' });
        
        // Generate PDF
        generateStrategicPlanningPDF({
          userName: userState.name,
          unitManager: userState.um,
          agencyName: userState.agency,
          goal: goalData,
        });
      } else {
        setSubmitMessage({ type: 'error', text: `Failed to submit: ${saveResult.error}` });
      }
    } catch (error) {
      console.error('Error submitting goals:', error);
      setSubmitMessage({
        type: 'error',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-[#D31145]">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">2026 Strategic Goal Setting</h2>
          {!isLeader && (
            <button
              onClick={generateAdvisorStrategy}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-2 sm:py-2.5 px-4 sm:px-5 rounded-lg sm:rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all self-start sm:self-auto"
            >
              ✨ AI Coach
            </button>
          )}
        </div>
      </div>

      {/* Dec Sprint */}
      <div className="bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-xl shadow-md p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-[#D31145] mb-3 sm:mb-4">Dec 2025 Sprint 🚀</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            <select
              value={decTarget}
              onChange={(e) => setDecTarget(e.target.value)}
              className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm font-medium"
            >
              <option value="">Select Goal...</option>
              <option value="MDRT">MDRT (3.3M FYP)</option>
              <option value="Premier">Premier ({isLeader ? '1.2M Team FYP' : '1.2M FYP'})</option>
              <option value="UM">Promote to UM (1M Team FYP)</option>
              <option value="AUM">Promote to AUM (60k FYC)</option>
            </select>
            <input
              type="text"
              value={formatNumberWithCommas(decCurrFYP)}
              onChange={(e) => {
                handleNumberInputChange(e.target.value, setDecCurrFYP);
              }}
              placeholder={isLeader && decTarget === 'Premier' ? 'Current Team FYP' : 'Current FYP'}
              className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm"
            />
            {(decTarget === 'UM' || decTarget === 'AUM') && (
              <div className="p-2 bg-red-50 border rounded text-xs flex justify-between items-center">
                <span>Goal: {decTarget === 'UM' ? '6' : '0'} Recruits</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={decCurrRecruits}
                    onChange={(e) => setDecCurrRecruits(e.target.value)}
                    placeholder="Curr"
                    className="w-16 p-1 border rounded text-right"
                  />
                  <span className="font-bold text-[#D31145]">
                    {parseInt(decCurrRecruits) >= (decTarget === 'UM' ? 6 : 0) ? 'Met!' : `Need ${Math.max(0, (decTarget === 'UM' ? 6 : 0) - parseInt(decCurrRecruits))} more!`}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs font-bold text-[#D31145] mb-2 block">
                Target {isLeader && decTarget === 'Premier' ? 'Team ' : ''}FYC
                {isLeader && decTarget === 'Premier' && <span className="text-[10px] text-slate-600"> (25% of FYP)</span>}
              </label>
              <input
                type="text"
                value={formatNumberWithCommas(goal2025FYC)}
                onChange={(e) => {
                  handleNumberInputChange(e.target.value, (val) => {
                    setGoal2025FYC(val);
                    if (isLeader && decTarget === 'Premier') {
                      // For Premier leader, recalculate FYP from FYC (FYP = FYC / 0.25)
                      const fyp = parseCommaNumber(val) / 0.25;
                      setGoal2025FYP(formatNumberWithCommas(fyp.toString()));
                    } else {
                      syncDec(true);
                    }
                  });
                }}
                className="w-full p-2.5 sm:p-3 border-2 border-[#D31145]/30 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm font-bold bg-white text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#D31145] mb-2 block">
                Target {isLeader && decTarget === 'Premier' ? 'Team ' : ''}FYP
              </label>
              <input
                type="text"
                value={formatNumberWithCommas(goal2025FYP)}
                onChange={(e) => {
                  handleNumberInputChange(e.target.value, (val) => {
                    setGoal2025FYP(val);
                    if (isLeader && decTarget === 'Premier') {
                      // For Premier leader, calculate FYC as 25% of FYP
                      const fyc = parseCommaNumber(val) * 0.25;
                      setGoal2025FYC(formatNumberWithCommas(fyc.toString()));
                    } else {
                      syncDec(false);
                    }
                  });
                }}
                className="w-full p-2.5 sm:p-3 border-2 border-[#D31145]/30 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm font-bold bg-white text-sm sm:text-base"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2026 Targets */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-800">2026 Quarterly Goals</h3>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border-2 border-slate-200 self-start sm:self-auto">
            <label className="text-xs font-semibold text-slate-700">Comm %</label>
            <input
              type="number"
              value={commRate}
              onChange={(e) => setCommRate(parseInt(e.target.value) || 25)}
              className="w-12 sm:w-14 p-1.5 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all text-center font-bold text-xs sm:text-sm"
            />
          </div>
        </div>
        
        {/* Personal FYC (Advisor) / Personal & Team FYC (Leader) Display */}
        {!isLeader ? (
          <div className="mb-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                  Personal FYC
                </label>
                <p className="text-base sm:text-lg font-bold text-blue-900 mt-1 break-all">
                  ₱{totalFYC.toLocaleString()}
                </p>
                {totalFYC > 0 && (
                  <div className="mt-1 text-[10px] sm:text-xs text-blue-700 font-medium">
                    Current Bonus Rate: {Math.round(getFYCBonusRate(totalFYC / 4) * 100)}% per quarter
                  </div>
                )}
              </div>
              <div className="text-left sm:text-right flex-1">
                <label className="text-xs font-bold text-purple-800 uppercase tracking-wide">
                  Personal FYP
                </label>
                <p className="text-base sm:text-lg font-bold text-purple-900 mt-1 break-all">
                  ₱{totalFYP.toLocaleString()}
                </p>
              </div>
            </div>
            {/* Annual Bonus Qualification Prompt for Advisors */}
            {totalFYC > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-300">
                {(() => {
                  const avgQuarterlyFYC = totalFYC / 4;
                  const annualPrompt = getBonusPrompt(avgQuarterlyFYC);
                  if (annualPrompt.type === 'congrats') {
                    return (
                      <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-lg p-2 sm:p-3 text-center">
                        <div className="text-xs sm:text-sm font-bold text-green-800">
                          {annualPrompt.message}
                        </div>
                        <div className="text-[10px] sm:text-xs text-green-700 mt-1">
                          Maintain ₱350k+ quarterly FYC to keep max bonus!
                        </div>
                      </div>
                    );
                  } else if (annualPrompt.type === 'prompt') {
                    return (
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-2 sm:p-3 text-center">
                        <div className="text-xs sm:text-sm font-bold text-amber-800">
                          {annualPrompt.message}
                        </div>
                        <div className="text-[10px] sm:text-xs text-amber-700 mt-1">
                          Average per quarter: ₱{Math.round(avgQuarterlyFYC).toLocaleString()}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            {/* Personal FYC Summary */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-2 border-indigo-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🛡️</span>
                <label className="text-xs font-bold text-indigo-800 uppercase tracking-wide">
                  Personal FYC (For Advisor Bonuses)
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-indigo-700 mb-1">Total Personal FYC</p>
                  <p className="text-lg sm:text-xl font-bold text-indigo-900 break-all">
                    ₱{totalPersonalFYC.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-indigo-700 mb-1">Avg Per Quarter</p>
                  <p className="text-lg sm:text-xl font-bold text-indigo-900 break-all">
                    ₱{Math.round(totalPersonalFYC / 4).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-indigo-300">
                <p className="text-[10px] sm:text-xs text-indigo-700 font-medium">
                  Qualifies for: PPB (FYC Bonus), Case Count Bonus, Persistency Multiplier, Self-Override
                </p>
              </div>
            </div>
            
            {/* Team FYC Summary */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">👥</span>
                <label className="text-xs font-bold text-purple-800 uppercase tracking-wide">
                  Team FYC (For Leader Bonuses)
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-purple-700 mb-1">Total Team FYC</p>
                  <p className="text-lg sm:text-xl font-bold text-purple-900 break-all">
                    ₱{totalTeamFYC.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-purple-700 mb-1">Avg Per Quarter</p>
                  <p className="text-lg sm:text-xl font-bold text-purple-900 break-all">
                    ₱{Math.round(totalTeamFYC / 4).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-purple-300">
                <p className="text-[10px] sm:text-xs text-purple-700 font-medium">
                  Qualifies for: QPB (Tiered 10-30% based on Team Quarterly FYC), DPI (20-30% based on rank)
                </p>
              </div>
            </div>
          </div>
        )}
        
        {!isLeader ? (
          /* Advisor View: Single FYC Input */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {[1, 2, 3, 4].map((q) => {
              const value = q === 1 ? q1FYC : q === 2 ? q2FYC : q === 3 ? q3FYC : q4FYC;
              const setValue = q === 1 ? setQ1FYC : q === 2 ? setQ2FYC : q === 3 ? setQ3FYC : setQ4FYC;
                  const currentFYC = parseCommaNumber(value) || 0;
                  const bonusPrompt = getBonusPrompt(currentFYC);
                  const currentRate = getFYCBonusRate(currentFYC);
                  
                  return (
                    <div key={q} className={`p-3 border-2 rounded-lg relative transition-all ${
                      currentFYC >= 350000 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-md' 
                        : currentFYC >= 80000
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-bold">Q{q} Personal FYC</div>
                        {currentFYC > 0 && (
                          <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            currentRate >= 0.40 ? 'bg-green-200 text-green-800' :
                            currentRate >= 0.30 ? 'bg-blue-200 text-blue-800' :
                            currentRate >= 0.20 ? 'bg-indigo-200 text-indigo-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {Math.round(currentRate * 100)}%
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={formatNumberWithCommas(value)}
                        onChange={(e) => handleNumberInputChange(e.target.value, setValue)}
                        className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm font-medium"
                        placeholder="Enter FYC"
                      />
                  {bonusPrompt && bonusPrompt.type !== 'none' && (
                    <div className={`mt-2 p-2 rounded-lg text-[10px] sm:text-xs font-bold animate-pulse ${
                      bonusPrompt.type === 'congrats' 
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-2 border-green-300 shadow-sm' 
                        : 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 border border-amber-200 shadow-sm'
                    }`}>
                      {bonusPrompt.message}
                    </div>
                  )}
                  {currentFYC > 0 && bonusPrompt?.type === 'none' && (
                    <div className="mt-2 text-[10px] sm:text-xs text-slate-600 font-medium">
                      Current bonus: {Math.round(currentRate * 100)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
        
        {/* Case Count Inputs for Advisors */}
        {!isLeader && (
          <div className="mb-4 sm:mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">📋</span>
                <h4 className="text-sm sm:text-base font-bold text-blue-900">
                  Case Count Per Quarter (For Case Count Bonus)
                </h4>
              </div>
              <p className="text-[10px] sm:text-xs text-blue-700 mb-3 font-medium">
                Requires 2+ months active. Bonus: 5% (3 cases), 10% (5 cases), 15% (7 cases), 20% (9+ cases)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((q) => {
                  const value = q === 1 ? q1Cases : q === 2 ? q2Cases : q === 3 ? q3Cases : q4Cases;
                  const setValue = q === 1 ? setQ1Cases : q === 2 ? setQ2Cases : q === 3 ? setQ3Cases : setQ4Cases;
                  const caseCount = parseInt(value) || 0;
                  const caseBonusRate = getCaseCountBonusRate(caseCount);
                  const qFYC = q === 1 ? (parseCommaNumber(q1FYC) || 0) :
                               q === 2 ? (parseCommaNumber(q2FYC) || 0) :
                               q === 3 ? (parseCommaNumber(q3FYC) || 0) : (parseCommaNumber(q4FYC) || 0);
                  const persMultiplier = getPersistencyMultiplier(persistency);
                  const caseBonus = qFYC > 0 ? qFYC * caseBonusRate * persMultiplier : 0;
                  
                  return (
                    <div key={q} className={`p-2.5 border-2 rounded-lg ${
                      caseCount >= 9 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' :
                      caseCount >= 5 ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300' :
                      caseCount >= 3 ? 'bg-white border-blue-200' :
                      'bg-white border-blue-100'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] sm:text-xs font-bold text-blue-900">Q{q} Cases</div>
                        {caseCount > 0 && (
                          <div className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                            caseBonusRate >= 0.20 ? 'bg-green-200 text-green-800' :
                            caseBonusRate >= 0.10 ? 'bg-blue-200 text-blue-800' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {Math.round(caseBonusRate * 100)}%
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm text-xs sm:text-sm font-medium text-center"
                        placeholder="Cases"
                      />
                      {caseCount > 0 && qFYC > 0 && (
                        <div className="mt-1.5 text-[9px] sm:text-[10px] text-blue-700 font-medium">
                          Bonus: ₱{Math.round(caseBonus).toLocaleString()}
                        </div>
                      )}
                      {caseCount > 0 && caseCount < 3 && (
                        <div className="mt-1 text-[9px] text-amber-700 font-bold">
                          Need 3+ for bonus!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Persistency Input for Advisors */}
              <div className="mt-3 pt-3 border-t border-blue-300">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-blue-900 mb-1 block">{isLeader ? '2-Year Team Persistency (%)' : '2-Year Persistency (%)'}</label>
                    <p className="text-[10px] text-blue-700">
                      {isLeader 
                        ? 'Multiplier: 80% (75%+), 100% (82.5%+), 110% (90%+) - Applied to (DPI + QPB)'
                        : 'Multiplier: 80% (75%+), 100% (82.5%+), 110% (90%+)'}
                    </p>
                  </div>
                  <input
                    type="number"
                    value={persistency}
                    onChange={(e) => setPersistency(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-20 p-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm text-sm font-bold text-center"
                  />
                </div>
                {persistency > 0 && (
                  <div className="mt-2 p-2 bg-blue-100 rounded-lg">
                    <div className="text-[10px] sm:text-xs text-blue-800 font-bold">
                      {isLeader ? 'Team ' : ''}Persistency Multiplier: {Math.round(getPersistencyMultiplier(persistency) * 100)}%
                      {persistency >= 90 && <span className="text-green-700 ml-1">⭐ Max!</span>}
                      {persistency >= 82.5 && persistency < 90 && <span className="text-blue-700 ml-1">✓</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {isLeader && (
          /* Leader View: Separate Personal and Team FYC */
          <div className="space-y-4 mb-4 sm:mb-6">
            {/* Personal FYC Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border-2 border-indigo-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🛡️</span>
                <h4 className="text-sm sm:text-base font-bold text-indigo-900">
                  Personal FYC Per Quarter (For Advisor-Level Bonuses)
                </h4>
              </div>
              <p className="text-[10px] sm:text-xs text-indigo-700 mb-3 font-medium">
                Qualifies for: <span className="font-bold">PPB (FYC Bonus up to 40%)</span>, Case Count Bonus (up to 20%), Persistency Multiplier (80-100%), Self-Override (10% with 3+ recruits)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((q) => {
                  const value = q === 1 ? q1PersonalFYC : q === 2 ? q2PersonalFYC : q === 3 ? q3PersonalFYC : q4PersonalFYC;
                  const setValue = q === 1 ? setQ1PersonalFYC : q === 2 ? setQ2PersonalFYC : q === 3 ? setQ3PersonalFYC : setQ4PersonalFYC;
                  const currentFYC = parseCommaNumber(value) || 0;
                  const bonusPrompt = getBonusPrompt(currentFYC);
                  const currentRate = getFYCBonusRate(currentFYC);
                  
                  return (
                    <div key={q} className={`p-2.5 border-2 rounded-lg relative transition-all ${
                      currentFYC >= 350000 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-md' 
                        : currentFYC >= 80000
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                        : 'bg-white border-indigo-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] sm:text-xs font-bold text-indigo-900">Q{q} Personal</div>
                        {currentFYC > 0 && (
                          <div className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                            currentRate >= 0.40 ? 'bg-green-200 text-green-800' :
                            currentRate >= 0.30 ? 'bg-blue-200 text-blue-800' :
                            currentRate >= 0.20 ? 'bg-indigo-200 text-indigo-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {Math.round(currentRate * 100)}%
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={formatNumberWithCommas(value)}
                        onChange={(e) => handleNumberInputChange(e.target.value, setValue)}
                        className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm text-xs sm:text-sm font-medium"
                        placeholder="Personal FYC"
                      />
                      {bonusPrompt && bonusPrompt.type !== 'none' && (
                        <div className={`mt-1.5 p-1.5 rounded text-[9px] sm:text-[10px] font-bold ${
                          bonusPrompt.type === 'congrats' 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300' 
                            : 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 border border-amber-200'
                        }`}>
                          {bonusPrompt.message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Team FYC Section */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">👥</span>
                <h4 className="text-sm sm:text-base font-bold text-purple-900">
                  Team FYC Per Quarter (For Leader Bonuses)
                </h4>
              </div>
              <p className="text-[10px] sm:text-xs text-purple-700 mb-3 font-medium">
                Qualifies for: <span className="font-bold">QPB (Tiered 10-30% based on Team Quarterly FYC)</span>, DPI (20-30% based on rank: UM/SUM/AD), <span className="font-bold">Persistency Multiplier (80-110%)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((q) => {
                  const value = q === 1 ? q1TeamFYC : q === 2 ? q2TeamFYC : q === 3 ? q3TeamFYC : q4TeamFYC;
                  const setValue = q === 1 ? setQ1TeamFYC : q === 2 ? setQ2TeamFYC : q === 3 ? setQ3TeamFYC : setQ4TeamFYC;
                  const currentTeamFYC = parseCommaNumber(value) || 0;
                  
                  // Base calculations before persistency multiplier
                  const qpbRate = getQPBRate(currentTeamFYC);
                  const baseQPB = currentTeamFYC * qpbRate;
                  const baseDPI = currentTeamFYC * 0.20; // Using UM tenured rate
                  
                  // Apply Team Persistency Multiplier to (Base DPI + QPB Bonus)
                  const teamPersMultiplier = getPersistencyMultiplier(persistency);
                  const totalDirectOverride = (baseDPI + baseQPB) * teamPersMultiplier;
                  
                  // Final amounts after multiplier
                  const qpbAmount = baseQPB * teamPersMultiplier;
                  const dpiAmount = baseDPI * teamPersMultiplier;
                  const totalLeaderBonus = totalDirectOverride;
                  
                  return (
                    <div key={q} className={`p-2.5 border-2 rounded-lg relative transition-all ${
                      currentTeamFYC > 0 
                        ? 'bg-white border-purple-300 shadow-sm' 
                        : 'bg-white border-purple-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] sm:text-xs font-bold text-purple-900">Q{q} Team</div>
                        {currentTeamFYC > 0 && (
                          <div className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-200 text-purple-800">
                            QPB+DPI
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={formatNumberWithCommas(value)}
                        onChange={(e) => handleNumberInputChange(e.target.value, setValue)}
                        className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm text-xs sm:text-sm font-medium"
                        placeholder="Team FYC"
                      />
                      {currentTeamFYC > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          <div className="text-[8px] text-purple-600 mb-1 font-medium">
                            Base: DPI ₱{Math.round(baseDPI).toLocaleString()} + QPB ₱{Math.round(baseQPB).toLocaleString()}
                          </div>
                          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-purple-700 font-medium">
                            <span>QPB ({Math.round(qpbRate * 100)}%):</span>
                            <span className="font-bold">₱{Math.round(qpbAmount).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-purple-600 font-medium">
                            <span>DPI (20%):</span>
                            <span className="font-bold">₱{Math.round(dpiAmount).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-[8px] text-purple-600 font-medium">
                            <span>Persistency ({Math.round(teamPersMultiplier * 100)}%):</span>
                            <span className="font-bold">
                              {persistency >= 90 ? '⭐ 110%' : persistency >= 82.5 ? '✓ 100%' : persistency >= 75 ? '✓ 80%' : '⚠️ 0%'}
                            </span>
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-purple-800 font-bold border-t border-purple-200 pt-1 mt-1">
                            Total Direct Override: ₱{Math.round(totalLeaderBonus).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Base Manpower and New Recruits Inputs for Leaders */}
              <div className="mt-4 pt-4 border-t border-purple-300">
                <h5 className="text-xs font-bold text-purple-900 mb-3">Manpower Planning</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((q) => {
                    const baseValue = q === 1 ? q1BaseManpower : q === 2 ? q2BaseManpower : q === 3 ? q3BaseManpower : q4BaseManpower;
                    const setBaseValue = q === 1 ? setQ1BaseManpower : q === 2 ? setQ2BaseManpower : q === 3 ? setQ3BaseManpower : setQ4BaseManpower;
                    const recruitValue = q === 1 ? q1Recruits : q === 2 ? q2Recruits : q === 3 ? q3Recruits : q4Recruits;
                    const setRecruitValue = q === 1 ? setQ1Recruits : q === 2 ? setQ2Recruits : q === 3 ? setQ3Recruits : setQ4Recruits;
                    
                    return (
                      <div key={q} className="p-2.5 border-2 border-purple-200 rounded-lg bg-white">
                        <div className="text-[10px] sm:text-xs font-bold text-purple-900 mb-2">Q{q}</div>
                        <div className="space-y-2">
                          <div>
                            <label className="text-[9px] text-purple-700 mb-1 block">Base Manpower</label>
                            <input
                              type="number"
                              value={baseValue}
                              onChange={(e) => setBaseValue(e.target.value)}
                              className="w-full p-1.5 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 text-xs"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-purple-700 mb-1 block">New Recruits</label>
                            <input
                              type="number"
                              value={recruitValue}
                              onChange={(e) => setRecruitValue(e.target.value)}
                              className="w-full p-1.5 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 text-xs"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Case Count Input for Personal FYC Bonuses */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">📋</span>
                <h4 className="text-sm sm:text-base font-bold text-blue-900">
                  Case Count Per Quarter (For Case Count Bonus)
                </h4>
              </div>
              <p className="text-[10px] sm:text-xs text-blue-700 mb-3 font-medium">
                Requires 2+ months active. Bonus: 5% (3 cases), 10% (5 cases), 15% (7 cases), 20% (9+ cases)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((q) => {
                  const value = q === 1 ? q1Cases : q === 2 ? q2Cases : q === 3 ? q3Cases : q4Cases;
                  const setValue = q === 1 ? setQ1Cases : q === 2 ? setQ2Cases : q === 3 ? setQ3Cases : setQ4Cases;
                  const caseCount = parseInt(value) || 0;
                  const caseBonusRate = getCaseCountBonusRate(caseCount);
                  const qPersonalFYC = q === 1 ? (parseCommaNumber(q1PersonalFYC) || 0) :
                                     q === 2 ? (parseCommaNumber(q2PersonalFYC) || 0) :
                                     q === 3 ? (parseCommaNumber(q3PersonalFYC) || 0) : (parseCommaNumber(q4PersonalFYC) || 0);
                  const persMultiplier = getPersistencyMultiplier(persistency);
                  const caseBonus = qPersonalFYC > 0 ? qPersonalFYC * caseBonusRate * persMultiplier : 0;
                  
                  return (
                    <div key={q} className={`p-2.5 border-2 rounded-lg ${
                      caseCount >= 9 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' :
                      caseCount >= 5 ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300' :
                      caseCount >= 3 ? 'bg-white border-blue-200' :
                      'bg-white border-blue-100'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] sm:text-xs font-bold text-blue-900">Q{q} Cases</div>
                        {caseCount > 0 && (
                          <div className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                            caseBonusRate >= 0.20 ? 'bg-green-200 text-green-800' :
                            caseBonusRate >= 0.10 ? 'bg-blue-200 text-blue-800' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {Math.round(caseBonusRate * 100)}%
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm text-xs sm:text-sm font-medium text-center"
                        placeholder="Cases"
                      />
                      {caseCount > 0 && qPersonalFYC > 0 && (
                        <div className="mt-1.5 text-[9px] sm:text-[10px] text-blue-700 font-medium">
                          Bonus: ₱{Math.round(caseBonus).toLocaleString()}
                        </div>
                      )}
                      {caseCount > 0 && caseCount < 3 && (
                        <div className="mt-1 text-[9px] text-amber-700 font-bold">
                          Need 3+ for bonus!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Persistency Input */}
              <div className="mt-3 pt-3 border-t border-blue-300">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-blue-900 mb-1 block">{isLeader ? '2-Year Team Persistency (%)' : '2-Year Persistency (%)'}</label>
                    <p className="text-[10px] text-blue-700">
                      {isLeader 
                        ? 'Multiplier: 80% (75%+), 100% (82.5%+), 110% (90%+) - Applied to (DPI + QPB)'
                        : 'Multiplier: 80% (75%+), 100% (82.5%+), 110% (90%+)'}
                    </p>
                  </div>
                  <input
                    type="number"
                    value={persistency}
                    onChange={(e) => setPersistency(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-20 p-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm text-sm font-bold text-center"
                  />
                </div>
                {persistency > 0 && (
                  <div className="mt-2 p-2 bg-blue-100 rounded-lg">
                    <div className="text-[10px] sm:text-xs text-blue-800 font-bold">
                      {isLeader ? 'Team ' : ''}Persistency Multiplier: {Math.round(getPersistencyMultiplier(persistency) * 100)}%
                      {persistency >= 90 && <span className="text-green-700 ml-1">⭐ Max!</span>}
                      {persistency >= 82.5 && persistency < 90 && <span className="text-blue-700 ml-1">✓</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isLeader && (
          <div className="mb-4 sm:mb-6">
            <div className="p-3 sm:p-4 border-2 border-blue-200 rounded-lg bg-gradient-to-br from-blue-50/80 to-indigo-50/50">
              <h4 className="text-xs font-bold text-blue-800 uppercase mb-2 sm:mb-3 flex items-center gap-2">
                <span>👥</span>
                Recruitment Plan (Quarterly Targets)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center text-xs mb-3">
                {[1, 2, 3, 4].map((q) => {
                  const value = q === 1 ? q1Recruits : q === 2 ? q2Recruits : q === 3 ? q3Recruits : q4Recruits;
                  const setValue = q === 1 ? setQ1Recruits : q === 2 ? setQ2Recruits : q === 3 ? setQ3Recruits : setQ4Recruits;
                  const recruitCount = parseInt(value) || 0;
                  const monthlyAvg = recruitCount > 0 ? (recruitCount / 3).toFixed(1) : '0';
                  
                  return (
                    <div key={q} className={`bg-white rounded-lg p-2 border-2 transition-all ${
                      recruitCount >= 3 ? 'border-green-300 bg-green-50/30' : 
                      recruitCount > 0 ? 'border-blue-300 bg-blue-50/30' : 
                      'border-blue-200'
                    }`}>
                      <div className="mb-1 font-bold text-blue-900">Q{q}</div>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="0"
                        className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-center text-sm font-bold"
                      />
                      {recruitCount > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          <div className="text-[9px] sm:text-[10px] text-blue-700 font-semibold">
                            {recruitCount} total
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-blue-600 font-medium">
                            ~{monthlyAvg}/month
                          </div>
                          {recruitCount >= 3 && (
                            <div className="text-[9px] text-green-700 font-bold mt-0.5">
                              ✓ Self-Override!
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Quarterly Recruit Summary */}
              <div className="mt-3 pt-3 border-t-2 border-blue-300">
                <div className="mb-2 text-[10px] sm:text-xs font-bold text-blue-900 uppercase">Quarterly Summary</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[1, 2, 3, 4].map((q) => {
                    const recruitCount = q === 1 ? (parseInt(q1Recruits) || 0) : 
                                       q === 2 ? (parseInt(q2Recruits) || 0) :
                                       q === 3 ? (parseInt(q3Recruits) || 0) : (parseInt(q4Recruits) || 0);
                    const monthlyAvg = recruitCount > 0 ? (recruitCount / 3).toFixed(1) : '0';
                    const hasSelfOverride = recruitCount >= 3;
                    
                    return (
                      <div key={q} className={`rounded p-2 text-[9px] sm:text-[10px] border ${
                        hasSelfOverride 
                          ? 'bg-green-100/60 border-green-300' 
                          : 'bg-white/60 border-blue-200'
                      }`}>
                        <div className="font-bold text-blue-900">Q{q}</div>
                        <div className="text-blue-700 font-semibold">{recruitCount} recruits</div>
                        <div className="text-blue-600">{monthlyAvg}/month avg</div>
                        {hasSelfOverride && (
                          <div className="text-[8px] text-green-700 font-bold mt-0.5">
                            🎉 10% Self-Override
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leader Total Income Summary */}
        {isLeader && (
          <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-300 rounded-xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-emerald-900 border-b-2 border-emerald-400 pb-2 sm:pb-3 mb-4 sm:mb-5 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">💰</span>
              Total Income Summary
            </h3>
            
            {/* Income Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5">
              <div className="bg-white rounded-lg p-4 sm:p-5 shadow-md border-2 border-emerald-300 text-center">
                <p className="text-xs sm:text-sm text-emerald-700 font-bold uppercase tracking-wide mb-2">Annual Total</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-900 break-all">
                  ₱{Math.round(leaderTotalAnnual).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 sm:p-5 shadow-md border-2 border-blue-300 text-center">
                <p className="text-xs sm:text-sm text-blue-700 font-bold uppercase tracking-wide mb-2">Quarterly Average</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-900 break-all">
                  ₱{Math.round(leaderAvgQuarterly).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 sm:p-5 shadow-md border-2 border-purple-300 text-center">
                <p className="text-xs sm:text-sm text-purple-700 font-bold uppercase tracking-wide mb-2">Monthly Average</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-purple-900 break-all">
                  ₱{Math.round(leaderAvgMonthly).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Income Breakdown by Source */}
            <div className="bg-white rounded-lg p-4 sm:p-5 shadow-md border-2 border-slate-200">
              <h4 className="text-sm sm:text-base font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="text-lg">📋</span>
                Income Breakdown by Source
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Personal FYC (Base) */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-3 sm:p-4 border-2 border-indigo-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-700 uppercase">Personal FYC</span>
                    <span className="text-lg">🛡️</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-indigo-900 break-all">
                    ₱{Math.round(leaderPersonalFYC).toLocaleString()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-indigo-600 mt-1">
                    Base Personal Production
                  </p>
                </div>

                {/* Personal Bonuses */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-3 sm:p-4 border-2 border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-700 uppercase">Personal Bonuses</span>
                    <span className="text-lg">⭐</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-amber-900 break-all">
                    ₱{Math.round(leaderPersonalBonuses).toLocaleString()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-amber-600 mt-1">
                    PPB + Case Count + Self-Override
                  </p>
                </div>

                {/* Leader Overrides (DPI) */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 sm:p-4 border-2 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-700 uppercase">Leader Overrides</span>
                    <span className="text-lg">👑</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-purple-900 break-all">
                    ₱{Math.round(leaderDPI).toLocaleString()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-purple-600 mt-1">
                    DPI (Direct Production Incentive)
                  </p>
                </div>

                {/* Leader Bonuses (QPB) */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 sm:p-4 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-green-700 uppercase">Leader Bonuses</span>
                    <span className="text-lg">🎯</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-green-900 break-all">
                    ₱{Math.round(leaderQPB).toLocaleString()}
                  </p>
                  <p className="text-[10px] sm:text-xs text-green-600 mt-1">
                    QPB (Quarterly Production Bonus)
                  </p>
                </div>
              </div>

              {/* Summary Bar */}
              <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t-2 border-slate-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase mb-2">Total Annual Income</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-emerald-900 break-all">
                      ₱{Math.round(leaderTotalAnnual).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase mb-1">Per Quarter</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-900 break-all">
                      ₱{Math.round(leaderAvgQuarterly).toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase mb-1 mt-2">Per Month</p>
                    <p className="text-lg sm:text-xl font-bold text-purple-900 break-all">
                      ₱{Math.round(leaderAvgMonthly).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-white via-red-50/30 to-pink-50/20 border-2 border-[#D31145]/20 p-4 sm:p-6 rounded-xl shadow-xl">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 border-b-2 border-[#D31145]/30 pb-2 sm:pb-3 mb-4 sm:mb-5 flex items-center gap-2">
            <span className="text-xl sm:text-2xl">📊</span>
            2026 Annual Summary
          </h3>
          {!isLeader ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 text-center">
              <div className="bg-white rounded-lg p-3 sm:p-4 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
                <p className="text-xs text-slate-600 font-bold uppercase tracking-wide mb-1 sm:mb-2">Total Annual FYC</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-800 break-all">₱{totalFYC.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-3 sm:p-4 shadow-md border-2 border-[#D31145]/30 hover:shadow-lg transition-shadow">
                <p className="text-xs text-[#D31145] font-bold uppercase tracking-wide mb-1 sm:mb-2">Total Annual FYP</p>
                <p className="text-xl sm:text-2xl font-bold text-[#D31145] break-all">₱{totalFYP.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-3 sm:p-4 shadow-md border-2 border-amber-300 hover:shadow-lg transition-shadow">
                <p className="text-xs text-amber-700 font-bold uppercase tracking-wide mb-1 sm:mb-2">Total Bonuses</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 break-all">₱{Math.round(totalBonus).toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-3 sm:p-4 shadow-md border-2 border-indigo-300 hover:shadow-lg transition-shadow">
                <p className="text-xs text-indigo-700 font-bold uppercase tracking-wide mb-1 sm:mb-2">Avg Monthly Income</p>
                <p className="text-lg sm:text-xl font-bold text-indigo-600 break-all">₱{Math.round(avgMonthly).toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 sm:p-4 shadow-md border-2 border-green-300 hover:shadow-lg transition-shadow">
                <p className="text-xs text-green-700 font-bold uppercase tracking-wide mb-1 sm:mb-2">Total Est. Income</p>
                <p className="text-lg sm:text-xl font-bold text-green-600 break-all">₱{Math.round(totalIncome).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 text-center">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-3 sm:p-4 shadow-md border-2 border-indigo-300 hover:shadow-lg transition-shadow">
                <p className="text-xs text-indigo-700 font-bold uppercase tracking-wide mb-1 sm:mb-2">Personal FYC</p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-600 break-all">₱{totalPersonalFYC.toLocaleString()}</p>
                <p className="text-[10px] text-indigo-600 mt-1">For Advisor Bonuses</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 sm:p-4 shadow-md border-2 border-purple-300 hover:shadow-lg transition-shadow">
                <p className="text-xs text-purple-700 font-bold uppercase tracking-wide mb-1 sm:mb-2">Team FYC</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600 break-all">₱{totalTeamFYC.toLocaleString()}</p>
                <p className="text-[10px] text-purple-600 mt-1">For Leader Bonuses</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-3 sm:p-4 shadow-md border-2 border-amber-300 hover:shadow-lg transition-shadow">
                <p className="text-xs text-amber-700 font-bold uppercase tracking-wide mb-1 sm:mb-2">Total Bonuses</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 break-all">₱{Math.round(totalBonus).toLocaleString()}</p>
                <p className="text-[10px] text-amber-600 mt-1">PPB + Case + QPB + DPI</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 sm:p-4 shadow-md border-2 border-green-300 hover:shadow-lg transition-shadow">
                <p className="text-xs text-green-700 font-bold uppercase tracking-wide mb-1 sm:mb-2">Total Est. Income</p>
                <p className="text-lg sm:text-xl font-bold text-green-600 break-all">₱{Math.round(totalIncome).toLocaleString()}</p>
                <p className="text-[10px] text-green-600 mt-1">Avg: ₱{Math.round(avgMonthly).toLocaleString()}/mo</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Submit Button */}
        <div className="mt-6 sm:mt-8 pt-6 border-t-2 border-slate-300">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              {submitMessage && (
                <div className={`p-3 rounded-lg ${
                  submitMessage.type === 'success' 
                    ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                    : 'bg-red-100 text-red-800 border-2 border-red-300'
                }`}>
                  <p className="text-sm font-medium">{submitMessage.text}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleSubmitGoals}
              disabled={isSubmitting}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#D31145] to-[#B0103A] text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Submit Goals & Generate PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="relative w-full h-[250px] sm:h-[300px] lg:h-[350px] mt-4 sm:mt-6">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    </section>
  );
}

