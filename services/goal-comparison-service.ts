/**
 * Goal Comparison Service
 * Compares Top-Down goals (set by leaders) vs Bottom-Up goals (sum of subordinates)
 */

import { 
  getUnitGoals, 
  getGoalsForSUM, 
  getGoalsForADD, 
  getAgencyGoals,
  type StrategicPlanningGoal 
} from './strategic-planning-service';
import { normalizeAgencyName, areAgencyNamesEqual } from '@/lib/utils/agency-name-normalizer';

/**
 * Unit Level Comparison (UM)
 * Compares UM's Team Goals (Top-Down) vs Sum of Advisors' Goals + UM's Personal Goals (Bottom-Up)
 */
export interface UnitComparison {
  unitManager: string;
  unitName: string;
  agencyName: string;
  
  // Top-Down: UM's Team Goals (what UM set for the team)
  topDownFYP: number;  // monthlyTeamTargetFYP * 12
  topDownFYC: number;  // monthlyTeamTargetFYC * 12
  topDownCases: number; // monthlyTargetCases * 12
  
  // Bottom-Up: Sum of Advisors' Personal Goals + UM's Personal Goals
  bottomUpFYP: number;  // Sum of advisors' annualFYP + UM's annualFYP
  bottomUpFYC: number;  // Sum of advisors' annualFYC + UM's annualFYC
  bottomUpCases: number; // Sum of advisors' quarterly cases + UM's quarterly cases
  
  // Variance (Bottom-Up - Top-Down)
  varianceFYP: number;
  varianceFYC: number;
  varianceCases: number;
  
  // Variance Percentage
  varianceFYPPct: number;
  varianceFYCPct: number;
  varianceCasesPct: number;
  
  // Per-User Breakdown
  advisorVariances: AdvisorVariance[];
  
  // Status
  status: 'aligned' | 'under' | 'over';
}

export interface AdvisorVariance {
  userName: string;
  userRank: string;
  personalFYP: number;
  personalFYC: number;
  personalCases: number;
  varianceFromUnitFYP?: number; // If unit FYP was distributed, show variance
  varianceFromUnitFYC?: number;
  varianceFromUnitCases?: number;
}

/**
 * Agency Level Comparison (ADD)
 * Compares ADD's Agency Goals (Top-Down) vs Sum of All Units' Goals (Bottom-Up)
 */
export interface AgencyComparison {
  agencyName: string;
  addName?: string;
  
  // Top-Down: ADD's Agency Goals (if set)
  topDownFYP: number;
  topDownFYC: number;
  topDownCases: number;
  topDownRecruits: number;
  topDownEndManpower: number;
  
  // Bottom-Up: Sum of All Units' Goals (including advisors + UM personal goals)
  bottomUpFYP: number;
  bottomUpFYC: number;
  bottomUpCases: number;
  bottomUpRecruits: number;
  bottomUpEndManpower: number;
  
  // Variance (Bottom-Up - Top-Down)
  varianceFYP: number;
  varianceFYC: number;
  varianceCases: number;
  varianceRecruits: number;
  varianceEndManpower: number;
  
  // Variance Percentage
  varianceFYPPct: number;
  varianceFYCPct: number;
  varianceCasesPct: number;
  varianceRecruitsPct: number;
  varianceEndManpowerPct: number;
  
  // Per-Unit Breakdown
  unitVariances: UnitVariance[];
  
  // Status
  status: 'aligned' | 'under' | 'over';
}

export interface UnitVariance {
  unitManager: string;
  unitName: string;
  unitFYP: number;
  unitFYC: number;
  unitCases: number;
  unitRecruits: number;
  unitEndManpower: number;
  varianceFromAgencyFYP?: number;
  varianceFromAgencyFYC?: number;
  varianceFromAgencyCases?: number;
  varianceFromAgencyRecruits?: number;
  varianceFromAgencyEndManpower?: number;
}

/**
 * Get Unit Level Comparison (UM perspective)
 */
