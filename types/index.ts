// Core data types for the CMA Dashboard

// Export user authentication types
export * from './user';

export interface Leader {
  id: string;
  name: string;
  unit: string;
  anpActual: number;
  anpTarget: number;
  recruitsActual: number; // NEW_RECRUIT - New Recruits
  recruitsTarget: number;
  casesActual?: number; // CASECNT_MTD - Total Cases (optional, for backward compatibility)
  fypActual?: number; // FYPI_MTD - First Year Premium (optional, from Leaders sheet)
  fycActual?: number; // FYC_MTD - First Year Commission (optional, from Leaders sheet)
  anpYtdActual?: number; // ANP_YTD - Annualized New Premium YTD (optional, from Column P)
  fypYtdActual?: number; // FYP_YTD - First Year Premium YTD (optional, from Column AE)
  fycYtdActual?: number; // FYC_YTD - First Year Commission YTD (optional, from Column DF)
  anpNovForecast: number;
  anpDecForecast: number;
  recNovForecast: number;
  recDecForecast: number;
}

export interface Agent {
  id: string;
  name: string;
  umName: string;
  unit: string;
  anpActual: number;
  fypActual: number;
  casesActual: number;
  fycTarget: number;
  fypTarget: number;
  anpTarget: number;
  recruitsTarget: number;
  fycNovForecast: number;
  fycDecForecast: number;
  recNovForecast: number;
  recDecForecast: number;
}

export interface AgencySummary {
  // Agency Information
  agencyName?: string;
  
  // MTD Metrics
  totalAnpMtd: number;
  totalFypMtd: number;
  totalFycMtd: number;
  totalCasesMtd: number;
  producingAdvisorsMtd: number;
  totalManpowerMtd: number;
  totalProducingAdvisorsMtd: number;
  persistencyMtd: number;
  
  // YTD Metrics
  totalAnpYtd: number;
  totalFypYtd: number;
  totalFycYtd: number;
  totalCasesYtd: number;
  producingAdvisorsYtd: number;
  totalManpowerYtd: number;
  totalProducingAdvisorsYtd: number;
  persistencyYtd: number;
  
  // Override flags (true if manually edited)
  overrides?: {
    totalAnpMtd?: boolean;
    totalFypMtd?: boolean;
    totalFycMtd?: boolean;
    totalCasesMtd?: boolean;
    producingAdvisorsMtd?: boolean;
    totalManpowerMtd?: boolean;
    totalProducingAdvisorsMtd?: boolean;
    persistencyMtd?: boolean;
    totalAnpYtd?: boolean;
    totalFypYtd?: boolean;
    totalFycYtd?: boolean;
    totalCasesYtd?: boolean;
    producingAdvisorsYtd?: boolean;
    totalManpowerYtd?: boolean;
    totalProducingAdvisorsYtd?: boolean;
    persistencyYtd?: boolean;
  };
}

export interface AgencyTargets {
  anpTarget: number;
  recruitsTarget: number;
}

export interface ComparisonData {
  unit: string;
  agentsAnpTotal: number;
  umAnpForecast: number;
  variance: number;
  adjustedAnpTarget: number;
  adjustedRecruitsTarget: number;
  agentCount: number;
  alignmentPercentage: number;
  status: 'aligned' | 'under' | 'over';
}

export interface ComparisonSummary {
  totalAgentsAnp: number;
  totalUMAnp: number;
  totalVariance: number;
  totalAdjustedAnp: number;
  totalAdjustedRecruits: number;
}

// Sheet configuration types
export type SheetType = 'agency' | 'leaders' | 'agents';

export interface SheetConfig {
  id: string;
  type: SheetType;
  name: string;
  csvUrl: string;
  lastUpdated?: Date | string; // Can be Date object or ISO string for serialization
  isActive: boolean;
}

export interface SheetConfigs {
  agency: SheetConfig | null;
  leaders: SheetConfig | null;
  agents: SheetConfig | null;
}

