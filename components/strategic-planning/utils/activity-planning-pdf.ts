import jsPDF from 'jspdf';
import { marked } from 'marked';

interface ActivityPlanningPDFData {
  leaderName: string;
  rank: string;
  agency: string;
  content: string; // Markdown content from AI
  personalFYC: number;
  activeRecruits: number;
  tenuredCount: number;
  tenuredProd: number;
  newCount: number;
  newProd: number;
  persistency: number;
}

/**
 * Convert markdown to plain text for PDF (removing HTML tags)
 */
function markdownToPlainText(markdown: string): string {
  // Convert markdown to HTML first
  const html = marked(markdown) as string;
  // Remove HTML tags and convert entities
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  return text;
}

/**
 * Split text into lines that fit within page width
 */
function splitTextIntoLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const words = text.split(' ');
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = doc.getTextWidth(testLine);

    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Add section title to PDF
 */
function addSectionTitle(doc: jsPDF, title: string, yPos: number, margin: number): number {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(211, 17, 69); // AIA Red
  doc.text(title, margin, yPos);
  return yPos + 8;
}

/**
 * Add regular text to PDF
 */
function addText(doc: jsPDF, text: string, yPos: number, margin: number, pageWidth: number, pageHeight: number): number {
  const maxWidth = pageWidth - (margin * 2);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const lines = splitTextIntoLines(doc, text, maxWidth);
  let currentY = yPos;

  for (const line of lines) {
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = margin;
    }
    doc.text(line, margin, currentY);
    currentY += 6;
  }

  return currentY + 3;
}

/**
 * Generate PDF for Activity Planning
 */
export function generateActivityPlanningPDF(data: ActivityPlanningPDFData): void {
  const { leaderName, rank, agency, content, personalFYC, activeRecruits, tenuredCount, tenuredProd, newCount, newProd, persistency } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(211, 17, 69); // AIA Red
  doc.setFont('helvetica', 'bold');
  doc.text('AI Assisted Activity Planning', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Overview Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Leader Profile', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${leaderName}`, margin, yPos);
  yPos += 6;
  doc.text(`Rank: ${rank}`, margin, yPos);
  yPos += 6;
  doc.text(`Agency: ${agency}`, margin, yPos);
  yPos += 10;

  // Performance Metrics Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Current Performance Metrics', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const monthlyTeamFYC = (tenuredCount * tenuredProd) + (newCount * newProd);
  
  const metrics = [
    `Personal Monthly FYC: ₱${personalFYC.toLocaleString()}`,
    `Active New Recruits: ${activeRecruits}`,
    `Tenured Team Count: ${tenuredCount} advisors`,
    `Tenured Team Avg Monthly FYC: ₱${tenuredProd.toLocaleString()}`,
    `New Recruits Count: ${newCount} advisors`,
    `New Recruits Avg Monthly FYC: ₱${newProd.toLocaleString()}`,
    `Monthly Team FYC: ₱${monthlyTeamFYC.toLocaleString()}`,
    `Team Persistency: ${persistency}%`,
  ];

  metrics.forEach((metric) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(metric, margin, yPos);
    yPos += 6;
  });

  yPos += 5;

  // Activity Plan Content - Parse markdown sections
  const lines = content.split('\n');
  let currentSection = '';
  let currentSectionTitle = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this is a markdown header (## or ###)
    if (line.startsWith('##')) {
      // Save previous section if it exists
      if (currentSectionTitle && currentSection) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }
        yPos = addSectionTitle(doc, currentSectionTitle, yPos, margin);
        yPos = addText(doc, currentSection.trim(), yPos, margin, pageWidth, pageHeight);
      }
      
      // Start new section
      currentSectionTitle = line.replace(/^#+\s*/, '').trim();
      currentSection = '';
    } else if (line.length > 0) {
      // Add line to current section
      currentSection += (currentSection ? ' ' : '') + line;
    } else if (line.length === 0 && currentSection) {
      // Empty line - add space between paragraphs
      currentSection += '\n\n';
    }
  }
  
  // Don't forget the last section
  if (currentSectionTitle && currentSection) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }
    yPos = addSectionTitle(doc, currentSectionTitle, yPos, margin);
    yPos = addText(doc, currentSection.trim(), yPos, margin, pageWidth, pageHeight);
  }

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
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      margin,
      pageHeight - 10
    );
  }

  // Save PDF
  const fileName = `Activity_Plan_${leaderName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}

