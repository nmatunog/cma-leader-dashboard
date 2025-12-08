'use server';

import { saveDashboardData, loadDashboardData } from '@/services/data-service';
import type { Agent } from '@/types';

// Update agent FYC target (auto-calculates FYP and ANP)
export async function updateAgentFycTarget(
  agentId: string,
  fycTarget: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await loadDashboardData();
    if (!data) {
      return { success: false, error: 'No dashboard data found' };
    }

    const agent = data.agentsData.find((a) => a.id === agentId);
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    // Auto-calculate FYP (FYC / 25%)
    const fypTarget = fycTarget / 0.25;
    // Auto-calculate ANP (FYP * 110%)
    const anpTarget = fypTarget * 1.1;

    agent.fycTarget = fycTarget;
    agent.fypTarget = fypTarget;
    agent.anpTarget = anpTarget;

    await saveDashboardData(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating agent FYC target:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update target',
    };
  }
}

// Update agent recruits target
export async function updateAgentRecruitsTarget(
  agentId: string,
  recruitsTarget: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await loadDashboardData();
    if (!data) {
      return { success: false, error: 'No dashboard data found' };
    }

    const agent = data.agentsData.find((a) => a.id === agentId);
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    agent.recruitsTarget = recruitsTarget;

    await saveDashboardData(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating agent recruits target:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update target',
    };
  }
}

// Update agent forecasts
export async function updateAgentForecasts(
  agentId: string,
  fycNovForecast: number,
  fycDecForecast: number,
  recNovForecast: number,
  recDecForecast: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await loadDashboardData();
    if (!data) {
      return { success: false, error: 'No dashboard data found' };
    }

    const agent = data.agentsData.find((a) => a.id === agentId);
    if (!agent) {
      return { success: false, error: 'Agent not found' };
    }

    agent.fycNovForecast = fycNovForecast;
    agent.fycDecForecast = fycDecForecast;
    agent.recNovForecast = recNovForecast;
    agent.recDecForecast = recDecForecast;

    await saveDashboardData(data);
    return { success: true };
  } catch (error) {
    console.error('Error updating agent forecasts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update forecasts',
    };
  }
}

// Get all agents (sorted by UM Name, then Agent Name)
export async function getAgents(): Promise<Agent[]> {
  try {
    const data = await loadDashboardData(false); // Don't use cache to get fresh data
    const agents = data?.agentsData || [];
    
    console.log(`Loaded ${agents.length} agents from Firebase`);
    
    // Sort by UM Name, then Agent Name
    return agents.sort((a, b) => {
      if (a.umName !== b.umName) {
        return a.umName.localeCompare(b.umName);
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error loading agents:', error);
    return [];
  }
}

