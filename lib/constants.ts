/**
 * Application Constants
 */

// Agency options for dropdowns
export const AGENCIES = [
  'CE VISAYAS 1 DIRECT',
  'CEBU-EZ MATUNOG AGENCY',
  'CEBU-MATUNOG AGENCY',
] as const;

export type AgencyName = typeof AGENCIES[number];


