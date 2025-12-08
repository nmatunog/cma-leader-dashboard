'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEditMode } from '@/hooks/use-edit-mode';
import { updateLeaderTargets, updateLeaderForecasts, getLeaders } from '@/actions/leaders-actions';
import type { Leader } from '@/types';

export function LeadersTargetsTable() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const isEditMode = useEditMode();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getLeaders();
      setLeaders(data);
    } catch (error) {
      console.error('Error loading leaders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleTargetChange(
    leaderId: string,
    field: 'anpTarget' | 'recruitsTarget',
    value: number
  ) {
    const leader = leaders.find((l) => l.id === leaderId);
    if (!leader) return;

    setSaving(leaderId);
    try {
      if (field === 'anpTarget') {
        await updateLeaderTargets(leaderId, value, leader.recruitsTarget);
      } else {
        await updateLeaderTargets(leaderId, leader.anpTarget, value);
      }
      setLeaders((prev) =>
        prev.map((l) => (l.id === leaderId ? { ...l, [field]: value } : l))
      );
    } catch (error) {
      console.error('Error saving target:', error);
      alert('Failed to save target');
    } finally {
      setSaving(null);
    }
  }

  async function handleForecastChange(
    leaderId: string,
    field: 'anpNovForecast' | 'anpDecForecast' | 'recNovForecast' | 'recDecForecast',
    value: number
  ) {
    const leader = leaders.find((l) => l.id === leaderId);
    if (!leader) return;

    setSaving(leaderId);
    try {
      await updateLeaderForecasts(
        leaderId,
        field === 'anpNovForecast' ? value : leader.anpNovForecast,
        field === 'anpDecForecast' ? value : leader.anpDecForecast,
        field === 'recNovForecast' ? value : leader.recNovForecast,
        field === 'recDecForecast' ? value : leader.recDecForecast
      );
      setLeaders((prev) =>
        prev.map((l) => (l.id === leaderId ? { ...l, [field]: value } : l))
      );
    } catch (error) {
      console.error('Error saving forecast:', error);
      alert('Failed to save forecast');
    } finally {
      setSaving(null);
    }
  }

  const formatCurrency = (value: number) =>
    `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i>
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <p>No leaders data found. Sync data from Google Sheets first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Targets (Sept-Dec 2025)</CardTitle>
          <CardDescription>Set ANP and Recruits targets for each Unit Manager</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leader (UM Name)</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>ANP Target (Sept-Dec)</TableHead>
                  <TableHead>Recruits Target (Sept-Dec)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaders.map((leader) => (
                  <TableRow key={leader.id}>
                    <TableCell className="font-medium">{leader.name}</TableCell>
                    <TableCell>{leader.unit}</TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={leader.anpTarget || ''}
                          onChange={(e) =>
                            handleTargetChange(leader.id, 'anpTarget', parseFloat(e.target.value) || 0)
                          }
                          disabled={saving === leader.id}
                          className="w-32"
                          step="1000"
                        />
                      ) : (
                        formatCurrency(leader.anpTarget || 0)
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={leader.recruitsTarget || ''}
                          onChange={(e) =>
                            handleTargetChange(
                              leader.id,
                              'recruitsTarget',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === leader.id}
                          className="w-24"
                        />
                      ) : (
                        leader.recruitsTarget || 0
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Forecasts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast (Nov-Dec 2025)</CardTitle>
          <CardDescription>Set ANP and Recruits forecasts for November and December</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leader (UM Name)</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Forecast ANP (Nov)</TableHead>
                  <TableHead>Forecast ANP (Dec)</TableHead>
                  <TableHead>Forecast Recruits (Nov)</TableHead>
                  <TableHead>Forecast Recruits (Dec)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaders.map((leader) => (
                  <TableRow key={leader.id}>
                    <TableCell className="font-medium">{leader.name}</TableCell>
                    <TableCell>{leader.unit}</TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={leader.anpNovForecast || ''}
                          onChange={(e) =>
                            handleForecastChange(
                              leader.id,
                              'anpNovForecast',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === leader.id}
                          className="w-32"
                          step="1000"
                        />
                      ) : (
                        formatCurrency(leader.anpNovForecast || 0)
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={leader.anpDecForecast || ''}
                          onChange={(e) =>
                            handleForecastChange(
                              leader.id,
                              'anpDecForecast',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === leader.id}
                          className="w-32"
                          step="1000"
                        />
                      ) : (
                        formatCurrency(leader.anpDecForecast || 0)
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={leader.recNovForecast || ''}
                          onChange={(e) =>
                            handleForecastChange(
                              leader.id,
                              'recNovForecast',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === leader.id}
                          className="w-24"
                        />
                      ) : (
                        leader.recNovForecast || 0
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={leader.recDecForecast || ''}
                          onChange={(e) =>
                            handleForecastChange(
                              leader.id,
                              'recDecForecast',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === leader.id}
                          className="w-24"
                        />
                      ) : (
                        leader.recDecForecast || 0
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

