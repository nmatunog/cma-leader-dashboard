'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { getAllGoals, getAgencyGoals, getGoalsForSUM, getGoalsForADD, getUnitGoals, type StrategicPlanningGoal } from '@/services/strategic-planning-service';
import { formatNumberWithCommas } from '@/components/strategic-planning/utils/number-format';
import { getCanonicalAgencyName, areAgencyNamesEqual } from '@/lib/utils/agency-name-normalizer';
import { formatDisplayName } from '@/lib/utils/name-formatter';
import { getCanonicalName, areNamesLikelySamePerson } from '@/lib/utils/name-canonicalizer';
import { getAllUsers, getSUMsInAgencyFromUsers, getUMsUnderSUMFromUsers, getUMsUnderADDFromUsers, getUnitsByAgencyFromUsers } from '@/lib/user-service';
import type { User } from '@/types/user';
import { useAuth } from '@/contexts/auth-context';
import { generateStrategicPlanningPDF, generateUnitSummaryPDF, generateSUMSummaryPDF, generateAgencySummaryPDF } from '@/components/strategic-planning/utils/pdf-generator';

interface QuarterlyData {
  baseManpower: number;
  newRecruits: number;
  fyp: number;
  fyc: number;
  cases: number;
}

interface AggregatedData {
  totalUsers: number;
  totalManpower: number;
  totalNewRecruits: number;
  totalFYP: number;
  totalFYC: number;
  totalIncome: number;
  avgMonthlyIncome: number;
  byAgency: Record<string, {
    count: number;
    beginningManpowerBase: number;
    endManpower: number;
    newRecruits: number;
    fyp: number;
    fyc: number;
    income: number;
  }>;
  bySUM: Record<string, {
    sumName: string;
    agencyName: string;
    count: number;
    beginningManpowerBase: number;
    endManpower: number;
    newRecruits: number;
    fyp: number;
    fyc: number;
    income: number;
  }>;
  byUnit: Record<string, {
    unitManager: string;
    agencyName: string;
    count: number;
    beginningManpowerBase: number;
    endManpower: number;
    newRecruits: number;
    fyp: number;
    fyc: number;
    income: number;
    // Reconciliation breakdown
    leaderPersonalFYP?: number;
    leaderPersonalFYC?: number;
    leaderPersonalCases?: number;
    leaderPersonalRecruits?: number;
    leaderTeamFYP?: number; // Annual team FYP (monthly * 12)
    leaderTeamFYC?: number; // Annual team FYC (monthly * 12)
    advisorSumFYP?: number;
    advisorSumFYC?: number;
    advisorSumCases?: number;
    advisorSumRecruits?: number;
    reconciliationMethod?: 'leader_team' | 'advisor_sum'; // Which method was used: max(Leader Team, Advisor Sum)
  }>;
  byRank: Record<string, {
    count: number;
    manpower: number;
    newRecruits: number;
    fyp: number;
    fyc: number;
    income: number;
  }>;
  quarterly: {
    q1: QuarterlyData;
    q2: QuarterlyData;
    q3: QuarterlyData;
    q4: QuarterlyData;
  };
}

