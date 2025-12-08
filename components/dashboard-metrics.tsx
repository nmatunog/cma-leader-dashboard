'use client';

import { useState, useEffect, useMemo } from 'react';
import { EditableMetricCard } from './editable-metric-card';
import { DashboardSkeleton } from './loading-skeleton';
import { loadAgencySummary, updateAgencyMetric } from '@/actions/dashboard-actions';
import type { AgencySummary } from '@/types';

const defaultSummary: AgencySummary = {
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
  overrides: {},
};

export function DashboardMetrics() {
  const [summary, setSummary] = useState<AgencySummary>(defaultSummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      console.log('=== Dashboard: Loading Agency Summary ===');
      const data = await loadAgencySummary(false); // Don't use cache to get fresh data
      console.log('=== Dashboard: Data received ===', data);
      
      if (data) {
        console.log('Dashboard metrics loaded:', {
          totalAnpMtd: data.totalAnpMtd,
          totalFypMtd: data.totalFypMtd,
          totalFycMtd: data.totalFycMtd,
          totalCasesMtd: data.totalCasesMtd,
          totalManpowerMtd: data.totalManpowerMtd,
          producingAdvisorsMtd: data.producingAdvisorsMtd,
        });
        
        // Check if all values are zero
        const allZeros = data.totalAnpMtd === 0 && data.totalFypMtd === 0 && data.totalCasesMtd === 0;
        if (allZeros) {
          console.warn('⚠️ WARNING: All dashboard metrics are ZERO!');
          console.warn('This means the Agency Summary sheet was loaded but no data was extracted.');
          console.warn('Check the server console for CSV parsing details.');
        }
        
        setSummary(data);
      } else {
        console.warn('⚠️ No agency summary data found in Firebase');
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(metric: keyof AgencySummary, value: number) {
    const result = await updateAgencyMetric(metric, value);
    if (result.success) {
      setSummary((prev) => ({
        ...prev,
        [metric]: value,
        overrides: {
          ...prev.overrides,
          [metric]: true,
        },
      }));
    } else {
      throw new Error(result.error || 'Failed to save');
    }
  }

  // Memoize metrics arrays to prevent re-creation
  const mtdMetrics = useMemo(
    () => [
      {
        title: 'Total ANP (MTD)',
        value: summary.totalAnpMtd,
        icon: 'fa-dollar-sign',
        iconColor: 'bg-green-100 text-green-600',
        format: 'currency' as const,
        metric: 'totalAnpMtd' as keyof AgencySummary,
      },
      {
        title: 'Total FYP (MTD)',
        value: summary.totalFypMtd,
        icon: 'fa-chart-line',
        iconColor: 'bg-blue-100 text-blue-600',
        format: 'currency' as const,
        metric: 'totalFypMtd' as keyof AgencySummary,
      },
      {
        title: 'Total FYC (MTD)',
        value: summary.totalFycMtd,
        icon: 'fa-hand-holding-dollar',
        iconColor: 'bg-orange-100 text-orange-600',
        format: 'currency' as const,
        metric: 'totalFycMtd' as keyof AgencySummary,
      },
      {
        title: 'Case Count (MTD)',
        value: summary.totalCasesMtd,
        icon: 'fa-file-lines',
        iconColor: 'bg-red-100 text-red-600',
        format: 'number' as const,
        metric: 'totalCasesMtd' as keyof AgencySummary,
      },
      {
        title: 'Producing Advisors (MTD)',
        value: summary.producingAdvisorsMtd,
        icon: 'fa-user-check',
        iconColor: 'bg-purple-100 text-purple-600',
        format: 'number' as const,
        metric: 'producingAdvisorsMtd' as keyof AgencySummary,
      },
      {
        title: 'Total Manpower (MTD)',
        value: summary.totalManpowerMtd,
        icon: 'fa-users',
        iconColor: 'bg-indigo-100 text-indigo-600',
        format: 'number' as const,
        metric: 'totalManpowerMtd' as keyof AgencySummary,
      },
      {
        title: 'Total Producing Advisors (MTD)',
        value: summary.totalProducingAdvisorsMtd,
        icon: 'fa-user-group',
        iconColor: 'bg-teal-100 text-teal-600',
        format: 'number' as const,
        metric: 'totalProducingAdvisorsMtd' as keyof AgencySummary,
      },
      {
        title: 'Persistency (MTD)',
        value: summary.persistencyMtd,
        icon: 'fa-percent',
        iconColor: 'bg-pink-100 text-pink-600',
        format: 'percent' as const,
        metric: 'persistencyMtd' as keyof AgencySummary,
      },
    ],
    [summary]
  );

  const ytdMetrics = useMemo(
    () => [
      {
        title: 'Total ANP (YTD)',
        value: summary.totalAnpYtd,
        icon: 'fa-dollar-sign',
        iconColor: 'bg-green-100 text-green-600',
        format: 'currency' as const,
        metric: 'totalAnpYtd' as keyof AgencySummary,
      },
      {
        title: 'Total FYP (YTD)',
        value: summary.totalFypYtd,
        icon: 'fa-chart-line',
        iconColor: 'bg-blue-100 text-blue-600',
        format: 'currency' as const,
        metric: 'totalFypYtd' as keyof AgencySummary,
      },
      {
        title: 'Total FYC (YTD)',
        value: summary.totalFycYtd,
        icon: 'fa-hand-holding-dollar',
        iconColor: 'bg-orange-100 text-orange-600',
        format: 'currency' as const,
        metric: 'totalFycYtd' as keyof AgencySummary,
      },
      {
        title: 'Case Count (YTD)',
        value: summary.totalCasesYtd,
        icon: 'fa-file-lines',
        iconColor: 'bg-red-100 text-red-600',
        format: 'number' as const,
        metric: 'totalCasesYtd' as keyof AgencySummary,
      },
      {
        title: 'Producing Advisors (YTD)',
        value: summary.producingAdvisorsYtd,
        icon: 'fa-user-check',
        iconColor: 'bg-purple-100 text-purple-600',
        format: 'number' as const,
        metric: 'producingAdvisorsYtd' as keyof AgencySummary,
      },
      {
        title: 'Total Manpower (YTD)',
        value: summary.totalManpowerYtd,
        icon: 'fa-users',
        iconColor: 'bg-indigo-100 text-indigo-600',
        format: 'number' as const,
        metric: 'totalManpowerYtd' as keyof AgencySummary,
      },
      {
        title: 'Total Producing Advisors (YTD)',
        value: summary.totalProducingAdvisorsYtd,
        icon: 'fa-user-group',
        iconColor: 'bg-teal-100 text-teal-600',
        format: 'number' as const,
        metric: 'totalProducingAdvisorsYtd' as keyof AgencySummary,
      },
      {
        title: 'Persistency (YTD)',
        value: summary.persistencyYtd,
        icon: 'fa-percent',
        iconColor: 'bg-pink-100 text-pink-600',
        format: 'percent' as const,
        metric: 'persistencyYtd' as keyof AgencySummary,
      },
    ],
    [summary]
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* MTD Performance */}
      <div>
        <h2 className="mb-6 text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          MTD Performance
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {mtdMetrics.map((metric) => (
            <EditableMetricCard
              key={metric.metric}
              title={metric.title}
              value={metric.value}
              icon={metric.icon}
              iconColor={metric.iconColor}
              format={metric.format}
              onSave={(value) => handleSave(metric.metric, value)}
              isOverridden={
                (summary.overrides &&
                  summary.overrides[metric.metric as keyof typeof summary.overrides]) ||
                false
              }
            />
          ))}
        </div>
      </div>

      {/* YTD Performance */}
      <div>
        <h2 className="mb-6 text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          YTD Performance
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ytdMetrics.map((metric) => (
            <EditableMetricCard
              key={metric.metric}
              title={metric.title}
              value={metric.value}
              icon={metric.icon}
              iconColor={metric.iconColor}
              format={metric.format}
              onSave={(value) => handleSave(metric.metric, value)}
              isOverridden={
                (summary.overrides &&
                  summary.overrides[metric.metric as keyof typeof summary.overrides]) ||
                false
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

