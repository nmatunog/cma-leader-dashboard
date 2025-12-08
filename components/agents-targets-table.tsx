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
import {
  updateAgentFycTarget,
  updateAgentRecruitsTarget,
  updateAgentForecasts,
  getAgents,
} from '@/actions/agents-actions';
import type { Agent } from '@/types';

export function AgentsTargetsTable() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const isEditMode = useEditMode();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getAgents();
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFycTargetChange(agentId: string, fycTarget: number) {
    setSaving(agentId);
    try {
      await updateAgentFycTarget(agentId, fycTarget);
      // Reload to get auto-calculated values
      await loadData();
    } catch (error) {
      console.error('Error saving FYC target:', error);
      alert('Failed to save FYC target');
    } finally {
      setSaving(null);
    }
  }

  async function handleRecruitsTargetChange(agentId: string, recruitsTarget: number) {
    setSaving(agentId);
    try {
      await updateAgentRecruitsTarget(agentId, recruitsTarget);
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, recruitsTarget } : a))
      );
    } catch (error) {
      console.error('Error saving recruits target:', error);
      alert('Failed to save recruits target');
    } finally {
      setSaving(null);
    }
  }

  async function handleForecastChange(
    agentId: string,
    field: 'fycNovForecast' | 'fycDecForecast' | 'recNovForecast' | 'recDecForecast',
    value: number
  ) {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    setSaving(agentId);
    try {
      await updateAgentForecasts(
        agentId,
        field === 'fycNovForecast' ? value : agent.fycNovForecast,
        field === 'fycDecForecast' ? value : agent.fycDecForecast,
        field === 'recNovForecast' ? value : agent.recNovForecast,
        field === 'recDecForecast' ? value : agent.recDecForecast
      );
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, [field]: value } : a))
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

  if (agents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <p>No agents data found. Sync data from Google Sheets first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Enter FYC Target to auto-calculate FYP (FYC ÷ 25%) and ANP (FYP
            × 110%). Forecasts can be entered monthly.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent Targets & Forecasts Input (Sept-Dec 2025)</CardTitle>
          <CardDescription>
            Set FYC targets and forecasts for individual agents. FYP and ANP are auto-calculated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UM Name</TableHead>
                  <TableHead>Agent Name</TableHead>
                  <TableHead>FYC Target (Sept-Dec)</TableHead>
                  <TableHead>FYP Target (Auto)</TableHead>
                  <TableHead>ANP Target (Auto)</TableHead>
                  <TableHead>Recruits Target</TableHead>
                  <TableHead>Forecast FYC (Nov)</TableHead>
                  <TableHead>Forecast FYC (Dec)</TableHead>
                  <TableHead>Forecast Recruits (Nov)</TableHead>
                  <TableHead>Forecast Recruits (Dec)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.umName}</TableCell>
                    <TableCell>{agent.name}</TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={agent.fycTarget || ''}
                          onChange={(e) =>
                            handleFycTargetChange(agent.id, parseFloat(e.target.value) || 0)
                          }
                          disabled={saving === agent.id}
                          className="w-32"
                          step="1000"
                        />
                      ) : (
                        formatCurrency(agent.fycTarget || 0)
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatCurrency(agent.fypTarget || 0)}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatCurrency(agent.anpTarget || 0)}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={agent.recruitsTarget || ''}
                          onChange={(e) =>
                            handleRecruitsTargetChange(agent.id, parseFloat(e.target.value) || 0)
                          }
                          disabled={saving === agent.id}
                          className="w-24"
                        />
                      ) : (
                        agent.recruitsTarget || 0
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={agent.fycNovForecast || ''}
                          onChange={(e) =>
                            handleForecastChange(
                              agent.id,
                              'fycNovForecast',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === agent.id}
                          className="w-32"
                          step="1000"
                        />
                      ) : (
                        formatCurrency(agent.fycNovForecast || 0)
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={agent.fycDecForecast || ''}
                          onChange={(e) =>
                            handleForecastChange(
                              agent.id,
                              'fycDecForecast',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === agent.id}
                          className="w-32"
                          step="1000"
                        />
                      ) : (
                        formatCurrency(agent.fycDecForecast || 0)
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={agent.recNovForecast || ''}
                          onChange={(e) =>
                            handleForecastChange(
                              agent.id,
                              'recNovForecast',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === agent.id}
                          className="w-24"
                        />
                      ) : (
                        agent.recNovForecast || 0
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={agent.recDecForecast || ''}
                          onChange={(e) =>
                            handleForecastChange(
                              agent.id,
                              'recDecForecast',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={saving === agent.id}
                          className="w-24"
                        />
                      ) : (
                        agent.recDecForecast || 0
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

