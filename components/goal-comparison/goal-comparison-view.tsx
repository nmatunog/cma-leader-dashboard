'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { 
  getUnitComparison, 
  getAgencyComparison, 
  getAllUnitComparisons,
  type UnitComparison,
  type AgencyComparison 
} from '@/services/goal-comparison-service';
import { UnitComparisonTable } from './unit-comparison-table';
import { AgencyComparisonTable } from './agency-comparison-table';
import { getAllGoals, getAgencyGoals } from '@/services/strategic-planning-service';
import { getAllSUMsInAgency, getUnitsUnderSUM, getUnitsByAgency, getHierarchyByAgency } from '@/services/organizational-hierarchy-service';
import { getAgencies } from '@/services/agency-service';
import { normalizeAgencyName } from '@/lib/utils/agency-name-normalizer';

export function GoalComparisonView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitComparison, setUnitComparison] = useState<UnitComparison | null>(null);
  const [agencyComparison, setAgencyComparison] = useState<AgencyComparison | null>(null);
  const [allUnitComparisons, setAllUnitComparisons] = useState<UnitComparison[]>([]);
  const [viewMode, setViewMode] = useState<'unit' | 'agency' | 'all-units'>('agency');
  
  // Filters for ADMIN users
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [filterSUM, setFilterSUM] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [availableAgencies, setAvailableAgencies] = useState<string[]>([]);
  const [availableSUMs, setAvailableSUMs] = useState<string[]>([]);
  const [availableUnits, setAvailableUnits] = useState<Array<{ name: string; displayName: string }>>([]);
  const [availableUnitsForSUM, setAvailableUnitsForSUM] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      if (user.rank === 'ADMIN') {
        // For ADMIN, just load filter options (non-blocking)
        loadAdminFilterOptions();
        setLoading(false); // Don't wait for agencies to load
      } else {
        loadComparisons();
      }
    }
  }, [user]);

  // Reload comparisons when filters change for ADMIN
  useEffect(() => {
    if (user?.rank === 'ADMIN' && !loading) {
      loadComparisons();
    }
  }, [filterAgency, filterSUM, filterUnit]);

  // Load SUMs when agency filter changes for ADMIN
  useEffect(() => {
    if (user?.rank === 'ADMIN' && filterAgency !== 'all') {
      loadSUMsForAgency(filterAgency);
    } else {
      setAvailableSUMs([]);
      setFilterSUM('all');
    }
  }, [filterAgency]);

  // Load Units when SUM filter changes for ADMIN
  useEffect(() => {
    if (user?.rank === 'ADMIN' && filterSUM !== 'all' && filterAgency !== 'all') {
      loadUnitsForSUM(filterSUM, filterAgency);
    } else if (user?.rank === 'ADMIN' && filterAgency !== 'all' && filterSUM === 'all') {
      loadUnitsForAgency(filterAgency);
    } else {
      setAvailableUnits([]);
      setFilterUnit('all');
    }
  }, [filterSUM, filterAgency]);

  const loadAdminFilterOptions = async () => {
    if (!user || user.rank !== 'ADMIN') return;
    
    try {
      // Try to load agencies from agency service first (faster)
      try {
        const agenciesFromService = await getAgencies();
        if (agenciesFromService && agenciesFromService.length > 0) {
          setAvailableAgencies(agenciesFromService.filter(a => a !== 'No Agency').sort());
          return;
        }
      } catch (serviceErr) {
        console.warn('Could not load agencies from service, falling back to goals:', serviceErr);
      }
      
      // Fallback: Load agencies from goals (slower but works)
      // Do this in background to not block UI
      getAllGoals().then(allGoals => {
        const agencies = Array.from(new Set(allGoals.map(g => g.agencyName)))
          .filter(agency => agency && agency !== 'No Agency')
          .sort();
        setAvailableAgencies(agencies);
      }).catch(err => {
        console.error('Error loading agencies from goals:', err);
        setAvailableAgencies([]);
      });
    } catch (err) {
      console.error('Error loading admin filter options:', err);
      setAvailableAgencies([]);
    }
  };

  const loadSUMsForAgency = async (agencyName: string) => {
    try {
      const sums = await getAllSUMsInAgency(agencyName);
      setAvailableSUMs(sums.map(sum => sum.name));
    } catch (err) {
      console.error('Error loading SUMs for agency:', err);
      setAvailableSUMs([]);
    }
  };

  const loadUnitsForSUM = async (sumName: string, agencyName: string) => {
    try {
      const umNames = await getUnitsUnderSUM(sumName, agencyName);
      const units = umNames.map(name => ({ name, displayName: name }));
      setAvailableUnits(units);
      setAvailableUnitsForSUM(umNames);
    } catch (err) {
      console.error('Error loading units for SUM:', err);
      setAvailableUnits([]);
    }
  };

  const loadUnitsForAgency = async (agencyName: string) => {
    try {
      const umNames = await getUnitsByAgency(agencyName);
      const units = umNames.map(name => ({ name, displayName: name }));
      setAvailableUnits(units);
    } catch (err) {
      console.error('Error loading units for agency:', err);
      setAvailableUnits([]);
    }
  };

  const loadUnitComparison = async (unitManagerName: string, agencyName: string) => {
    try {
      const comparison = await getUnitComparison(unitManagerName, agencyName);
      setUnitComparison(comparison);
      if (!comparison) {
        console.warn(`[GoalComparisonView] No goals found for unit ${unitManagerName}`);
      }
    } catch (err) {
      console.error('Error loading unit comparison:', err);
      setUnitComparison(null);
    }
  };

  const loadComparisons = async () => {
    if (!user) {
      setError('User information not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUnitComparison(null);
      setAgencyComparison(null);
      setAllUnitComparisons([]);

      if (user.rank === 'UM' || user.rank === 'SUM') {
        // UM/SUM: Show their unit comparison
        if (!user.agencyName) {
          setError('Agency information not available');
          setLoading(false);
          return;
        }
        const comparison = await getUnitComparison(user.name, user.agencyName);
        setUnitComparison(comparison);
        setViewMode('unit');
        if (!comparison) {
          setError('No goals found for your unit. Please ensure goals have been submitted.');
        }
      } else if (user.rank === 'ADD') {
        // ADD: Show agency comparison and all unit comparisons
        if (!user.agencyName) {
          setError('Agency information not available');
          setLoading(false);
          return;
        }
        const [agencyComp, unitComps] = await Promise.all([
          getAgencyComparison(user.name, user.agencyName),
          getAllUnitComparisons(user.agencyName),
        ]);
        console.log('[GoalComparisonView] ADD user - Agency comparison:', agencyComp);
        console.log('[GoalComparisonView] ADD user - Unit comparisons:', unitComps);
        setAgencyComparison(agencyComp);
        setAllUnitComparisons(unitComps);
        
        // Extract available units from agency comparison
        if (agencyComp && agencyComp.unitVariances) {
          const units = agencyComp.unitVariances.map(uv => ({
            name: uv.unitManager,
            displayName: uv.unitManager,
          }));
          setAvailableUnits(units);
        } else if (unitComps.length > 0) {
          const units = unitComps.map(uc => ({
            name: uc.unitManager,
            displayName: uc.unitManager,
          }));
          setAvailableUnits(units);
        }
        
        setViewMode('agency');
        if (!agencyComp && unitComps.length === 0) {
          setError('No goals found for your agency. Please ensure goals have been submitted.');
        } else {
          setError(null);
        }
      } else if (user.rank === 'ADMIN') {
        // ADMIN: Handle filters (Agency, SUM, Unit)
        setViewMode('agency');
        
        if (filterAgency === 'all') {
          // No filters selected - just show welcome message
          setError(null);
          setLoading(false);
          return;
        }
        
        if (filterUnit !== 'all' && filterAgency !== 'all') {
          // Filter by Unit - filterUnit is the UM name directly
          await loadUnitComparison(filterUnit, filterAgency);
          setViewMode('unit');
        } else if (filterSUM !== 'all' && filterAgency !== 'all') {
          // Filter by SUM - show unit comparisons for that SUM
          const unitComps = await getAllUnitComparisons(filterAgency);
          // Filter unit comparisons by SUM
          const allGoals = await getAgencyGoals(filterAgency);
          const filteredUnitComps = unitComps.filter(uc => {
            // Find the UM goal for this unit
            const umGoal = allGoals.find(g => g.userName === uc.unitManager && (g.userRank === 'UM' || g.userRank === 'SUM'));
            // Check if UM reports to the selected SUM
            return umGoal?.unitManager === filterSUM;
          });
          setAllUnitComparisons(filteredUnitComps);
          setViewMode('all-units');
        } else if (filterAgency !== 'all') {
          // Filter by Agency - show agency comparison
          // Find ADD for this agency - try hierarchy first, then goals
          try {
            const hierarchy = await getHierarchyByAgency(filterAgency);
            const addEntry = hierarchy.find(e => e.rank === 'ADD');
            
            if (addEntry) {
              const agencyComp = await getAgencyComparison(addEntry.name, filterAgency);
              setAgencyComparison(agencyComp);
              if (agencyComp && agencyComp.unitVariances) {
                const units = agencyComp.unitVariances.map(uv => ({
                  name: uv.unitManager,
                  displayName: uv.unitManager,
                }));
                setAvailableUnits(units);
              }
            } else {
              // No ADD found, try finding from goals
              const allGoals = await getAgencyGoals(filterAgency);
              const addGoal = allGoals.find(g => g.userRank === 'ADD');
              if (addGoal) {
                const agencyComp = await getAgencyComparison(addGoal.userName, filterAgency);
                setAgencyComparison(agencyComp);
                if (agencyComp && agencyComp.unitVariances) {
                  const units = agencyComp.unitVariances.map(uv => ({
                    name: uv.unitManager,
                    displayName: uv.unitManager,
                  }));
                  setAvailableUnits(units);
                }
              } else {
                // No ADD found, show all unit comparisons for the agency
                const unitComps = await getAllUnitComparisons(filterAgency);
                setAllUnitComparisons(unitComps);
                setViewMode('all-units');
              }
            }
          } catch (err) {
            console.error('Error loading agency comparison for admin:', err);
            // Fallback to unit comparisons
            const unitComps = await getAllUnitComparisons(filterAgency);
            setAllUnitComparisons(unitComps);
            setViewMode('all-units');
          }
        } else {
          // No filters - show message to select filters
          setError(null); // Clear error, show filter UI
        }
      } else {
        setError('Comparisons are only available for Unit Managers, SUMs, ADDs, and Admins.');
      }
    } catch (err) {
      console.error('Error loading comparisons:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comparisons');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D31145]"></div>
        <p className="mt-4 text-slate-600">Loading comparisons...</p>
      </div>
    );
  }

  if (error && !(user?.rank === 'ADMIN' && filterAgency === 'all')) {
    return (
      <div className="bg-red-100 border-2 border-red-300 text-red-800 p-4 rounded-lg">
        <p className="font-semibold">Error: {error}</p>
        <button
          onClick={loadComparisons}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filters for ADMIN users */}
      {user?.rank === 'ADMIN' && (
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Agency Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Filter by Agency
              </label>
              <select
                value={filterAgency}
                onChange={(e) => {
                  setFilterAgency(e.target.value);
                  setFilterSUM('all');
                  setFilterUnit('all');
                }}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
              >
                <option value="all">All Agencies</option>
                {availableAgencies.map((agency) => (
                  <option key={agency} value={agency}>
                    {agency}
                  </option>
                ))}
              </select>
            </div>

            {/* SUM Filter */}
            {filterAgency !== 'all' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Filter by SUM
                </label>
                <select
                  value={filterSUM}
                  onChange={(e) => {
                    setFilterSUM(e.target.value);
                    setFilterUnit('all');
                  }}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                >
                  <option value="all">All SUMs</option>
                  {availableSUMs.map((sum) => (
                    <option key={sum} value={sum}>
                      {sum}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Unit Filter */}
            {filterAgency !== 'all' && availableUnits.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Filter by Unit
                </label>
                <select
                  value={filterUnit}
                  onChange={(e) => {
                    setFilterUnit(e.target.value);
                  }}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                >
                  <option value="all">All Units</option>
                  {availableUnits.map((unit) => (
                    <option key={unit.name} value={unit.name}>
                      {unit.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Mode Toggle for ADD/ADMIN users */}
      {(user?.rank === 'ADD' || user?.rank === 'ADMIN') && filterAgency !== 'all' && (
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setViewMode('agency');
                setFilterUnit('all');
                setUnitComparison(null);
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'agency'
                  ? 'bg-[#D31145] text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Agency Comparison
            </button>
            <button
              onClick={() => {
                setViewMode('all-units');
                setFilterUnit('all');
                setUnitComparison(null);
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                viewMode === 'all-units'
                  ? 'bg-[#D31145] text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              All Unit Comparisons
            </button>
          </div>
        </div>
      )}

      {/* Agency Comparison View */}
      {viewMode === 'agency' && (
        <>
          {/* Unit Filter for Agency Comparison */}
          {(user?.rank === 'ADD' || user?.rank === 'ADMIN') && agencyComparison && availableUnits.length > 0 && (
            <div className="mb-4 bg-white rounded-lg shadow-md p-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Filter by Unit
              </label>
              <select
                value={filterUnit}
                onChange={async (e) => {
                  const selectedUnit = e.target.value;
                  setFilterUnit(selectedUnit);
                  const agencyName = user.rank === 'ADMIN' ? filterAgency : user.agencyName;
                  if (selectedUnit !== 'all' && agencyName) {
                    await loadUnitComparison(selectedUnit, agencyName);
                    setViewMode('unit');
                  } else {
                    setUnitComparison(null);
                  }
                }}
                className="w-full md:w-auto p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
              >
                <option value="all">All Units (Agency View)</option>
                {availableUnits.map((unit) => (
                  <option key={unit.name} value={unit.name}>
                    {unit.displayName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Show filtered unit comparison or full agency comparison */}
          {filterUnit !== 'all' && unitComparison ? (
            <UnitComparisonTable comparison={unitComparison} />
          ) : agencyComparison ? (
            <AgencyComparisonTable comparison={agencyComparison} />
          ) : user?.rank === 'ADMIN' && filterAgency === 'all' ? (
            <div className="bg-blue-50 border-2 border-blue-200 text-blue-800 p-6 rounded-lg">
              <p className="font-semibold text-lg mb-2">Welcome to Comparisons</p>
              <p className="text-sm">
                Please select an Agency to view comparisons. You can filter by Agency, SUM, or Unit to see detailed comparisons.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-100 border-2 border-yellow-300 text-yellow-800 p-4 rounded-lg">
              <p className="font-semibold">No agency comparison data available.</p>
              <p className="mt-2 text-sm">
                Goals need to be submitted by team members before comparisons can be generated.
              </p>
            </div>
          )}
        </>
      )}

      {/* Unit Comparison View (for UM/SUM or selected unit) */}
      {viewMode === 'unit' && (
        <>
          {unitComparison ? (
            <UnitComparisonTable comparison={unitComparison} />
          ) : (
            <div className="bg-yellow-100 border-2 border-yellow-300 text-yellow-800 p-4 rounded-lg">
              <p className="font-semibold">No unit comparison data available.</p>
              <p className="mt-2 text-sm">
                Goals need to be submitted by you and your team members before comparisons can be generated.
              </p>
            </div>
          )}
        </>
      )}

      {/* All Unit Comparisons View */}
      {viewMode === 'all-units' && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            All Unit Comparisons{user?.rank === 'ADMIN' && filterAgency !== 'all' ? ` - ${filterAgency}` : user?.agencyName ? ` - ${user.agencyName}` : ''}
          </h2>
          {allUnitComparisons.length === 0 ? (
            <div className="bg-yellow-100 border-2 border-yellow-300 text-yellow-800 p-4 rounded-lg">
              <p>No unit comparisons available. Units need to submit goals first.</p>
            </div>
          ) : (
            allUnitComparisons.map((comparison, index) => (
              <UnitComparisonTable key={index} comparison={comparison} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
