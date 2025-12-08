'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  addSheetConfig,
  removeSheetConfig,
  syncAllSheets,
  getSheetConfigs,
} from '@/actions/sheets-actions';
import type { SheetConfig, SheetType } from '@/types';

const SHEET_TYPES: { type: SheetType; label: string; description: string }[] = [
  {
    type: 'agency',
    label: 'Agency Summary',
    description: 'Overall agency totals (MTD/YTD) - Optional (calculated from Leaders sheet)',
  },
  {
    type: 'leaders',
    label: 'Leaders Data',
    description: 'Unit Managers performance data - Required for Dashboard',
  },
  {
    type: 'agents',
    label: 'Agents Data',
    description: 'All agents performance data',
  },
];

export function SheetsManager() {
  const [configs, setConfigs] = useState<Record<SheetType, SheetConfig | null>>({
    agency: null,
    leaders: null,
    agents: null,
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [openDialog, setOpenDialog] = useState<SheetType | null>(null);
  const [formData, setFormData] = useState({ name: '', csvUrl: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load configurations on mount
  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    setLoading(true);
    try {
      const loaded = await getSheetConfigs();
      setConfigs(loaded);
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSheet(type: SheetType) {
    if (!formData.name.trim() || !formData.csvUrl.trim()) {
      setErrorMessage('Please fill in both name and CSV URL');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await addSheetConfig(type, formData.name, formData.csvUrl);
      if (result.success) {
        await loadConfigs();
        setOpenDialog(null);
        setFormData({ name: '', csvUrl: '' });
        // Success - dialog will close
      } else {
        setErrorMessage(result.error || 'Failed to add sheet');
      }
    } catch (error) {
      console.error('Error adding sheet:', error);
      const errMsg = error instanceof Error ? error.message : 'Failed to add sheet';
      setErrorMessage(`Error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveSheet(type: SheetType) {
    if (!confirm('Are you sure you want to remove this sheet configuration?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await removeSheetConfig(type);
      if (result.success) {
        await loadConfigs();
      } else {
        alert(result.error || 'Failed to remove sheet');
      }
    } catch (error) {
      console.error('Error removing sheet:', error);
      alert('Failed to remove sheet');
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncAll() {
    setSyncing(true);
    setErrorMessage(null);
    
    console.log('=== Starting Sync ===');
    console.log('Current sheet configurations:', configs);
    console.log('Agency Summary configured:', !!configs.agency);
    console.log('Agency Summary URL:', configs.agency?.csvUrl || 'NOT CONFIGURED');
    
    try {
      const result = await syncAllSheets();
      
      console.log('=== Sync Result ===');
      console.log('Success:', result.success);
      console.log('Stats:', result.stats);
      console.log('Warnings:', result.warnings);
      console.log('Error:', result.error);
      
      if (result.debug) {
        console.log('=== Debug Info ===');
        if (result.debug.agencyHeaders) {
          console.log('Agency Summary CSV Headers:', result.debug.agencyHeaders);
          console.log('First 10 headers:', result.debug.agencyHeaders.slice(0, 10));
        }
        if (result.debug.agencyValues) {
          console.log('Agency Summary Values Extracted:', result.debug.agencyValues);
          if (result.debug.agencyValues.totalAnpMtd === 0 && result.debug.agencyValues.totalFypMtd === 0) {
            console.error('⚠️ PROBLEM: All values are ZERO!');
            console.error('This means the CSV headers were detected but no data was extracted.');
            console.error('Check if column names match expected names (ANP_MTD, FYPI_MTD, etc.)');
          }
        }
        
        // Show detailed Leaders debug info
        if (result.debug.leadersDebug) {
          console.log('\n=== Leaders Sheet Debug Info ===');
          if (result.debug.leadersDebug.firstFewHeaders) {
            console.log('First 20 headers:', result.debug.leadersDebug.firstFewHeaders);
          }
          if (result.debug.leadersDebug.columnMatches) {
            console.log('Column Matches:', result.debug.leadersDebug.columnMatches);
          }
          if (result.debug.leadersDebug.columnOInfo) {
            console.log('Column O Info:', {
              index: result.debug.leadersDebug.columnOInfo.index,
              header: result.debug.leadersDebug.columnOInfo.header,
              nextHeader: result.debug.leadersDebug.columnOInfo.nextHeader,
            });
          }
          if (result.debug.leadersDebug.fycMtdIndex !== null && result.debug.leadersDebug.fycMtdIndex !== undefined) {
            console.log(`✓ FYC_MTD found at index ${result.debug.leadersDebug.fycMtdIndex}: "${result.debug.leadersDebug.fycMtdHeader}"`);
            if (result.debug.leadersDebug.fycMtdIndex === 2) {
              console.error('⚠️ ERROR: FYC_MTD is at index 2, which is Column O!');
              console.error('   Column O should be ANP_MTD, not FYC_MTD!');
            } else {
              console.log(`   Column O is at index 2, FYC_MTD is at index ${result.debug.leadersDebug.fycMtdIndex} - different columns (good)`);
            }
          } else {
            console.log('⚠️ FYC_MTD not found in headers');
          }
          if (result.debug.leadersDebug.anpHeaders && result.debug.leadersDebug.anpHeaders.length > 0) {
            console.log('Headers containing "ANP":', result.debug.leadersDebug.anpHeaders);
          }
          if (result.debug.leadersDebug.caseHeaders && result.debug.leadersDebug.caseHeaders.length > 0) {
            console.log('Headers containing "CASE" or "RECRUIT":', result.debug.leadersDebug.caseHeaders);
          }
          if (result.debug.leadersDebug.sampleLeaders && result.debug.leadersDebug.sampleLeaders.length > 0) {
            console.log('Sample Leaders (first 3):', result.debug.leadersDebug.sampleLeaders);
            // Show scoring info if available
            result.debug.leadersDebug.sampleLeaders.forEach((leader: any, idx: number) => {
              if (leader.anpScoring) {
                console.log(`\n📊 ANP Scoring for "${leader.name}":`);
                if (leader.anpScoring.bestMatch) {
                  console.log(`  ✓ Best Match: Column ${leader.anpScoring.bestMatch.index} ("${leader.anpScoring.bestMatch.header}") - Score: ${leader.anpScoring.bestMatch.score}`);
                  console.log(`    Value: ${leader.anpActual}`);
                }
                if (leader.anpScoring.potentialColumns && leader.anpScoring.potentialColumns.length > 0) {
                  console.log(`  Other potential columns:`);
                  leader.anpScoring.potentialColumns.forEach((col: any) => {
                    console.log(`    - Column ${col.index} ("${col.header}") - Score: ${col.score}`);
                  });
                }
              }
            });
          }
          if (result.debug.leadersDebug.totals) {
            console.log('Totals from Leaders:', result.debug.leadersDebug.totals);
            
            // Show FYP summary prominently with detailed breakdown
            console.log('\n📊📊📊 FYP MTD SUMMARY 📊📊📊');
            
            // Show totals from Leaders debug
            if (result.debug.leadersDebug.totals) {
              const totals = result.debug.leadersDebug.totals as any;
              console.log(`FYP from Leaders Debug Totals: ${totals.fyp?.toLocaleString() || 0}`);
              console.log(`ANP from Leaders Debug Totals: ${totals.anp?.toLocaleString() || 0}`);
              console.log(`Cases from Leaders Debug Totals: ${totals.cases?.toLocaleString() || 0}`);
              console.log(`New Recruits from Leaders Debug Totals: ${totals.newRecruits?.toLocaleString() || 0}`);
            }
            
            // Show Agency Summary values
            if (result.debug.agencyValues) {
              console.log(`\nAgency Summary Values:`);
              console.log(`  Total FYP MTD: ${result.debug.agencyValues.totalFypMtd?.toLocaleString() || 0}`);
              console.log(`  Total ANP MTD: ${result.debug.agencyValues.totalAnpMtd?.toLocaleString() || 0}`);
              console.log(`  Total Cases MTD: ${result.debug.agencyValues.totalCasesMtd?.toLocaleString() || 0}`);
              
              // Warn if FYP looks wrong
              if (result.debug.agencyValues.totalFypMtd && result.debug.agencyValues.totalFypMtd < 1000) {
                console.log(`\n⚠️⚠️⚠️ WARNING: FYP MTD is very low (${result.debug.agencyValues.totalFypMtd})! ⚠️⚠️⚠️`);
                console.log(`This might indicate FYP is being read from the wrong column.`);
                console.log(`Check the FYP_MTD extraction logs above for each leader.`);
                console.log(`Look for: "🔍🔍🔍 FYP_MTD EXTRACTION DEBUG 🔍🔍🔍"`);
                console.log(`Or filter console by: "FYP" or "Column 13" or "Column AA"`);
              }
            }
            
            // Show sample leaders FYP values if available
            if (result.debug.leadersDebug.sampleLeaders && result.debug.leadersDebug.sampleLeaders.length > 0) {
              console.log(`\nSample Leaders FYP values (first 3):`);
              result.debug.leadersDebug.sampleLeaders.forEach((leader: any, idx: number) => {
                console.log(`  ${idx + 1}. ${leader.name}: FYP = ${(leader.fypActual || 0).toLocaleString()}`);
              });
            }
            
            console.log('📊📊📊 END FYP SUMMARY 📊📊📊\n');
          }
        }
      }
      
      if (result.success) {
        let successMsg = `Sync successful!\n- Agency Summary: ${result.stats?.agencySummary ? 'Loaded' : 'N/A'}\n- Leaders: ${result.stats?.leadersCount || 0}\n- Agents: ${result.stats?.agentsCount || 0}`;
        
        // Add debug info to the message if available
        if (result.debug) {
          if (result.debug.agencyHeaders && result.debug.agencyHeaders.length > 0) {
            successMsg += `\n\n📋 CSV Headers (first 10):\n${result.debug.agencyHeaders.slice(0, 10).join(', ')}`;
          }
          if (result.debug.agencyValues) {
            successMsg += `\n\n📊 Values Extracted:\n- ANP MTD: ${result.debug.agencyValues.totalAnpMtd}\n- FYP MTD: ${result.debug.agencyValues.totalFypMtd}\n- Cases MTD: ${result.debug.agencyValues.totalCasesMtd}`;
            
            // Warn if all zeros
            if (result.debug.agencyValues.totalAnpMtd === 0 && result.debug.agencyValues.totalFypMtd === 0) {
              successMsg += `\n\n⚠️ WARNING: All values are ZERO!\nThe CSV was loaded but no data was extracted.\nCheck if column names match: ANP_MTD, FYPI_MTD, etc.`;
            }
          }
        }
        
        if (result.warnings && result.warnings.length > 0) {
          successMsg += `\n\n⚠️ Warnings:\n${result.warnings.join('\n')}`;
        }
        
        // Note: Agency Summary is now calculated from Leaders sheet, so it's always available
        // No need to check if it was loaded separately
        
        // Show alert with all debug info
        alert(successMsg);
        
        // Show warnings in UI if any
        if (result.warnings && result.warnings.length > 0) {
          let errorMsg = `⚠️ Warnings:\n${result.warnings.join('\n')}`;
          if (result.debug?.agencyHeaders) {
            errorMsg += `\n\n📋 CSV Headers:\n${result.debug.agencyHeaders.slice(0, 15).join(', ')}`;
          }
          setErrorMessage(errorMsg);
        }
        
        // Don't reload page - let console logs persist for debugging
        // Data will be refreshed when user navigates to dashboard or refreshes manually
        console.log('✅ Sync completed successfully. Console logs preserved for debugging.');
        console.log('💡 Tip: Navigate to Dashboard to see updated data, or refresh the page manually if needed.');
      } else {
        console.error('Sync failed:', result.error);
        setErrorMessage(result.error || 'Failed to sync sheets');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      const errMsg = error instanceof Error ? error.message : 'Failed to sync sheets';
      setErrorMessage(`Sync Error: ${errMsg}`);
    } finally {
      setSyncing(false);
      console.log('=== Sync Complete ===');
    }
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-circle-exclamation text-red-600 mt-1"></i>
              <div className="flex-1">
                <p className="font-semibold text-red-800 mb-2">Error</p>
                <pre className="text-sm text-red-700 whitespace-pre-wrap font-sans">
                  {errorMessage}
                </pre>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Google Sheets Configuration</h2>
          <p className="text-gray-600 mt-1">
            Manage your data sources. Upload fresh worksheets monthly to update actual data.
          </p>
        </div>
        <Button onClick={handleSyncAll} disabled={syncing} size="lg">
          {syncing ? (
            <>
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>Syncing...
            </>
          ) : (
            <>
              <i className="fa-solid fa-sync-alt mr-2"></i>Sync All Sheets
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {SHEET_TYPES.map(({ type, label, description }) => {
          const config = configs[type];
          const isLeadersSheet = type === 'leaders';
          return (
            <Card key={type} className={isLeadersSheet && !config ? 'border-yellow-300 bg-yellow-50' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {label}
                  {isLeadersSheet && !config && (
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                      Required for Dashboard
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {config ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{config.name}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate">{config.csvUrl}</p>
                      {config.lastUpdated && (
                        <p className="text-xs text-gray-400 mt-1">
                          Updated: {typeof config.lastUpdated === 'string' 
                            ? new Date(config.lastUpdated).toLocaleDateString()
                            : config.lastUpdated.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Dialog
                        open={openDialog === type}
                        onOpenChange={(open) => {
                          setOpenDialog(open ? type : null);
                          setErrorMessage(null); // Clear errors when dialog opens/closes
                          if (open) {
                            setFormData({ name: config.name, csvUrl: config.csvUrl });
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1">
                            <i className="fa-solid fa-edit mr-2"></i>Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit {label} Sheet</DialogTitle>
                            <DialogDescription>
                              Update the Google Sheets CSV URL for {label.toLowerCase()}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {errorMessage && openDialog === type && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                <pre className="whitespace-pre-wrap font-sans">{errorMessage}</pre>
                              </div>
                            )}
                            <div>
                              <Label htmlFor={`${type}-name`}>Sheet Name</Label>
                              <Input
                                id={`${type}-name`}
                                value={formData.name}
                                onChange={(e) =>
                                  setFormData({ ...formData, name: e.target.value })
                                }
                                placeholder="e.g., October 2025 Agency Summary"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`${type}-url`}>Google Sheets CSV URL</Label>
                              <Input
                                id={`${type}-url`}
                                value={formData.csvUrl}
                                onChange={(e) =>
                                  setFormData({ ...formData, csvUrl: e.target.value })
                                }
                                placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Make sure the sheet is published as CSV format
                              </p>
                            </div>
                            <Button
                              onClick={() => handleAddSheet(type)}
                              disabled={loading}
                              className="w-full"
                            >
                              {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveSheet(type)}
                        disabled={loading}
                      >
                        <i className="fa-solid fa-trash mr-2"></i>Remove
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">No sheet configured</p>
                    <Dialog
                      open={openDialog === type}
                      onOpenChange={(open) => {
                        setOpenDialog(open ? type : null);
                        setErrorMessage(null); // Clear errors when dialog opens/closes
                        if (open) {
                          setFormData({ name: '', csvUrl: '' });
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button className="w-full">
                          <i className="fa-solid fa-plus mr-2"></i>Add Sheet
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add {label} Sheet</DialogTitle>
                          <DialogDescription>
                            Configure the Google Sheets CSV URL for {label.toLowerCase()}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`${type}-name`}>Sheet Name</Label>
                            <Input
                              id={`${type}-name`}
                              value={formData.name}
                              onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                              }
                              placeholder="e.g., October 2025 Agency Summary"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${type}-url`}>Google Sheets CSV URL</Label>
                            <Input
                              id={`${type}-url`}
                              value={formData.csvUrl}
                              onChange={(e) =>
                                setFormData({ ...formData, csvUrl: e.target.value })
                              }
                              placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Make sure the sheet is published as CSV format
                            </p>
                          </div>
                          {errorMessage && openDialog === type && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <pre className="whitespace-pre-wrap font-sans">{errorMessage}</pre>
                            </div>
                          )}
                          <Button
                            onClick={() => handleAddSheet(type)}
                            disabled={loading}
                            className="w-full"
                          >
                            {loading ? 'Adding...' : 'Add Sheet'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">How to Get Google Sheets CSV URL</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>Open your Google Sheet</li>
            <li>Click <strong>File</strong> → <strong>Share</strong> → <strong>Publish to web</strong></li>
            <li>Select <strong>CSV</strong> format</li>
            <li>Click <strong>Publish</strong></li>
            <li>Copy the generated CSV URL</li>
            <li>Paste it in the form above</li>
          </ol>
          <p className="mt-4 text-xs text-gray-600">
            <strong>Note:</strong> Targets and forecasts are entered directly in the dashboard, not
            from sheets. Sheets only provide actual performance data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