export async function getUnitComparison(
  unitManager: string, 
  agencyName: string
): Promise<UnitComparison | null> {
  try {
    const normalizedAgency = normalizeAgencyName(agencyName);
    
    // Get all goals for this agency (this has proper permissions)
    const allAgencyGoals = await getAgencyGoals(normalizedAgency);
    
    // Get UM's own goal (where userName = UM name and rank = UM/SUM)
    const umGoal = allAgencyGoals.find(g => 
      g.userName === unitManager && 
      (g.userRank === 'UM' || g.userRank === 'SUM') &&
      areAgencyNamesEqual(g.agencyName, normalizedAgency)
    );
    
    if (!umGoal) {
      console.warn(`[getUnitComparison] No UM goal found for ${unitManager} in agency ${normalizedAgency}`);
      return null;
    }
    
    // Get advisor goals from agency goals (where unitManager = UM name)
    // Use case-insensitive name matching for unitManager
    const normalizeName = (name: string) => name.trim().toUpperCase().replace(/\s+/g, ' ');
    const normalizedUnitManager = normalizeName(unitManager);
    
    const advisorGoals = allAgencyGoals.filter(g => {
      const isAdvisor = g.userRank === 'ADV' || g.userRank === 'AUM';
      const matchesUnitManager = normalizeName(g.unitManager || '') === normalizedUnitManager;
      const matchesAgency = areAgencyNamesEqual(g.agencyName, normalizedAgency);
      
      return isAdvisor && matchesUnitManager && matchesAgency;
    });
    
    console.log(`[getUnitComparison] Unit: ${unitManager}, Found UM goal and ${advisorGoals.length} advisor goals`);
    console.log(`[getUnitComparison] UM: ${umGoal.userName} (${umGoal.userRank})`);
    if (advisorGoals.length > 0) {
      console.log(`[getUnitComparison] Advisors: ${advisorGoals.map(g => `${g.userName} (${g.userRank})`).join(', ')}`);
    } else {
      console.log(`[getUnitComparison] No advisors found for unit ${unitManager}`);
      console.log(`[getUnitComparison] Debug: Total agency goals = ${allAgencyGoals.length}`);
      console.log(`[getUnitComparison] Debug: Advisor goals in agency: ${allAgencyGoals.filter(g => g.userRank === 'ADV' || g.userRank === 'AUM').map(g => `${g.userName} (unitManager: ${g.unitManager})`).join(', ')}`);
    }
    
    // Top-Down: UM's Team Goals
    const topDownFYP = (umGoal.monthlyTeamTargetFYP || 0) * 12;
    const topDownFYC = (umGoal.monthlyTeamTargetFYC || 0) * 12;
    const topDownCases = umGoal.monthlyTargetCases * 12;
    
    // Bottom-Up: Sum of Advisors' Personal Goals + UM's Personal Goals
    const advisorsFYP = advisorGoals.reduce((sum, goal) => sum + goal.annualFYP, 0);
    const advisorsFYC = advisorGoals.reduce((sum, goal) => sum + goal.annualFYC, 0);
    const advisorsCases = advisorGoals.reduce((sum, goal) => {
      return sum + (goal.q1?.cases || 0) + (goal.q2?.cases || 0) + (goal.q3?.cases || 0) + (goal.q4?.cases || 0);
    }, 0);
    
    const umPersonalFYP = umGoal.annualFYP;
    const umPersonalFYC = umGoal.annualFYC;
    const umPersonalCases = (umGoal.q1?.cases || 0) + (umGoal.q2?.cases || 0) + (umGoal.q3?.cases || 0) + (umGoal.q4?.cases || 0);
    
    const bottomUpFYP = advisorsFYP + umPersonalFYP;
    const bottomUpFYC = advisorsFYC + umPersonalFYC;
    const bottomUpCases = advisorsCases + umPersonalCases;
    
    // Calculate Variance
    const varianceFYP = bottomUpFYP - topDownFYP;
    const varianceFYC = bottomUpFYC - topDownFYC;
    const varianceCases = bottomUpCases - topDownCases;
    
    // Calculate Variance Percentage
    const varianceFYPPct = topDownFYP > 0 ? (varianceFYP / topDownFYP) * 100 : 0;
    const varianceFYCPct = topDownFYC > 0 ? (varianceFYC / topDownFYC) * 100 : 0;
    const varianceCasesPct = topDownCases > 0 ? (varianceCases / topDownCases) * 100 : 0;
    
    // Per-User Breakdown
    // Include UM first, then all advisors
    const advisorVariances: AdvisorVariance[] = [
      // Add UM's personal contribution
      {
        userName: umGoal.userName,
        userRank: umGoal.userRank,
        personalFYP: umPersonalFYP,
        personalFYC: umPersonalFYC,
        personalCases: umPersonalCases,
      },
      // Add each advisor's contribution
      ...advisorGoals.map(goal => ({
        userName: goal.userName,
        userRank: goal.userRank,
        personalFYP: goal.annualFYP,
        personalFYC: goal.annualFYC,
        personalCases: (goal.q1?.cases || 0) + (goal.q2?.cases || 0) + (goal.q3?.cases || 0) + (goal.q4?.cases || 0),
      }))
    ];
    
    console.log(`[getUnitComparison] Created advisorVariances array with ${advisorVariances.length} entries: ${advisorVariances.map(a => a.userName).join(', ')}`);
    
    // Determine Status (5% threshold)
    let status: 'aligned' | 'under' | 'over' = 'aligned';
    if (Math.abs(varianceFYCPct) > 5 || Math.abs(varianceFYPPct) > 5) {
      status = varianceFYC < 0 || varianceFYP < 0 ? 'under' : 'over';
    }
    
    return {
      unitManager: umGoal.userName,
      unitName: umGoal.unitName || `${unitManager}_${normalizedAgency}`,
      agencyName: normalizedAgency,
      topDownFYP,
      topDownFYC,
      topDownCases,
      bottomUpFYP,
      bottomUpFYC,
      bottomUpCases,
      varianceFYP,
      varianceFYC,
      varianceCases,
      varianceFYPPct,
      varianceFYCPct,
      varianceCasesPct,
      advisorVariances,
      status,
    };
  } catch (error) {
    console.error(`Error getting unit comparison for ${unitManager}:`, error);
    return null;
  }
}

