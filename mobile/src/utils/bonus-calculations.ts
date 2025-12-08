// Shared bonus calculation utilities (ported from web)

// ACS 3.0 FYC Bonus Rates (Quarterly FYC)
export function getFYCBonusRate(fyc: number, isNewAdvisor: boolean = false): number {
  if (fyc >= 350000) return 0.40;
  if (fyc >= 200000) return 0.35;
  if (fyc >= 120000) return 0.30;
  if (fyc >= 80000) return 0.20;
  if (fyc >= 50000) return 0.15;
  if (fyc >= 30000) return 0.10;
  // ACS 3.0: 20,000-29,999 gets 10% for 1st and 2nd year Advisors
  if (isNewAdvisor && fyc >= 20000) return 0.10;
  return 0;
}

// ACS 3.0 Case Count Bonus Rates (Quarterly Net Case Count)
export function getCaseCountBonusRate(caseCount: number): number {
  if (caseCount >= 9) return 0.20;
  if (caseCount >= 7) return 0.15;
  if (caseCount >= 5) return 0.10;
  if (caseCount >= 3) return 0.05;
  return 0;
}

// ACS 3.0 Persistency Multiplier (2-Yr Persistency)
// For Advisors: Applied to Personal FYC bonuses
// For Leaders: Applied to (Base DPI + QPB Bonus) - uses Team Persistency
export function getPersistencyMultiplier(persistency: number): number {
  if (persistency >= 90) return 1.1; // 110% - Additional bonus for 90%+ persistency
  if (persistency >= 82.5) return 1.0; // 100%
  if (persistency >= 75) return 0.8; // 80%
  return 0; // Below 75% - no bonus
}

// ACS 3.0 Self-Override Rates (based on Active New Recruits)
export function getSelfOverrideRate(activeRecruits: number): number {
  if (activeRecruits >= 3) return 0.10;
  if (activeRecruits === 2) return 0.075;
  if (activeRecruits === 1) return 0.05;
  return 0;
}

// ACS 3.0 Direct Production Incentive (DPI) Rates by Rank
export function getDPIRate(rank: 'UM' | 'SUM' | 'AD', isNewRecruit: boolean): number {
  if (rank === 'UM') return isNewRecruit ? 0.30 : 0.20;
  if (rank === 'SUM') return isNewRecruit ? 0.325 : 0.225;
  if (rank === 'AD') return isNewRecruit ? 0.35 : 0.25;
  return 0.20; // Default to UM tenured
}

// ACS 3.0 Quarterly Production Bonus (QPB) Rates - Tiered by Advisor's Quarterly FYC
// Performance-Based Override per Direct Advisor
export function getQPBRate(advisorQuarterlyFYC: number): number {
  if (advisorQuarterlyFYC >= 350000) return 0.30; // 30%
  if (advisorQuarterlyFYC >= 200000) return 0.25; // 25%
  if (advisorQuarterlyFYC >= 150000) return 0.20; // 20%
  if (advisorQuarterlyFYC >= 80000) return 0.15; // 15%
  if (advisorQuarterlyFYC >= 50000) return 0.125; // 12.5%
  if (advisorQuarterlyFYC >= 30000) return 0.10; // 10%
  return 0; // Below 30k - no QPB
}

// Legacy constant for backward compatibility (deprecated - use getQPBRate instead)
export const QPB_RATE = 0.10; // Deprecated: Use getQPBRate() for tiered rates

