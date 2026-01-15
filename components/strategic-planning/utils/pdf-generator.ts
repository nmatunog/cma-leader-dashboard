import jsPDF from 'jspdf';
import type { StrategicPlanningGoal } from '@/services/strategic-planning-service';

interface PDFReportData {
  userName: string;
  unitManager: string;
  agencyName: string;
  goal: StrategicPlanningGoal;
}

export function generateStrategicPlanningPDF(data: PDFReportData): void {
  const { userName, unitManager, agencyName, goal } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;
  
  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
  };
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(211, 17, 69); // AIA Red
  doc.setFont('helvetica', 'bold');
  doc.text('Strategic Planning Summary 2026', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Overview Section
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Overview', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${userName}`, margin, yPos);
  yPos += 6;
  doc.text(`Unit Manager: ${unitManager}`, margin, yPos);
  yPos += 6;
  doc.text(`Agency Name: ${agencyName}`, margin, yPos);
  yPos += 6;
  doc.text(`Submitted: ${goal.submittedAt.toLocaleDateString()}`, margin, yPos);
  yPos += 10;
  
  // Jan 2026 Targets Section
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('January 2026 Targets', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Jan 2026 Targets Table
  const decColWidths = [60, 80];
  let xPos = margin;
  
  // Header
  doc.setFillColor(211, 17, 69);
  doc.rect(xPos, yPos - 5, decColWidths[0], 7, 'F');
  doc.rect(xPos + decColWidths[0], yPos - 5, decColWidths[1], 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Metric', xPos + 2, yPos);
  doc.text('Target', xPos + decColWidths[0] + 2, yPos);
  yPos += 7;
  
  // Data rows
  doc.setDrawColor(200, 200, 200);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  const monthlyGoalRows = [
    ['FYP', `₱${goal.monthlyTargetFYP.toLocaleString()}`],
    ['FYC', `₱${goal.monthlyTargetFYC.toLocaleString()}`],
    ['Cases', goal.monthlyTargetCases.toString()],
  ];
  
  monthlyGoalRows.forEach((row) => {
    doc.rect(xPos, yPos - 5, decColWidths[0], 7);
    doc.rect(xPos + decColWidths[0], yPos - 5, decColWidths[1], 7);
    doc.text(row[0], xPos + 2, yPos);
    doc.text(row[1], xPos + decColWidths[0] + 2, yPos);
    yPos += 7;
  });
  
  yPos += 5;
  
  // Quarterly Goals Section
  checkPageBreak(80);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Quarterly Goals Summary', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const quarterlyData = [
    ['Quarter', 'Base Manpower', 'New Recruits', 'FYP', 'FYC', 'Cases'],
    [
      'Q1',
      goal.q1.baseManpower.toString(),
      goal.q1.newRecruits.toString(),
      `₱${goal.q1.fyp.toLocaleString()}`,
      `₱${goal.q1.fyc.toLocaleString()}`,
      goal.q1.cases.toString(),
    ],
    [
      'Q2',
      goal.q2.baseManpower.toString(),
      goal.q2.newRecruits.toString(),
      `₱${goal.q2.fyp.toLocaleString()}`,
      `₱${goal.q2.fyc.toLocaleString()}`,
      goal.q2.cases.toString(),
    ],
    [
      'Q3',
      goal.q3.baseManpower.toString(),
      goal.q3.newRecruits.toString(),
      `₱${goal.q3.fyp.toLocaleString()}`,
      `₱${goal.q3.fyc.toLocaleString()}`,
      goal.q3.cases.toString(),
    ],
    [
      'Q4',
      goal.q4.baseManpower.toString(),
      goal.q4.newRecruits.toString(),
      `₱${goal.q4.fyp.toLocaleString()}`,
      `₱${goal.q4.fyc.toLocaleString()}`,
      goal.q4.cases.toString(),
    ],
  ];
  
  // Note: jsPDF doesn't have built-in table support, so we'll create a simple table manually
  const colWidths = [25, 35, 35, 40, 40, 20];
  const startX = margin;
  xPos = startX; // Reuse xPos from above
  
  // Header row
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(211, 17, 69);
  doc.rect(xPos, yPos - 5, colWidths[0], 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('Q', xPos + 2, yPos);
  
  xPos += colWidths[0];
  doc.rect(xPos, yPos - 5, colWidths[1], 7, 'F');
  doc.text('Base', xPos + 2, yPos);
  
  xPos += colWidths[1];
  doc.rect(xPos, yPos - 5, colWidths[2], 7, 'F');
  doc.text('New', xPos + 2, yPos);
  
  xPos += colWidths[2];
  doc.rect(xPos, yPos - 5, colWidths[3], 7, 'F');
  doc.text('FYP', xPos + 2, yPos);
  
  xPos += colWidths[3];
  doc.rect(xPos, yPos - 5, colWidths[4], 7, 'F');
  doc.text('FYC', xPos + 2, yPos);
  
  xPos += colWidths[4];
  doc.rect(xPos, yPos - 5, colWidths[5], 7, 'F');
  doc.text('Cases', xPos + 2, yPos);
  
  yPos += 7;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  // Data rows
  const quarters = [
    { q: 'Q1', data: goal.q1 },
    { q: 'Q2', data: goal.q2 },
    { q: 'Q3', data: goal.q3 },
    { q: 'Q4', data: goal.q4 },
  ];
  
  quarters.forEach((quarter) => {
    checkPageBreak(10);
    xPos = startX;
    
    // Draw cell borders
    doc.setDrawColor(200, 200, 200);
    doc.rect(xPos, yPos - 5, colWidths[0], 7);
    doc.text(quarter.q, xPos + 2, yPos);
    
    xPos += colWidths[0];
    doc.rect(xPos, yPos - 5, colWidths[1], 7);
    doc.text(quarter.data.baseManpower.toString(), xPos + 2, yPos);
    
    xPos += colWidths[1];
    doc.rect(xPos, yPos - 5, colWidths[2], 7);
    doc.text(quarter.data.newRecruits.toString(), xPos + 2, yPos);
    
    xPos += colWidths[2];
    doc.rect(xPos, yPos - 5, colWidths[3], 7);
    doc.text(`₱${quarter.data.fyp.toLocaleString()}`, xPos + 2, yPos);
    
    xPos += colWidths[3];
    doc.rect(xPos, yPos - 5, colWidths[4], 7);
    doc.text(`₱${quarter.data.fyc.toLocaleString()}`, xPos + 2, yPos);
    
    xPos += colWidths[4];
    doc.rect(xPos, yPos - 5, colWidths[5], 7);
    doc.text(quarter.data.cases.toString(), xPos + 2, yPos);
    
    yPos += 7;
  });
  
  yPos += 5;
  
  // Annual Totals Section
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Annual Totals', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Annual Totals Table
  const annualColWidths = [100, 80];
  xPos = margin;
  
  // Header
  doc.setFillColor(211, 17, 69);
  doc.rect(xPos, yPos - 5, annualColWidths[0], 7, 'F');
  doc.rect(xPos + annualColWidths[0], yPos - 5, annualColWidths[1], 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Metric', xPos + 2, yPos);
  doc.text('Total', xPos + annualColWidths[0] + 2, yPos);
  yPos += 7;
  
  // Data rows
  doc.setDrawColor(200, 200, 200);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  const annualRows = [
    ['Manpower (Base + New)', goal.annualManpower.toString()],
    ['FYP', `₱${goal.annualFYP.toLocaleString()}`],
    ['FYC', `₱${goal.annualFYC.toLocaleString()}`],
    ['Income', `₱${goal.annualIncome.toLocaleString()}`],
    ['Avg Monthly Income', `₱${goal.avgMonthlyIncome.toLocaleString()}`],
  ];
  
  annualRows.forEach((row) => {
    checkPageBreak(8);
    doc.rect(xPos, yPos - 5, annualColWidths[0], 7);
    doc.rect(xPos + annualColWidths[0], yPos - 5, annualColWidths[1], 7);
    doc.text(row[0], xPos + 2, yPos);
    doc.text(row[1], xPos + annualColWidths[0] + 2, yPos);
    yPos += 7;
  });
  
  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  // Save PDF
  const fileName = `Strategic_Planning_${userName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}

interface UnitSummaryPDFData {
  unitManager: string;
  agencyName: string;
  goals: StrategicPlanningGoal[];
}

export function generateUnitSummaryPDF(data: UnitSummaryPDFData): void {
  const { unitManager, agencyName, goals } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;
  
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
  };
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(211, 17, 69);
  doc.setFont('helvetica', 'bold');
  doc.text('Unit Summary Report 2026', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Unit Info
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Unit Information', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Unit Manager: ${unitManager}`, margin, yPos);
  yPos += 6;
  doc.text(`Agency: ${agencyName}`, margin, yPos);
  yPos += 6;
  doc.text(`Total Members: ${goals.length}`, margin, yPos);
  yPos += 10;
  
  // Calculate totals
  const totals = goals.reduce((acc, goal) => {
    acc.manpower += goal.annualManpower || 0;
    acc.fyp += goal.annualFYP || 0;
    acc.fyc += goal.annualFYC || 0;
    acc.income += goal.annualIncome || 0;
    acc.newRecruits += (goal.q1?.newRecruits || 0) + (goal.q2?.newRecruits || 0) + 
                       (goal.q3?.newRecruits || 0) + (goal.q4?.newRecruits || 0);
    return acc;
  }, { manpower: 0, fyp: 0, fyc: 0, income: 0, newRecruits: 0 });
  
  // Summary Totals
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Unit Totals', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const summaryRows = [
    ['Total Manpower', totals.manpower.toString()],
    ['Total New Recruits', totals.newRecruits.toString()],
    ['Total Annual FYP', `₱${totals.fyp.toLocaleString()}`],
    ['Total Annual FYC', `₱${totals.fyc.toLocaleString()}`],
    ['Total Annual Income', `₱${totals.income.toLocaleString()}`],
  ];
  
  const colWidths = [100, 80];
  let xPos = margin;
  
  doc.setFillColor(211, 17, 69);
  doc.rect(xPos, yPos - 5, colWidths[0], 7, 'F');
  doc.rect(xPos + colWidths[0], yPos - 5, colWidths[1], 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Metric', xPos + 2, yPos);
  doc.text('Total', xPos + colWidths[0] + 2, yPos);
  yPos += 7;
  
  doc.setDrawColor(200, 200, 200);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  summaryRows.forEach((row) => {
    checkPageBreak(8);
    doc.rect(xPos, yPos - 5, colWidths[0], 7);
    doc.rect(xPos + colWidths[0], yPos - 5, colWidths[1], 7);
    doc.text(row[0], xPos + 2, yPos);
    doc.text(row[1], xPos + colWidths[0] + 2, yPos);
    yPos += 7;
  });
  
  yPos += 10;
  
  // Individual Members Table
  checkPageBreak(30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Individual Members', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  const memberColWidths = [50, 30, 35, 35];
  xPos = margin;
  
  // Header
  doc.setFillColor(211, 17, 69);
  doc.rect(xPos, yPos - 5, memberColWidths[0], 7, 'F');
  doc.rect(xPos + memberColWidths[0], yPos - 5, memberColWidths[1], 7, 'F');
  doc.rect(xPos + memberColWidths[0] + memberColWidths[1], yPos - 5, memberColWidths[2], 7, 'F');
  doc.rect(xPos + memberColWidths[0] + memberColWidths[1] + memberColWidths[2], yPos - 5, memberColWidths[3], 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Name', xPos + 2, yPos);
  doc.text('Rank', xPos + memberColWidths[0] + 2, yPos);
  doc.text('FYP', xPos + memberColWidths[0] + memberColWidths[1] + 2, yPos);
  doc.text('FYC', xPos + memberColWidths[0] + memberColWidths[1] + memberColWidths[2] + 2, yPos);
  yPos += 7;
  
  doc.setDrawColor(200, 200, 200);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  goals.forEach((goal) => {
    checkPageBreak(10);
    xPos = margin;
    doc.rect(xPos, yPos - 5, memberColWidths[0], 7);
    doc.text(goal.userName.length > 20 ? goal.userName.substring(0, 17) + '...' : goal.userName, xPos + 2, yPos);
    
    xPos += memberColWidths[0];
    doc.rect(xPos, yPos - 5, memberColWidths[1], 7);
    doc.text(goal.userRank, xPos + 2, yPos);
    
    xPos += memberColWidths[1];
    doc.rect(xPos, yPos - 5, memberColWidths[2], 7);
    doc.text(`₱${Math.round(goal.annualFYP).toLocaleString()}`, xPos + 2, yPos);
    
    xPos += memberColWidths[2];
    doc.rect(xPos, yPos - 5, memberColWidths[3], 7);
    doc.text(`₱${Math.round(goal.annualFYC).toLocaleString()}`, xPos + 2, yPos);
    
    yPos += 7;
  });
  
  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
  
  const fileName = `Unit_Summary_${unitManager.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}

interface SUMSummaryPDFData {
  sumName: string;
  agencyName: string;
  goals: StrategicPlanningGoal[];
}

export function generateSUMSummaryPDF(data: SUMSummaryPDFData): void {
  const { sumName, agencyName, goals } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;
  
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
  };
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(211, 17, 69);
  doc.setFont('helvetica', 'bold');
  doc.text('SUM Summary Report 2026', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // SUM Info
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('SUM Information', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`SUM: ${sumName}`, margin, yPos);
  yPos += 6;
  doc.text(`Agency: ${agencyName}`, margin, yPos);
  yPos += 6;
  doc.text(`Total Members: ${goals.length}`, margin, yPos);
  yPos += 10;
  
  // Calculate totals
  const totals = goals.reduce((acc, goal) => {
    acc.manpower += goal.annualManpower || 0;
    acc.fyp += goal.annualFYP || 0;
    acc.fyc += goal.annualFYC || 0;
    acc.income += goal.annualIncome || 0;
    acc.newRecruits += (goal.q1?.newRecruits || 0) + (goal.q2?.newRecruits || 0) + 
                       (goal.q3?.newRecruits || 0) + (goal.q4?.newRecruits || 0);
    return acc;
  }, { manpower: 0, fyp: 0, fyc: 0, income: 0, newRecruits: 0 });
  
  // Summary Totals
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SUM Totals', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const summaryRows = [
    ['Total Manpower', totals.manpower.toString()],
    ['Total New Recruits', totals.newRecruits.toString()],
    ['Total Annual FYP', `₱${totals.fyp.toLocaleString()}`],
    ['Total Annual FYC', `₱${totals.fyc.toLocaleString()}`],
    ['Total Annual Income', `₱${totals.income.toLocaleString()}`],
  ];
  
  const colWidths = [100, 80];
  let xPos = margin;
  
  doc.setFillColor(211, 17, 69);
  doc.rect(xPos, yPos - 5, colWidths[0], 7, 'F');
  doc.rect(xPos + colWidths[0], yPos - 5, colWidths[1], 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Metric', xPos + 2, yPos);
  doc.text('Total', xPos + colWidths[0] + 2, yPos);
  yPos += 7;
  
  doc.setDrawColor(200, 200, 200);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  summaryRows.forEach((row) => {
    checkPageBreak(8);
    doc.rect(xPos, yPos - 5, colWidths[0], 7);
    doc.rect(xPos + colWidths[0], yPos - 5, colWidths[1], 7);
    doc.text(row[0], xPos + 2, yPos);
    doc.text(row[1], xPos + colWidths[0] + 2, yPos);
    yPos += 7;
  });
  
  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
  
  const fileName = `SUM_Summary_${sumName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}

interface AgencySummaryPDFData {
  agencyName: string;
  goals: StrategicPlanningGoal[];
  aggregatedData?: {
    totalUsers: number;
    totalManpower: number;
    totalNewRecruits: number;
    totalFYP: number;
    totalFYC: number;
    totalIncome: number;
  };
}

export function generateAgencySummaryPDF(data: AgencySummaryPDFData): void {
  const { agencyName, goals, aggregatedData } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;
  
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }
  };
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(211, 17, 69);
  doc.setFont('helvetica', 'bold');
  doc.text('Agency Summary Report 2026', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Agency Info
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Agency Information', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Agency: ${agencyName}`, margin, yPos);
  yPos += 6;
  doc.text(`Total Members: ${aggregatedData?.totalUsers || goals.length}`, margin, yPos);
  yPos += 10;
  
  // Summary Totals
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Agency Totals', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const totals = aggregatedData || {
    totalUsers: goals.length,
    totalManpower: goals.reduce((sum, g) => sum + (g.annualManpower || 0), 0),
    totalNewRecruits: goals.reduce((sum, g) => sum + (g.q1?.newRecruits || 0) + (g.q2?.newRecruits || 0) + (g.q3?.newRecruits || 0) + (g.q4?.newRecruits || 0), 0),
    totalFYP: goals.reduce((sum, g) => sum + (g.annualFYP || 0), 0),
    totalFYC: goals.reduce((sum, g) => sum + (g.annualFYC || 0), 0),
    totalIncome: goals.reduce((sum, g) => sum + (g.annualIncome || 0), 0),
  };
  
  const summaryRows = [
    ['Total Manpower', totals.totalManpower.toString()],
    ['Total New Recruits', totals.totalNewRecruits.toString()],
    ['Total Annual FYP', `₱${totals.totalFYP.toLocaleString()}`],
    ['Total Annual FYC', `₱${totals.totalFYC.toLocaleString()}`],
    ['Total Annual Income', `₱${totals.totalIncome.toLocaleString()}`],
  ];
  
  const colWidths = [100, 80];
  let xPos = margin;
  
  doc.setFillColor(211, 17, 69);
  doc.rect(xPos, yPos - 5, colWidths[0], 7, 'F');
  doc.rect(xPos + colWidths[0], yPos - 5, colWidths[1], 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Metric', xPos + 2, yPos);
  doc.text('Total', xPos + colWidths[0] + 2, yPos);
  yPos += 7;
  
  doc.setDrawColor(200, 200, 200);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  summaryRows.forEach((row) => {
    checkPageBreak(8);
    doc.rect(xPos, yPos - 5, colWidths[0], 7);
    doc.rect(xPos + colWidths[0], yPos - 5, colWidths[1], 7);
    doc.text(row[0], xPos + 2, yPos);
    doc.text(row[1], xPos + colWidths[0] + 2, yPos);
    yPos += 7;
  });
  
  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
  
  const fileName = `Agency_Summary_${agencyName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}

