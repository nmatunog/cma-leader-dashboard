'use server';

import { saveSheetConfig, deleteSheetConfig, loadSheetConfigs } from '@/services/sheets-config-service';
import { loadAllDataFromSheets, calculateAgencySummaryFromLeaders } from '@/services/sheets-service';
import { saveDashboardData, clearDashboardCache } from '@/services/data-service';
import { saveAgencySummary, clearAgencySummaryCache } from '@/actions/dashboard-actions';
import type { SheetConfig, SheetType, AgencySummary, Leader, Agent } from '@/types';

// Add or update a sheet configuration
export async function addSheetConfig(
  type: SheetType,
  name: string,
  csvUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate URL format - accept multiple Google Sheets CSV URL formats
    const isValidUrl = 
      csvUrl.includes('docs.google.com/spreadsheets') && 
      (csvUrl.includes('output=csv') || 
       csvUrl.includes('format=csv') || 
       csvUrl.includes('export?format=csv') ||
       csvUrl.includes('gviz/tq?tqx=out:csv'));
    
    if (!isValidUrl) {
      return {
        success: false,
        error: 'Invalid Google Sheets CSV URL. Must be a published CSV export URL.\n\nValid formats:\n- https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0\n- https://docs.google.com/spreadsheets/d/SHEET_ID/pub?output=csv\n- https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&gid=0',
      };
    }

    // Test the URL by attempting to fetch it
    try {
      const testResponse = await fetch(csvUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Accept': 'text/csv',
        },
      });

      if (!testResponse.ok) {
        return {
          success: false,
          error: `Cannot access the sheet. HTTP ${testResponse.status}: ${testResponse.statusText}\n\nMake sure:\n1. The sheet is published to web (File → Share → Publish to web)\n2. CSV format is selected\n3. The URL is correct`,
        };
      }

      const testText = await testResponse.text();
      if (!testText || testText.trim().length === 0) {
        return {
          success: false,
          error: 'The sheet appears to be empty or not accessible. Make sure the sheet is published and contains data.',
        };
      }
    } catch (fetchError) {
      return {
        success: false,
        error: `Failed to access the sheet: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}\n\nCommon issues:\n1. Sheet not published to web\n2. CORS restrictions\n3. Invalid URL\n4. Network connectivity issues`,
      };
    }

    const config: SheetConfig = {
      id: `${type}-${Date.now()}`,
      type,
      name,
      csvUrl,
      isActive: true,
      lastUpdated: new Date(),
    };

    await saveSheetConfig(type, config);
    return { success: true };
  } catch (error) {
    console.error('Error adding sheet config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save sheet configuration',
    };
  }
}

// Remove a sheet configuration
export async function removeSheetConfig(
  type: SheetType
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteSheetConfig(type);
    return { success: true };
  } catch (error) {
    console.error('Error removing sheet config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove sheet configuration',
    };
  }
}

