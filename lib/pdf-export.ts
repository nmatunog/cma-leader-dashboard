import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { AgencySummary, Leader, ComparisonData, ComparisonSummary } from '@/types';

// Format currency for PDF
const formatCurrency = (value: number): string =>
  `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Format number for PDF
const formatNumber = (value: number): string => value.toLocaleString('en-US');

// Add header to PDF page
function addPageHeader(doc: jsPDF, title: string, pageNum: number, totalPages: number) {
  doc.setFontSize(16);
  doc.setTextColor(99, 102, 241); // Indigo
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Page ${pageNum} of ${totalPages}`, 190, 20, { align: 'right' });

  // Add line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 25, 196, 25);
}

// Export dashboard summary to PDF
export async function exportDashboardSummary(
  summary: AgencySummary,
  element?: HTMLElement
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin + 15;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(99, 102, 241);
  doc.text('CMA Leader Performance Dashboard', margin, yPos);
  yPos += 10;

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
  yPos += 15;

  // MTD Performance Section
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('MTD Performance', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const mtdMetrics = [
    ['Total ANP (MTD)', formatCurrency(summary.totalAnpMtd)],
    ['Total FYP (MTD)', formatCurrency(summary.totalFypMtd)],
    ['Total FYC (MTD)', formatCurrency(summary.totalFycMtd)],
    ['Case Count (MTD)', formatNumber(summary.totalCasesMtd)],
    ['Producing Advisors (MTD)', formatNumber(summary.producingAdvisorsMtd)],
    ['Total Manpower (MTD)', formatNumber(summary.totalManpowerMtd)],
    ['Total Producing Advisors (MTD)', formatNumber(summary.totalProducingAdvisorsMtd)],
  ];

  mtdMetrics.forEach(([label, value]) => {
    doc.text(`${label}:`, margin, yPos);
    doc.text(value, margin + 80, yPos);
    yPos += 6;
  });

  yPos += 5;

  // YTD Performance Section
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = margin + 15;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('YTD Performance', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const ytdMetrics = [
    ['Total ANP (YTD)', formatCurrency(summary.totalAnpYtd)],
    ['Total FYP (YTD)', formatCurrency(summary.totalFypYtd)],
    ['Total FYC (YTD)', formatCurrency(summary.totalFycYtd)],
    ['Case Count (YTD)', formatNumber(summary.totalCasesYtd)],
    ['Producing Advisors (YTD)', formatNumber(summary.producingAdvisorsYtd)],
    ['Total Manpower (YTD)', formatNumber(summary.totalManpowerYtd)],
    ['Total Producing Advisors (YTD)', formatNumber(summary.totalProducingAdvisorsYtd)],
  ];

  ytdMetrics.forEach(([label, value]) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = margin + 15;
    }
    doc.text(`${label}:`, margin, yPos);
    doc.text(value, margin + 80, yPos);
    yPos += 6;
  });

  doc.save('cma-dashboard-summary.pdf');
}

// Export leaders data to PDF
export async function exportLeadersData(leaders: Leader[]): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let yPos = margin + 15;
  let pageNum = 1;
  const totalPages = Math.ceil(leaders.length / 20) + 1;

  addPageHeader(doc, 'Leaders Targets & Forecasts', pageNum, totalPages);
  yPos = margin + 30;

  // Table headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Leader', margin, yPos);
  doc.text('ANP Target', margin + 50, yPos);
  doc.text('Recruits Target', margin + 90, yPos);
  doc.text('ANP Nov', margin + 130, yPos);
  doc.text('ANP Dec', margin + 160, yPos);
  yPos += 6;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  leaders.forEach((leader, index) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      pageNum++;
      addPageHeader(doc, 'Leaders Targets & Forecasts', pageNum, totalPages);
      yPos = margin + 30;
      doc.setFont('helvetica', 'bold');
      doc.text('Leader', margin, yPos);
      doc.text('ANP Target', margin + 50, yPos);
      doc.text('Recruits Target', margin + 90, yPos);
      doc.text('ANP Nov', margin + 130, yPos);
      doc.text('ANP Dec', margin + 160, yPos);
      yPos += 6;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
    }

    const name = leader.name.length > 20 ? leader.name.substring(0, 17) + '...' : leader.name;
    doc.text(name, margin, yPos);
    doc.text(formatCurrency(leader.anpTarget || 0), margin + 50, yPos);
    doc.text(String(leader.recruitsTarget || 0), margin + 90, yPos);
    doc.text(formatCurrency(leader.anpNovForecast || 0), margin + 130, yPos);
    doc.text(formatCurrency(leader.anpDecForecast || 0), margin + 160, yPos);
    yPos += 6;
  });

  doc.save('cma-leaders-data.pdf');
}

