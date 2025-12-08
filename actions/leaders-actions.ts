'use server';

import { saveDashboardData, loadDashboardData } from '@/services/data-service';
import type { Leader } from '@/types';

// Update leader targets
export async function updateLeaderTargets(
  leaderId: string,
  anpTarget: number,
  recruitsTarget: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await loadDashboardData();
    if (!data) {
      return { success: false, error: 'No dashboard data found' };
    }

    const leader = data.trackingData.find((l) => l.id === leaderId);
    if (!leader) {
      return { success: false, error: 'Leader not found' };
    }

    leader.anpTarget = anpTarget;
    leader.recruitsTarget = recruitsTarget;

    await saveDashboardData(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating leader targets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update targets',
    };
  }
}

// Update leader forecasts
export async function updateLeaderForecasts(
  leaderId: string,
  anpNovForecast: number,
  anpDecForecast: number,
  recNovForecast: number,
  recDecForecast: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await loadDashboardData();
    if (!data) {
      return { success: false, error: 'No dashboard data found' };
    }

    const leader = data.trackingData.find((l) => l.id === leaderId);
    if (!leader) {
      return { success: false, error: 'Leader not found' };
    }

    leader.anpNovForecast = anpNovForecast;
    leader.anpDecForecast = anpDecForecast;
    leader.recNovForecast = recNovForecast;
    leader.recDecForecast = recDecForecast;

    await saveDashboardData(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating leader forecasts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update forecasts',
    };
  }
}

// Get all leaders
export async function getLeaders(): Promise<Leader[]> {
  try {
    const data = await loadDashboardData(false); // Don't use cache to get fresh data
    const leaders = data?.trackingData || [];
    console.log(`Loaded ${leaders.length} leaders from Firebase`);
    return leaders;
  } catch (error) {
    console.error('Error loading leaders:', error);
    return [];
  }
}

