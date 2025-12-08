'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEditMode } from '@/hooks/use-edit-mode';
import {
  getComparisonData,
  getComparisonSummary,
  updateUnitAdjustedTarget,
  updateAgencyAdjustedTargets,
} from '@/actions/comparison-actions';
import type { ComparisonData, ComparisonSummary } from '@/types';

export function ComparisonTables() {
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [summary, setSummary] = useState<ComparisonSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const isEditMode = useEditMode();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [data, summaryData] = await Promise.all([
        getComparisonData(),
        getComparisonSummary(),
      ]);
      setComparisonData(data);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading comparison data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnitAdjustedTarget(
    unitName: string,
    field: 'adjustedAnpTarget' | 'adjustedRecruitsTarget',
    value: number
  ) {
    const unit = comparisonData.find((c) => c.unit === unitName);
    if (!unit) return;

    setSaving(unitName);
    try {
      await updateUnitAdjustedTarget(
        unitName,
        field === 'adjustedAnpTarget' ? value : unit.adjustedAnpTarget,
        field === 'adjustedRecruitsTarget' ? value : unit.adjustedRecruitsTarget
      );
      await loadData(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving adjusted target:', error);
      alert('Failed to save adjusted target');
    } finally {
      setSaving(null);
    }
  }

  async function handleAgencyAdjustedTarget(
    field: 'totalAdjustedAnp' | 'totalAdjustedRecruits',
    value: number
  ) {
    if (!summary) return;

    setSaving('AGENCY');
    try {
      await updateAgencyAdjustedTargets(
        field === 'totalAdjustedAnp' ? value : summary.totalAdjustedAnp,
        field === 'totalAdjustedRecruits' ? value : summary.totalAdjustedRecruits
      );
      await loadData(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving agency adjusted target:', error);
      alert('Failed to save agency adjusted target');
    } finally {
      setSaving(null);
    }
  }

  const formatCurrency = (value: number) =>
    `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aligned':
        return 'text-green-600';
      case 'under':
        return 'text-yellow-600';
      case 'over':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Agents ANP Target</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(summary.totalAgentsAnp)}</p>
              <p className="text-sm text-gray-500 mt-2">Sum of all agent ANP targets</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total UM Forecast ANP</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(summary.totalUMAnp)}</p>
              <p className="text-sm text-gray-500 mt-2">Sum of UM Nov + Dec forecasts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-3xl font-bold ${summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(summary.totalVariance)}
              </p>
              <p className="text-sm text-gray-500 mt-2">Difference between agents and UMs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agents vs UM Forecasts Comparison</CardTitle>
          <CardDescription>
            Compare total agent ANP targets with UM forecasts per unit. Adjust targets as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit (UM Name)</TableHead>
                  <TableHead>Agent Count</TableHead>
                  <TableHead>Total Agents ANP Target</TableHead>
                  <TableHead>UM Forecast ANP</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Alignment %</TableHead>
                  <TableHead>Adjusted ANP Target</TableHead>
                  <TableHead>Adjusted Recruits Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((item) => (
                  <TableRow key={item.unit}>
                    <TableCell className="font-medium">{item.unit}</TableCell>
                    <TableCell>{item.agentCount}</TableCell>
                    <TableCell>{formatCurrency(item.agentsAnpTotal)}</TableCell>
                    <TableCell>{formatCurrency(item.umAnpForecast)}</TableCell>
                    <TableCell
                      className={item.variance >= 0 ? 'text-green-600' : 'text-red-600'}
                    >
                      {formatCurrency(item.variance)}
                    </TableCell>
                    <TableCell className={getStatusColor(item.status)}>
                      {item.alignmentPercentage.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={item.adjustedAnpTarget || ''}
                          onChange={(e) =>
                            handleUnitAdjustedTarget(
                              item.unit,
                              'adjustedAnpTarget',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === item.unit}
                          className="w-32"
                          step="1000"
                        />
                      ) : (
                        formatCurrency(item.adjustedAnpTarget || 0)
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={item.adjustedRecruitsTarget || ''}
                          onChange={(e) =>
                            handleUnitAdjustedTarget(
                              item.unit,
                              'adjustedRecruitsTarget',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === item.unit}
                          className="w-24"
                        />
                      ) : (
                        item.adjustedRecruitsTarget || 0
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {summary && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-bold">
                      AGENCY TOTAL
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(summary.totalAgentsAnp)}
                    </TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(summary.totalUMAnp)}
                    </TableCell>
                    <TableCell
                      className={`font-bold ${summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(summary.totalVariance)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={summary.totalAdjustedAnp || ''}
                          onChange={(e) =>
                            handleAgencyAdjustedTarget(
                              'totalAdjustedAnp',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === 'AGENCY'}
                          className="w-32 font-bold"
                          step="1000"
                        />
                      ) : (
                        <span className="font-bold">{formatCurrency(summary.totalAdjustedAnp)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={summary.totalAdjustedRecruits || ''}
                          onChange={(e) =>
                            handleAgencyAdjustedTarget(
                              'totalAdjustedRecruits',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === 'AGENCY'}
                          className="w-24 font-bold"
                        />
                      ) : (
                        <span className="font-bold">{summary.totalAdjustedRecruits}</span>
                      )}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Alignment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Unit-by-Unit Alignment</CardTitle>
          <CardDescription>
            Detailed alignment status and adjusted targets for each unit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Agent Count</TableHead>
                  <TableHead>Total Agent ANP Target</TableHead>
                  <TableHead>UM Forecast ANP</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Alignment %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Adjusted ANP Target</TableHead>
                  <TableHead>Adjusted Recruits Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((item) => (
                  <TableRow key={item.unit}>
                    <TableCell className="font-medium">{item.unit}</TableCell>
                    <TableCell>{item.agentCount}</TableCell>
                    <TableCell>{formatCurrency(item.agentsAnpTotal)}</TableCell>
                    <TableCell>{formatCurrency(item.umAnpForecast)}</TableCell>
                    <TableCell
                      className={item.variance >= 0 ? 'text-green-600' : 'text-red-600'}
                    >
                      {formatCurrency(item.variance)}
                    </TableCell>
                    <TableCell className={getStatusColor(item.status)}>
                      {item.alignmentPercentage.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          item.status === 'aligned'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'under'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status === 'aligned'
                          ? 'Aligned'
                          : item.status === 'under'
                            ? 'Under'
                            : 'Over'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={item.adjustedAnpTarget || ''}
                          onChange={(e) =>
                            handleUnitAdjustedTarget(
                              item.unit,
                              'adjustedAnpTarget',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === item.unit}
                          className="w-32"
                          step="1000"
                        />
                      ) : (
                        formatCurrency(item.adjustedAnpTarget || 0)
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={item.adjustedRecruitsTarget || ''}
                          onChange={(e) =>
                            handleUnitAdjustedTarget(
                              item.unit,
                              'adjustedRecruitsTarget',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === item.unit}
                          className="w-24"
                        />
                      ) : (
                        item.adjustedRecruitsTarget || 0
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