// Export comparison data to PDF
export async function exportComparisonData(
  comparisonData: ComparisonData[],
  summary: ComparisonSummary
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let yPos = margin + 15;
  let pageNum = 1;
  const totalPages = Math.ceil(comparisonData.length / 15) + 1;

  addPageHeader(doc, 'Comparison & Alignment', pageNum, totalPages);
  yPos = margin + 30;

  // Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Agents ANP Target: ${formatCurrency(summary.totalAgentsAnp)}`, margin, yPos);
  yPos += 6;
  doc.text(`Total UM Forecast ANP: ${formatCurrency(summary.totalUMAnp)}`, margin, yPos);
  yPos += 6;
  doc.text(`Variance: ${formatCurrency(summary.totalVariance)}`, margin, yPos);
  yPos += 10;

  // Table headers
  doc.setFont('helvetica', 'bold');
  doc.text('Unit', margin, yPos);
  doc.text('Agents', margin + 40, yPos);
  doc.text('Agent ANP', margin + 55, yPos);
  doc.text('UM Forecast', margin + 90, yPos);
  doc.text('Variance', margin + 125, yPos);
  doc.text('Align %', margin + 155, yPos);
  yPos += 6;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  comparisonData.forEach((item) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      pageNum++;
      addPageHeader(doc, 'Comparison & Alignment', pageNum, totalPages);
      yPos = margin + 30;
      doc.setFont('helvetica', 'bold');
      doc.text('Unit', margin, yPos);
      doc.text('Agents', margin + 40, yPos);
      doc.text('Agent ANP', margin + 55, yPos);
      doc.text('UM Forecast', margin + 90, yPos);
      doc.text('Variance', margin + 125, yPos);
      doc.text('Align %', margin + 155, yPos);
      yPos += 6;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
    }

    const unit = item.unit.length > 15 ? item.unit.substring(0, 12) + '...' : item.unit;
    doc.text(unit, margin, yPos);
    doc.text(String(item.agentCount), margin + 40, yPos);
    doc.text(formatCurrency(item.agentsAnpTotal), margin + 55, yPos);
    doc.text(formatCurrency(item.umAnpForecast), margin + 90, yPos);
    doc.text(formatCurrency(item.variance), margin + 125, yPos);
    doc.text(`${item.alignmentPercentage.toFixed(1)}%`, margin + 155, yPos);
    yPos += 6;
  });

  doc.save('cma-comparison-data.pdf');
}

// Export full dashboard as PDF (captures HTML element)
export async function exportFullDashboard(elementId?: string): Promise<void> {
  const id = elementId || 'dashboard-content';
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Dashboard element with id "${id}" not found`);
  }

  // Hide edit mode toggle and other UI elements
  const editToggles = element.querySelectorAll('[data-export-hide]');
  editToggles.forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
    const imgScaledWidth = imgWidth * ratio;
    const imgScaledHeight = imgHeight * ratio;

    let heightLeft = imgScaledHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgScaledWidth, imgScaledHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgScaledHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgScaledWidth, imgScaledHeight);
      heightLeft -= pageHeight;
    }

    pdf.save('cma-dashboard-full.pdf');
  } finally {
    // Restore hidden elements
    editToggles.forEach((el) => {
      (el as HTMLElement).style.display = '';
    });
  }
}

