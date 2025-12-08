'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  exportDashboardSummary,
  exportLeadersData,
  exportComparisonData,
  exportFullDashboard,
} from '@/lib/pdf-export';
import { loadAgencySummary } from '@/actions/dashboard-actions';
import { getLeaders } from '@/actions/leaders-actions';
import { getComparisonData, getComparisonSummary } from '@/actions/comparison-actions';
import type { AgencySummary, Leader, ComparisonData, ComparisonSummary } from '@/types';

export function PdfExportButton() {
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExportSummary() {
    setExporting('summary');
    try {
      const summary = await loadAgencySummary();
      if (summary) {
        await exportDashboardSummary(summary);
      } else {
        alert('No summary data available');
      }
    } catch (error) {
      console.error('Error exporting summary:', error);
      alert('Failed to export summary');
    } finally {
      setExporting(null);
    }
  }

  async function handleExportLeaders() {
    setExporting('leaders');
    try {
      const leaders = await getLeaders();
      if (leaders.length > 0) {
        await exportLeadersData(leaders);
      } else {
        alert('No leaders data available');
      }
    } catch (error) {
      console.error('Error exporting leaders:', error);
      alert('Failed to export leaders data');
    } finally {
      setExporting(null);
    }
  }

  async function handleExportComparison() {
    setExporting('comparison');
    try {
      const [data, summary] = await Promise.all([
        getComparisonData(),
        getComparisonSummary(),
      ]);
      if (data.length > 0) {
        await exportComparisonData(data, summary);
      } else {
        alert('No comparison data available');
      }
    } catch (error) {
      console.error('Error exporting comparison:', error);
      alert('Failed to export comparison data');
    } finally {
      setExporting(null);
    }
  }

  async function handleExportFull() {
    setExporting('full');
    try {
      // Try to find the main content area
      const dashboardContent =
        document.getElementById('dashboard-content') ||
        document.querySelector('main') ||
        document.body;
      const id = dashboardContent.id || 'dashboard-content';
      if (!dashboardContent.id) {
        dashboardContent.id = id;
      }
      await exportFullDashboard(id);
    } catch (error) {
      console.error('Error exporting full dashboard:', error);
      alert('Failed to export full dashboard');
    } finally {
      setExporting(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={!!exporting}
          className="gap-2"
        >
          {exporting ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i>
              Exporting...
            </>
          ) : (
            <>
              <i className="fa-solid fa-file-export"></i>
              Export PDF
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportSummary} disabled={!!exporting}>
          <i className="fa-solid fa-chart-line mr-2"></i>
          Dashboard Summary
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportLeaders} disabled={!!exporting}>
          <i className="fa-solid fa-users mr-2"></i>
          Leaders Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportComparison} disabled={!!exporting}>
          <i className="fa-solid fa-chart-bar mr-2"></i>
          Comparison & Alignment
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportFull} disabled={!!exporting}>
          <i className="fa-solid fa-file-pdf mr-2"></i>
          Full Dashboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