/**
 * Get Agency Level Comparison (ADD perspective)
 */
export async function getAgencyComparison(
  addName: string,
  agencyName: string
): Promise<AgencyComparison | null> {
  try {
    const normalizedAgency = normalizeAgencyName(agencyName);
    const allGoals = await getGoalsForADD(addName, normalizedAgency);
    
    if (allGoals.length === 0) {
      return null;
    }
    
    // Get ADD's goal (most recent) - if they set agency-level goals
    const addGoal = allGoals.find(g => g.userName === addName && g.userRank === 'ADD');
    
    // Top-Down: ADD's Agency Goals (if set, otherwise 0)
    const topDownFYP = addGoal ? (addGoal.monthlyTeamTargetFYP || 0) * 12 : 0;
    const topDownFYC = addGoal ? (addGoal.monthlyTeamTargetFYC || 0) * 12 : 0;
    const topDownCases = addGoal ? addGoal.monthlyTargetCases * 12 : 0;
    const topDownRecruits = addGoal ? ((addGoal.q1?.newRecruits || 0) + (addGoal.q2?.newRecruits || 0) + (addGoal.q3?.newRecruits || 0) + (addGoal.q4?.newRecruits || 0)) : 0;
    const topDownEndManpower = addGoal ? ((addGoal.q1?.baseManpower || 0) + topDownRecruits) : 0;
    
    // Bottom-Up: Sum of All Units' Goals
    // Group goals by unit - identify units by UM/SUM name (for leaders) or unitManager (for advisors)
    // Normalize names to merge duplicate units with different casing
    const normalizeName = (name: string) => name.trim().toUpperCase().replace(/\s+/g, ' ');
    const unitGroups: Record<string, StrategicPlanningGoal[]> = {};
    allGoals.forEach(goal => {
      let unitKey: string;
      
      // For UM/SUM/ADD goals, the unit is identified by their userName (normalized)
      // For advisor goals, the unit is identified by their unitManager (normalized)
      if (goal.userRank === 'UM' || goal.userRank === 'SUM' || goal.userRank === 'ADD') {
        unitKey = `${normalizeName(goal.userName)}_${normalizedAgency}`;
      } else if (goal.userRank === 'ADV' || goal.userRank === 'AUM') {
        // For advisors, use their unitManager as the unit key (normalized)
        // This groups advisors with their leader (UM/SUM/ADD)
        unitKey = `${normalizeName(goal.unitManager || '')}_${normalizedAgency}`;
      } else {
        // Fallback to unitName or unitManager (normalized)
        if (goal.unitName) {
          // Extract the unitManager name from unitName (format: "UNITMANAGER_AGENCY")
          const parts = goal.unitName.split('_');
          const unitManagerPart = parts.slice(0, -1).join('_'); // Everything except last part (agency)
          unitKey = `${normalizeName(unitManagerPart)}_${normalizedAgency}`;
        } else {
          unitKey = `${normalizeName(goal.unitManager || '')}_${normalizedAgency}`;
        }
      }
      
      if (!unitGroups[unitKey]) {
        unitGroups[unitKey] = [];
      }
      unitGroups[unitKey].push(goal);
    });
    
    console.log(`[getAgencyComparison] Grouped ${allGoals.length} goals into ${Object.keys(unitGroups).length} units`);
    
    // Calculate per-unit totals
    const unitVariances: UnitVariance[] = [];
    let bottomUpFYP = 0;
    let bottomUpFYC = 0;
    let bottomUpCases = 0;
    let bottomUpRecruits = 0;
    let bottomUpEndManpower = 0;
    
    Object.entries(unitGroups).forEach(([unitKey, unitGoals]) => {
      // Get the leader goal for this unit (UM, SUM, or ADD)
      const unitLeaderGoal = unitGoals.find(g => g.userRank === 'UM' || g.userRank === 'SUM' || g.userRank === 'ADD');
      // Use the leader's userName for display (preserves original casing)
      // If no leader goal, fallback to unitManager from first goal (for advisors)
      const unitManagerName = unitLeaderGoal?.userName || unitGoals[0]?.unitManager || unitKey.split('_')[0];
      
      // Calculate unit totals: sum of all goals in this unit
      const unitFYP = unitGoals.reduce((sum, goal) => sum + goal.annualFYP, 0);
      const unitFYC = unitGoals.reduce((sum, goal) => sum + goal.annualFYC, 0);
      const unitCases = unitGoals.reduce((sum, goal) => {
        return sum + (goal.q1?.cases || 0) + (goal.q2?.cases || 0) + (goal.q3?.cases || 0) + (goal.q4?.cases || 0);
      }, 0);
      
      // Get recruits from leaders only (UM, SUM, ADD) in this unit
      const leadersInUnit = unitGoals.filter(g => g.userRank === 'UM' || g.userRank === 'SUM' || g.userRank === 'ADD');
      const unitRecruits = leadersInUnit.reduce((sum, goal) => {
        return sum + (goal.q1?.newRecruits || 0) + (goal.q2?.newRecruits || 0) + (goal.q3?.newRecruits || 0) + (goal.q4?.newRecruits || 0);
      }, 0);
      
      // End Manpower: Q1 baseManpower + total recruits (from leaders only)
      // Use Q1 baseManpower from the first leader goal in this unit
      // Note: For unit-level, we use the leader's (UM/SUM/ADD) Q1 baseManpower
      const unitBaseManpower = leadersInUnit.length > 0 ? (leadersInUnit[0].q1?.baseManpower || 0) : 0;
      // End Manpower = Q1 baseManpower + total recruits (Q1 to Q4)
      const unitEndManpower = unitBaseManpower + unitRecruits;
      
      console.log(`[getAgencyComparison] Unit ${unitManagerName}: Base=${unitBaseManpower}, Recruits=${unitRecruits}, End=${unitEndManpower}`);
      
      bottomUpFYP += unitFYP;
      bottomUpFYC += unitFYC;
      bottomUpCases += unitCases;
      bottomUpRecruits += unitRecruits;
      bottomUpEndManpower += unitEndManpower;
      
      unitVariances.push({
        unitManager: unitManagerName,
        unitName: unitKey,
        unitFYP,
        unitFYC,
        unitCases,
        unitRecruits,
        unitEndManpower,
      });
    });
    
    console.log(`[getAgencyComparison] Bottom-Up totals: FYP=${bottomUpFYP}, FYC=${bottomUpFYC}, Cases=${bottomUpCases}, Recruits=${bottomUpRecruits}, EndManpower=${bottomUpEndManpower}`);
    
    // Calculate Variance
    const varianceFYP = bottomUpFYP - topDownFYP;
    const varianceFYC = bottomUpFYC - topDownFYC;
    const varianceCases = bottomUpCases - topDownCases;
    const varianceRecruits = bottomUpRecruits - topDownRecruits;
    const varianceEndManpower = bottomUpEndManpower - topDownEndManpower;
    
    // Calculate Variance Percentage
    const varianceFYPPct = topDownFYP > 0 ? (varianceFYP / topDownFYP) * 100 : 0;
    const varianceFYCPct = topDownFYC > 0 ? (varianceFYC / topDownFYC) * 100 : 0;
    const varianceCasesPct = topDownCases > 0 ? (varianceCases / topDownCases) * 100 : 0;
    const varianceRecruitsPct = topDownRecruits > 0 ? (varianceRecruits / topDownRecruits) * 100 : 0;
    const varianceEndManpowerPct = topDownEndManpower > 0 ? (varianceEndManpower / topDownEndManpower) * 100 : 0;
    
    // Determine Status (5% threshold)
    let status: 'aligned' | 'under' | 'over' = 'aligned';
    if (Math.abs(varianceFYCPct) > 5 || Math.abs(varianceFYPPct) > 5) {
      status = varianceFYC < 0 || varianceFYP < 0 ? 'under' : 'over';
    }
    
    return {
      agencyName: normalizedAgency,
      addName,
      topDownFYP,
      topDownFYC,
      topDownCases,
      topDownRecruits,
      topDownEndManpower,
      bottomUpFYP,
      bottomUpFYC,
      bottomUpCases,
      bottomUpRecruits,
      bottomUpEndManpower,
      varianceFYP,
      varianceFYC,
      varianceCases,
      varianceRecruits,
      varianceEndManpower,
      varianceFYPPct,
      varianceFYCPct,
      varianceCasesPct,
      varianceRecruitsPct,
      varianceEndManpowerPct,
      unitVariances,
      status,
    };
  } catch (error) {
    console.error(`Error getting agency comparison for ${addName}:`, error);
    return null;
  }
}

/**
 * Get all Unit Comparisons for an agency (for ADD view)
 */
export async function getAllUnitComparisons(agencyName: string): Promise<UnitComparison[]> {
  try {
    const normalizedAgency = normalizeAgencyName(agencyName);
    const allGoals = await getAgencyGoals(normalizedAgency);
    
    // Get unique units from goals
    const unitNames = new Set<string>();
    allGoals.forEach(goal => {
      const unitName = goal.unitName || `${goal.unitManager}_${normalizedAgency}`;
      unitNames.add(unitName);
    });
    
    // Get unit manager names (UMs)
    const ums = new Set<string>();
    allGoals.forEach(goal => {
      if (goal.userRank === 'UM' || goal.userRank === 'SUM') {
        ums.add(goal.userName);
      }
    });
    
    // Get comparisons for each unit
    const comparisons: UnitComparison[] = [];
    for (const umName of ums) {
      const comparison = await getUnitComparison(umName, normalizedAgency);
      if (comparison) {
        comparisons.push(comparison);
      }
    }
    
    return comparisons.sort((a, b) => a.unitManager.localeCompare(b.unitManager));
  } catch (error) {
    console.error(`Error getting all unit comparisons for ${agencyName}:`, error);
    return [];
  }
}