export default function ReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState<StrategicPlanningGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [filterRank, setFilterRank] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterSUM, setFilterSUM] = useState<string>('all'); // For ADD/DD users
  const [aggregated, setAggregated] = useState<AggregatedData | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<StrategicPlanningGoal | null>(null);
  const [showQuarterlySummary, setShowQuarterlySummary] = useState(false);
  const [availableSUMs, setAvailableSUMs] = useState<string[]>([]);
  const [availableUnitsForSUM, setAvailableUnitsForSUM] = useState<string[]>([]);
  const [sumToUMsMap, setSumToUMsMap] = useState<Map<string, string[]>>(new Map()); // Cache: SUM name -> list of UM names
  const [addToUMsMap, setAddToUMsMap] = useState<Map<string, string[]>>(new Map()); // Cache: ADD name -> list of UM names (direct reporting)
  const [userRankMap, setUserRankMap] = useState<Map<string, string>>(new Map()); // Cache: userName -> rank (from user records, source of truth)
  const [userAgencyMap, setUserAgencyMap] = useState<Map<string, string>>(new Map()); // Cache: userName -> agencyName (from user records, source of truth)
  const [userUnitManagerMap, setUserUnitManagerMap] = useState<Map<string, string>>(new Map()); // Cache: userName -> unitManager (from user records, source of truth)
  const [validAgencyNames, setValidAgencyNames] = useState<Set<string>>(new Set()); // Cache: valid agency names from Users collection (source of truth)
  const [allUsersList, setAllUsersList] = useState<User[]>([]); // Store all users for flexible name matching
  
  // State for accordion expansion
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set()); // Track expanded agencies
  const [expandedSUMs, setExpandedSUMs] = useState<Map<string, Set<string>>>(new Map()); // Track expanded SUMs per agency
  const [expandedUnits, setExpandedUnits] = useState<Map<string, Set<string>>>(new Map()); // Track expanded units per SUM
  const [showSummaryByUnit, setShowSummaryByUnit] = useState<boolean>(false); // Track Summary by Unit section visibility
  const [expandedUnitManagers, setExpandedUnitManagers] = useState<Set<string>>(new Set()); // Track expanded unit managers for individual reports
  
  // Helper functions for accordion state
  const toggleAgency = (agencyName: string) => {
    setExpandedAgencies(prev => {
      const next = new Set(prev);
      if (next.has(agencyName)) {
        next.delete(agencyName);
      } else {
        next.add(agencyName);
      }
      return next;
    });
  };
  
  const toggleSUM = (agencyName: string, sumKey: string) => {
    setExpandedSUMs(prev => {
      const next = new Map(prev);
      const agencySUMs = next.get(agencyName) || new Set<string>();
      const newAgencySUMs = new Set(agencySUMs);
      if (newAgencySUMs.has(sumKey)) {
        newAgencySUMs.delete(sumKey);
      } else {
        newAgencySUMs.add(sumKey);
      }
      next.set(agencyName, newAgencySUMs);
      return next;
    });
  };
  
  const toggleUnit = (sumKey: string, unitKey: string) => {
    setExpandedUnits(prev => {
      const next = new Map(prev);
      const sumUnits = next.get(sumKey) || new Set<string>();
      const newSumUnits = new Set(sumUnits);
      if (newSumUnits.has(unitKey)) {
        newSumUnits.delete(unitKey);
      } else {
        newSumUnits.add(unitKey);
      }
      next.set(sumKey, newSumUnits);
      return next;
    });
  };
  
  const isAgencyExpanded = (agencyName: string) => expandedAgencies.has(agencyName);
  const isSUMExpanded = (agencyName: string, sumKey: string) => (expandedSUMs.get(agencyName) || new Set()).has(sumKey);
  const isUnitExpanded = (sumKey: string, unitKey: string) => (expandedUnits.get(sumKey) || new Set()).has(unitKey);
  
  const toggleUnitManager = (unitManagerName: string) => {
    setExpandedUnitManagers(prev => {
      const next = new Set(prev);
      if (next.has(unitManagerName)) {
        next.delete(unitManagerName);
      } else {
        next.add(unitManagerName);
      }
      return next;
    });
  };
  
  const isUnitManagerExpanded = (unitManagerName: string) => expandedUnitManagers.has(unitManagerName);
  
  // Helper function to calculate annual new recruits from quarterly data
  const calculateAnnualNewRecruits = (goal: StrategicPlanningGoal): number => {
    return (goal.q1?.newRecruits || 0) + 
           (goal.q2?.newRecruits || 0) + 
           (goal.q3?.newRecruits || 0) + 
           (goal.q4?.newRecruits || 0);
  };

  // Helper function to calculate reconciled unit totals using reconciliation logic
  // Unit Total = Leader Personal + max(Leader Team, Advisor Sum)
  const calculateReconciledUnitTotals = (unitGoals: StrategicPlanningGoal[]) => {
    // Separate leader goals from advisor goals
    const leaderGoal = unitGoals.find(g => g.userRank === 'UM' || g.userRank === 'SUM' || g.userRank === 'ADD');
    const advisorGoals = unitGoals.filter(g => g.userRank !== 'UM' && g.userRank !== 'SUM' && g.userRank !== 'ADD');
    
    // Calculate leader personal goals from quarterly goals
    // NOTE: For leaders, q1.fyc contains (Personal + Team), so we need to subtract team component
    // Team annual = monthlyTeamTarget * 12
    let leaderPersonalFYP = 0;
    let leaderPersonalFYC = 0;
    
    if (leaderGoal) {
      // Total FYP/FYC from quarterly goals (includes both personal and team)
      let totalFYP = (leaderGoal.q1?.fyp || 0) + (leaderGoal.q2?.fyp || 0) + (leaderGoal.q3?.fyp || 0) + (leaderGoal.q4?.fyp || 0);
      let totalFYC = (leaderGoal.q1?.fyc || 0) + (leaderGoal.q2?.fyc || 0) + (leaderGoal.q3?.fyc || 0) + (leaderGoal.q4?.fyc || 0);
      
      // Annual team targets
      const annualTeamFYP = leaderGoal.monthlyTeamTargetFYP ? (leaderGoal.monthlyTeamTargetFYP * 12) : 0;
      const annualTeamFYC = leaderGoal.monthlyTeamTargetFYC ? (leaderGoal.monthlyTeamTargetFYC * 12) : 0;
      
        // Calculate Personal FYP/FYC
        // If quarterly values exist, use them (Total - Team)
        // If quarterly values are zero but monthly target is set, use monthly target as fallback
        // If result is zero/negative (data inconsistency), use monthly target as fallback
        if (totalFYP > 0) {
          // Quarterly values exist - subtract team component
          const calculatedPersonalFYP = totalFYP - annualTeamFYP;
          if (calculatedPersonalFYP > 0) {
            leaderPersonalFYP = calculatedPersonalFYP;
          } else if (leaderGoal.monthlyTargetFYP && leaderGoal.monthlyTargetFYP > 0) {
            // Result is zero/negative - likely data inconsistency, use monthly target as fallback
            // Monthly target FYP is personal-only, so use it directly * 12
            leaderPersonalFYP = leaderGoal.monthlyTargetFYP * 12;
          } else {
            leaderPersonalFYP = 0;
          }
        } else if (leaderGoal.monthlyTargetFYP && leaderGoal.monthlyTargetFYP > 0) {
          // Fallback: Use monthly target FYP * 12 (annual) as personal FYP (monthly target is personal-only)
          leaderPersonalFYP = leaderGoal.monthlyTargetFYP * 12;
        } else {
          leaderPersonalFYP = 0;
        }
        
        if (totalFYC > 0) {
          // Quarterly values exist - subtract team component
          const calculatedPersonalFYC = totalFYC - annualTeamFYC;
          if (calculatedPersonalFYC > 0) {
            leaderPersonalFYC = calculatedPersonalFYC;
          } else if (leaderGoal.monthlyTargetFYC && leaderGoal.monthlyTargetFYC > 0) {
            // Result is zero/negative - likely data inconsistency, use monthly target as fallback
            // Monthly target FYC is personal-only, so use it directly * 12
            leaderPersonalFYC = leaderGoal.monthlyTargetFYC * 12;
          } else {
            leaderPersonalFYC = 0;
          }
        } else if (leaderGoal.monthlyTargetFYC && leaderGoal.monthlyTargetFYC > 0) {
          // Fallback: Use monthly target FYC * 12 (annual) as personal FYC (monthly target is personal-only)
          leaderPersonalFYC = leaderGoal.monthlyTargetFYC * 12;
        } else {
          leaderPersonalFYC = 0;
        }
    }
    const leaderPersonalCases = leaderGoal ? 
      ((leaderGoal.q1?.cases || 0) + (leaderGoal.q2?.cases || 0) + (leaderGoal.q3?.cases || 0) + (leaderGoal.q4?.cases || 0)) : 0;
    const leaderPersonalRecruits = leaderGoal ? calculateAnnualNewRecruits(leaderGoal) : 0;
    
    // Calculate leader team goals (annual from monthly targets)
    const leaderTeamFYP = leaderGoal?.monthlyTeamTargetFYP ? (leaderGoal.monthlyTeamTargetFYP * 12) : 0;
    const leaderTeamFYC = leaderGoal?.monthlyTeamTargetFYC ? (leaderGoal.monthlyTeamTargetFYC * 12) : 0;
    
    // Calculate advisor sum totals from quarterly goals (advisors only have personal goals)
    const advisorSum = advisorGoals.reduce((acc, goal) => {
      const annualNewRecruits = calculateAnnualNewRecruits(goal);
      const annualCases = (goal.q1?.cases || 0) + (goal.q2?.cases || 0) + (goal.q3?.cases || 0) + (goal.q4?.cases || 0);
      // Calculate FYP/FYC from quarterly goals (sum of q1+q2+q3+q4) - this is the advisor's personal FYP/FYC
      const advisorFYP = (goal.q1?.fyp || 0) + (goal.q2?.fyp || 0) + (goal.q3?.fyp || 0) + (goal.q4?.fyp || 0);
      const advisorFYC = (goal.q1?.fyc || 0) + (goal.q2?.fyc || 0) + (goal.q3?.fyc || 0) + (goal.q4?.fyc || 0);
      return {
        fyp: acc.fyp + advisorFYP,
        fyc: acc.fyc + advisorFYC,
        cases: acc.cases + annualCases,
        recruits: acc.recruits + annualNewRecruits,
      };
    }, { fyp: 0, fyc: 0, cases: 0, recruits: 0 });
    
    // Reconciliation Logic: Unit Total = Leader Personal + max(Leader Team, Advisor Sum)
    const teamOrAdvisorFYP = Math.max(leaderTeamFYP, advisorSum.fyp);
    const teamOrAdvisorFYC = Math.max(leaderTeamFYC, advisorSum.fyc);
    
    const reconciledFYP = leaderPersonalFYP + teamOrAdvisorFYP;
    const reconciledFYC = leaderPersonalFYC + teamOrAdvisorFYC;
    
    // For cases and recruits, use Leader Personal + Advisor Sum (no team targets)
    const reconciledCases = leaderPersonalCases + advisorSum.cases;
    const reconciledRecruits = leaderPersonalRecruits + advisorSum.recruits;
    
    // Calculate other totals (manpower, income) - sum all goals
    const totalManpower = unitGoals.reduce((sum, goal) => sum + (goal.annualManpower || 0), 0);
    const totalIncome = unitGoals.reduce((sum, goal) => sum + (goal.annualIncome || 0), 0);
    
    return {
      fyp: reconciledFYP,
      fyc: reconciledFYC,
      cases: reconciledCases,
      recruits: reconciledRecruits,
      manpower: totalManpower,
      income: totalIncome,
      // Breakdown for reference
      leaderPersonalFYP,
      leaderPersonalFYC,
      leaderTeamFYP,
      leaderTeamFYC,
      advisorSumFYP: advisorSum.fyp,
      advisorSumFYC: advisorSum.fyc,
    };
  };

  // Helper function to calculate summary metrics for a set of goals (deprecated - use calculateReconciledUnitTotals instead)
  const calculateUnitMetrics = (goals: StrategicPlanningGoal[]) => {
    const annualNewRecruits = goals.reduce((sum, goal) => {
      return sum + (goal.q1?.newRecruits || 0) + (goal.q2?.newRecruits || 0) + 
             (goal.q3?.newRecruits || 0) + (goal.q4?.newRecruits || 0);
    }, 0);
    const totalFYP = goals.reduce((sum, goal) => sum + goal.annualFYP, 0);
    const totalFYC = goals.reduce((sum, goal) => sum + goal.annualFYC, 0);
    const totalIncome = goals.reduce((sum, goal) => sum + goal.annualIncome, 0);
    return { count: goals.length, newRecruits: annualNewRecruits, fyp: totalFYP, fyc: totalFYC, income: totalIncome };
  };

  // Load filter options for ADD users
  const loadFilterOptions = async () => {
    if (!user || user.rank !== 'ADD' || !user.agencyName) return;
    
    try {
      // Load SUM list from Users collection (source of truth)
      const sums = await getSUMsInAgencyFromUsers(user.agencyName);
      setAvailableSUMs(sums.map(sum => sum.name));
      
      // Load units based on SUM filter
      await updateAvailableUnits();
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  };

  // Update available units based on SUM filter
  const updateAvailableUnits = async () => {
    if (!user || user.rank !== 'ADD' || !user.agencyName) return;
    
    try {
      if (filterSUM !== 'all') {
        // Get units under selected SUM from Users collection (source of truth)
        const umNames = await getUMsUnderSUMFromUsers(filterSUM, user.agencyName);
        setAvailableUnitsForSUM(umNames.map(umName => `${umName}_${user.agencyName}`));
      } else {
        // Get all units in agency from Users collection (source of truth)
        const allUnits = await getUnitsByAgencyFromUsers(user.agencyName);
        setAvailableUnitsForSUM(allUnits.map(umName => `${umName}_${user.agencyName}`));
      }
    } catch (err) {
      console.error('Error updating available units:', err);
    }
  };

  // Check authorization - allow ADMIN, ADD, SUM, UM
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      const allowedRanks = ['ADMIN', 'ADD', 'SUM', 'UM'];
      
      if (!allowedRanks.includes(user.rank)) {
        router.push('/login');
        return;
      }
      
      // Load filter options for ADD users
      if (user.rank === 'ADD' && user.agencyName) {
        loadFilterOptions();
      }
      
      // Load user records to get accurate rank information (source of truth)
      loadUserRanks();
      
      loadGoals();
    }
  }, [user, authLoading, router]);
  
  // Load user ranks and agency names from user records (source of truth, not from goals)
  const loadUserRanks = async () => {
    try {
      const allUsers = await getAllUsers();
      const rankMap = new Map<string, string>();
      const agencyMap = new Map<string, string>(); // userName -> canonical agencyName
      const unitManagerMap = new Map<string, string>(); // userName -> unitManager (source of truth)
      const agencySet = new Set<string>();
      
      allUsers.forEach(user => {
        if (user.name && user.rank) {
          // Store both canonical and original name for rank lookup
          const canonicalName = getCanonicalName(user.name);
          rankMap.set(canonicalName, user.rank);
          // Also store original name for backward compatibility
          rankMap.set(user.name, user.rank);
        }
        // Map userName to canonical agency name (source of truth for agency assignment)
        // Store both canonical and original name variations
        if (user.name) {
          const canonicalUserName = getCanonicalName(user.name);
          if (user.agencyName) {
            const canonicalAgencyName = getCanonicalAgencyName(user.agencyName);
            // Store with canonical name (primary lookup)
            agencyMap.set(canonicalUserName, canonicalAgencyName);
            // Also store with original name for backward compatibility
            agencyMap.set(user.name, canonicalAgencyName);
            agencySet.add(canonicalAgencyName);
          } else {
            // Even if no agencyName, store the user so we know they exist
            // This helps with debugging - we'll know the user exists but has no agency
            console.warn(`[ReportsPage] User "${user.name}" (canonical: "${canonicalUserName}") has no agencyName in Users collection`);
          }
          
          // Map userName to unitManager (source of truth for unit assignments)
          if (user.unitManager) {
            const canonicalUnitManager = getCanonicalName(user.unitManager);
            // Store with canonical name (primary lookup)
            unitManagerMap.set(canonicalUserName, canonicalUnitManager);
            // Also store with original name for backward compatibility
            unitManagerMap.set(user.name, canonicalUnitManager);
          }
        }
      });
      
      // Store allUsers for flexible name matching when needed
      setAllUsersList(allUsers);
      
      setUserRankMap(rankMap);
      setUserAgencyMap(agencyMap);
      setUserUnitManagerMap(unitManagerMap);
      setValidAgencyNames(agencySet);
      
      const sumNames = Array.from(rankMap.entries()).filter(([_, rank]) => rank === 'SUM').map(([name]) => name);
      console.log('[ReportsPage] Loaded user ranks. SUMs found:', sumNames);
      console.log('[ReportsPage] Valid agency names from Users:', Array.from(agencySet).sort());
      console.log('[ReportsPage] User agency map size:', agencyMap.size);
      
      // Debug: Log some sample entries to verify the map is correct
      const sampleEntries = Array.from(agencyMap.entries()).slice(0, 5);
      console.log('[ReportsPage] Sample user agency map entries:', sampleEntries);
      
      // Debug: Check for specific users mentioned in the issue
      const checkUsers = ['JANICE I. NUNEZ', 'MARIA ESTRELLA C. MATUNOG', 'VIRGINIA B. IWAY', 'SARAH P. RECLA', 'DARLYN L. PEREZ'];
      checkUsers.forEach(name => {
        const canonicalName = getCanonicalName(name);
        const agency = agencyMap.get(canonicalName);
        // Also check if they exist in allUsers
        const userInCollection = allUsers.find(u => getCanonicalName(u.name) === canonicalName);
        if (userInCollection) {
          console.log(`[ReportsPage] User "${name}" (canonical: "${canonicalName}") -> Found in Users collection. Agency in collection: "${userInCollection.agencyName || 'MISSING'}", Mapped agency: ${agency || 'NOT FOUND'}`);
        } else {
          console.warn(`[ReportsPage] User "${name}" (canonical: "${canonicalName}") -> NOT FOUND in Users collection at all!`);
        }
      });
      
      // Debug: Show all unit managers/leaders in the Users collection
      const leadersInCollection = allUsers.filter(u => u.rank === 'UM' || u.rank === 'SUM' || u.rank === 'ADD');
      console.log(`[ReportsPage] Total leaders (UM/SUM/ADD) in Users collection: ${leadersInCollection.length}`);
      const leaderNames = leadersInCollection.map(u => `${u.name} (${u.rank}) - Agency: ${u.agencyName || 'MISSING'}`);
      console.log('[ReportsPage] Leaders in Users collection:', leaderNames.slice(0, 10)); // Show first 10
    } catch (err) {
      console.error('Error loading user ranks:', err);
    }
  };

  // Reload goals when filters change for ADD users
  useEffect(() => {
    if (user && user.rank === 'ADD' && !authLoading && !loading) {
      loadGoals();
    }
  }, [filterSUM, filterUnit]);

  // Reload goals when filters change for ADMIN users
  useEffect(() => {
    if (user && (user.role === 'admin' || user.rank === 'ADMIN') && !authLoading && !loading) {
      loadGoals();
    }
  }, [filterSUM, filterAgency]);

  // Load UMs under SUM when SUM filter changes (for client-side filtering only - doesn't affect Individual Reports)
  // Note: This is only used for populating availableUnitsForSUM filter dropdown, not for Individual Reports grouping
  useEffect(() => {
    const loadUMsUnderSUM = async () => {
      if (filterSUM === 'all' || !goals.length) {
        setAvailableUnitsForSUM([]);
        return;
      }

      try {
        const units: string[] = [];
        // Get unique agencies from goals
        const agencies = Array.from(new Set(goals.map(g => g.agencyName)));
        
        // For each agency, get UMs under the selected SUM from Users collection (source of truth)
        for (const agency of agencies) {
          try {
            const ums = await getUMsUnderSUMFromUsers(filterSUM, agency);
            if (ums.length > 0) {
              units.push(...ums);
            }
          } catch (err) {
            console.error(`Error loading UMs under SUM ${filterSUM} for agency ${agency}:`, err);
          }
        }
        
        setAvailableUnitsForSUM([...new Set(units)]); // Remove duplicates
      } catch (err) {
        console.error('Error loading UMs under SUM:', err);
        setAvailableUnitsForSUM([]);
      }
    };

    // Only load if we're doing client-side filtering (admin with SUM filter but no agency filter)
    if ((user?.role === 'admin' || user?.rank === 'ADMIN') && filterSUM !== 'all' && filterAgency === 'all') {
      loadUMsUnderSUM();
    } else {
      setAvailableUnitsForSUM([]);
    }
  }, [filterSUM, filterAgency, goals, user]);

  // Load SUM -> UMs and ADD -> UMs maps for all agencies when goals are loaded (for Individual Reports grouping)
  useEffect(() => {
    const loadHierarchyMaps = async () => {
      if (!goals.length || userRankMap.size === 0) {
        setSumToUMsMap(new Map());
        setAddToUMsMap(new Map());
        return;
      }

      try {
        const sumMap = new Map<string, string[]>();
        const addMap = new Map<string, string[]>();
        
        // Get unique agencies from goals
        const agencies = Array.from(new Set(goals.map(g => g.agencyName)));
        
        // For each agency, get SUMs and ADDs, then get their UMs from Users collection (source of truth)
        for (const agency of agencies) {
          try {
            // Get all SUMs in agency from Users collection (source of truth)
            const sums = await getSUMsInAgencyFromUsers(agency);
            for (const sum of sums) {
              const ums = await getUMsUnderSUMFromUsers(sum.name, agency);
              if (ums.length > 0) {
                const existing = sumMap.get(sum.name) || [];
                sumMap.set(sum.name, [...existing, ...ums]);
              }
            }
            
            // Get all ADDs in agency (from userRankMap)
            const addNames: string[] = [];
            userRankMap.forEach((rank, userName) => {
              if (rank === 'ADD') {
                // Check if this ADD is in this agency (by checking if they have goals in this agency)
                const hasGoalsInAgency = goals.some(g => 
                  getCanonicalAgencyName(g.agencyName) === getCanonicalAgencyName(agency) && 
                  g.userName === userName
                );
                if (hasGoalsInAgency) {
                  addNames.push(userName);
                }
              }
            });
            
            // Get UMs under each ADD from Users collection (source of truth)
            for (const addName of addNames) {
              try {
                const ums = await getUMsUnderADDFromUsers(addName, agency);
                if (ums.length > 0) {
                  const existing = addMap.get(addName) || [];
                  addMap.set(addName, [...existing, ...ums]);
                }
              } catch (err) {
                console.error(`Error loading UMs under ADD ${addName} for agency ${agency}:`, err);
              }
            }
          } catch (err) {
            console.error(`Error loading hierarchy for agency ${agency}:`, err);
          }
        }
        
        setSumToUMsMap(sumMap);
        setAddToUMsMap(addMap);
        console.log('[ReportsPage] Loaded hierarchy maps from Users collection:', {
          sumMapSize: sumMap.size,
          addMapSize: addMap.size,
          sumMapEntries: Array.from(sumMap.entries()).map(([sum, ums]) => [sum, ums.length]),
          addMapEntries: Array.from(addMap.entries()).map(([add, ums]) => [add, ums.length]),
        });
      } catch (err) {
        console.error('Error loading hierarchy maps:', err);
        setSumToUMsMap(new Map());
        setAddToUMsMap(new Map());
      }
    };

    // Load hierarchy maps when goals and user ranks are available
    if (goals.length > 0 && userRankMap.size > 0) {
      loadHierarchyMaps();
    }
  }, [goals, userRankMap]);

  useEffect(() => {
    // Wait for both userRankMap and userAgencyMap to be loaded before calculating aggregates
    if (goals.length > 0 && userRankMap.size > 0 && userAgencyMap.size > 0) {
      calculateAggregates();
    }
  }, [goals, filterAgency, filterRank, filterUnit, filterSUM, sumToUMsMap, userRankMap, userAgencyMap]);

  // Update available units when SUM filter changes
  useEffect(() => {
    if (user?.rank === 'ADD' && user.agencyName) {
      updateAvailableUnits().then(() => {
        // Reset unit filter if current selection is not in available units
        if (filterUnit !== 'all' && !availableUnitsForSUM.includes(filterUnit)) {
          setFilterUnit('all');
        }
      });
    }
  }, [filterSUM]);

  const loadGoals = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      let loadedGoals: StrategicPlanningGoal[] = [];
      
      if (user.role === 'admin' || user.rank === 'ADMIN') {
        // Admin: Handle filters (Overall, By Agency, By SUM)
        if (filterSUM !== 'all') {
          if (filterAgency !== 'all') {
            // Filter by SUM and Agency - use getGoalsForSUM
            loadedGoals = await getGoalsForSUM(filterSUM, filterAgency);
          } else {
            // Filter by SUM only - need to find SUM's agency from goals first
            // Load all goals temporarily to find SUM's agency
            const allGoalsTemp = await getAllGoals();
            // Verify SUM from user records, not goal.userRank
            const isSUM = userRankMap.get(filterSUM) === 'SUM';
            const sumGoal = isSUM ? allGoalsTemp.find(g => g.userName === filterSUM) : null;
            if (sumGoal && sumGoal.agencyName) {
              // Use getGoalsForSUM with the SUM's agency
              loadedGoals = await getGoalsForSUM(filterSUM, sumGoal.agencyName);
            } else {
              // SUM not found in goals, return empty array
              console.warn(`SUM "${filterSUM}" not found in goals`);
              loadedGoals = [];
            }
          }
        } else if (filterAgency !== 'all') {
          // Filter by Agency only
          loadedGoals = await getAgencyGoals(filterAgency);
        } else {
          // Get all goals
          loadedGoals = await getAllGoals();
        }
      } else if (user.rank === 'ADD') {
        // ADD: Handle filters (Overall, By SUM, By Unit)
        console.log(`[ReportsPage] ADD user "${user.name}" (email: ${user.email}) loading goals`);
        console.log(`[ReportsPage] ADD agency: "${user.agencyName}"`);
        console.log(`[ReportsPage] ADD filters - SUM: "${filterSUM}", Unit: "${filterUnit}"`);
        
        if (filterSUM !== 'all' && filterUnit === 'all') {
          // Filter by SUM only - get goals for this specific SUM
          console.log(`[ReportsPage] ADD filtering by SUM: "${filterSUM}"`);
          loadedGoals = await getGoalsForSUM(filterSUM, user.agencyName);
          console.log(`[ReportsPage] ADD loaded ${loadedGoals.length} goals for SUM "${filterSUM}"`);
        } else if (filterUnit !== 'all') {
          // Filter by Unit - get goals for this specific UM/unit
          const unitParts = filterUnit.split('_'); // Format: "UM_NAME_AGENCY_NAME"
          const umName = unitParts.slice(0, -1).join('_'); // Handle names with underscores
          console.log(`[ReportsPage] ADD filtering by Unit: "${umName}"`);
          loadedGoals = await getUnitGoals(umName, user.agencyName);
          console.log(`[ReportsPage] ADD loaded ${loadedGoals.length} goals for Unit "${umName}"`);
        } else {
          // Overall agency view (both filters = 'all') - get all goals for ADD's agency
          console.log(`[ReportsPage] ADD loading all goals for agency using getGoalsForADD`);
          console.log(`[ReportsPage] Calling getGoalsForADD("${user.name}", "${user.agencyName}")`);
          loadedGoals = await getGoalsForADD(user.name, user.agencyName);
          console.log(`[ReportsPage] ADD loaded ${loadedGoals.length} goals from getGoalsForADD`);
          
          // Debug: Log sample goals
          if (loadedGoals.length > 0) {
            console.log(`[ReportsPage] Sample goals:`, loadedGoals.slice(0, 3).map(g => ({
              userName: g.userName,
              userRank: g.userRank,
              agencyName: g.agencyName
            })));
          } else {
            console.warn(`[ReportsPage] No goals loaded for ADD user!`);
          }
        }
      } else if (user.rank === 'SUM') {
        // SUM: Get consolidated goals
        loadedGoals = await getGoalsForSUM(user.name, user.agencyName);
      } else if (user.rank === 'UM') {
        // UM: Get unit goals
        loadedGoals = await getUnitGoals(user.name, user.agencyName);
      } else {
        // Others: No access
        router.push('/login');
        return;
      }
      
      // Deduplicate goals: keep only the most recent goal per user
      // Group goals by userId (or userName + userRank as fallback)
      const goalsMap = new Map<string, StrategicPlanningGoal>();
      loadedGoals.forEach(goal => {
        const key = goal.userId || `${goal.userName}_${goal.userRank}`;
        const existing = goalsMap.get(key);
        
        if (!existing) {
          // First goal for this user - add it
          goalsMap.set(key, goal);
        } else {
          // Compare submittedAt dates - keep the most recent
          const existingDate = existing.submittedAt instanceof Date 
            ? existing.submittedAt 
            : new Date(existing.submittedAt);
          const currentDate = goal.submittedAt instanceof Date 
            ? goal.submittedAt 
            : new Date(goal.submittedAt);
          
          if (currentDate > existingDate) {
            // Current goal is more recent - replace existing
            goalsMap.set(key, goal);
          }
        }
      });
      
      const deduplicatedGoals = Array.from(goalsMap.values());
      console.log(`[ReportsPage] Deduplicated ${loadedGoals.length} goals to ${deduplicatedGoals.length} unique goals`);
      
      setGoals(deduplicatedGoals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter goals to only include those with valid agency names from Users collection
  // This must be defined before calculateAggregates uses it
  const validGoals = goals.filter(goal => {
    if (!goal.agencyName || validAgencyNames.size === 0) return false;
    const canonicalAgencyName = getCanonicalAgencyName(goal.agencyName);
    // Only include goals if their agency name (canonicalized) exists in Users collection
    return validAgencyNames.has(canonicalAgencyName);
  });

  const calculateAggregates = async () => {
    // First filter by valid agency names, then apply other filters
    const validFiltered = validGoals.filter(goal => {
      if (filterAgency !== 'all' && goal.agencyName !== filterAgency) return false;
      if (filterRank !== 'all' && goal.userRank !== filterRank) return false;
      if (filterSUM !== 'all') {
        // Filter by SUM: include goals where:
        // 1. Goal is from the SUM itself (verify from user records)
        const goalUserRank = userRankMap.get(goal.userName) || goal.userRank;
        if (goalUserRank === 'SUM' && goal.userName === filterSUM) {
          // SUM's own goal - include
        } else if (goalUserRank === 'UM') {
          // 2. Goal is from a UM that reports to this SUM
          // Check if this UM reports to the selected SUM
          const umsUnderSUM = sumToUMsMap.get(filterSUM) || [];
          // Also check if goal.unitManager equals filterSUM (in case it's set correctly)
          if (!umsUnderSUM.includes(goal.userName) && goal.unitManager !== filterSUM) {
            return false;
          }
        } else {
          // 3. Goal is from an advisor or other role
          // Check if advisor reports directly to SUM (verify SUM from user records)
          const unitManagerRank = userRankMap.get(goal.unitManager || '');
          if (unitManagerRank === 'SUM' && goal.unitManager === filterSUM) {
            // Direct advisor under SUM - include
          } else {
            // Check if their UM reports to this SUM
            const umsUnderSUM = sumToUMsMap.get(filterSUM) || [];
            if (!umsUnderSUM.includes(goal.unitManager)) {
              // Also check if UM goal exists and has unitManager set to SUM (verify from user records)
              const umGoal = goals.find(g => g.userName === goal.unitManager);
              const umGoalUserRank = umGoal ? (userRankMap.get(umGoal.userName) || umGoal.userRank) : null;
              if (!umGoal || !umGoalUserRank || (umGoal.unitManager !== filterSUM && !umsUnderSUM.includes(umGoal.userName))) {
                return false;
              }
            }
          }
        }
      }
      if (filterUnit !== 'all') {
        const goalUnitName = goal.unitName || `${goal.unitManager}_${goal.agencyName}`;
        if (goalUnitName !== filterUnit) return false;
      }
      return true;
    });
    const filtered = validFiltered;

    const agg: AggregatedData = {
      totalUsers: filtered.length,
      totalManpower: 0,
      totalNewRecruits: 0,
      totalFYP: 0,
      totalFYC: 0,
      totalIncome: 0,
      avgMonthlyIncome: 0,
      byAgency: {},
      bySUM: {},
      byUnit: {},
      byRank: {},
      quarterly: {
        q1: { baseManpower: 0, newRecruits: 0, fyp: 0, fyc: 0, cases: 0 },
        q2: { baseManpower: 0, newRecruits: 0, fyp: 0, fyc: 0, cases: 0 },
        q3: { baseManpower: 0, newRecruits: 0, fyp: 0, fyc: 0, cases: 0 },
        q4: { baseManpower: 0, newRecruits: 0, fyp: 0, fyc: 0, cases: 0 },
      },
    };

    // STEP 1: Group goals by unit, ensuring leaders are grouped with their advisors
    // Always use canonical names to avoid duplicates from name variations
    // Key: canonicalManager_canonicalAgency (always use this format, ignore goal.unitName)
    // IMPORTANT: Use Users collection as source of truth for agency assignments, not goal.agencyName
    const unitGroups: Record<string, StrategicPlanningGoal[]> = {};
    const canonicalUnitKeyToUnitName = new Map<string, string>();
    
      // STEP 1A: First pass - identify all leaders (UM/SUM/ADD) and create unit groups for them
      // Leaders always create their own unit group under their own name
      // Check for similar names to avoid duplicate groups (e.g., "JESSICA BACULAN" vs "JESSICA G. BACULAN")
      filtered.forEach(goal => {
        const isLeader = goal.userRank === 'UM' || goal.userRank === 'SUM' || goal.userRank === 'ADD';
        
        if (isLeader) {
          const canonicalManager = getCanonicalName(goal.userName);
          
          // FIRST: Check if there's already a unit group for a similar name (regardless of agency)
          // This prevents duplicates when the same person has goals with different agency names
          let existingUnitKey: string | null = null;
          let goalOwnerAgency: string | null = null;
          
          for (const [unitKey, unitGoalList] of Object.entries(unitGroups)) {
            // Check if any leader in this unit has a similar name
            const similarLeader = unitGoalList.find(g => {
              const isUnitLeader = g.userRank === 'UM' || g.userRank === 'SUM' || g.userRank === 'ADD';
              if (!isUnitLeader) return false;
              // Use flexible name matching to handle middle initial variations
              return areNamesLikelySamePerson(g.userName, goal.userName);
            });
            
            if (similarLeader) {
              // Found a similar leader - verify they're actually the same person
              // Double-check using areNamesLikelySamePerson to ensure ALL first names match
              // This prevents "Maria Rosario" from being grouped with "Maria Estrella"
              if (areNamesLikelySamePerson(similarLeader.userName, goal.userName)) {
                // Confirmed same person - use their unit key and agency (from Users collection)
                existingUnitKey = unitKey;
                // Extract agency from existing unit key (source of truth)
                goalOwnerAgency = unitKey.split('_').slice(1).join('_');
                break;
              }
              // If names don't match (e.g., "Maria Rosario" vs "Maria Estrella"), continue searching
            }
          }
          
          // If no existing unit found, get agency from Users collection (source of truth)
          if (!existingUnitKey) {
            const canonicalGoalOwner = getCanonicalName(goal.userName);
            goalOwnerAgency = userAgencyMap.get(canonicalGoalOwner) || null;
            if (!goalOwnerAgency) {
              // Try with original userName (not canonicalized)
              goalOwnerAgency = userAgencyMap.get(goal.userName) || null;
            }
            if (!goalOwnerAgency) {
              // Try flexible name matching
              const matchingUser = allUsersList.find(u => 
                areNamesLikelySamePerson(u.name, goal.userName)
              );
              if (matchingUser && matchingUser.agencyName) {
                goalOwnerAgency = getCanonicalAgencyName(matchingUser.agencyName);
                // Cache this match
                userAgencyMap.set(canonicalGoalOwner, goalOwnerAgency);
                userAgencyMap.set(goal.userName, goalOwnerAgency);
              } else {
                // Fallback to goal's agencyName
                goalOwnerAgency = getCanonicalAgencyName(goal.agencyName);
                console.warn(`[ReportsPage] Agency not found in Users collection for leader ${canonicalGoalOwner}, using fallback: ${goalOwnerAgency}`);
              }
            }
          }
          
          // Create canonical unit key with the agency (either from existing unit or looked up)
          const canonicalUnitKey = `${canonicalManager}_${goalOwnerAgency}`;
          
          if (existingUnitKey) {
            // Add to existing unit group (consolidate similar names)
            // Always use the existing unit key to ensure consistency
            unitGroups[existingUnitKey].push(goal);
          } else {
            // Create new unit group for this leader
            if (!unitGroups[canonicalUnitKey]) {
              unitGroups[canonicalUnitKey] = [];
              canonicalUnitKeyToUnitName.set(canonicalUnitKey, goal.unitName || canonicalUnitKey);
            }
            unitGroups[canonicalUnitKey].push(goal);
          }
        }
      });
    
    // STEP 1B: Second pass - assign advisors to their unit manager's group
    // For advisors, find which leader (UM) they report to and group them with that leader
    filtered.forEach(goal => {
      const isLeader = goal.userRank === 'UM' || goal.userRank === 'SUM' || goal.userRank === 'ADD';
      
      if (!isLeader) {
        // For advisors, get unit manager from Users collection (source of truth)
        // Override goal.unitManager with the current assignment from Users collection
        const canonicalGoalOwner = getCanonicalName(goal.userName);
        let advisorUnitManager: string = userUnitManagerMap.get(canonicalGoalOwner) || '';
        if (!advisorUnitManager) {
          // Try with original userName (not canonicalized)
          advisorUnitManager = userUnitManagerMap.get(goal.userName) || '';
        }
        if (!advisorUnitManager) {
          // Try flexible name matching
          const matchingUser = allUsersList.find(u => 
            areNamesLikelySamePerson(u.name, goal.userName)
          );
          if (matchingUser && matchingUser.unitManager) {
            advisorUnitManager = getCanonicalName(matchingUser.unitManager);
            // Cache this match
            userUnitManagerMap.set(canonicalGoalOwner, advisorUnitManager);
            userUnitManagerMap.set(goal.userName, advisorUnitManager);
          } else {
            // Fallback to goal's unitManager (for backward compatibility)
            advisorUnitManager = goal.unitManager || 'Unknown';
            console.warn(`[ReportsPage] Unit manager not found in Users collection for advisor ${goal.userName}, using goal's unitManager: ${advisorUnitManager}`);
          }
        }
        const canonicalUnitManager = getCanonicalName(advisorUnitManager);
        
        // Try to find a unit group for this unit manager
        // Look through all existing unit groups to find one where the leader matches
        let foundUnitKey: string | null = null;
        
        for (const [unitKey, unitGoalList] of Object.entries(unitGroups)) {
          // Check if any leader in this unit matches the advisor's unitManager
          // Use areNamesLikelySamePerson to handle middle initial variations (e.g., "JESSICA BACULAN" vs "JESSICA G. BACULAN")
          const leaderInUnit = unitGoalList.find(g => {
            const isUnitLeader = g.userRank === 'UM' || g.userRank === 'SUM' || g.userRank === 'ADD';
            if (!isUnitLeader) return false;
            // Use flexible name matching to handle middle initial variations
            return areNamesLikelySamePerson(g.userName, advisorUnitManager);
          });
          
          if (leaderInUnit) {
            foundUnitKey = unitKey;
            break;
          }
        }
        
        // If we found a matching unit, add the advisor to it
        if (foundUnitKey) {
          unitGroups[foundUnitKey].push(goal);
        } else {
          // If no matching unit found, create a new unit group for this advisor
          // This handles cases where the unit manager hasn't submitted a goal yet
          // Get agency from Users collection
          // Try exact match first, then flexible name matching
          let canonicalAgency: string;
          let unitManagerAgency = userAgencyMap.get(canonicalUnitManager);
          if (!unitManagerAgency) {
            // Try with original unitManager name (not canonicalized)
            unitManagerAgency = userAgencyMap.get(advisorUnitManager);
          }
          if (!unitManagerAgency) {
            // Try flexible name matching - look through all users to find a similar name
            const matchingUser = allUsersList.find(u => 
              areNamesLikelySamePerson(u.name, advisorUnitManager)
            );
            if (matchingUser && matchingUser.agencyName) {
              unitManagerAgency = getCanonicalAgencyName(matchingUser.agencyName);
              // Cache this match for future lookups
              userAgencyMap.set(canonicalUnitManager, unitManagerAgency);
              userAgencyMap.set(advisorUnitManager, unitManagerAgency);
            }
          }
          if (unitManagerAgency) {
            canonicalAgency = unitManagerAgency;
          } else {
            // Fallback: Try advisor's own agency, then goal's agencyName
            const canonicalGoalOwner = getCanonicalName(goal.userName);
            let goalOwnerAgency = userAgencyMap.get(canonicalGoalOwner);
            if (!goalOwnerAgency) {
              goalOwnerAgency = userAgencyMap.get(goal.userName);
            }
            canonicalAgency = goalOwnerAgency || getCanonicalAgencyName(goal.agencyName);
            console.warn(`[ReportsPage] Unit manager "${canonicalUnitManager}" not found in Users collection for advisor ${goal.userName}, using fallback agency: ${canonicalAgency}`);
          }
          
          const canonicalUnitKey = `${canonicalUnitManager}_${canonicalAgency}`;
          
          if (!unitGroups[canonicalUnitKey]) {
            unitGroups[canonicalUnitKey] = [];
            canonicalUnitKeyToUnitName.set(canonicalUnitKey, goal.unitName || canonicalUnitKey);
          }
          unitGroups[canonicalUnitKey].push(goal);
        }
      }
    });

    // Helper function to calculate annual new recruits from quarterly data
    const calculateAnnualNewRecruits = (goal: StrategicPlanningGoal): number => {
      return (goal.q1?.newRecruits || 0) + 
             (goal.q2?.newRecruits || 0) + 
             (goal.q3?.newRecruits || 0) + 
             (goal.q4?.newRecruits || 0);
    };

    // STEP 2: Calculate unit totals with reconciliation logic
    // Reconcile leader personal goals with advisor goals
    // unitName here is actually the canonical unit key (canonicalManager_canonicalAgency)
    Object.entries(unitGroups).forEach(([canonicalUnitKey, unitGoals]) => {
      // Separate leader goals from advisor goals
      const leaderGoal = unitGoals.find(g => g.userRank === 'UM' || g.userRank === 'SUM' || g.userRank === 'ADD');
      const advisorGoals = unitGoals.filter(g => g.userRank !== 'UM' && g.userRank !== 'SUM' && g.userRank !== 'ADD');
      
      // Calculate leader personal goals from quarterly goals
      // NOTE: For leaders, q1.fyc contains (Personal + Team), so we need to subtract team component
      // Team annual = monthlyTeamTarget * 12
      let leaderPersonalFYP = 0;
      let leaderPersonalFYC = 0;
      
      if (leaderGoal) {
        // Total FYP/FYC from quarterly goals (includes both personal and team)
        let totalFYP = (leaderGoal.q1?.fyp || 0) + (leaderGoal.q2?.fyp || 0) + (leaderGoal.q3?.fyp || 0) + (leaderGoal.q4?.fyp || 0);
        let totalFYC = (leaderGoal.q1?.fyc || 0) + (leaderGoal.q2?.fyc || 0) + (leaderGoal.q3?.fyc || 0) + (leaderGoal.q4?.fyc || 0);
        
        // Annual team targets
        const annualTeamFYP = leaderGoal.monthlyTeamTargetFYP ? (leaderGoal.monthlyTeamTargetFYP * 12) : 0;
        const annualTeamFYC = leaderGoal.monthlyTeamTargetFYC ? (leaderGoal.monthlyTeamTargetFYC * 12) : 0;
        
        // Calculate Personal FYP/FYC
        // If quarterly values exist, use them (Total - Team)
        // If quarterly values are zero but monthly target is set, use monthly target as fallback
        // If result is zero/negative (data inconsistency), use monthly target as fallback
        if (totalFYP > 0) {
          // Quarterly values exist - subtract team component
          const calculatedPersonalFYP = totalFYP - annualTeamFYP;
          if (calculatedPersonalFYP > 0) {
            leaderPersonalFYP = calculatedPersonalFYP;
          } else if (leaderGoal.monthlyTargetFYP && leaderGoal.monthlyTargetFYP > 0) {
            // Result is zero/negative - likely data inconsistency, use monthly target as fallback
            // Monthly target FYP is personal-only, so use it directly * 12
            leaderPersonalFYP = leaderGoal.monthlyTargetFYP * 12;
          } else {
            leaderPersonalFYP = 0;
          }
        } else if (leaderGoal.monthlyTargetFYP && leaderGoal.monthlyTargetFYP > 0) {
          // Fallback: Use monthly target FYP * 12 (annual) as personal FYP (monthly target is personal-only)
          leaderPersonalFYP = leaderGoal.monthlyTargetFYP * 12;
        } else {
          leaderPersonalFYP = 0;
        }
        
        if (totalFYC > 0) {
          // Quarterly values exist - subtract team component
          const calculatedPersonalFYC = totalFYC - annualTeamFYC;
          if (calculatedPersonalFYC > 0) {
            leaderPersonalFYC = calculatedPersonalFYC;
          } else if (leaderGoal.monthlyTargetFYC && leaderGoal.monthlyTargetFYC > 0) {
            // Result is zero/negative - likely data inconsistency, use monthly target as fallback
            // Monthly target FYC is personal-only, so use it directly * 12
            leaderPersonalFYC = leaderGoal.monthlyTargetFYC * 12;
          } else {
            leaderPersonalFYC = 0;
          }
        } else if (leaderGoal.monthlyTargetFYC && leaderGoal.monthlyTargetFYC > 0) {
          // Fallback: Use monthly target FYC * 12 (annual) as personal FYC (monthly target is personal-only)
          leaderPersonalFYC = leaderGoal.monthlyTargetFYC * 12;
        } else {
          leaderPersonalFYC = 0;
        }
      }
      const leaderPersonalCases = leaderGoal ? 
        ((leaderGoal.q1?.cases || 0) + (leaderGoal.q2?.cases || 0) + (leaderGoal.q3?.cases || 0) + (leaderGoal.q4?.cases || 0)) : 0;
      const leaderPersonalRecruits = leaderGoal ? calculateAnnualNewRecruits(leaderGoal) : 0;
      
      // Calculate leader team goals (annual from monthly targets)
      // Team goals are stored as monthly targets, so multiply by 12 to get annual
      const leaderTeamFYP = leaderGoal?.monthlyTeamTargetFYP ? (leaderGoal.monthlyTeamTargetFYP * 12) : 0;
      const leaderTeamFYC = leaderGoal?.monthlyTeamTargetFYC ? (leaderGoal.monthlyTeamTargetFYC * 12) : 0;
      
      // Calculate advisor sum totals from quarterly goals (advisors only have personal goals)
      const advisorSum = advisorGoals.reduce((acc, goal) => {
        const annualNewRecruits = calculateAnnualNewRecruits(goal);
        const annualCases = (goal.q1?.cases || 0) + (goal.q2?.cases || 0) + (goal.q3?.cases || 0) + (goal.q4?.cases || 0);
        // Calculate FYP/FYC from quarterly goals (sum of q1+q2+q3+q4) - this is the advisor's personal FYP/FYC
        const advisorFYP = (goal.q1?.fyp || 0) + (goal.q2?.fyp || 0) + (goal.q3?.fyp || 0) + (goal.q4?.fyp || 0);
        const advisorFYC = (goal.q1?.fyc || 0) + (goal.q2?.fyc || 0) + (goal.q3?.fyc || 0) + (goal.q4?.fyc || 0);
        return {
          fyp: acc.fyp + advisorFYP,
          fyc: acc.fyc + advisorFYC,
          cases: acc.cases + annualCases,
          recruits: acc.recruits + annualNewRecruits,
        };
      }, { fyp: 0, fyc: 0, cases: 0, recruits: 0 });
      
      // Reconciliation Logic (clarified with examples):
      // Unit Total = Leader Personal + max(Leader Team, Advisor Sum)
      // Example 1: Leader Personal = 1M, Leader Team = 800K, Advisor Sum = 500K
      //   → Unit Total = 1M + 800K = 1.8M (uses Leader Team since 800K > 500K)
      // Example 2: Leader Personal = 500K, Leader Team = 1M, Advisor Sum = 1.3M
      //   → Unit Total = 500K + 1.3M = 1.8M (uses Advisor Sum since 1.3M > 1M)
      // The variance accounts for advisors not yet submitting and new recruits coming later
      
      let unitFYP: number;
      let unitFYC: number;
      let unitCases: number;
      let unitRecruits: number;
      let reconciliationMethod: 'leader_team' | 'advisor_sum';
      
      // For FYP and FYC: Unit Total = Leader Personal + max(Leader Team, Advisor Sum)
      const teamOrAdvisorFYP = Math.max(leaderTeamFYP, advisorSum.fyp);
      const teamOrAdvisorFYC = Math.max(leaderTeamFYC, advisorSum.fyc);
      
      unitFYP = leaderPersonalFYP + teamOrAdvisorFYP;
      unitFYC = leaderPersonalFYC + teamOrAdvisorFYC;
      
      // For cases and recruits, use Leader Personal + Advisor Sum
      // (no team targets for these metrics)
      unitCases = leaderPersonalCases + advisorSum.cases;
      unitRecruits = leaderPersonalRecruits + advisorSum.recruits;
      
      // Determine reconciliation method based on which is higher (Leader Team or Advisor Sum)
      reconciliationMethod = leaderTeamFYP > advisorSum.fyp ? 'leader_team' : 'advisor_sum';
      
      // Calculate other totals (manpower, income) - sum all goals
      const unitTotal = unitGoals.reduce((acc, goal) => {
        const annualNewRecruits = calculateAnnualNewRecruits(goal);
        // Beginning Manpower Base: Only from leaders (UM, SUM, ADD)
        const isLeader = goal.userRank === 'UM' || goal.userRank === 'SUM' || goal.userRank === 'ADD';
        const beginningBase = isLeader ? (goal.q1?.baseManpower || 0) : 0;
        // End Manpower: Q1 Base Manpower + Total New Recruits (Q1+Q2+Q3+Q4) - only from leaders
        const endManpower = isLeader ? ((goal.q1?.baseManpower || 0) + annualNewRecruits) : 0;
        
        return {
          count: acc.count + 1,
          beginningManpowerBase: acc.beginningManpowerBase + beginningBase,
          endManpower: acc.endManpower + endManpower,
          manpower: acc.manpower + goal.annualManpower,
          income: acc.income + goal.annualIncome,
        };
      }, { count: 0, beginningManpowerBase: 0, endManpower: 0, manpower: 0, income: 0 });

      // Store unit totals with reconciliation breakdown
      // Use canonical unit key (canonicalUnitKey is: canonicalManager_canonicalAgency)
      // IMPORTANT: The canonicalUnitKey is already in the format canonicalManager_canonicalAgency
      // Extract the canonical manager from the key (everything before the last underscore)
      // But actually, the key format is: canonicalManager_canonicalAgency
      // So we need to find the leader's name to use as the unit manager
      const firstGoal = unitGoals[0];
      
      // Prefer the leader's name if available, otherwise use the first goal's unitManager
      // But make sure we use the canonical name that matches the key
      let unitManagerName: string;
      if (leaderGoal) {
        unitManagerName = leaderGoal.userName;
      } else {
        // No leader in this unit - this shouldn't happen for proper units, but handle it
        unitManagerName = firstGoal.unitManager || 'Unknown';
      }
      
      const canonicalUnitManager = getCanonicalName(unitManagerName);
      
      // Get agency from Users collection (source of truth), fallback to goal if not found
      let canonicalAgencyName: string;
      let userAgency = userAgencyMap.get(canonicalUnitManager);
      if (!userAgency) {
        // Try with original name (not canonicalized)
        userAgency = userAgencyMap.get(unitManagerName);
      }
      if (userAgency) {
        canonicalAgencyName = userAgency;
      } else {
        // Fallback to first goal's agency
        canonicalAgencyName = getCanonicalAgencyName(firstGoal.agencyName);
      }
      
      // Verify the canonicalUnitKey matches what we expect
      const expectedUnitKey = `${canonicalUnitManager}_${canonicalAgencyName}`;
      if (canonicalUnitKey !== expectedUnitKey) {
        console.warn(`[ReportsPage] Unit key mismatch for unit manager ${canonicalUnitManager}. Expected: ${expectedUnitKey}, Actual: ${canonicalUnitKey}`);
      }
      
      agg.byUnit[canonicalUnitKey] = {
        unitManager: canonicalUnitManager,
        agencyName: canonicalAgencyName,
        count: unitTotal.count,
        beginningManpowerBase: unitTotal.beginningManpowerBase,
        endManpower: unitTotal.endManpower,
        newRecruits: unitRecruits, // Use reconciled recruits
        fyp: unitFYP, // Use reconciled FYP
        fyc: unitFYC, // Use reconciled FYC
        income: unitTotal.income,
        // Reconciliation breakdown
        leaderPersonalFYP,
        leaderPersonalFYC,
        leaderPersonalCases,
        leaderPersonalRecruits,
        leaderTeamFYP,
        leaderTeamFYC,
        advisorSumFYP: advisorSum.fyp,
        advisorSumFYC: advisorSum.fyc,
        advisorSumCases: advisorSum.cases,
        advisorSumRecruits: advisorSum.recruits,
        reconciliationMethod,
      };
    });

    // STEP 2.5: Consolidate duplicate units (merge units with similar manager names in same agency)
    // This is a safety net to catch any duplicates that weren't caught in the grouping step
    // IMPORTANT: Only consolidate if names are truly the same person (all first names match)
    const consolidatedByUnit: typeof agg.byUnit = {};
    const unitKeysProcessed = new Set<string>();
    
    Object.entries(agg.byUnit).forEach(([unitKey, unitData]) => {
      // Skip if already processed (merged into another unit)
      if (unitKeysProcessed.has(unitKey)) {
        return;
      }
      
      // Check if there's another unit with a similar manager name in the same agency
      // IMPORTANT: Use areNamesLikelySamePerson which now requires ALL first names to match
      // This prevents "Maria Rosario" from being merged with "Maria Estrella"
      let targetUnitKey = unitKey;
      let targetUnitData = unitData;
      
      // Look for similar units to merge
      Object.entries(agg.byUnit).forEach(([otherUnitKey, otherUnitData]) => {
        if (otherUnitKey === unitKey || unitKeysProcessed.has(otherUnitKey)) {
          return;
        }
        
        // Check if same agency and similar manager names
        const sameAgency = getCanonicalAgencyName(unitData.agencyName) === getCanonicalAgencyName(otherUnitData.agencyName);
        const similarNames = areNamesLikelySamePerson(unitData.unitManager, otherUnitData.unitManager);
        
        if (sameAgency && similarNames) {
          // Merge the other unit into this one
          console.log(`[ReportsPage] Consolidating duplicate units: "${otherUnitKey}" into "${targetUnitKey}"`);
          
          // Merge the data (sum all values)
          targetUnitData = {
            ...targetUnitData,
            count: targetUnitData.count + otherUnitData.count,
            beginningManpowerBase: targetUnitData.beginningManpowerBase + otherUnitData.beginningManpowerBase,
            endManpower: targetUnitData.endManpower + otherUnitData.endManpower,
            newRecruits: targetUnitData.newRecruits + otherUnitData.newRecruits,
            fyp: targetUnitData.fyp + otherUnitData.fyp,
            fyc: targetUnitData.fyc + otherUnitData.fyc,
            income: targetUnitData.income + otherUnitData.income,
            // Merge reconciliation breakdown (use max for team targets, sum for others)
            leaderPersonalFYP: (targetUnitData.leaderPersonalFYP || 0) + (otherUnitData.leaderPersonalFYP || 0),
            leaderPersonalFYC: (targetUnitData.leaderPersonalFYC || 0) + (otherUnitData.leaderPersonalFYC || 0),
            leaderPersonalCases: (targetUnitData.leaderPersonalCases || 0) + (otherUnitData.leaderPersonalCases || 0),
            leaderPersonalRecruits: (targetUnitData.leaderPersonalRecruits || 0) + (otherUnitData.leaderPersonalRecruits || 0),
            leaderTeamFYP: Math.max(targetUnitData.leaderTeamFYP || 0, otherUnitData.leaderTeamFYP || 0),
            leaderTeamFYC: Math.max(targetUnitData.leaderTeamFYC || 0, otherUnitData.leaderTeamFYC || 0),
            advisorSumFYP: (targetUnitData.advisorSumFYP || 0) + (otherUnitData.advisorSumFYP || 0),
            advisorSumFYC: (targetUnitData.advisorSumFYC || 0) + (otherUnitData.advisorSumFYC || 0),
            advisorSumCases: (targetUnitData.advisorSumCases || 0) + (otherUnitData.advisorSumCases || 0),
            advisorSumRecruits: (targetUnitData.advisorSumRecruits || 0) + (otherUnitData.advisorSumRecruits || 0),
            reconciliationMethod: targetUnitData.reconciliationMethod || otherUnitData.reconciliationMethod,
          };
          
          // Mark the other unit as processed
          unitKeysProcessed.add(otherUnitKey);
        }
      });
      
      // Add the (possibly merged) unit to consolidated results
      consolidatedByUnit[targetUnitKey] = targetUnitData;
      unitKeysProcessed.add(unitKey);
    });
    
    // Replace agg.byUnit with consolidated version
    agg.byUnit = consolidatedByUnit;

    // STEP 3: Calculate SUM totals from unit totals (SUM-level consolidation)
    // Use user records (userRankMap) as source of truth for ranks, not goal.userRank
    const umToSumMap = new Map<string, string>();
    const sumNames = new Set<string>();
    
    // First, identify all SUMs from user records (source of truth)
    // Use canonical names for consistency
    userRankMap.forEach((rank, userName) => {
      if (rank === 'SUM') {
        sumNames.add(getCanonicalName(userName));
      }
    });
    
    // Then, build UM -> SUM map from goals (verify SUM from user records)
    // Use canonical names for keys to handle case differences
    filtered.forEach(goal => {
      const unitManagerRank = userRankMap.get(goal.unitManager || '');
      if (goal.userName && unitManagerRank === 'SUM') {
        // For UMs, unitManager is the SUM they report to (verified from user records)
        // Store with canonical names for consistent comparison
        const canonicalUM = getCanonicalName(goal.userName);
        const canonicalSUM = getCanonicalName(goal.unitManager);
        umToSumMap.set(canonicalUM, canonicalSUM);
      }
    });

    // Group units by SUM
    // Use canonical names for comparison to handle case differences
    Object.entries(agg.byUnit).forEach(([unitName, unitData]) => {
      // unitData.unitManager is already canonicalized (all caps)
      const umName = unitData.unitManager;
      let sumName: string | undefined;
      
      // Check if this unit's manager is a SUM (direct advisors under SUM)
      // sumNames contains canonical names, so comparison should work
      if (sumNames.has(umName)) {
        sumName = umName;
      } else {
        // Otherwise, check if the UM reports to a SUM
        // umToSumMap uses canonical names, so lookup should work
        sumName = umToSumMap.get(umName);
      }
      
      // Only aggregate if we found a SUM
      if (sumName) {
        // Canonicalize SUM name to all caps for consistency
        const canonicalSumName = getCanonicalName(sumName);
        if (!agg.bySUM[canonicalSumName]) {
          agg.bySUM[canonicalSumName] = {
            sumName: canonicalSumName,
            agencyName: unitData.agencyName,
            count: 0,
            beginningManpowerBase: 0,
            endManpower: 0,
            newRecruits: 0,
            fyp: 0,
            fyc: 0,
            income: 0,
          };
        }
        // Sum unit totals to get SUM totals
        agg.bySUM[canonicalSumName].count += unitData.count;
        agg.bySUM[canonicalSumName].beginningManpowerBase += unitData.beginningManpowerBase;
        agg.bySUM[canonicalSumName].endManpower += unitData.endManpower;
        agg.bySUM[canonicalSumName].newRecruits += unitData.newRecruits;
        agg.bySUM[canonicalSumName].fyp += unitData.fyp;
        agg.bySUM[canonicalSumName].fyc += unitData.fyc;
        agg.bySUM[canonicalSumName].income += unitData.income;
      }
    });

    // STEP 4: Calculate agency totals from unit totals (agency-level consolidation)
    // Use canonical agency names to group properly (normalize case variations)
    Object.values(agg.byUnit).forEach(unitData => {
      const canonicalAgencyName = getCanonicalAgencyName(unitData.agencyName);
      if (!agg.byAgency[canonicalAgencyName]) {
        agg.byAgency[canonicalAgencyName] = {
          count: 0,
          beginningManpowerBase: 0,
          endManpower: 0,
          newRecruits: 0,
          fyp: 0,
          fyc: 0,
          income: 0,
        };
      }
      // Sum unit totals (not individual goals) to get agency totals
      agg.byAgency[canonicalAgencyName].count += unitData.count;
      agg.byAgency[canonicalAgencyName].beginningManpowerBase += unitData.beginningManpowerBase;
      agg.byAgency[canonicalAgencyName].endManpower += unitData.endManpower;
      agg.byAgency[canonicalAgencyName].newRecruits += unitData.newRecruits;
      agg.byAgency[canonicalAgencyName].fyp += unitData.fyp;
      agg.byAgency[canonicalAgencyName].fyc += unitData.fyc;
      agg.byAgency[canonicalAgencyName].income += unitData.income;
    });

    // STEP 5: Calculate overall totals from agency totals
    Object.values(agg.byAgency).forEach(agencyData => {
      agg.totalManpower += agencyData.endManpower;
      agg.totalNewRecruits += agencyData.newRecruits;
      agg.totalFYP += agencyData.fyp;
      agg.totalFYC += agencyData.fyc;
      agg.totalIncome += agencyData.income;
    });

    // STEP 6: Calculate by rank (still using individual goals for rank breakdown)
    filtered.forEach(goal => {
      if (!agg.byRank[goal.userRank]) {
        agg.byRank[goal.userRank] = {
          count: 0,
          manpower: 0,
          newRecruits: 0,
          fyp: 0,
          fyc: 0,
          income: 0,
        };
      }
      const annualNewRecruits = calculateAnnualNewRecruits(goal);
      agg.byRank[goal.userRank].count++;
      agg.byRank[goal.userRank].manpower += goal.annualManpower;
      agg.byRank[goal.userRank].newRecruits += annualNewRecruits;
      agg.byRank[goal.userRank].fyp += goal.annualFYP;
      agg.byRank[goal.userRank].fyc += goal.annualFYC;
      agg.byRank[goal.userRank].income += goal.annualIncome;
    });

    agg.avgMonthlyIncome = filtered.length > 0 
      ? agg.totalIncome / filtered.length / 12 
      : 0;

    // STEP 7: Calculate quarterly totals (sum all filtered goals' quarterly data)
    filtered.forEach(goal => {
      // Q1 totals
      agg.quarterly.q1.baseManpower += goal.q1?.baseManpower || 0;
      agg.quarterly.q1.newRecruits += goal.q1?.newRecruits || 0;
      agg.quarterly.q1.fyp += goal.q1?.fyp || 0;
      agg.quarterly.q1.fyc += goal.q1?.fyc || 0;
      agg.quarterly.q1.cases += goal.q1?.cases || 0;

      // Q2 totals
      agg.quarterly.q2.baseManpower += goal.q2?.baseManpower || 0;
      agg.quarterly.q2.newRecruits += goal.q2?.newRecruits || 0;
      agg.quarterly.q2.fyp += goal.q2?.fyp || 0;
      agg.quarterly.q2.fyc += goal.q2?.fyc || 0;
      agg.quarterly.q2.cases += goal.q2?.cases || 0;

      // Q3 totals
      agg.quarterly.q3.baseManpower += goal.q3?.baseManpower || 0;
      agg.quarterly.q3.newRecruits += goal.q3?.newRecruits || 0;
      agg.quarterly.q3.fyp += goal.q3?.fyp || 0;
      agg.quarterly.q3.fyc += goal.q3?.fyc || 0;
      agg.quarterly.q3.cases += goal.q3?.cases || 0;

      // Q4 totals
      agg.quarterly.q4.baseManpower += goal.q4?.baseManpower || 0;
      agg.quarterly.q4.newRecruits += goal.q4?.newRecruits || 0;
      agg.quarterly.q4.fyp += goal.q4?.fyp || 0;
      agg.quarterly.q4.fyc += goal.q4?.fyc || 0;
      agg.quarterly.q4.cases += goal.q4?.cases || 0;
    });

    setAggregated(agg);
  };

  // Use validGoals (filtered by valid agency names) instead of all goals, then apply additional filters
  const filteredGoals = validGoals.filter(goal => {
    if (filterAgency !== 'all' && goal.agencyName !== filterAgency) return false;
    if (filterRank !== 'all' && goal.userRank !== filterRank) return false;
    if (filterSUM !== 'all') {
      // Filter by SUM: include goals where:
      // 1. Goal is from a UM that reports to this SUM (unitManager === filterSUM for UMs)
      // 2. Goal is from an advisor under a UM that reports to this SUM
      // 3. Goal is from a direct advisor under this SUM (unitManager === filterSUM for advisors)
      if (goal.userRank === 'UM' && goal.unitManager !== filterSUM) return false;
      if (goal.userRank === 'ADV' || goal.userRank === 'AUM') {
        // For advisors, check if their UM reports to this SUM, or if they report directly to SUM
        if (goal.unitManager === filterSUM) {
          // Direct advisor under SUM - include
        } else {
          // Check if their UM reports to this SUM
          const umGoal = goals.find(g => g.userName === goal.unitManager && g.userRank === 'UM');
          if (!umGoal || umGoal.unitManager !== filterSUM) {
            return false;
          }
        }
      }
      // Verify SUM from user records, not goal.userRank
      const goalUserRank = userRankMap.get(goal.userName) || goal.userRank;
      if (goalUserRank === 'SUM' && goal.userName !== filterSUM) return false;
    }
    if (filterUnit !== 'all') {
      const goalUnitName = goal.unitName || `${goal.unitManager}_${goal.agencyName}`;
      if (goalUnitName !== filterUnit) return false;
    }
    return true;
  });

  // Get unique agencies using canonical names from valid goals only
  const agenciesMap = new Map<string, string>(); // normalized -> canonical display name
  validGoals.forEach(goal => {
    if (goal.agencyName) {
      const canonicalName = getCanonicalAgencyName(goal.agencyName);
      const normalized = canonicalName.toUpperCase();
      // Store the first canonical name we encounter for each normalized version
      if (!agenciesMap.has(normalized)) {
        agenciesMap.set(normalized, canonicalName);
      }
    }
  });
  // Only include agencies that exist in Users collection (source of truth)
  const agencies = Array.from(agenciesMap.values())
    .filter(agency => validAgencyNames.has(agency))
    .sort();
  const ranks = Array.from(new Set(goals.map(g => g.userRank))).sort();
  
  // Get unique SUMs from user records (source of truth, not from goals)
  // Only include users where rank='SUM' from user records
  const sumNamesFromUsers = new Set<string>();
  userRankMap.forEach((rank, userName) => {
    // Only add actual SUMs from user records, not UMs
    if (rank === 'SUM') {
      sumNamesFromUsers.add(userName);
    }
  });
  const availableSUMsForAdmin = Array.from(sumNamesFromUsers).sort();
  
  // Get unique units - filter by agency if an agency is selected
  const unitsForFilter = filterAgency !== 'all'
    ? validGoals.filter(g => g.agencyName === filterAgency)
    : validGoals;
  const units = Array.from(new Set(unitsForFilter.map(g => {
    const unitName = g.unitName || `${g.unitManager}_${g.agencyName}`;
    return unitName;
  }))).sort();
  
  // Reset unit filter if the selected unit is not in the filtered units
  useEffect(() => {
    if (filterUnit !== 'all' && !units.includes(filterUnit)) {
      setFilterUnit('all');
    }
  }, [filterAgency, units, filterUnit]);

  const exportToCSV = () => {
    if (filteredGoals.length === 0) return;

    const headers = [
      'Name', 'Rank', 'Unit Manager', 'Agency', 'Submitted Date',
      'Jan 2026 FYP', 'Jan 2026 FYC', 'Jan 2026 Cases',
      'Q1 Base Manpower', 'Q1 New Recruits', 'Q1 FYP', 'Q1 FYC', 'Q1 Cases',
      'Q2 Base Manpower', 'Q2 New Recruits', 'Q2 FYP', 'Q2 FYC', 'Q2 Cases',
      'Q3 Base Manpower', 'Q3 New Recruits', 'Q3 FYP', 'Q3 FYC', 'Q3 Cases',
      'Q4 Base Manpower', 'Q4 New Recruits', 'Q4 FYP', 'Q4 FYC', 'Q4 Cases',
      'Annual Manpower', 'Annual FYP', 'Annual FYC', 'Annual Income', 'Avg Monthly Income'
    ];

    const rows = filteredGoals.map(goal => [
      goal.userName,
      goal.userRank,
      goal.unitManager,
      goal.agencyName,
      goal.submittedAt.toLocaleDateString(),
      goal.monthlyTargetFYP,
      goal.monthlyTargetFYC,
      goal.monthlyTargetCases,
      goal.q1.baseManpower,
      goal.q1.newRecruits,
      goal.q1.fyp,
      goal.q1.fyc,
      goal.q1.cases,
      goal.q2.baseManpower,
      goal.q2.newRecruits,
      goal.q2.fyp,
      goal.q2.fyc,
      goal.q2.cases,
      goal.q3.baseManpower,
      goal.q3.newRecruits,
      goal.q3.fyp,
      goal.q3.fyc,
      goal.q3.cases,
      goal.q4.baseManpower,
      goal.q4.newRecruits,
      goal.q4.fyp,
      goal.q4.fyc,
      goal.q4.cases,
      goal.annualManpower,
      goal.annualFYP,
      goal.annualFYC,
      goal.annualIncome,
      goal.avgMonthlyIncome,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `strategic_planning_reports_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show loading state while checking auth
  if (authLoading || (loading && !error)) {
    return (
      <div className="flex h-full min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D31145]"></div>
              <p className="mt-4 text-slate-600">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If not authorized, show nothing (will redirect)
  if (!user) {
    return null;
  }
  
  const allowedRanks = ['ADMIN', 'ADD', 'SUM', 'UM'];
  if (!allowedRanks.includes(user.rank)) {
    return null;
  }

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Strategic Planning Reports</h1>
            <p className="text-slate-600">View and collate all submitted strategic planning goals</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Agency Filter - Only for Admin */}
              {user.rank === 'ADMIN' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by Agency</label>
                  <select
                    value={filterAgency}
                    onChange={(e) => {
                      setFilterAgency(e.target.value);
                      setFilterSUM('all'); // Reset SUM filter when agency changes
                      setFilterUnit('all'); // Reset unit filter when agency changes
                    }}
                    className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                  >
                    <option value="all">All Agencies</option>
                    {agencies.map(agency => (
                      <option key={agency} value={agency}>{agency}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* SUM Filter - For Admin and ADD */}
              {(user.rank === 'ADMIN' || user.rank === 'ADD') && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by SUM</label>
                  <select
                    value={filterSUM}
                    onChange={(e) => {
                      setFilterSUM(e.target.value);
                      setFilterUnit('all'); // Reset unit filter when SUM changes
                    }}
                    className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                  >
                    <option value="all">All SUMs</option>
                    {(user.rank === 'ADMIN' ? availableSUMsForAdmin : availableSUMs).map(sum => (
                      <option key={sum} value={sum}>{getCanonicalName(sum)}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by Unit</label>
                <select
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                  disabled={user.rank === 'ADD' ? availableUnitsForSUM.length === 0 : units.length === 0}
                >
                  <option value="all">All Units</option>
                  {units.map(unitName => {
                    // Extract unit manager name from unitName format: "UnitManager_Agency"
                    const unitManagerName = unitName.split('_').slice(0, -1).join('_');
                    return (
                      <option key={unitName} value={unitName}>{getCanonicalName(unitManagerName)}</option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by Rank</label>
                <select
                  value={filterRank}
                  onChange={(e) => setFilterRank(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                >
                  <option value="all">All Ranks</option>
                  {ranks.map(rank => (
                    <option key={rank} value={rank}>{rank}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={loadGoals}
                  className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  disabled={filteredGoals.length === 0}
                >
                  📥 Export CSV
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D31145]"></div>
              <p className="mt-4 text-slate-600">Loading reports...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-800 p-4 rounded-lg mb-6">
              <p className="font-semibold">Error: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Summary Cards */}
              {aggregated && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 shadow-md border-2 border-blue-200">
                    <p className="text-sm text-blue-700 font-semibold mb-1">Total Submissions</p>
                    <p className="text-2xl font-bold text-blue-900">{aggregated.totalUsers}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 shadow-md border-2 border-green-200">
                    <p className="text-sm text-green-700 font-semibold mb-1">Total Annual FYP</p>
                    <p className="text-2xl font-bold text-green-900">₱{formatNumberWithCommas(Math.round(aggregated.totalFYP))}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 shadow-md border-2 border-purple-200">
                    <p className="text-sm text-purple-700 font-semibold mb-1">Total Annual FYC</p>
                    <p className="text-2xl font-bold text-purple-900">₱{formatNumberWithCommas(Math.round(aggregated.totalFYC))}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 shadow-md border-2 border-amber-200">
                    <p className="text-sm text-amber-700 font-semibold mb-1">Total Annual Income</p>
                    <p className="text-2xl font-bold text-amber-900">₱{formatNumberWithCommas(Math.round(aggregated.totalIncome))}</p>
                  </div>
                </div>
              )}

              {/* Aggregated by Agency */}
              {aggregated && Object.keys(aggregated.byAgency).length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">Summary by Agency</h2>
                  <p className="text-sm text-slate-600 mb-4">
                    Agency totals are consolidated from unit totals (units are consolidated from individual advisor/leader goals).
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="text-left p-3 font-semibold text-slate-700">Agency</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Users</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Beginning Manpower Base</th>
                          <th className="text-right p-3 font-semibold text-slate-700">End Manpower</th>
                          <th className="text-right p-3 font-semibold text-slate-700">New Recruits</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Annual FYP</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Annual FYC</th>
                          <th className="text-right p-3 font-semibold text-slate-700">Annual Income</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(aggregated.byAgency).map(([agency, data]) => {
                          const agencyGoals = filteredGoals.filter(g => getCanonicalAgencyName(g.agencyName || '') === agency);
                          return (
                          <tr key={agency} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="p-3 font-medium">
                                <div className="flex items-center gap-2">
                                  <span>{agency}</span>
                                  <button
                                    onClick={() => {
                                      generateAgencySummaryPDF({
                                        agencyName: agency,
                                        goals: agencyGoals,
                                        aggregatedData: {
                                          totalUsers: data.count,
                                          totalManpower: data.endManpower,
                                          totalNewRecruits: data.newRecruits,
                                          totalFYP: data.fyp,
                                          totalFYC: data.fyc,
                                          totalIncome: data.income,
                                        },
                                      });
                                    }}
                                    className="px-2 py-1 bg-[#D31145] text-white rounded hover:bg-red-700 transition-colors text-xs font-semibold flex items-center gap-1"
                                    title="Download Agency Summary PDF"
                                  >
                                    <span>📥</span>
                                    <span>PDF</span>
                                  </button>
                                </div>
                              </td>
                            <td className="p-3 text-right">{data.count}</td>
                            <td className="p-3 text-right">{Math.round(data.beginningManpowerBase)}</td>
                            <td className="p-3 text-right">{Math.round(data.endManpower)}</td>
                            <td className="p-3 text-right">{Math.round(data.newRecruits)}</td>
                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.fyp))}</td>
                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.fyc))}</td>
                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.income))}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Aggregated by Unit - Collapsible */}
              {aggregated && Object.keys(aggregated.byUnit).length > 0 && (
                <div className="bg-white rounded-lg shadow-md mb-6 border border-slate-200 overflow-hidden">
                  {/* Summary by Unit Header - Clickable */}
                  <button
                    onClick={() => setShowSummaryByUnit(!showSummaryByUnit)}
                    className="w-full bg-gradient-to-r from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 transition-colors p-4 flex items-center justify-between border-b border-slate-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <i className={`fa-solid ${showSummaryByUnit ? 'fa-chevron-down' : 'fa-chevron-right'} text-slate-600 transition-transform duration-200`}></i>
                      <div className="text-left flex-1">
                        <h2 className="text-xl font-bold text-slate-900">Summary by Unit</h2>
                        <p className="text-sm text-slate-600 mt-1">
                          Unit totals = Leader Personal + max(Leader Team, Advisor Sum). If Leader Team &gt; Advisor Sum, uses Leader Team (accounts for advisors not yet submitting and new recruits). Otherwise uses Advisor Sum.
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  {/* Summary by Unit Content - Collapsible */}
                  {showSummaryByUnit && (
                    <div className="p-6 transition-all duration-300 ease-in-out">
                      <div className="overflow-x-auto">
                        {(() => {
                          // Group units by agency
                          const unitsByAgency = new Map<string, Array<[string, typeof aggregated.byUnit[string]]>>();
                          
                          Object.entries(aggregated.byUnit).forEach(([unitName, data]) => {
                            const canonicalAgencyName = getCanonicalAgencyName(data.agencyName);
                            if (!unitsByAgency.has(canonicalAgencyName)) {
                              unitsByAgency.set(canonicalAgencyName, []);
                            }
                            unitsByAgency.get(canonicalAgencyName)!.push([unitName, data]);
                          });
                          
                          // Sort agencies alphabetically
                          const sortedAgencies = Array.from(unitsByAgency.keys()).sort();
                          
                          return sortedAgencies.map((agencyName) => {
                            const units = unitsByAgency.get(agencyName)!;
                            // Sort units alphabetically by unit manager name within each agency
                            const sortedUnits = units.sort(([, a], [, b]) => {
                              return getCanonicalName(a.unitManager).localeCompare(getCanonicalName(b.unitManager));
                            });
                            
                            return (
                              <div key={agencyName} className="mb-6 last:mb-0">
                                {/* Agency Header */}
                                <h3 className="text-lg font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">
                                  {agencyName}
                                </h3>
                                
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                                      <th className="text-left p-3 font-semibold text-slate-700">Unit Manager</th>
                                      <th className="text-right p-3 font-semibold text-slate-700">Users</th>
                                      <th className="text-right p-3 font-semibold text-slate-700">Beginning Manpower Base</th>
                                      <th className="text-right p-3 font-semibold text-slate-700">End Manpower</th>
                                      <th className="text-right p-3 font-semibold text-slate-700">New Recruits</th>
                                      <th className="text-right p-3 font-semibold text-slate-700">Annual FYP</th>
                                      <th className="text-right p-3 font-semibold text-slate-700">Annual FYC</th>
                                      <th className="text-right p-3 font-semibold text-slate-700">Annual Income</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sortedUnits.map(([canonicalUnitKey, data]) => {
                                      // Find goals that belong to this unit using flexible name matching
                                      // Extract the unit manager name and agency from the canonicalUnitKey
                                      const keyParts = canonicalUnitKey.split('_');
                                      const unitManagerFromKey = keyParts[0]; // First part is the canonical manager name
                                      const agencyFromKey = keyParts.slice(1).join('_'); // Rest is the agency
                                      
                                      const unitGoals = filteredGoals.filter(g => {
                                        const isLeader = g.userRank === 'UM' || g.userRank === 'SUM' || g.userRank === 'ADD';
                                        const goalCanonicalAgency = getCanonicalAgencyName(g.agencyName);
                                        
                                        // Check if agency matches first
                                        if (goalCanonicalAgency !== agencyFromKey) {
                                          return false;
                                        }
                                        
                                        // For leaders, check if their name matches the unit manager
                                        if (isLeader) {
                                          const leaderCanonicalName = getCanonicalName(g.userName);
                                          // Use flexible name matching to handle variations
                                          return areNamesLikelySamePerson(leaderCanonicalName, unitManagerFromKey);
                                        } else {
                                          // For advisors, check if their unitManager matches the unit manager
                                          // Use flexible name matching to handle name variations (e.g., "DARLYN PEREZ" vs "DARLYN L. PEREZ")
                                          const matches = areNamesLikelySamePerson(g.unitManager || 'Unknown', unitManagerFromKey);
                                          // Debug logging for advisors not matching
                                          if (!matches && g.unitManager) {
                                            console.log(`[ReportsPage] Advisor "${g.userName}" (unitManager: "${g.unitManager}") not matched to unit manager "${unitManagerFromKey}" in unit "${canonicalUnitKey}"`);
                                          }
                                          return matches;
                                        }
                                      });
                                      
                                      // Debug: Log unit goals found
                                      if (unitGoals.length !== data.count) {
                                        console.warn(`[ReportsPage] Unit "${canonicalUnitKey}" (${data.unitManager}): Expected ${data.count} goals, found ${unitGoals.length} goals. Leader goals: ${unitGoals.filter(g => g.userRank === 'UM' || g.userRank === 'SUM' || g.userRank === 'ADD').length}, Advisor goals: ${unitGoals.filter(g => g.userRank !== 'UM' && g.userRank !== 'SUM' && g.userRank !== 'ADD').length}`);
                                      }
                                      
                                      const isExpanded = isUnitManagerExpanded(canonicalUnitKey);
                                      const unitTotals = calculateReconciledUnitTotals(unitGoals);
                                      
                                      return (
                                        <React.Fragment key={canonicalUnitKey}>
                                          <tr 
                                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                                            onClick={() => toggleUnitManager(canonicalUnitKey)}
                                          >
                                            <td className="p-3 font-medium">
                                              <div className="flex items-center gap-2">
                                                <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-slate-600 transition-transform duration-200 text-xs`}></i>
                                                <span>{getCanonicalName(data.unitManager)}</span>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    generateUnitSummaryPDF({
                                                      unitManager: data.unitManager,
                                                      agencyName: data.agencyName,
                                                      goals: unitGoals,
                                                    });
                                                  }}
                                                  className="px-2 py-1 bg-[#D31145] text-white rounded hover:bg-red-700 transition-colors text-xs font-semibold flex items-center gap-1"
                                                  title="Download Unit Summary PDF"
                                                >
                                                  <span>📥</span>
                                                  <span>PDF</span>
                                                </button>
                                              </div>
                                            </td>
                                            <td className="p-3 text-right">{data.count}</td>
                                            <td className="p-3 text-right">{Math.round(data.beginningManpowerBase)}</td>
                                            <td className="p-3 text-right">{Math.round(data.endManpower)}</td>
                                            <td className="p-3 text-right">{Math.round(data.newRecruits)}</td>
                                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.fyp))}</td>
                                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.fyc))}</td>
                                            <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.income))}</td>
                                          </tr>
                                          
                                          {/* Expanded Individual Reports Row */}
                                          {isExpanded && (
                                            <tr key={`${canonicalUnitKey}-details`} className="bg-slate-50">
                                              <td colSpan={8} className="p-4">
                                                <div className="space-y-4">
                                                  {/* Individual Member Reports */}
                                                  <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                      <h4 className="text-sm font-semibold text-slate-700">Individual Member Reports</h4>
                                                      {/* Reconciliation Breakdown Tooltip */}
                                                      <div className="relative group">
                                                        <button
                                                          type="button"
                                                          className="text-blue-600 hover:text-blue-800 focus:outline-none"
                                                          title="View Unit Reconciliation Breakdown"
                                                        >
                                                          <i className="fa-solid fa-circle-info text-sm"></i>
                                                        </button>
                                                        {/* Tooltip Content */}
                                                        <div className="absolute left-0 top-6 z-50 w-80 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                                                          <p className="text-xs font-semibold text-blue-900 mb-2">Unit Reconciliation Breakdown:</p>
                                                          <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                                                            <div>
                                                              <p className="text-blue-700">Leader Personal FYP</p>
                                                              <p className="font-semibold text-blue-900">₱{formatNumberWithCommas(Math.round(unitTotals.leaderPersonalFYP || 0))}</p>
                                                            </div>
                                                            <div>
                                                              <p className="text-blue-700">Leader Team FYP</p>
                                                              <p className="font-semibold text-blue-900">₱{formatNumberWithCommas(Math.round(unitTotals.leaderTeamFYP || 0))}</p>
                                                            </div>
                                                            <div>
                                                              <p className="text-blue-700">Advisor Sum FYP</p>
                                                              <p className="font-semibold text-blue-900">₱{formatNumberWithCommas(Math.round(unitTotals.advisorSumFYP || 0))}</p>
                                                            </div>
                                                            <div>
                                                              <p className="text-blue-700">Unit Total FYP</p>
                                                              <p className="font-semibold text-blue-900">₱{formatNumberWithCommas(Math.round(unitTotals.fyp))}</p>
                                                            </div>
                                                          </div>
                                                          <p className="text-xs text-blue-700">
                                                            <span className="font-semibold">Formula:</span> Leader Personal + max(Leader Team, Advisor Sum) = {formatNumberWithCommas(Math.round(unitTotals.leaderPersonalFYP || 0))} + max({formatNumberWithCommas(Math.round(unitTotals.leaderTeamFYP || 0))}, {formatNumberWithCommas(Math.round(unitTotals.advisorSumFYP || 0))}) = {formatNumberWithCommas(Math.round(unitTotals.fyp))}
                                                          </p>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                      {/* Show leader goal first if exists */}
                                                      {unitGoals
                                                        .filter(g => g.userRank === 'UM' || g.userRank === 'SUM' || g.userRank === 'ADD')
                                                        .sort((a, b) => formatDisplayName(a.userName).localeCompare(formatDisplayName(b.userName)))
                                                        .map((goal) => {
                                                          // Calculate Personal FYP/FYC from quarterly goals
                                                          // NOTE: For leaders, q1.fyc contains (Personal + Team), so we need to subtract team component
                                                          // Team quarterly = monthlyTeamTarget * 3 (since quarterly = 3 months)
                                                          const quarterlyTeamFYC = goal.monthlyTeamTargetFYC ? (goal.monthlyTeamTargetFYC * 3) : 0;
                                                          const quarterlyTeamFYP = goal.monthlyTeamTargetFYP ? (goal.monthlyTeamTargetFYP * 3) : 0;
                                                          
                                                          // Personal = Total (q1+q2+q3+q4) - Team (monthly * 3 * 4 quarters)
                                                          let totalFYC = (goal.q1?.fyc || 0) + (goal.q2?.fyc || 0) + (goal.q3?.fyc || 0) + (goal.q4?.fyc || 0);
                                                          let totalFYP = (goal.q1?.fyp || 0) + (goal.q2?.fyp || 0) + (goal.q3?.fyp || 0) + (goal.q4?.fyp || 0);
                                                          
                                                          const annualTeamFYC = goal.monthlyTeamTargetFYC ? (goal.monthlyTeamTargetFYC * 12) : 0;
                                                          const annualTeamFYP = goal.monthlyTeamTargetFYP ? (goal.monthlyTeamTargetFYP * 12) : 0;
                                                          
                                                          // Calculate Personal FYP/FYC
                                                          // If quarterly values exist, use them (Total - Team)
                                                          // If quarterly values are zero but monthly target is set, use monthly target as fallback
                                                          // If result is zero/negative (data inconsistency), use monthly target as fallback
                                                          let personalFYP: number;
                                                          let personalFYC: number;
                                                          
                                                          if (totalFYP > 0) {
                                                            // Quarterly values exist - subtract team component
                                                            const calculatedPersonalFYP = totalFYP - annualTeamFYP;
                                                            if (calculatedPersonalFYP > 0) {
                                                              personalFYP = calculatedPersonalFYP;
                                                            } else if (goal.monthlyTargetFYP && goal.monthlyTargetFYP > 0) {
                                                              // Result is zero/negative - likely data inconsistency, use monthly target as fallback
                                                              // Monthly target FYP is personal-only, so use it directly * 12
                                                              personalFYP = goal.monthlyTargetFYP * 12;
                                                            } else {
                                                              personalFYP = 0;
                                                            }
                                                          } else if (goal.monthlyTargetFYP && goal.monthlyTargetFYP > 0) {
                                                            // Fallback: Use monthly target FYP * 12 (annual) as personal FYP (monthly target is personal-only)
                                                            personalFYP = goal.monthlyTargetFYP * 12;
                                                          } else {
                                                            personalFYP = 0;
                                                          }
                                                          
                                                          if (totalFYC > 0) {
                                                            // Quarterly values exist - subtract team component
                                                            const calculatedPersonalFYC = totalFYC - annualTeamFYC;
                                                            if (calculatedPersonalFYC > 0) {
                                                              personalFYC = calculatedPersonalFYC;
                                                            } else if (goal.monthlyTargetFYC && goal.monthlyTargetFYC > 0) {
                                                              // Result is zero/negative - likely data inconsistency, use monthly target as fallback
                                                              // Monthly target FYC is personal-only, so use it directly * 12
                                                              personalFYC = goal.monthlyTargetFYC * 12;
                                                            } else {
                                                              personalFYC = 0;
                                                            }
                                                          } else if (goal.monthlyTargetFYC && goal.monthlyTargetFYC > 0) {
                                                            // Fallback: Use monthly target FYC * 12 (annual) as personal FYC (monthly target is personal-only)
                                                            personalFYC = goal.monthlyTargetFYC * 12;
                                                          } else {
                                                            personalFYC = 0;
                                                          }
                                                          
                                                          return (
                                                          <div
                                                            key={goal.userId || goal.userName}
                                                            className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow"
                                                          >
                                                            <div className="flex items-center justify-between">
                                                              <div className="flex-1">
                                                                <div className="flex items-center gap-3">
                                                                  <h4 className="font-semibold text-slate-900">{formatDisplayName(goal.userName)}</h4>
                                                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                                                    {goal.userRank} (Leader)
                                                                  </span>
                                                                </div>
                                                                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                                  <div>
                                                                    <p className="text-slate-500">Personal FYP</p>
                                                                    <p className="font-semibold text-slate-900">₱{formatNumberWithCommas(Math.round(personalFYP))}</p>
                                                                  </div>
                                                                  <div>
                                                                    <p className="text-slate-500">Personal FYC</p>
                                                                    <p className="font-semibold text-slate-900">₱{formatNumberWithCommas(Math.round(personalFYC))}</p>
                                                                  </div>
                                                                  <div>
                                                                    <p className="text-slate-500">Manpower</p>
                                                                    <p className="font-semibold text-slate-900">{Math.round(goal.annualManpower)}</p>
                                                                  </div>
                                                                  <div>
                                                                    <p className="text-slate-500">Income</p>
                                                                    <p className="font-semibold text-slate-900">₱{formatNumberWithCommas(Math.round(goal.annualIncome))}</p>
                                                                  </div>
                                                                </div>
                                                                {goal.monthlyTeamTargetFYP && goal.monthlyTeamTargetFYP > 0 && (
                                                                  <div className="mt-2 text-xs text-slate-600">
                                                                    <span className="font-semibold">Team Target:</span> Monthly FYP ₱{formatNumberWithCommas(Math.round(goal.monthlyTeamTargetFYP))} (Annual: ₱{formatNumberWithCommas(Math.round(goal.monthlyTeamTargetFYP * 12))})
                                                                  </div>
                                                                )}
                                                              </div>
                                                              <div className="ml-4 flex items-center gap-2">
                                                                <button
                                                                  onClick={() => setSelectedGoal(goal)}
                                                                  className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-semibold"
                                                                >
                                                                  View Details
                                                                </button>
                                                                <button
                                                                  onClick={() => {
                                                                    generateStrategicPlanningPDF({
                                                                      userName: goal.userName,
                                                                      unitManager: goal.unitManager,
                                                                      agencyName: goal.agencyName,
                                                                      goal,
                                                                    });
                                                                  }}
                                                                  className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-1"
                                                                >
                                                                  <span>📥</span>
                                                                  <span>PDF</span>
                                                                </button>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        );
                                                        })}
                                                      {/* Then show advisor goals */}
                                                      {unitGoals
                                                        .filter(g => g.userRank !== 'UM' && g.userRank !== 'SUM' && g.userRank !== 'ADD')
                                                        .sort((a, b) => formatDisplayName(a.userName).localeCompare(formatDisplayName(b.userName)))
                                                        .map((goal) => {
                                                          // Calculate FYP/FYC from quarterly goals (advisors only have personal goals)
                                                          const advisorFYP = (goal.q1?.fyp || 0) + (goal.q2?.fyp || 0) + (goal.q3?.fyp || 0) + (goal.q4?.fyp || 0);
                                                          const advisorFYC = (goal.q1?.fyc || 0) + (goal.q2?.fyc || 0) + (goal.q3?.fyc || 0) + (goal.q4?.fyc || 0);
                                                          
                                                          return (
                                                          <div
                                                            key={goal.userId || goal.userName}
                                                            className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow"
                                                          >
                                                            <div className="flex items-center justify-between">
                                                              <div className="flex-1">
                                                                <div className="flex items-center gap-3">
                                                                  <h4 className="font-semibold text-slate-900">{formatDisplayName(goal.userName)}</h4>
                                                                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                                                                    {goal.userRank}
                                                                  </span>
                                                                </div>
                                                                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                                  <div>
                                                                    <p className="text-slate-500">FYP</p>
                                                                    <p className="font-semibold text-slate-900">₱{formatNumberWithCommas(Math.round(advisorFYP))}</p>
                                                                  </div>
                                                                  <div>
                                                                    <p className="text-slate-500">FYC</p>
                                                                    <p className="font-semibold text-slate-900">₱{formatNumberWithCommas(Math.round(advisorFYC))}</p>
                                                                  </div>
                                                                  <div>
                                                                    <p className="text-slate-500">Manpower</p>
                                                                    <p className="font-semibold text-slate-900">{Math.round(goal.annualManpower)}</p>
                                                                  </div>
                                                                  <div>
                                                                    <p className="text-slate-500">Income</p>
                                                                    <p className="font-semibold text-slate-900">₱{formatNumberWithCommas(Math.round(goal.annualIncome))}</p>
                                                                  </div>
                                                                </div>
                                                              </div>
                                                              <div className="ml-4 flex items-center gap-2">
                                                                <button
                                                                  onClick={() => setSelectedGoal(goal)}
                                                                  className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-semibold"
                                                                >
                                                                  View Details
                                                                </button>
                                                                <button
                                                                  onClick={() => {
                                                                    generateStrategicPlanningPDF({
                                                                      userName: goal.userName,
                                                                      unitManager: goal.unitManager,
                                                                      agencyName: goal.agencyName,
                                                                      goal,
                                                                    });
                                                                  }}
                                                                  className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-1"
                                                                  title="Download Individual PDF"
                                                                >
                                                                  <span>📥</span>
                                                                  <span>PDF</span>
                                                                </button>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        );
                                                        })}
                                                    </div>
                                                  </div>
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quarterly Summary Section */}
              {aggregated && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Quarterly Summary</h2>
                      <p className="text-sm text-slate-600 mt-1">
                        Consolidated quarterly totals across all units and agencies
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          if (!aggregated) return;
                          const headers = ['Quarter', 'Base Manpower', 'New Recruits', 'FYP', 'FYC', 'Cases'];
                          const rows = [
                            ['Q1', aggregated.quarterly.q1.baseManpower, aggregated.quarterly.q1.newRecruits, aggregated.quarterly.q1.fyp, aggregated.quarterly.q1.fyc, aggregated.quarterly.q1.cases],
                            ['Q2', aggregated.quarterly.q2.baseManpower, aggregated.quarterly.q2.newRecruits, aggregated.quarterly.q2.fyp, aggregated.quarterly.q2.fyc, aggregated.quarterly.q2.cases],
                            ['Q3', aggregated.quarterly.q3.baseManpower, aggregated.quarterly.q3.newRecruits, aggregated.quarterly.q3.fyp, aggregated.quarterly.q3.fyc, aggregated.quarterly.q3.cases],
                            ['Q4', aggregated.quarterly.q4.baseManpower, aggregated.quarterly.q4.newRecruits, aggregated.quarterly.q4.fyp, aggregated.quarterly.q4.fyc, aggregated.quarterly.q4.cases],
                          ];
                          const csvContent = [
                            headers.join(','),
                            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                          ].join('\n');
                          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement('a');
                          const url = URL.createObjectURL(blob);
                          link.setAttribute('href', url);
                          link.setAttribute('download', `quarterly_summary_${new Date().toISOString().split('T')[0]}.csv`);
                          link.style.visibility = 'hidden';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
                      >
                        <span>📥</span>
                        <span>Download CSV</span>
                      </button>
                      <button
                        onClick={() => setShowQuarterlySummary(!showQuarterlySummary)}
                        className="px-4 py-2 bg-[#D31145] text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
                      >
                        <span>{showQuarterlySummary ? '▼' : '▶'}</span>
                        <span>{showQuarterlySummary ? 'Hide' : 'Show'} Summary</span>
                      </button>
                    </div>
                  </div>

                  {showQuarterlySummary && (
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-slate-200 bg-slate-50">
                            <th className="text-left p-3 font-semibold text-slate-700">Quarter</th>
                            <th className="text-right p-3 font-semibold text-slate-700">Base Manpower</th>
                            <th className="text-right p-3 font-semibold text-slate-700">New Recruits</th>
                            <th className="text-right p-3 font-semibold text-slate-700">Total Manpower</th>
                            <th className="text-right p-3 font-semibold text-slate-700">FYP</th>
                            <th className="text-right p-3 font-semibold text-slate-700">FYC</th>
                            <th className="text-right p-3 font-semibold text-slate-700">Cases</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(['q1', 'q2', 'q3', 'q4'] as const).map((q) => {
                            const data = aggregated.quarterly[q];
                            const totalManpower = data.baseManpower + data.newRecruits;
                            return (
                              <tr key={q} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3 font-bold text-[#D31145]">{q.toUpperCase()}</td>
                                <td className="p-3 text-right">{Math.round(data.baseManpower)}</td>
                                <td className="p-3 text-right">{Math.round(data.newRecruits)}</td>
                                <td className="p-3 text-right font-semibold">{Math.round(totalManpower)}</td>
                                <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.fyp))}</td>
                                <td className="p-3 text-right">₱{formatNumberWithCommas(Math.round(data.fyc))}</td>
                                <td className="p-3 text-right">{Math.round(data.cases)}</td>
                              </tr>
                            );
                          })}
                          {/* Total Row */}
                          <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                            <td className="p-3">TOTAL</td>
                            <td className="p-3 text-right">
                              {Math.round(aggregated.quarterly.q1.baseManpower + aggregated.quarterly.q2.baseManpower + aggregated.quarterly.q3.baseManpower + aggregated.quarterly.q4.baseManpower)}
                            </td>
                            <td className="p-3 text-right">
                              {Math.round(aggregated.quarterly.q1.newRecruits + aggregated.quarterly.q2.newRecruits + aggregated.quarterly.q3.newRecruits + aggregated.quarterly.q4.newRecruits)}
                            </td>
                            <td className="p-3 text-right">
                              {Math.round(
                                (aggregated.quarterly.q1.baseManpower + aggregated.quarterly.q1.newRecruits) +
                                (aggregated.quarterly.q2.baseManpower + aggregated.quarterly.q2.newRecruits) +
                                (aggregated.quarterly.q3.baseManpower + aggregated.quarterly.q3.newRecruits) +
                                (aggregated.quarterly.q4.baseManpower + aggregated.quarterly.q4.newRecruits)
                              )}
                            </td>
                            <td className="p-3 text-right">
                              ₱{formatNumberWithCommas(Math.round(aggregated.quarterly.q1.fyp + aggregated.quarterly.q2.fyp + aggregated.quarterly.q3.fyp + aggregated.quarterly.q4.fyp))}
                            </td>
                            <td className="p-3 text-right">
                              ₱{formatNumberWithCommas(Math.round(aggregated.quarterly.q1.fyc + aggregated.quarterly.q2.fyc + aggregated.quarterly.q3.fyc + aggregated.quarterly.q4.fyc))}
                            </td>
                            <td className="p-3 text-right">
                              {Math.round(aggregated.quarterly.q1.cases + aggregated.quarterly.q2.cases + aggregated.quarterly.q3.cases + aggregated.quarterly.q4.cases)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Individual Reports section removed - now integrated into Unit Summary above as expandable rows */}
          {/* Detail Modal */}
          {selectedGoal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedGoal(null)}>
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-[#D31145] text-white p-4 flex justify-between items-center">
                  <h3 className="text-xl font-bold">Report Details - {formatDisplayName(selectedGoal.userName)}</h3>
                  <button
                    onClick={() => setSelectedGoal(null)}
                    className="text-white hover:text-gray-200 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-slate-600">Name</p>
                      <p className="font-semibold">{formatDisplayName(selectedGoal.userName)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Rank</p>
                      <p className="font-semibold">{selectedGoal.userRank}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Unit Manager</p>
                      <p className="font-semibold">{getCanonicalName(selectedGoal.unitManager)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Agency</p>
                      <p className="font-semibold">{selectedGoal.agencyName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Submitted</p>
                      <p className="font-semibold">{selectedGoal.submittedAt.toLocaleString()}</p>
                    </div>
                  </div>

                  <h4 className="font-bold text-lg mb-3">January 2026 Targets</h4>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm text-blue-700">FYP</p>
                      <p className="font-bold text-blue-900">₱{formatNumberWithCommas(Math.round(selectedGoal.monthlyTargetFYP))}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-sm text-green-700">FYC</p>
                      <p className="font-bold text-green-900">₱{formatNumberWithCommas(Math.round(selectedGoal.monthlyTargetFYC))}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <p className="text-sm text-purple-700">Cases</p>
                      <p className="font-bold text-purple-900">{selectedGoal.monthlyTargetCases}</p>
                    </div>
                  </div>

                  <h4 className="font-bold text-lg mb-3">2026 Quarterly Goals</h4>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="p-2 text-left">Quarter</th>
                          <th className="p-2 text-right">Base Manpower</th>
                          <th className="p-2 text-right">New Recruits</th>
                          <th className="p-2 text-right">FYP</th>
                          <th className="p-2 text-right">FYC</th>
                          <th className="p-2 text-right">Cases</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { q: 'Q1', data: selectedGoal.q1 },
                          { q: 'Q2', data: selectedGoal.q2 },
                          { q: 'Q3', data: selectedGoal.q3 },
                          { q: 'Q4', data: selectedGoal.q4 },
                        ].map(({ q, data }) => (
                          <tr key={q} className="border-b">
                            <td className="p-2 font-medium">{q}</td>
                            <td className="p-2 text-right">{data.baseManpower}</td>
                            <td className="p-2 text-right">{data.newRecruits}</td>
                            <td className="p-2 text-right">₱{formatNumberWithCommas(Math.round(data.fyp))}</td>
                            <td className="p-2 text-right">₱{formatNumberWithCommas(Math.round(data.fyc))}</td>
                            <td className="p-2 text-right">{data.cases}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h4 className="font-bold text-lg mb-3">Annual Totals</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-sm text-slate-600">Manpower</p>
                      <p className="font-bold text-slate-900">{Math.round(selectedGoal.annualManpower)}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-sm text-slate-600">Annual FYP</p>
                      <p className="font-bold text-slate-900">₱{formatNumberWithCommas(Math.round(selectedGoal.annualFYP))}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-sm text-slate-600">Annual FYC</p>
                      <p className="font-bold text-slate-900">₱{formatNumberWithCommas(Math.round(selectedGoal.annualFYC))}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-sm text-slate-600">Annual Income</p>
                      <p className="font-bold text-slate-900">₱{formatNumberWithCommas(Math.round(selectedGoal.annualIncome))}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded">
                      <p className="text-sm text-slate-600">Avg Monthly Income</p>
                      <p className="font-bold text-slate-900">₱{formatNumberWithCommas(Math.round(selectedGoal.avgMonthlyIncome))}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

