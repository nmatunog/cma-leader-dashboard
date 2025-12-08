'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

    console.log('Loading agency summary from Firebase...');
    const docRef = doc(db, DATA_COLLECTION, DASHBOARD_SUMMARY_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as AgencySummary;
      console.log('Agency summary loaded from Firebase:', {
        totalAnpMtd: data.totalAnpMtd,
        totalFypMtd: data.totalFypMtd,
        totalFycMtd: data.totalFycMtd,
        totalCasesMtd: data.totalCasesMtd,
        totalManpowerMtd: data.totalManpowerMtd,
        producingAdvisorsMtd: data.producingAdvisorsMtd,
      });
      
      // Check if all values are zero
      if (data.totalAnpMtd === 0 && data.totalFypMtd === 0 && data.totalCasesMtd === 0) {
        console.warn('⚠️ WARNING: Agency summary loaded but all values are ZERO!');
        console.warn('This means the CSV was loaded but parsing failed to extract data.');
        console.warn('Check server logs for CSV parsing details.');
      }
      
      cachedSummary = data;
      summaryCacheTimestamp = Date.now();
      return data;
    }
    console.warn('⚠️ Agency summary document does not exist in Firebase');
    return null;
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
export async function updateAgencyMetric(
  metric: keyof AgencySummary,
  value: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, DATA_COLLECTION, DASHBOARD_SUMMARY_DOC_ID);
    const current = await loadAgencySummary();

    const updated: AgencySummary = {
      totalAnpMtd: 0,
      totalFypMtd: 0,
      totalFycMtd: 0,
      totalCasesMtd: 0,
      producingAdvisorsMtd: 0,
      totalManpowerMtd: 0,
      totalProducingAdvisorsMtd: 0,
      persistencyMtd: 0,
      totalAnpYtd: 0,
      totalFypYtd: 0,
      totalFycYtd: 0,
      totalCasesYtd: 0,
      producingAdvisorsYtd: 0,
      totalManpowerYtd: 0,
      totalProducingAdvisorsYtd: 0,
      persistencyYtd: 0,
      ...current,
      [metric]: value,
      overrides: {
        ...current?.overrides,
        [metric]: true,
      },
    };

    await setDoc(docRef, updated, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating agency metric:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update metric',
    };
  }
}

// Save complete agency summary (preserves overrides)
export async function saveAgencySummary(
  summary: AgencySummary
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, DATA_COLLECTION, DASHBOARD_SUMMARY_DOC_ID);
    const current = await loadAgencySummary(false); // Don't use cache when loading current

    console.log('Current agency summary from Firebase:', current);
    console.log('New agency summary to save:', summary);

    // Preserve overrides when syncing from sheets
    const updated: AgencySummary = {
      ...summary,
      overrides: current?.overrides || {},
    };

    // If a metric is overridden, keep the overridden value
    if (current?.overrides) {
      Object.keys(current.overrides).forEach((key) => {
        // Skip 'overrides' key itself
        if (key === 'overrides') return;
        
        const metricKey = key as keyof AgencySummary;
        if (current.overrides![key as keyof typeof current.overrides] && current[metricKey] !== undefined) {
          // Only update if it's a number field
          if (typeof current[metricKey] === 'number') {
            (updated as any)[metricKey] = current[metricKey] as number;
          }
        }
      });
    }

    console.log('Final agency summary to save:', {
      totalAnpMtd: updated.totalAnpMtd,
      totalFypMtd: updated.totalFypMtd,
      totalFycMtd: updated.totalFycMtd,
      totalCasesMtd: updated.totalCasesMtd,
      totalManpowerMtd: updated.totalManpowerMtd,
    });

    await setDoc(docRef, updated, { merge: true });
    // Update cache
    cachedSummary = updated;
    summaryCacheTimestamp = Date.now();
    
    console.log('Agency summary saved successfully to Firebase');
    return { success: true };
  } catch (error) {
    console.error('Error saving agency summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save summary',
    };
  }
}

