/**
 * Shared bonus calculation utilities for ACS 3.0
 * Ensures consistency across Advisor Sim, Leader HQ, and Goal Setting sections
 */

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
export function getDPIRate(rank: 'ADD' | 'SUM' | 'UM' | 'AUM', isNewRecruit: boolean): number {
  if (rank === 'ADD') return isNewRecruit ? 0.35 : 0.25; // Agency/District Director: 25%/35%
  if (rank === 'SUM') return isNewRecruit ? 0.325 : 0.225; // Senior Unit Manager: 22.5%/32.5%
  if (rank === 'UM') return isNewRecruit ? 0.30 : 0.20; // Unit Manager: 20%/30%
  if (rank === 'AUM') return isNewRecruit ? 0.28 : 0.18; // Associate Unit Manager: 18%/28%
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

/**
 * PPB Enhancement Comparison Tables
 * Shows the transition from ANP-based to FYC-based bonus structure
 */

export interface BonusTier {
  min: number;
  max: number | null; // null means "and up"
  rate: number; // as decimal (0.35 = 35%)
  label: string; // formatted range label
}

/**
 * BEFORE: ANP-based bonus structure (old system)
 * Requirements were based on Quarterly Net ANP
 */
export const ANP_BONUS_TIERS: BonusTier[] = [
  { min: 2000000, max: null, rate: 0.35, label: '2,000,000 & up' },
  { min: 1500000, max: 1999999, rate: 0.30, label: '1,500,000 – 1,999,999' },
  { min: 1000000, max: 1499999, rate: 0.25, label: '1,000,000 – 1,499,999' },
  { min: 500000, max: 999999, rate: 0.20, label: '500,000 – 999,999' },
  { min: 300000, max: 499999, rate: 0.15, label: '300,000 – 499,999' },
  { min: 150000, max: 299999, rate: 0.10, label: '150,000 – 299,999' },
];

/**
 * AFTER: FYC-based bonus structure (ACS 3.0)
 * Requirements are now FYC-based – tied directly to your earnings
 */
export const FYC_BONUS_TIERS: BonusTier[] = [
  { min: 350000, max: null, rate: 0.40, label: '350,000 & up' },
  { min: 200000, max: 349999, rate: 0.35, label: '200,000 – 349,999' },
  { min: 120000, max: 199999, rate: 0.30, label: '120,000 – 199,999' },
  { min: 80000, max: 119999, rate: 0.20, label: '80,000 – 119,999' },
  { min: 50000, max: 79999, rate: 0.15, label: '50,000 – 79,999' },
  { min: 30000, max: 49999, rate: 0.10, label: '30,000 – 49,999' },
  { min: 20000, max: 29999, rate: 0.10, label: '20,000 – 29,999 (1st & 2nd year Advisors)' },
];

/**
 * Get bonus rate from ANP-based system (legacy)
 * @param anp Quarterly Net ANP
 * @returns Bonus rate as decimal
 */
export function getANPBonusRate(anp: number): number {
  for (const tier of ANP_BONUS_TIERS) {
    if (tier.max === null) {
      if (anp >= tier.min) return tier.rate;
    } else {
      if (anp >= tier.min && anp <= tier.max) return tier.rate;
    }
  }
  return 0;
}

/**
 * Get formatted comparison data for display
 * Returns both before and after structures for comparison tables
 */
export function getPPBComparisonData() {
  return {
    before: {
      title: 'BEFORE',
      subtitle: 'Requirements are ANP based',
      tiers: ANP_BONUS_TIERS,
      maxRate: 0.35,
      maxRateLabel: '35%',
    },
    after: {
      title: 'AFTER',
      subtitle: 'Requirements are now FYC based – tied directly to your earnings',
      tiers: FYC_BONUS_TIERS,
      maxRate: 0.40,
      maxRateLabel: '40%',
      enhancements: [
        {
          type: 'higher_max',
          message: 'Higher bonus rates up to 40% (+5% more)!',
          tier: FYC_BONUS_TIERS[0],
        },
        {
          type: 'lower_entry',
          message: 'Lower entry point to qualify!',
          tier: FYC_BONUS_TIERS[5],
        },
        {
          type: 'new_advisor',
          message: 'Even lower entry point for new advisors!',
          tier: FYC_BONUS_TIERS[6],
        },
      ],
    },
  };
}

