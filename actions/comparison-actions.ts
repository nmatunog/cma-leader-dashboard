'use server';

import { loadDashboardData, saveDashboardData } from '@/services/data-service';
import type { ComparisonData, ComparisonSummary, AgencyTargets } from '@/types';

// Calculate comparison data per unit
export async function getComparisonData(): Promise<ComparisonData[]> {
  try {
    const data = await loadDashboardData();
    if (!data) return [];

    const { trackingData, agentsData } = data;

    // Group agents by UM Name
    const unitGroups: Record<string, { agents: typeof agentsData; um: typeof trackingData[0] | null }> = {};

    // Initialize units from leaders
    trackingData.forEach((leader) => {
      if (!unitGroups[leader.name]) {
        unitGroups[leader.name] = { agents: [], um: leader };
      } else {
        unitGroups[leader.name].um = leader;
      }
    });

    // Group agents by UM Name
    agentsData.forEach((agent) => {
      if (!unitGroups[agent.umName]) {
        unitGroups[agent.umName] = { agents: [], um: null };
      }
      unitGroups[agent.umName].agents.push(agent);
    });

    // Calculate comparison for each unit
    const comparisons: ComparisonData[] = [];

    Object.entries(unitGroups).forEach(([unitName, group]) => {
      // Sum agent ANP targets
      const agentsAnpTotal = group.agents.reduce((sum, agent) => sum + (agent.anpTarget || 0), 0);

      // Get UM forecast (Nov + Dec)
      const umAnpForecast =
        (group.um?.anpNovForecast || 0) + (group.um?.anpDecForecast || 0);

      const variance = agentsAnpTotal - umAnpForecast;

      // Calculate alignment percentage
      const alignmentPercentage =
        umAnpForecast > 0 ? Math.min((agentsAnpTotal / umAnpForecast) * 100, 200) : 0;

      // Determine status
      let status: 'aligned' | 'under' | 'over' = 'aligned';
      if (variance < -0.05 * umAnpForecast) {
        status = 'under';
      } else if (variance > 0.05 * umAnpForecast) {
        status = 'over';
      }

      comparisons.push({
        unit: unitName,
        agentsAnpTotal,
        umAnpForecast,
        variance,
        adjustedAnpTarget: group.um?.anpTarget || 0,
        adjustedRecruitsTarget: group.um?.recruitsTarget || 0,
        agentCount: group.agents.length,
        alignmentPercentage,
        status,
      });
    });

    return comparisons.sort((a, b) => a.unit.localeCompare(b.unit));
  } catch (error) {
    console.error('Error calculating comparison data:', error);
    return [];
  }
}

// Get comparison summary
export async function getComparisonSummary(): Promise<ComparisonSummary> {
  try {
    const data = await loadDashboardData();
    if (!data) {
      return {
        totalAgentsAnp: 0,
        totalUMAnp: 0,
        totalVariance: 0,
        totalAdjustedAnp: 0,
        totalAdjustedRecruits: 0,
      };
    }

    const { trackingData, agentsData } = data;

    // Total agents ANP
    const totalAgentsAnp = agentsData.reduce((sum, agent) => sum + (agent.anpTarget || 0), 0);

    // Total UM forecasts (Nov + Dec)
    const totalUMAnp = trackingData.reduce(
      (sum, leader) =>
        sum + (leader.anpNovForecast || 0) + (leader.anpDecForecast || 0),
      0
    );

    const totalVariance = totalAgentsAnp - totalUMAnp;

    // Total adjusted targets (from agency level if set, otherwise sum of leaders)
    const totalAdjustedAnp = data.agencyAnpTarget || trackingData.reduce(
      (sum, leader) => sum + (leader.anpTarget || 0),
      0
    );
    const totalAdjustedRecruits = data.agencyRecruitsTarget || trackingData.reduce(
      (sum, leader) => sum + (leader.recruitsTarget || 0),
      0
    );

    return {
      totalAgentsAnp,
      totalUMAnp,
      totalVariance,
      totalAdjustedAnp,
      totalAdjustedRecruits,
    };
  } catch (error) {
    console.error('Error calculating comparison summary:', error);
    return {
      totalAgentsAnp: 0,
      totalUMAnp: 0,
      totalVariance: 0,
      totalAdjustedAnp: 0,
      totalAdjustedRecruits: 0,
    };
  }
}

// Update adjusted target for a unit (UM level)
export async function updateUnitAdjustedTarget(
  unitName: string,
  adjustedAnp: number,
  adjustedRecruits: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await loadDashboardData();
    if (!data) {
      return { success: false, error: 'No dashboard data found' };
    }

    const leader = data.trackingData.find((l) => l.name === unitName);
    if (!leader) {
      return { success: false, error: 'Unit Manager not found' };
    }

    leader.anpTarget = adjustedAnp;
    leader.recruitsTarget = adjustedRecruits;

    await saveDashboardData(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating unit adjusted target:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update target',
    };
  }
}

// Update agency-level adjusted targets
export async function updateAgencyAdjustedTargets(
  adjustedAnp: number,
  adjustedRecruits: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await loadDashboardData();
    if (!data) {
      return { success: false, error: 'No dashboard data found' };
    }

    data.agencyAnpTarget = adjustedAnp;
    data.agencyRecruitsTarget = adjustedRecruits;

    await saveDashboardData(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating agency adjusted targets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update targets',
    };
  }
}

