/**
 * Signup Flow State Management
 * Manages the state of the chatbot signup conversation flow
 */

import type { OrganizationalHierarchyEntry } from '@/services/organizational-hierarchy-service';

export type SignupStep = 
  | 'email' 
  | 'code' 
  | 'lastName' 
  | 'firstName' 
  | 'middleName' 
  | 'unitManager' 
  | 'agency' 
  | 'confirm' 
  | 'complete'
  | 'password';

export interface CollectedSignupData {
  email?: string;
  code?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  unitManager?: string;
  unitManagerFullName?: string; // Full name with middle initial if matched
  agency?: string;
  agencyOther?: string; // If agency is "Other", store the actual name here
  password?: string;
  confirmPassword?: string;
}

export interface SignupFlowState {
  step: SignupStep;
  collectedData: CollectedSignupData;
  hierarchyMatch?: OrganizationalHierarchyEntry | null; // null means explicitly no match
  unitManagerMatch?: OrganizationalHierarchyEntry | null;
  agencyMatch?: boolean; // true if agency exists in hierarchy
  pendingConfirmation?: {
    type: 'hierarchy' | 'unitManager' | 'agency' | 'summary';
    data: any;
    message?: string;
  };
  error?: string;
  isLoading?: boolean;
}

export const INITIAL_SIGNUP_STATE: SignupFlowState = {
  step: 'email',
  collectedData: {},
  hierarchyMatch: undefined,
  unitManagerMatch: undefined,
  agencyMatch: undefined,
  pendingConfirmation: undefined,
  error: undefined,
  isLoading: false,
};

/**
 * Helper function to get full name from collected data
 */
export function getFullName(data: CollectedSignupData): string {
  const parts = [
    data.firstName,
    data.middleName,
    data.lastName,
  ].filter(Boolean);
  return parts.join(' ').trim();
}

/**
 * Helper function to check if we have minimum required data for matching
 */
export function hasMinimumNameData(data: CollectedSignupData): boolean {
  return !!(data.firstName && data.lastName);
}

/**
 * Helper function to check if all required data is collected
 */
export function hasAllRequiredData(data: CollectedSignupData): boolean {
  return !!(
    data.email &&
    data.code &&
    data.firstName &&
    data.lastName &&
    data.unitManager &&
    data.agency &&
    data.password
  );
}