// Sync data from all configured sheets
export async function syncAllSheets(): Promise<{
  success: boolean;
  error?: string;
  warnings?: string[];
  stats?: {
    agencySummary: boolean;
    leadersCount: number;
    agentsCount: number;
  };
  debug?: {
    agencyHeaders?: string[];
    agencyValues?: {
      totalAnpMtd: number;
      totalFypMtd: number;
      totalCasesMtd: number;
    };
      leadersDebug?: {
        headers?: string[];
        firstFewHeaders?: string[];
        columnMatches?: {
          leaderName?: string;
          anp?: string;
          cases?: string;
        };
        anpHeaders?: string[];
        caseHeaders?: string[];
        fycMtdIndex?: number | null;
        fycMtdHeader?: string | null;
        columnOInfo?: {
          index: number;
          header: string;
          nextHeader: string;
        };
        sampleLeaders?: Array<{
          name: string;
          anpActual: number;
          recruitsActual: number;
        }>;
        totals?: {
          anp: number;
          cases: number;
        };
      };
  };
}> {
  try {
    const configs = await loadSheetConfigs();

    console.log('Sheet configurations loaded:', {
      agency: configs.agency ? { name: configs.agency.name, url: configs.agency.csvUrl } : null,
      leaders: configs.leaders ? { name: configs.leaders.name } : null,
      agents: configs.agents ? { name: configs.agents.name } : null,
    });

    if (!configs.leaders && !configs.agents) {
      return {
        success: false,
        error: 'Leaders sheet is required. Please add a Leaders sheet in Settings.',
      };
    }

    if (!configs.leaders) {
      return {
        success: false,
        error: 'Leaders sheet is required to calculate dashboard metrics. Please add a Leaders sheet in Settings.',
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    
    console.log('Loading data from sheets...');
    let leaders: Leader[] = [];
    let agents: Agent[] = [];
    let headers: { leaders?: string[]; agents?: string[] } = {};
    let leadersDebug: any = null;
    
    try {
      const result = await loadAllDataFromSheets({
        agency: null, // No longer using Agency Summary sheet
        leaders: configs.leaders?.csvUrl || null,
        agents: configs.agents?.csvUrl || null,
      });
      leaders = result.leaders;
      agents = result.agents;
      headers = result.headers;
      leadersDebug = result.leadersDebug;
    } catch (error) {
      console.error('Error in loadAllDataFromSheets:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to load data from sheets: ${errorMsg}`);
    }
    
    console.log('Data loaded:', {
      leadersCount: leaders.length,
      agentsCount: agents.length,
      leadersHeaders: headers.leaders?.slice(0, 10),
    });

    // Check if we got Leaders data (required)
    if (leaders.length === 0) {
      let errorMsg = 'Leaders sheet returned 0 records.\n\n';
      errorMsg += 'Please check:\n';
      errorMsg += '1. Sheet is published to web as CSV\n';
      errorMsg += '2. URL is correct\n';
      errorMsg += '3. Sheet contains data\n';
      errorMsg += '4. Column headers match expected names\n\n';
      errorMsg += 'Expected column names:\n';
      errorMsg += '- Leader Name: "UM Name" or "Leader Name" or "AGENT NAME"\n';
      errorMsg += '- ANP: "ANP_MTD" or "ANP MTD" or "ANP"\n';
      errorMsg += '- Cases: "CASECNT_MTD" or "CASECNT MTD" or "Cases"\n';
      
      if (headers.leaders && headers.leaders.length > 0) {
        errorMsg += `\n\nLeaders sheet headers found: ${headers.leaders.slice(0, 10).join(', ')}${headers.leaders.length > 10 ? '...' : ''}`;
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Calculate Agency Summary from Leaders sheet totals
    // Agency name is extracted from Leaders sheet during loadAllDataFromSheets
    console.log('Calculating Agency Summary from Leaders sheet totals...');
    const agencySummary = calculateAgencySummaryFromLeaders(leaders, agents, data.agencySummary?.agencyName);
    
    // Store agency name in localStorage for sidebar display
    if (agencySummary.agencyName) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('agency_name', agencySummary.agencyName);
      }
    }
    console.log('Agency Summary calculated:', {
      totalAnpMtd: agencySummary.totalAnpMtd,
      totalFypMtd: agencySummary.totalFypMtd,
      totalFycMtd: agencySummary.totalFycMtd,
      totalCasesMtd: agencySummary.totalCasesMtd,
      totalManpowerMtd: agencySummary.totalManpowerMtd,
    });

    // Add warnings for missing Agents data (optional but helpful for FYP/FYC)
    if (configs.agents && agents.length === 0) {
      let warningMsg = 'Agents sheet returned 0 records. FYP and FYC will be calculated from Leaders data only.';
      if (headers.agents && headers.agents.length > 0) {
        warningMsg += `\nHeaders found: ${headers.agents.slice(0, 8).join(', ')}${headers.agents.length > 8 ? '...' : ''}`;
        warningMsg += '\nExpected: "AGENT NAME" or "Agent Name" in first few columns.';
      }
      warnings.push(warningMsg);
    }

    // Clear caches before saving new data
    clearDashboardCache();
    clearAgencySummaryCache();

    // Save to Firebase
    try {
      await saveDashboardData({
        trackingData: leaders,
        agentsData: agents,
        agencyAnpTarget: 0, // Will be set via inputs
        agencyRecruitsTarget: 0, // Will be set via inputs
      });
      console.log(`Saved ${leaders.length} leaders and ${agents.length} agents to Firebase`);
    } catch (saveError) {
      errors.push(`Failed to save data: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
    }

    // Save agency summary if loaded
    if (agencySummary) {
      try {
        console.log('Agency Summary before saving:', {
          totalAnpMtd: agencySummary.totalAnpMtd,
          totalFypMtd: agencySummary.totalFypMtd,
          totalFycMtd: agencySummary.totalFycMtd,
          totalCasesMtd: agencySummary.totalCasesMtd,
          totalManpowerMtd: agencySummary.totalManpowerMtd,
        });
        const saveResult = await saveAgencySummary(agencySummary);
        if (saveResult.success) {
          console.log('Saved agency summary to Firebase successfully');
        } else {
          console.error('Failed to save agency summary:', saveResult.error);
          errors.push(`Failed to save agency summary: ${saveResult.error}`);
        }
      } catch (saveError) {
        console.error('Error saving agency summary:', saveError);
        errors.push(`Failed to save agency summary: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
      }
    } else {
      console.log('No agency summary data to save');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Data loaded but failed to save:\n${errors.join('\n')}`,
      };
    }

    const resultMessage = warnings.length > 0 
      ? `\n\nWarnings:\n${warnings.join('\n')}`
      : '';

        return {
          success: true,
          stats: {
            agencySummary: true, // Always true now since we calculate from Leaders
            leadersCount: leaders.length,
            agentsCount: agents.length,
          },
          warnings: warnings.length > 0 ? warnings : undefined,
          debug: {
            agencyHeaders: headers.leaders, // Show Leaders headers instead
            agencyValues: {
              totalAnpMtd: agencySummary.totalAnpMtd,
              totalFypMtd: agencySummary.totalFypMtd,
              totalCasesMtd: agencySummary.totalCasesMtd,
            },
            leadersDebug: leadersDebug || undefined,
          },
        };
  } catch (error) {
    console.error('Error syncing sheets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to sync sheets: ${errorMessage}\n\nTroubleshooting:\n1. Check browser console for details\n2. Verify sheet URLs are correct\n3. Ensure sheets are published to web\n4. Check network connectivity`,
    };
  }
}

// Get all sheet configurations
export async function getSheetConfigs() {
  return await loadSheetConfigs();
}

