'use server';

// Note: This file contains server actions, but Firebase client SDK cannot be used on server.
// These functions are deprecated - use client-side services instead.
// Keeping for backward compatibility but they will return cached/null data.

import type { AgencySummary } from '@/types';

const DASHBOARD_SUMMARY_DOC_ID = 'agency-summary';
const DATA_COLLECTION = 'data';

// Cache for agency summary
let cachedSummary: AgencySummary | null = null;
let summaryCacheTimestamp: number = 0;
const SUMMARY_CACHE_DURATION = 30000; // 30 seconds

// Clear cache (useful after syncing)
export async function clearAgencySummaryCache(): Promise<void> {
  cachedSummary = null;
  summaryCacheTimestamp = 0;
}

// Load agency summary from Firebase with caching
export async function loadAgencySummary(useCache = true): Promise<AgencySummary | null> {
  try {
    // Return cached data if still valid
    if (useCache && cachedSummary && Date.now() - summaryCacheTimestamp < SUMMARY_CACHE_DURATION) {
      console.log('Using cached agency summary');
      return cachedSummary;
    }

    // Server actions cannot use Firebase client SDK - return cached data or null
    return cachedSummary;
  } catch (error) {
    console.error('Error loading agency summary:', error);
    // Return cached data on error if available
    if (cachedSummary) {
      return cachedSummary;
    }
    return null;
  }
}

// Update a specific metric in agency summary
// DEPRECATED: Server actions cannot use Firebase client SDK
export async function updateAgencyMetric(
  metric: keyof AgencySummary,
  value: number
): Promise<{ success: boolean; error?: string }> {
  console.warn('updateAgencyMetric: Server actions cannot use Firebase client SDK. This function is deprecated.');
  return { success: false, error: 'Server actions cannot use Firebase client SDK. Use client-side services instead.' };
}

// Save complete agency summary (preserves overrides)
// DEPRECATED: Server actions cannot use Firebase client SDK
export async function saveAgencySummary(
  summary: AgencySummary
): Promise<{ success: boolean; error?: string }> {
  console.warn('saveAgencySummary: Server actions cannot use Firebase client SDK. This function is deprecated.');
  return { success: false, error: 'Server actions cannot use Firebase client SDK. Use client-side services instead.' };
}

