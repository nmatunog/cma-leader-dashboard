import type { Leader, Agent, AgencySummary, SheetType } from '@/types';
import { findBestAnpColumn } from './ai-column-matcher';

// Parse CSV text into rows
function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentValue.trim());
      currentValue = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentValue || currentLine.length > 0) {
        currentLine.push(currentValue.trim());
        if (currentLine.some((val) => val !== '')) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentValue = '';
      }
    } else {
      currentValue += char;
    }
  }

  if (currentValue || currentLine.length > 0) {
    currentLine.push(currentValue.trim());
    if (currentLine.some((val) => val !== '')) {
      lines.push(currentLine);
    }
  }

  return lines;
}

// Helper function to check if a row looks like a header row
function isHeaderRow(row: string[], headers: string[]): boolean {
  if (!row || row.length === 0) return false;
  
  const firstCell = (row[0] || '').toLowerCase().trim();
  const secondCell = (row[1] || '').toLowerCase().trim();
  
  // STRICT header patterns - only exact matches or very specific patterns
  // Don't match generic words like "name" that could be in actual data
  const strictHeaderPatterns = [
    'agency_name', 'leader_um_name', 'leader um name', 'leaderumname',
    'anp_mtd', 'anp mtd', 'anpmtd',
    'fypi_mtd', 'fyp mtd', 'fypmtd',
    'fyc_mtd', 'fyc mtd', 'fycmtd',
    'casecnt_mtd', 'casecnt mtd', 'casecnt',
    'manpowercn', 'manpower count',
    'total', 'summary', 'grand total', 'subtotal',
    '#', 'no.', 'number', 'id', 'row'
  ];
  
  // Check if first cell EXACTLY matches header patterns (not just contains)
  // This prevents matching leader names that happen to contain these words
  const firstCellMatches = strictHeaderPatterns.some(pattern => {
    // Exact match or starts with pattern followed by space/underscore
    return firstCell === pattern || 
           firstCell.startsWith(pattern + ' ') ||
           firstCell.startsWith(pattern + '_') ||
           firstCell === pattern.replace(/_/g, ' ').replace(/\s+/g, ' ');
  });
  
  if (firstCellMatches) {
    return true;
  }
  
  // Check if row matches the header row exactly (case-insensitive)
  // But be more lenient - allow some differences
  if (row.length === headers.length) {
    let exactMatches = 0;
    let emptyMatches = 0;
    let totalCells = 0;
    
    row.forEach((cell, index) => {
      const cellLower = (cell || '').toLowerCase().trim();
      const headerLower = (headers[index] || '').toLowerCase().trim();
      totalCells++;
      
      if (cellLower === headerLower) {
        exactMatches++;
      } else if (cellLower === '' || headerLower === '') {
        emptyMatches++;
      }
    });
    
    // If more than 50% of cells match exactly, it's likely a header row
    // But also check that we have at least 3 non-empty matching cells
    if (exactMatches >= Math.max(3, totalCells * 0.5)) {
      return true;
    }
  }
  
  // Check if all cells look like headers (text only, no numbers that look like data)
  // But be more strict - require multiple header-like cells
  const headerLikeCells = row.filter(cell => {
    const cellTrimmed = (cell || '').trim();
    if (cellTrimmed === '') return false;
    // If it's a number that looks like data (not a header), it's not a header row
    if (/^\d+([.,]\d+)?$/.test(cellTrimmed)) return false;
    // If it contains common header words
    return /^(um\s*name|leader|agent|anp|fyp|fyc|case|manpower|total|summary|mtd|ytd|qtd|count|percent|persistency)/i.test(cellTrimmed);
  });
  
  // Require at least 3 header-like cells to be considered a header row
  return headerLikeCells.length >= 3;
}

// Helper function to find column value by multiple possible names (case-insensitive)
function findColumnValue(rowData: Record<string, string>, possibleNames: string[]): string {
  const normalizedData: Record<string, string> = {};
  Object.keys(rowData).forEach(key => {
    // Normalize key: lowercase, trim, remove trailing apostrophes, and replace & with _ for matching
    const normalizedKey = key.toLowerCase().trim().replace(/'$/, '').replace(/&/g, '_');
    normalizedData[normalizedKey] = rowData[key];
  });
  
  for (const name of possibleNames) {
    // Normalize name: lowercase, trim, remove trailing apostrophes, and replace & with _ for matching
    const normalizedName = name.toLowerCase().trim().replace(/'$/, '').replace(/&/g, '_');
    if (normalizedData[normalizedName]) {
      // Remove commas from numbers (e.g., "3,430,346.20" -> "3430346.20")
      return normalizedData[normalizedName].replace(/,/g, '');
    }
  }
  return '';
}

// Map CSV row to Leader object
// Returns leader and scoring info
// dataStartColumn: The absolute column index where data starts (e.g., Column M = 12)
function mapRowToLeader(headers: string[], row: string[], dataStartColumn: number = 12): { leader: Leader | null; scoringInfo?: any } {
  const rowData: Record<string, string> = {};
  headers.forEach((header, index) => {
    rowData[header] = row[index] || '';
  });

  // Try multiple possible column names for leader name (case-insensitive)
  // Your sheet uses: LEADER_UM_NAME (Row 5, Column M)
  const leaderName = findColumnValue(rowData, [
    'LEADER_UM_NAME', 'LEADER UM NAME', 'LEADERUMNAME',
    'UM NAME', 'UM Name', 'UM_NAME', 'UMName', 
    'Leader Name', 'LEADER NAME', 'LEADER_NAME',
    'LeaderName', 'AGENT NAME', 'AGENT_NAME', 'Agent Name', 'Name', 'NAME'
  ]);

  if (!leaderName.trim()) {
    return { leader: null };
  }

  // IDEAL APPROACH: Find ANP column by header name matching, NOT by position
  // Strategy:
  // 1. First, find ALL columns that contain "ANP" and "MTD" together (exclude FYC/FYP)
  // 2. If multiple found, prefer exact matches like "ANP_MTD"
  // 3. Verify it's NOT FYC_MTD by checking header doesn't contain "FYC"
  // 4. Only use position as absolute last resort, and verify it's not FYC
  
  let anpActual = 0;
  let anpSource = '';
  let anpColumnIndex = -1;
  
  // Step 1: Find all potential ANP columns by searching headers
  // Also find FYC column first to compare values
  let fycMtdIndex = headers.findIndex(h => {
    if (!h) return false;
    const hLower = h.toLowerCase().trim();
    return (hLower.includes('fyc') && hLower.includes('mtd')) ||
           hLower === 'fyc_mtd' || hLower === 'fyc mtd' || hLower === 'fycmtd';
  });
  
  // If not found, try searching for just "FYC" columns
  if (fycMtdIndex < 0) {
    const fycColumns = headers.map((h, idx) => ({ index: idx, header: h })).filter(({ header }) => {
      if (!header) return false;
      const hLower = header.toLowerCase();
      return hLower.includes('fyc') && !hLower.includes('fyp');
    });
    if (fycColumns.length > 0) {
      fycMtdIndex = fycColumns[0].index;
    }
  }
  
  const fycValue = fycMtdIndex >= 0 ? parseFloat((rowData[headers[fycMtdIndex]] || '').replace(/,/g, '')) || 0 : 0;
  
  const potentialAnpColumns: Array<{ index: number; header: string; score: number; value: number }> = [];
  
  headers.forEach((header, index) => {
    if (!header) return;
    const headerLower = header.toLowerCase().trim();
    const value = parseFloat((rowData[header] || '').replace(/,/g, '')) || 0;
    
    // Skip if value is zero or header contains FYC/FYP
    if (value === 0 || headerLower.includes('fyc') || headerLower.includes('fyp')) {
      return;
    }
    
    // Score based on how well it matches ANP_MTD
    let score = 0;
    
    // Exact match gets highest score
    // Handle various formats: ANP_MTD, ANP MTD, ANPMTD, etc.
    const normalizedHeader = headerLower.replace(/[\s_\-]/g, '');
    if (normalizedHeader === 'anpmtd' || headerLower === 'anp_mtd' || headerLower === 'anp mtd' || headerLower === 'anpmtd') {
      score = 100;
    }
    // Contains both ANP and MTD (but not MANPOWER)
    else if (headerLower.includes('anp') && headerLower.includes('mtd') && !headerLower.includes('manpower')) {
      score = 80;
    }
    // Contains ANP (but not MANPOWER) - lower score
    else if (headerLower.includes('anp') && !headerLower.includes('manpower')) {
      score = 40;
    }
    // Just "MTD" - check context (next column should be YTD for ANP)
    else if (headerLower === 'mtd' && headers[index + 1]) {
      const nextHeader = (headers[index + 1] || '').toLowerCase();
      if (nextHeader.includes('ytd') && !nextHeader.includes('fyc') && !nextHeader.includes('fyp')) {
        score = 30; // Lower score, but acceptable if context is right
      }
    }
    // Empty header but value exists - might be ANP if value is high enough and context is right
    // Column O (index 2) should have empty header but next column (index 3) should be YTD
    else if (headerLower === '' && value > 0) {
      // Check if this is Column O (index 2) with YTD next (ANP_YTD context)
      const nextHeader = (headers[index + 1] || '').toLowerCase();
      if (nextHeader.includes('ytd') && !nextHeader.includes('fyc') && !nextHeader.includes('fyp')) {
        score = 25; // Lower score for empty header, but check value comparison
        // If this is index 2 (Column O), give it a bit more score since we know that's where ANP should be
        if (index === 2) {
          score = 35; // Higher score for Column O position
        }
      }
    }
    
    // Bonus: If we have FYC value, prefer columns with values higher than FYC (ANP is typically higher)
    if (score > 0 && fycValue > 0) {
      if (value > fycValue * 1.5) {
        // Value is significantly higher than FYC - likely ANP
        score += 20; // Bonus points
        console.log(`  Column ${index} ("${header}") value ${value} is ${(value / fycValue).toFixed(1)}x higher than FYC (${fycValue}) - likely ANP`);
      } else if (Math.abs(value - fycValue) < 1) {
        // Value matches FYC exactly - this is probably FYC, not ANP
        score = 0; // Reject it
        console.log(`  Column ${index} ("${header}") value ${value} matches FYC (${fycValue}) - rejecting as FYC`);
      } else if (value < fycValue) {
        // Value is lower than FYC - unlikely to be ANP
        score -= 10; // Penalty
        console.log(`  Column ${index} ("${header}") value ${value} is lower than FYC (${fycValue}) - unlikely ANP`);
      }
    }
    
    // If no FYC found but we have multiple MTD columns, prefer ones with higher values
    // (ANP is typically one of the highest MTD values)
    if (score > 0 && fycValue === 0 && headerLower.includes('mtd')) {
      // This is a fallback - if we can't compare with FYC, at least prefer higher values
      // But this is less reliable, so don't add too much bonus
      if (value > 50000) {
        score += 5; // Small bonus for high values
      }
    }
    
    if (score > 0) {
      potentialAnpColumns.push({ index, header, score, value });
    }
  });
  
  // Step 2: Sort by score (highest first) and use the best match
  potentialAnpColumns.sort((a, b) => b.score - a.score);
  
  // Store scoring info for debug output
  const anpScoringInfo: any = {
    potentialColumns: potentialAnpColumns.slice(0, 10).map(c => ({
      index: c.index,
      header: c.header,
      score: c.score,
      value: c.value,
    })),
    bestMatch: null as { index: number; header: string; score: number; value: number } | null,
    fycValue: fycValue,
    fycIndex: fycMtdIndex,
    __useAIMatching: false, // Will be set later if AI matching is needed
  };
  
  if (potentialAnpColumns.length > 0) {
    const bestMatch = potentialAnpColumns[0];
    anpColumnIndex = bestMatch.index;
    anpActual = parseFloat((rowData[headers[bestMatch.index]] || '').replace(/,/g, '')) || 0;
    anpSource = `Header match (score ${bestMatch.score}): Column ${bestMatch.index} ("${bestMatch.header}")`;
    anpScoringInfo.bestMatch = bestMatch;
    console.log(`✓ Found ANP column: ${anpSource}, value: ${anpActual}`);
    
    // Log other potential matches for debugging
    if (potentialAnpColumns.length > 1) {
      console.log(`  Other potential ANP columns found:`, potentialAnpColumns.slice(1, 4).map(c => 
        `Column ${c.index} ("${c.header}", score ${c.score})`
      ).join(', '));
    }
  } else {
    console.log(`⚠️ No ANP column found by header matching. Available headers:`, headers.slice(0, 10).join(', '));
    
    // AI FALLBACK: Try AI-enhanced matching if traditional matching failed
    console.log(`🤖 Attempting AI-enhanced column matching...`);
  }
  
  // Step 3: Verify we're NOT reading from FYC_MTD
  // Search more broadly for FYC columns (might be named differently in CSV)
  let shouldUseAI = anpActual === 0; // Start with true if no ANP found
  
  if (anpActual > 0) {
    // Try multiple patterns to find FYC_MTD
    let fycMtdIndex = headers.findIndex(h => {
      if (!h) return false;
      const hLower = h.toLowerCase().trim();
      return (hLower.includes('fyc') && hLower.includes('mtd')) ||
             hLower === 'fyc_mtd' || hLower === 'fyc mtd' || hLower === 'fycmtd';
    });
    
    // If not found, try searching for just "FYC" columns
    if (fycMtdIndex < 0) {
      // Look for columns that contain "FYC" but not "FYP" (to avoid matching FYP columns)
      const fycColumns = headers.map((h, idx) => ({ index: idx, header: h })).filter(({ header }) => {
        if (!header) return false;
        const hLower = header.toLowerCase();
        return hLower.includes('fyc') && !hLower.includes('fyp');
      });
      
      if (fycColumns.length > 0) {
        // Use the first FYC column found (might be FYC_MTD, FYC_QTD, or FYC_YTD)
        fycMtdIndex = fycColumns[0].index;
        console.log(`⚠️ FYC_MTD not found, but found FYC column at index ${fycMtdIndex}: "${fycColumns[0].header}"`);
      }
    }
    
    if (fycMtdIndex >= 0) {
      const fycValue = parseFloat((rowData[headers[fycMtdIndex]] || '').replace(/,/g, '')) || 0;
      if (Math.abs(fycValue - anpActual) < 1) {
        console.error(`⚠️ ERROR: ANP value (${anpActual}) matches FYC value (${fycValue})!`);
        console.error(`   ANP column: ${anpColumnIndex} ("${headers[anpColumnIndex]}")`);
        console.error(`   FYC column: ${fycMtdIndex} ("${headers[fycMtdIndex]}")`);
        console.error(`   We are reading from the wrong column! Rejecting this value.`);
        // Don't use this value - it's likely FYC
        anpActual = 0;
        anpSource = '';
        anpColumnIndex = -1;
        shouldUseAI = true; // Trigger AI matching
        // Also clear the best match from scoring info
        if (anpScoringInfo.bestMatch && anpScoringInfo.bestMatch.index === anpColumnIndex) {
          anpScoringInfo.bestMatch = null;
        }
      } else {
        console.log(`✓ Verified: ANP value (${anpActual}) differs from FYC value (${fycValue})`);
        // ANP should typically be higher than FYC (FYC is usually 25% of FYP, ANP is higher)
        if (anpActual < fycValue) {
          console.warn(`⚠️ WARNING: ANP value (${anpActual}) is LOWER than FYC value (${fycValue})!`);
          console.warn(`   This is unusual - ANP should typically be higher than FYC.`);
          console.warn(`   Will use AI matching to verify...`);
          shouldUseAI = true; // Use AI to double-check
        }
      }
    } else {
      console.log(`⚠️ FYC column not found - cannot verify ANP value is correct`);
      console.log(`   Available headers containing "FYC":`, headers.filter(h => h && h.toLowerCase().includes('fyc')).slice(0, 5));
      // If we can't find FYC, use AI to help identify the right column
      shouldUseAI = true;
    }
  } else {
    // No ANP found by traditional matching
    shouldUseAI = true;
  }
  
  // Mark for AI matching if needed (store in scoring info so it can be accessed later)
  anpScoringInfo.__useAIMatching = shouldUseAI;
  (rowData as any).__anpScoringInfo = anpScoringInfo;
  
  // Step 4: Only use position fallback if header matching completely failed
  // AND verify it's not FYC
  if (anpActual === 0 && headers.length > 2) {
    const colOHeader = headers[2] || '';
    const colOHeaderLower = colOHeader.toLowerCase();
    const colOValue = parseFloat((rowData[headers[2]] || '').replace(/,/g, '')) || 0;
    
    // Only use if:
    // 1. Value is non-zero
    // 2. Header doesn't contain FYC/FYP
    // 3. Header contains ANP or is MTD with YTD context
    const colPHeader = headers[3] || '';
    const hasYtdNext = colPHeader.toLowerCase().includes('ytd');
    const looksLikeAnp = colOHeaderLower.includes('anp') || 
                         (colOHeaderLower === 'mtd' && hasYtdNext);
    
    if (colOValue > 0 && !colOHeaderLower.includes('fyc') && !colOHeaderLower.includes('fyp') && looksLikeAnp) {
      // Double-check it's not FYC by comparing with FYC_MTD value
      const fycMtdIndex = headers.findIndex(h => {
        if (!h) return false;
        const hLower = h.toLowerCase();
        return hLower.includes('fyc') && hLower.includes('mtd');
      });
      
      if (fycMtdIndex >= 0) {
        const fycValue = parseFloat((rowData[headers[fycMtdIndex]] || '').replace(/,/g, '')) || 0;
        if (Math.abs(fycValue - colOValue) < 1) {
          console.error(`⚠️ ERROR: Column O value (${colOValue}) matches FYC_MTD (${fycValue})! Skipping position fallback.`);
        } else {
          anpActual = colOValue;
          anpColumnIndex = 2;
          anpSource = `Position fallback: Column O (index 2), header="${colOHeader}"`;
          console.log(`✓ Using position fallback: ${anpSource}, value: ${anpActual}`);
        }
      } else {
        anpActual = colOValue;
        anpColumnIndex = 2;
        anpSource = `Position fallback: Column O (index 2), header="${colOHeader}"`;
        console.log(`✓ Using position fallback: ${anpSource}, value: ${anpActual}`);
      }
    }
  }
  
  // Log final result
  if (anpActual > 0) {
    console.log(`Final ANP value: ${anpActual} from ${anpSource}`);
  } else {
    console.warn(`⚠️ Could not find ANP value for leader: ${leaderName}`);
  }
  
  // Get scoring info before returning
  const finalScoringInfo = (rowData as any).__anpScoringInfo;
  
  // Extract NEW_RECRUIT for New Recruits (recruitsActual)
  // This is separate from CASECNT_MTD which is for Total Cases
  const recruitsActualStr = findColumnValue(rowData, [
    'NEW_RECRUIT', 'NEW_RECRUITS', 'NEW_RECRUIT_MTD', 'NEW_RECRUIT MTD',
    'NEW_RECRUITS_FTM', 'NEW_RECRUIT_YTD', 'NEW_RECRUITS_YTD',
    'New Recruit', 'New Recruits', 'Recruits' // Fallback
  ]);
  const recruitsActual = parseFloat(recruitsActualStr || '0') || 0;
  
  // Extract CASECNT_MTD for Total Cases (casesActual)
  // Note: CASECNT_MTD is in Column CD (absolute index 82)
  // Relative index from dataStartColumn: 82 - dataStartColumn
  let casesActualStr = findColumnValue(rowData, [
    'CASECNT_MTD', 'CASECNT MTD', 'CASECNT_YTD', 'CASECNT YTD',
    'CASECNT_EX_AH_MTD', 'CASECNT_EX_AH_YTD',
    'Cases MTD', 'Cases_MTD', 'CASECNT', 'Cases' // Fallback
  ]);
  
  // If not found by name, try Column CD position (absolute index 82)
  // Column CD relative index = 82 - dataStartColumn
  if (!casesActualStr) {
    const columnCDRelativeIndex = 82 - dataStartColumn;
    if (columnCDRelativeIndex >= 0 && columnCDRelativeIndex < headers.length && columnCDRelativeIndex < row.length) {
      const cdValue = row[columnCDRelativeIndex] || '';
      const cdHeader = headers[columnCDRelativeIndex] || '';
      if (cdValue && cdValue.trim() !== '') {
        console.log(`  Using Column CD (absolute index 82, relative index ${columnCDRelativeIndex}, header "${cdHeader}") as CASECNT_MTD fallback, value: "${cdValue}"`);
        casesActualStr = cdValue;
      } else {
        console.log(`  Column CD (index ${columnCDRelativeIndex}) exists but value is empty: "${cdValue}"`);
      }
    } else {
      console.log(`  Column CD (relative index ${columnCDRelativeIndex}) is out of range (headers.length=${headers.length}, row.length=${row.length})`);
    }
  }
  
  const casesActual = parseFloat(casesActualStr || '0') || 0;
  
  // Log if new recruits not found (for debugging)
  if (recruitsActual === 0 && leaderName.trim()) {
    const newRecruitColIndex = headers.findIndex(h => {
      if (!h) return false;
      const hLower = h.toLowerCase().trim();
      return hLower.includes('new') && (hLower.includes('recruit') || hLower.includes('rec'));
    });
    if (newRecruitColIndex >= 0) {
      const newRecruitValue = parseFloat((rowData[headers[newRecruitColIndex]] || '').replace(/,/g, '')) || 0;
      console.log(`  New Recruit column found at index ${newRecruitColIndex} ("${headers[newRecruitColIndex]}"), value: ${newRecruitValue}`);
      if (newRecruitValue > 0) {
        console.log(`  ⚠️ WARNING: New Recruit column has value ${newRecruitValue} but wasn't matched by findColumnValue!`);
      }
    }
  }
  
  // Log if cases not found (for debugging)
  if (casesActual === 0 && leaderName.trim()) {
    const caseColIndex = headers.findIndex(h => {
      if (!h) return false;
      const hLower = h.toLowerCase().trim();
      return hLower.includes('casecnt') || (hLower.includes('case') && !hLower.includes('new'));
    });
    if (caseColIndex >= 0) {
      const caseValue = parseFloat((rowData[headers[caseColIndex]] || '').replace(/,/g, '')) || 0;
      console.log(`  Cases column found at index ${caseColIndex} ("${headers[caseColIndex]}"), value: ${caseValue}`);
      if (caseValue > 0) {
        console.log(`  ⚠️ WARNING: Cases column has value ${caseValue} but wasn't matched by findColumnValue!`);
      }
    }
  }

  // Extract FYP and FYC from Leaders sheet if available
  // Pass headers, row, and dataStartColumn for Column AA fallback
  console.log(`\n📊 Extracting FYP/FYC for leader: "${leaderName}"`);
  console.log(`  dataStartColumn=${dataStartColumn}, headers.length=${headers.length}, row.length=${row.length}`);
  const leaderMetrics = extractLeaderMetrics(rowData, headers, row, dataStartColumn);
  console.log(`  Extracted: FYP=${leaderMetrics.fypActual}, FYC=${leaderMetrics.fycActual}`);
  
  // Try multiple possible column names for Unit
  const unit = findColumnValue(rowData, [
    'Unit', 'UNIT', 'Unit Name', 'UNIT_NAME', 'UnitName'
  ]) || 'Unknown Unit';

  // Log extraction results for debugging (first few leaders only)
  if (leaderName.trim()) {
    console.log(`  Extracted for "${leaderName}": ANP=${anpActual}, Cases=${casesActual}, New Recruits=${recruitsActual}, FYP=${leaderMetrics.fypActual}, FYC=${leaderMetrics.fycActual}, ANP_YTD=${leaderMetrics.anpYtdActual}, FYP_YTD=${leaderMetrics.fypYtdActual}, FYC_YTD=${leaderMetrics.fycYtdActual}`);
  }

  return {
    leader: {
      id: leaderName.trim().toLowerCase().replace(/\s+/g, '-'),
      name: leaderName.trim(),
      unit: unit.trim(),
      anpActual,
      anpTarget: 1200000, // Default, will be updated via input
      recruitsActual, // NEW_RECRUIT - New Recruits
      recruitsTarget: 3, // Default, will be updated via input
      casesActual, // CASECNT_MTD - Total Cases
      fypActual: leaderMetrics.fypActual, // FYPI_MTD from Leaders sheet
      fycActual: leaderMetrics.fycActual, // FYC_MTD from Leaders sheet
      anpYtdActual: leaderMetrics.anpYtdActual, // ANP_YTD from Column P
      fypYtdActual: leaderMetrics.fypYtdActual, // FYP_YTD from Column AE
      fycYtdActual: leaderMetrics.fycYtdActual, // FYC_YTD from Column DF
      anpNovForecast: 0,
      anpDecForecast: 0,
      recNovForecast: 0,
      recDecForecast: 0,
    },
    scoringInfo: finalScoringInfo || undefined,
  };
}

// Extended Leader interface for calculation (includes FYP/FYC if available in Leaders sheet)
interface LeaderWithMetrics extends Leader {
  fypActual?: number;
  fycActual?: number;
}

// Helper function to convert Excel column letters to 1-based absolute index
// Examples: A=1, Z=26, AA=27, FC=159
function excelColumnToIndex(columnLetters: string): number {
  let result = 0;
  for (let i = 0; i < columnLetters.length; i++) {
    const char = columnLetters[i].toUpperCase();
    result = result * 26 + (char.charCodeAt(0) - 'A'.charCodeAt(0) + 1);
  }
  return result;
}

// Helper to extract FYP and FYC from Leaders row if available (MTD and YTD)
// dataStartColumn: The absolute column index where data starts (e.g., Column M = 12)
// headers: Array of header names (optional, for column position fallback)
// row: Array of row values (optional, for column position fallback)
function extractLeaderMetrics(
  rowData: Record<string, string>, 
  headers?: string[], 
  row?: string[], 
  dataStartColumn: number = 12
): { 
  fypActual: number; 
  fycActual: number;
  anpYtdActual: number;
  fypYtdActual: number;
  fycYtdActual: number;
} {
  // PRIORITY ORDER for FYP_MTD:
  // 1. Column FC (Oct 2025 FYP MTD) - absolute index 159
  // 2. Column FB (Sept 2025 FYP MTD) - absolute index 158
  // 3. Column AA (absolute index 27) - fallback
  // 4. Column 13 (relative index 13) - fallback
  let fypActualStr = '';
  let fypSource = '';
  
  // ALWAYS log that we're extracting FYP (even if headers/row are missing)
  console.log(`\n🔍🔍🔍 FYP_MTD EXTRACTION DEBUG - START 🔍🔍🔍`);
  console.log(`  extractLeaderMetrics called with: headers=${!!headers}, row=${!!row}, dataStartColumn=${dataStartColumn}`);
  
  if (headers && row) {
    console.log(`  dataStartColumn=${dataStartColumn}, headers.length=${headers.length}, row.length=${row.length}`);
    
    // Calculate column positions
    // Column FC = Oct 2025 FYP MTD (absolute index 159, 1-based)
    const columnFCAbsoluteIndex = excelColumnToIndex('FC'); // 159
    const columnFCRelativeIndex = columnFCAbsoluteIndex - dataStartColumn - 1; // Convert to 0-based relative index
    
    // Column FB = Sept 2025 FYP MTD (absolute index 158, 1-based)
    const columnFBAbsoluteIndex = excelColumnToIndex('FB'); // 158
    const columnFBRelativeIndex = columnFBAbsoluteIndex - dataStartColumn - 1; // Convert to 0-based relative index
    
    // Column AA (absolute index 27) - fallback
    const columnAAAbsoluteIndex = 27;
    const columnAARelativeIndex = columnAAAbsoluteIndex - dataStartColumn - 1;
    
    // Column 13 (relative index 13) - fallback
    const column13RelativeIndex = 13;
    const actualAbsoluteIndex13 = dataStartColumn + column13RelativeIndex;
    
    console.log(`  Column FC (Oct 2025) calculation: ${columnFCAbsoluteIndex} - ${dataStartColumn} - 1 = ${columnFCRelativeIndex} (relative)`);
    console.log(`  Column FB (Sept 2025) calculation: ${columnFBAbsoluteIndex} - ${dataStartColumn} - 1 = ${columnFBRelativeIndex} (relative)`);
    console.log(`  Column AA calculation: 27 - ${dataStartColumn} - 1 = ${columnAARelativeIndex} (relative)`);
    console.log(`  Column 13 calculation: relative index = ${column13RelativeIndex}, absolute = ${actualAbsoluteIndex13}`);
    
    // Check all positions
    let fcValue = '';
    let fcHeader = '';
    let fbValue = '';
    let fbHeader = '';
    let aaValue = '';
    let aaHeader = '';
    let col13Value = '';
    let col13Header = '';
    
    // Check Column FC (Oct 2025 FYP MTD) - HIGHEST PRIORITY
    if (columnFCRelativeIndex >= 0 && columnFCRelativeIndex < headers.length && columnFCRelativeIndex < row.length) {
      fcValue = row[columnFCRelativeIndex] || '';
      fcHeader = headers[columnFCRelativeIndex] || '';
      console.log(`  📊 Column FC (Oct 2025, relative ${columnFCRelativeIndex}, absolute ${columnFCAbsoluteIndex}): header="${fcHeader}", value="${fcValue}"`);
    }
    
    // Check Column FB (Sept 2025 FYP MTD) - SECOND PRIORITY
    if (columnFBRelativeIndex >= 0 && columnFBRelativeIndex < headers.length && columnFBRelativeIndex < row.length) {
      fbValue = row[columnFBRelativeIndex] || '';
      fbHeader = headers[columnFBRelativeIndex] || '';
      console.log(`  📊 Column FB (Sept 2025, relative ${columnFBRelativeIndex}, absolute ${columnFBAbsoluteIndex}): header="${fbHeader}", value="${fbValue}"`);
    }
    
    // Check Column AA (index 27) - FALLBACK
    if (columnAARelativeIndex >= 0 && columnAARelativeIndex < headers.length && columnAARelativeIndex < row.length) {
      aaValue = row[columnAARelativeIndex] || '';
      aaHeader = headers[columnAARelativeIndex] || '';
      console.log(`  📊 Column AA (relative ${columnAARelativeIndex}, absolute ${columnAAAbsoluteIndex}): header="${aaHeader}", value="${aaValue}"`);
    }
    
    // Check Column 13 (relative index 13) - FALLBACK
    if (column13RelativeIndex >= 0 && column13RelativeIndex < headers.length && column13RelativeIndex < row.length) {
      col13Value = row[column13RelativeIndex] || '';
      col13Header = headers[column13RelativeIndex] || '';
      console.log(`  📊 Column 13 (relative ${column13RelativeIndex}, absolute ${actualAbsoluteIndex13}): header="${col13Header}", value="${col13Value}"`);
    }
    
    // Check a range of columns around FC/FB positions for debugging
    const allFypIndices = [columnFCRelativeIndex, columnFBRelativeIndex, columnAARelativeIndex, column13RelativeIndex].filter(i => i >= 0);
    if (allFypIndices.length > 0) {
      const minIndex = Math.max(0, Math.min(...allFypIndices) - 2);
      const maxIndex = Math.min(headers.length - 1, Math.max(...allFypIndices) + 2);
      console.log(`  📊 Column values around FYP columns (FC/FB/AA/13):`);
      for (let i = minIndex; i <= maxIndex; i++) {
        const val = row[i] || '';
        const hdr = headers[i] || '';
        const absIdx = dataStartColumn + i;
        const parsed = parseFloat(val.replace(/,/g, '')) || 0;
        let marker = '';
        if (i === columnFCRelativeIndex) marker = ' 👈 COLUMN FC (Oct 2025)';
        if (i === columnFBRelativeIndex) marker += ' 👈 COLUMN FB (Sept 2025)';
        if (i === columnAARelativeIndex) marker += ' 👈 COLUMN AA';
        if (i === column13RelativeIndex) marker += ' 👈 COLUMN 13';
        console.log(`    Index ${i} (absolute ${absIdx}): header="${hdr}", value="${val}" (parsed: ${parsed})${marker}`);
      }
    }
    
    // Decide which column to use (PRIORITY ORDER):
    // 1. Column FC (Oct 2025 FYP MTD) - if it has a value
    // 2. Column FB (Sept 2025 FYP MTD) - if FC is empty
    // 3. Column 13 if it has "TOTAL FYP MTD" header
    // 4. Column AA if it has FYP-related content
    // 5. Fallback to whichever has a value
    
    const col13HasFypHeader = col13Header && (
      col13Header.toLowerCase().includes('total fyp mtd') ||
      col13Header.toLowerCase().includes('total mtd fy p') ||
      col13Header.toLowerCase().includes('total mtd fyp') ||
      col13Header.toLowerCase().includes('total fyp') ||
      (col13Header.toLowerCase().includes('fyp') && col13Header.toLowerCase().includes('mtd')) ||
      (col13Header.toLowerCase().includes('fyp') && col13Header.toLowerCase().includes('total'))
    );
    
    const aaHasFypHeader = aaHeader && (
      aaHeader.toLowerCase().includes('fyp') ||
      aaHeader.toLowerCase().includes('fypi')
    );
    
    // PRIORITY 1: Column FC (Oct 2025 FYP MTD)
    if (fcValue && fcValue.trim() !== '') {
      fypActualStr = fcValue;
      fypSource = `Column FC (Oct 2025 FYP MTD, relative index ${columnFCRelativeIndex}, absolute ${columnFCAbsoluteIndex}, header "${fcHeader}")`;
      console.log(`  ✅✅✅ Using Column FC (Oct 2025): header="${fcHeader}", value="${fcValue}"`);
    }
    // PRIORITY 2: Column FB (Sept 2025 FYP MTD) - if FC is empty
    else if (fbValue && fbValue.trim() !== '') {
      fypActualStr = fbValue;
      fypSource = `Column FB (Sept 2025 FYP MTD, relative index ${columnFBRelativeIndex}, absolute ${columnFBAbsoluteIndex}, header "${fbHeader}")`;
      console.log(`  ✅ Using Column FB (Sept 2025): header="${fbHeader}", value="${fbValue}"`);
    }
    // PRIORITY 3: Column 13 if it has "TOTAL FYP MTD" header
    else if (col13HasFypHeader && col13Value && col13Value.trim() !== '') {
      fypActualStr = col13Value;
      fypSource = `Column 13 (relative index ${column13RelativeIndex}, absolute ${actualAbsoluteIndex13}, header "${col13Header}")`;
      console.log(`  ✅ Using Column 13: header="${col13Header}", value="${col13Value}" (has "TOTAL FYP MTD" header)`);
    }
    // PRIORITY 4: Column AA if it has FYP-related content
    else if (aaHasFypHeader && aaValue && aaValue.trim() !== '') {
      fypActualStr = aaValue;
      fypSource = `Column AA (relative index ${columnAARelativeIndex}, absolute ${columnAAAbsoluteIndex}, header "${aaHeader}")`;
      console.log(`  ✅ Using Column AA: header="${aaHeader}", value="${aaValue}" (has FYP header)`);
    }
    // PRIORITY 5: Fallback to whichever has a value
    else if (col13Value && col13Value.trim() !== '') {
      fypActualStr = col13Value;
      fypSource = `Column 13 (relative index ${column13RelativeIndex}, absolute ${actualAbsoluteIndex13}, header "${col13Header}")`;
      console.log(`  ⚠️ Using Column 13: header="${col13Header}", value="${col13Value}" (fallback - has value)`);
    } else if (aaValue && aaValue.trim() !== '') {
      fypActualStr = aaValue;
      fypSource = `Column AA (relative index ${columnAARelativeIndex}, absolute ${columnAAAbsoluteIndex}, header "${aaHeader}")`;
      console.log(`  ⚠️ Using Column AA: header="${aaHeader}", value="${aaValue}" (fallback - has value)`);
    } else {
      console.log(`  ❌ No FYP value found in Column FC, FB, AA, or 13!`);
    }
  }
  
  // ALWAYS check name matching to see if it's overriding Column AA/Column 13
  // Include "TOTAL FYP MTD" and "TOTAL MTD FY P" which are in Column 13
  const nameMatch = findColumnValue(rowData, [
    'TOTAL FYP MTD', 'TOTAL MTD FY P', 'TOTAL MTD FYP', // Column 13 headers
    'FYP_MTD', 'FYP MTD', 'FYPMTD', 'FYP', 'FYPI_MTD', 'FYPI MTD', 'FYPI',
    'FYP MTD SP at 10%', 'TOTAL MTD FYP SP at 10%'
  ]);
  
  if (nameMatch) {
    const nameMatchParsed = parseFloat(nameMatch.replace(/,/g, '')) || 0;
    const positionValueParsed = parseFloat(fypActualStr.replace(/,/g, '')) || 0;
    
    console.log(`  🔍 Name matching found: "${nameMatch}" (parsed: ${nameMatchParsed})`);
    console.log(`  🔍 Position-based value: "${fypActualStr}" (parsed: ${positionValueParsed})`);
    
    // Only use name matching if position-based matching failed or found a suspiciously low value
    if (fypActualStr && positionValueParsed > 0) {
      // If position-based value is suspiciously low (< 1000), check name match
      if (positionValueParsed < 1000 && nameMatchParsed > positionValueParsed * 2) {
        console.log(`  ⚠️ Position-based value (${positionValueParsed}) is suspiciously low, name match (${nameMatchParsed}) is much higher`);
        console.log(`  ✅ Using name match "${nameMatch}" instead of position-based value`);
        fypActualStr = nameMatch;
        fypSource = `Name matching (overrode position-based: ${fypSource})`;
      } else {
        console.log(`  ✓ PRIORITIZING position-based value "${fypActualStr}" over name match "${nameMatch}"`);
        // fypActualStr already set from position-based above
      }
    } else if (nameMatchParsed > 0) {
      console.log(`  ⚠️ Position-based empty, using name match "${nameMatch}"`);
      fypActualStr = nameMatch;
      fypSource = 'Name matching';
    }
  } else {
    console.log(`  🔍 Name matching found nothing`);
  }
  
  const fypActual = parseFloat(fypActualStr || '0') || 0;
  
  // Log final FYP value prominently with source
  console.log(`  ✅✅✅ FINAL FYP_MTD: ${fypActual.toLocaleString()} ✅✅✅`);
  console.log(`  Source: ${fypSource || 'UNKNOWN'}`);
  console.log(`  Raw value: "${fypActualStr}"`);
  console.log(`🔍🔍🔍 FYP_MTD EXTRACTION DEBUG - END 🔍🔍🔍\n`);
  
  // If headers/row were missing, log a warning
  if (!headers || !row) {
    console.warn(`  ⚠️ WARNING: extractLeaderMetrics called without headers or row!`);
    console.warn(`  headers=${!!headers}, row=${!!row}`);
    console.warn(`  This means FYP extraction will use name matching only.`);
  }
  
  const fycActual = parseFloat(findColumnValue(rowData, [
    'FYC_MTD', 'FYC MTD', 'FYCMTD', 'FYC'
  ]) || '0') || 0;
  
  // Extract YTD values - try name matching first
  let anpYtdActualStr = findColumnValue(rowData, [
    'ANP_YTD', 'ANP YTD', 'ANPYTD', 'Total ANP YTD', 'TOTAL_ANP_YTD'
  ]);
  
  let fypYtdActualStr = findColumnValue(rowData, [
    'FYP_YTD', 'FYP YTD', 'FYPYTD', 'FYPI_YTD', 'FYPI YTD', 'FYPIYTD',
    'Total FYP YTD', 'TOTAL_FYP_YTD'
  ]);
  
  let fycYtdActualStr = findColumnValue(rowData, [
    'FYC_YTD', 'FYC YTD', 'FYCYTD', 'Total FYC YTD', 'TOTAL_FYC_YTD'
  ]);
  
  // If not found by name and we have headers/row, try column positions
  if (headers && row) {
    // Column P (index 15) = ANP_YTD
    if (!anpYtdActualStr) {
      const columnPRelativeIndex = 15 - dataStartColumn;
      if (columnPRelativeIndex >= 0 && columnPRelativeIndex < headers.length && columnPRelativeIndex < row.length) {
        const pValue = row[columnPRelativeIndex] || '';
        const pHeader = headers[columnPRelativeIndex] || '';
        if (pValue && pValue.trim() !== '') {
          console.log(`  Using Column P (absolute index 15, relative index ${columnPRelativeIndex}, header "${pHeader}") as ANP_YTD fallback, value: "${pValue}"`);
          anpYtdActualStr = pValue;
        }
      }
    }
    
    // Column AE (index 31) = FYP_YTD
    if (!fypYtdActualStr) {
      const columnAERelativeIndex = 31 - dataStartColumn;
      if (columnAERelativeIndex >= 0 && columnAERelativeIndex < headers.length && columnAERelativeIndex < row.length) {
        const aeValue = row[columnAERelativeIndex] || '';
        const aeHeader = headers[columnAERelativeIndex] || '';
        if (aeValue && aeValue.trim() !== '') {
          console.log(`  Using Column AE (absolute index 31, relative index ${columnAERelativeIndex}, header "${aeHeader}") as FYP_YTD fallback, value: "${aeValue}"`);
          fypYtdActualStr = aeValue;
        }
      }
    }
    
    // Column DF (index 110) = FYC_YTD
    if (!fycYtdActualStr) {
      const columnDFRelativeIndex = 110 - dataStartColumn;
      if (columnDFRelativeIndex >= 0 && columnDFRelativeIndex < headers.length && columnDFRelativeIndex < row.length) {
        const dfValue = row[columnDFRelativeIndex] || '';
        const dfHeader = headers[columnDFRelativeIndex] || '';
        if (dfValue && dfValue.trim() !== '') {
          console.log(`  Using Column DF (absolute index 110, relative index ${columnDFRelativeIndex}, header "${dfHeader}") as FYC_YTD fallback, value: "${dfValue}"`);
          fycYtdActualStr = dfValue;
        }
      }
    }
  }
  
  const anpYtdActual = parseFloat(anpYtdActualStr || '0') || 0;
  const fypYtdActual = parseFloat(fypYtdActualStr || '0') || 0;
  const fycYtdActual = parseFloat(fycYtdActualStr || '0') || 0;
  
  return { fypActual, fycActual, anpYtdActual, fypYtdActual, fycYtdActual };
}

// Calculate Agency Summary from Leaders sheet totals
// Note: Leaders sheet has FYPI_MTD, FYPI_YTD, FYC_MTD, FYC_YTD columns
export function calculateAgencySummaryFromLeaders(leaders: Leader[], agents: Agent[], agencyName?: string): AgencySummary {
  console.log('Calculating Agency Summary from Leaders sheet...');
  console.log(`Total Leaders: ${leaders.length}, Total Agents: ${agents.length}`);
  
  // Debug: Show sample leader data
  if (leaders.length > 0) {
    console.log('Sample leader data (first 3):', leaders.slice(0, 3).map(l => ({
      name: l.name,
      anpActual: l.anpActual,
      casesActual: l.casesActual || 0,
      recruitsActual: l.recruitsActual,
      fypActual: (l as any).fypActual || 0,
      fycActual: (l as any).fycActual || 0,
      anpYtdActual: (l as any).anpYtdActual || 0,
      fypYtdActual: (l as any).fypYtdActual || 0,
      fycYtdActual: (l as any).fycYtdActual || 0,
    })));
  }
  
  // Sum up MTD values from Leaders
  const totalAnpMtd = leaders.reduce((sum, leader) => sum + (leader.anpActual || 0), 0);
  // Use casesActual if available, otherwise fallback to recruitsActual for backward compatibility
  const totalCasesMtd = leaders.reduce((sum, leader) => sum + (leader.casesActual || leader.recruitsActual || 0), 0);
  // Sum NEW_RECRUIT (new recruits) separately
  const totalNewRecruitsMtd = leaders.reduce((sum, leader) => sum + (leader.recruitsActual || 0), 0);
  
  console.log(`Summing Leaders: ANP=${totalAnpMtd}, Cases=${totalCasesMtd}, New Recruits=${totalNewRecruitsMtd}`);
  
  // Extract FYP and FYC from Leaders sheet (FYPI_MTD and FYC_MTD columns)
  let totalFypMtd = leaders.reduce((sum, leader) => sum + ((leader as any).fypActual || 0), 0);
  let totalFycMtd = leaders.reduce((sum, leader) => sum + ((leader as any).fycActual || 0), 0);
  
  console.log(`FYP/FYC from Leaders sheet: FYP=${totalFypMtd}, FYC=${totalFycMtd}`);
  
  // If Leaders sheet doesn't have FYP/FYC, try to get from Agents (fallback)
  if (totalFypMtd === 0 && agents.length > 0) {
    const agentsFyp = agents.reduce((sum, agent) => sum + (agent.fypActual || 0), 0);
    if (agentsFyp > 0) {
      totalFypMtd = agentsFyp;
      // FYC can be calculated from FYP: FYC = FYP * 0.25 (25% commission rate)
      totalFycMtd = totalFypMtd * 0.25;
      console.log(`FYP/FYC calculated from ${agents.length} agents (fallback): FYP=${totalFypMtd}, FYC=${totalFycMtd}`);
    }
  }
  
  if (totalFypMtd === 0) {
    console.warn('⚠️ WARNING: FYP is 0! Check if FYPI_MTD column exists in Leaders sheet.');
  }
  if (totalCasesMtd === 0) {
    console.warn('⚠️ WARNING: Cases is 0! Check if CASECNT_MTD column exists in Leaders sheet.');
  }
  
  // Count producing advisors (leaders with ANP > 0)
  const producingAdvisorsMtd = leaders.filter(l => (l.anpActual || 0) > 0).length;
  
  // Total manpower = number of leaders
  const totalManpowerMtd = leaders.length;
  
  // Sum up YTD values from Leaders (extracted from YTD columns)
  const totalAnpYtd = leaders.reduce((sum, leader) => sum + ((leader as any).anpYtdActual || 0), 0);
  const totalFypYtd = leaders.reduce((sum, leader) => sum + ((leader as any).fypYtdActual || 0), 0);
  const totalFycYtd = leaders.reduce((sum, leader) => sum + ((leader as any).fycYtdActual || 0), 0);
  // Cases YTD - for now use same as MTD (no separate YTD column specified)
  const totalCasesYtd = totalCasesMtd;
  const producingAdvisorsYtd = producingAdvisorsMtd;
  const totalManpowerYtd = totalManpowerMtd;
  
  console.log(`YTD Totals from Leaders: ANP=${totalAnpYtd}, FYP=${totalFypYtd}, FYC=${totalFycYtd}`);
  
  const summary: AgencySummary = {
    agencyName,
    totalAnpMtd,
    totalFypMtd,
    totalFycMtd,
    totalCasesMtd,
    producingAdvisorsMtd,
    totalManpowerMtd,
    totalProducingAdvisorsMtd: producingAdvisorsMtd,
    persistencyMtd: 0, // Will need to be calculated separately if available
    totalAnpYtd,
    totalFypYtd,
    totalFycYtd,
    totalCasesYtd,
    producingAdvisorsYtd,
    totalManpowerYtd,
    totalProducingAdvisorsYtd: producingAdvisorsYtd,
    persistencyYtd: 0, // Will need to be calculated separately if available
    overrides: {},
  };
  
  console.log('Agency Summary calculated from Leaders:', {
    totalAnpMtd: summary.totalAnpMtd,
    totalFypMtd: summary.totalFypMtd,
    totalFycMtd: summary.totalFycMtd,
    totalCasesMtd: summary.totalCasesMtd,
    producingAdvisorsMtd: summary.producingAdvisorsMtd,
    totalManpowerMtd: summary.totalManpowerMtd,
  });
  
  return summary;
}

// Map CSV row to Agent object
function mapRowToAgent(headers: string[], row: string[]): Agent | null {
  const rowData: Record<string, string> = {};
  headers.forEach((header, index) => {
    rowData[header] = row[index] || '';
  });

  // Try multiple possible column names for agent name (case-insensitive)
  const agentName = findColumnValue(rowData, [
    'AGENT NAME', 'AGENT_NAME', 'Agent Name', 'AgentName', 'Name', 'NAME', 'Agent'
  ]);
  
  // Try multiple possible column names for UM name (case-insensitive)
  const umName = findColumnValue(rowData, [
    'UM Name', 'UM_NAME', 'UMName', 'Leader Name', 'LEADER NAME', 'LEADER_NAME', 'LeaderName'
  ]);

  if (!agentName.trim()) {
    return null;
  }

  // Try multiple possible column names for ANP (case-insensitive)
  const anpActual = parseFloat(findColumnValue(rowData, [
    'ANP_MTD', 'ANP MTD', 'ANPMTD', 'ANP', 'anp_mtd', 'anp mtd'
  ]) || '0') || 0;
  
  // Try multiple possible column names for FYP (case-insensitive)
  const fypActual = parseFloat(findColumnValue(rowData, [
    'FYP MTD SP at 10%', 'FYP_MTD', 'FYP MTD', 'FYPMTD', 'FYP', 'fyp_mtd', 'fyp mtd'
  ]) || '0') || 0;
  
  // Try multiple possible column names for cases (case-insensitive)
  const casesActual = parseFloat(findColumnValue(rowData, [
    'CASECNT_MTD', 'CASECNT MTD', 'CASECNT_YTD', 'CASECNT YTD',
    'Cases MTD', 'Cases_MTD', 'CASECNT', 'Cases'
  ]) || '0') || 0;

  // Try multiple possible column names for Unit
  const unit = findColumnValue(rowData, [
    'Unit', 'UNIT', 'Unit Name', 'UNIT_NAME', 'UnitName'
  ]) || 'Unknown Unit';

  return {
    id: agentName.trim().toLowerCase().replace(/\s+/g, '-'),
    name: agentName.trim(),
    umName: umName.trim() || 'Unknown',
    unit: unit.trim(),
    anpActual,
    fypActual,
    casesActual,
    fycTarget: 0,
    fypTarget: 0,
    anpTarget: 0,
    recruitsTarget: 0,
    fycNovForecast: 0,
    fycDecForecast: 0,
    recNovForecast: 0,
    recDecForecast: 0,
  };
}

// Map CSV row to Agency Summary (from summary sheet)
function mapRowToAgencySummary(headers: string[], rows: string[][]): AgencySummary {
  console.log('Agency Summary CSV Headers:', headers);
  console.log('Agency Summary CSV Headers (all with positions):');
  headers.forEach((h, i) => {
    console.log(`  Column ${i}: "${h}"`);
  });
  console.log(`Agency Summary CSV has ${rows.length} data rows`);
  
  // Find column positions by exact name match (case-insensitive)
  const findColumnIndex = (name: string): number => {
    const normalizedName = name.toLowerCase().trim().replace(/'$/, '').replace(/&/g, '_');
    return headers.findIndex(h => {
      const normalizedHeader = h.toLowerCase().trim().replace(/'$/, '').replace(/&/g, '_');
      return normalizedHeader === normalizedName;
    });
  };
  
  // Find column positions for key fields
  const columnPositions = {
    anpMtd: findColumnIndex('ANP_MTD'),
    anpYtd: findColumnIndex('ANP_YTD'),
    fypiMtd: findColumnIndex('FYPI_MTD'),
    fypiYtd: findColumnIndex('FYPI_YTD'),
    fycMtd: findColumnIndex('FYC_MTD'),
    fycYtd: findColumnIndex('FYC_YTD'),
    casesMtd: findColumnIndex('CASECNT_MTD'),
    casesYtd: findColumnIndex('CASECNT_EX_A&H_YTD'),
    manpower: findColumnIndex('MANPOWERCN'),
    producingAdvisors: findColumnIndex('TOTAL_LIFE_PRC_MTD'),
  };
  
  console.log('Column positions found:', columnPositions);
  
  // Agency summary sheet typically has totals in specific columns or rows
  // This is a flexible parser that looks for common patterns
  let summary: AgencySummary = {
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

  // Strategy 1: Look for summary row (usually contains "Total" or "Summary")
  let foundSummaryRow = false;
  for (const row of rows) {
    // Skip completely empty rows
    if (!row || row.length === 0 || row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }
    
    // Skip header rows (including hidden header rows)
    if (isHeaderRow(row, headers)) {
      continue;
    }
    
    const rowData: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowData[header] = row[index] || '';
    });

    const firstCell = (rowData[headers[0]] || '').toLowerCase().trim();
    
    if (firstCell.includes('total') || firstCell.includes('summary') || firstCell.includes('grand total')) {
      foundSummaryRow = true;
      // Use flexible column matching
      // User's sheet has: ANP_MTD, FYPI_MTD, MANPOWERCN, CASECNT_MTD, etc.
      // Prioritize exact column names from the sheet
      // DO NOT use generic 'MTD' or 'YTD' as they match wrong columns
      summary.totalAnpMtd = parseFloat(findColumnValue(rowData, [
        'ANP_MTD', 'ANP MTD', 'ANPMTD', 'Total ANP MTD', 'TOTAL_ANP_MTD'
      ]) || '0') || 0;
      
      // Try FYPI first (as shown in user's sheet), then FYP
      const fypiMtd = parseFloat(findColumnValue(rowData, [
        'FYPI_MTD', 'FYPI MTD', 'FYPI', 'First Year Premium Income MTD'
      ]) || '0') || 0;
      const fypMtd = parseFloat(findColumnValue(rowData, [
        'FYP_MTD', 'FYP MTD', 'FYPMTD', 'TOTAL MTD FYP SP at 10%', 'FYP MTD SP at 10%',
        'Total FYP MTD', 'TOTAL_FYP_MTD', 'FYP'
      ]) || '0') || 0;
      summary.totalFypMtd = fypiMtd || fypMtd; // Use FYPI if available, otherwise FYP
      
      summary.totalFycMtd = parseFloat(findColumnValue(rowData, [
        'FYC_MTD', 'FYC MTD', 'FYCMTD', 'Total FYC MTD', 'TOTAL_FYC_MTD', 'FYC'
      ]) || '0') || 0;
      
      // Producing Advisors MTD - use TOTAL_LIFE_PRC_MTD or TOTAL_LIFE_PRODUCER_IND (P6)
      summary.producingAdvisorsMtd = parseFloat(findColumnValue(rowData, [
        'TOTAL_LIFE_PRC_MTD', 'TOTAL_LIFE_PRODUCER_IND', 'TOTAL_LIFE_PRO', 'Producing Advisors MTD', 'Producing_Advisors_MTD', 'Producing Advisors', 'Prod Advisors MTD'
      ]) || '0') || 0;
      
      summary.totalCasesMtd = parseFloat(findColumnValue(rowData, [
        'CASECNT_MTD', 'CASECNT MTD', 'Cases MTD', 'Cases_MTD', 'Total Cases MTD', 'Cases', 'NEW_RECRUITS', 'NEW_RECRUIT'
      ]) || '0') || 0;
      
      summary.persistencyMtd = parseFloat(findColumnValue(rowData, [
        'PERS', 'Persistency MTD', 'PERS_MTD', 'PERS MTD', 'Persistency'
      ]) || '0') || 0;
      
      // DO NOT use generic 'YTD' as it matches wrong columns
      summary.totalAnpYtd = parseFloat(findColumnValue(rowData, [
        'ANP_YTD', 'ANP YTD', 'ANPYTD', 'Total ANP YTD', 'TOTAL_ANP_YTD'
      ]) || '0') || 0;
      
      // Try FYPI first (as shown in user's sheet), then FYP
      const fypiYtd = parseFloat(findColumnValue(rowData, [
        'FYPI_YTD', 'FYPI YTD', 'FYPI', 'First Year Premium Income YTD'
      ]) || '0') || 0;
      const fypYtd = parseFloat(findColumnValue(rowData, [
        'FYP_YTD', 'FYP YTD', 'FYPYTD', 'Total FYP YTD', 'TOTAL_FYP_YTD'
      ]) || '0') || 0;
      summary.totalFypYtd = fypiYtd || fypYtd; // Use FYPI if available, otherwise FYP
      
      // YTD FYC - use FYC_YTD (V6)
      summary.totalFycYtd = parseFloat(findColumnValue(rowData, [
        'FYC_YTD', 'FYC YTD', 'FYCYTD', 'Total FYC YTD', 'TOTAL_FYC_YTD'
      ]) || '0') || 0;
      
      // YTD Case Count - use CASECNT_EX_A&H_YTD (S6)
      summary.totalCasesYtd = parseFloat(findColumnValue(rowData, [
        'CASECNT_EX_A&H_YTD', 'CASECNT_EX_AI', 'CASECNT_EX_AH_YTD', 'CASECNT_YTD', 'CASECNT YTD', 'Cases YTD', 'Cases_YTD', 'Total Cases YTD'
      ]) || '0') || 0;
      
      summary.persistencyYtd = parseFloat(findColumnValue(rowData, [
        'PERS YTD', 'Persistency YTD', 'PERS_YTD', 'PERS YTD', 'Persistency'
      ]) || '0') || 0;
      
      // Try to get manpower and producing advisors from summary row
      summary.producingAdvisorsMtd = parseFloat(findColumnValue(rowData, [
        'Producing Advisors MTD', 'Producing_Advisors_MTD', 'Producing Advisors', 'Prod Advisors MTD'
      ]) || '0') || 0;
      
      summary.totalManpowerMtd = parseFloat(findColumnValue(rowData, [
        'MANPOWERCN', 'MANPOWER_CN', 'Total Manpower MTD', 'Total_Manpower_MTD', 'Manpower MTD', 
        'Total Manpower', 'Manpower', 'Manpower Count'
      ]) || '0') || 0;
      
      summary.totalProducingAdvisorsMtd = parseFloat(findColumnValue(rowData, [
        'Total Producing Advisors MTD', 'Total_Producing_Advisors_MTD', 'Total Producing Advisors'
      ]) || '0') || 0;
      
      summary.producingAdvisorsYtd = parseFloat(findColumnValue(rowData, [
        'Producing Advisors YTD', 'Producing_Advisors_YTD', 'Prod Advisors YTD'
      ]) || '0') || 0;
      
      summary.totalManpowerYtd = parseFloat(findColumnValue(rowData, [
        'MANPOWERCN', 'MANPOWER_CN', 'Total Manpower YTD', 'Total_Manpower_YTD', 'Manpower YTD',
        'Manpower Count'
      ]) || '0') || 0;
      
      summary.totalProducingAdvisorsYtd = parseFloat(findColumnValue(rowData, [
        'Total Producing Advisors YTD', 'Total_Producing_Advisors_YTD'
      ]) || '0') || 0;
      
      console.log('Found summary row, extracted values:', {
        totalAnpMtd: summary.totalAnpMtd,
        totalFypMtd: summary.totalFypMtd,
        totalFycMtd: summary.totalFycMtd,
        totalCasesMtd: summary.totalCasesMtd,
      });
      break;
    }
  }

  // Strategy 2: Check first data row (Row 6, index 0 in dataRows array)
  // User's sheet has headers in Row 5, data starts in Row 6
  // Use column positions for more reliable extraction
  if (!foundSummaryRow && summary.totalAnpMtd === 0 && rows.length > 0) {
    console.log('No summary row found, checking first data row (Row 6)...');
    const firstDataRow = rows[0]; // First row in dataRows array = Row 6 in the sheet
    
    if (firstDataRow && firstDataRow.length > 0 && !firstDataRow.every(cell => !cell || cell.trim() === '')) {
      console.log('First data row found, checking if it contains data...');
      console.log('First data row values:', firstDataRow.slice(0, 25).map((v, i) => `[${i}]="${v}"`).join(', '));

      // Use column positions if available, otherwise fall back to name matching
      let anpMtd = 0;
      if (columnPositions.anpMtd >= 0 && firstDataRow[columnPositions.anpMtd]) {
        anpMtd = parseFloat((firstDataRow[columnPositions.anpMtd] || '').replace(/,/g, '')) || 0;
        console.log(`Using column position ${columnPositions.anpMtd} for ANP_MTD: ${anpMtd}`);
      } else {
        // Fallback to name matching
        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowData[header] = firstDataRow[index] || '';
        });
        anpMtd = parseFloat(findColumnValue(rowData, ['ANP_MTD', 'ANP MTD', 'ANPMTD']) || '0') || 0;
        console.log(`Using name matching for ANP_MTD: ${anpMtd}`);
      }
      
      if (anpMtd > 0) {
        console.log('Found data in first data row, extracting Agency Summary values using column positions...');
        
        // Create rowData for fallback name matching
        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowData[header] = firstDataRow[index] || '';
        });
        
        // Helper function to get value by column position or name
        const getValue = (colPos: number, fallbackNames: string[]): number => {
          if (colPos >= 0 && firstDataRow[colPos]) {
            const value = parseFloat((firstDataRow[colPos] || '').replace(/,/g, '')) || 0;
            console.log(`  Column ${colPos} (${headers[colPos]}): ${value}`);
            return value;
          }
          // Fallback to name matching
          return parseFloat(findColumnValue(rowData, fallbackNames) || '0') || 0;
        };
        
        // Extract all metrics using column positions (more reliable)
        summary.totalAnpMtd = getValue(columnPositions.anpMtd, ['ANP_MTD', 'ANP MTD', 'ANPMTD']);
        summary.totalAnpYtd = getValue(columnPositions.anpYtd, ['ANP_YTD', 'ANP YTD', 'ANPYTD']);
        
        const fypiMtd = getValue(columnPositions.fypiMtd, ['FYPI_MTD', 'FYPI MTD', 'FYPI']);
        const fypMtd = parseFloat(findColumnValue(rowData, ['FYP_MTD', 'FYP MTD', 'FYPMTD']) || '0') || 0;
        summary.totalFypMtd = fypiMtd || fypMtd;
        
        const fypiYtd = getValue(columnPositions.fypiYtd, ['FYPI_YTD', 'FYPI YTD', 'FYPI']);
        const fypYtd = parseFloat(findColumnValue(rowData, ['FYP_YTD', 'FYP YTD', 'FYPYTD']) || '0') || 0;
        summary.totalFypYtd = fypiYtd || fypYtd;
        
        summary.totalFycMtd = getValue(columnPositions.fycMtd, ['FYC_MTD', 'FYC MTD', 'FYCMTD']);
        summary.totalFycYtd = getValue(columnPositions.fycYtd, ['FYC_YTD', 'FYC YTD', 'FYCYTD']);
        
        summary.totalCasesMtd = getValue(columnPositions.casesMtd, ['CASECNT_MTD', 'CASECNT MTD', 'Cases MTD']);
        summary.totalCasesYtd = getValue(columnPositions.casesYtd, ['CASECNT_EX_A&H_YTD', 'CASECNT_EX_AI', 'CASECNT_YTD']);
        
        summary.totalManpowerMtd = getValue(columnPositions.manpower, ['MANPOWERCN', "MANPOWERCN'", 'MANPOWER COUNT']);
        summary.totalManpowerYtd = summary.totalManpowerMtd; // Same value for YTD
        
        summary.producingAdvisorsMtd = getValue(columnPositions.producingAdvisors, ['TOTAL_LIFE_PRC_MTD', 'TOTAL_LIFE_PRODUCER_IND', 'TOTAL_LIFE_PRO']);
        summary.producingAdvisorsYtd = summary.producingAdvisorsMtd; // Same value for YTD
        
        // Persistency - no column position found, use name matching
        summary.persistencyMtd = parseFloat(findColumnValue(rowData, ['PERS', 'Persistency MTD', 'PERS_MTD']) || '0') || 0;
        summary.persistencyYtd = parseFloat(findColumnValue(rowData, ['PERS YTD', 'Persistency YTD', 'PERS_YTD']) || '0') || 0;
        
        summary.totalProducingAdvisorsMtd = summary.producingAdvisorsMtd;
        summary.totalProducingAdvisorsYtd = summary.producingAdvisorsYtd;
        
        console.log('Extracted from first data row:', {
          totalAnpMtd: summary.totalAnpMtd,
          totalFypMtd: summary.totalFypMtd,
          totalFycMtd: summary.totalFycMtd,
          totalCasesMtd: summary.totalCasesMtd,
          totalManpowerMtd: summary.totalManpowerMtd,
        });
        // Found the data row, extraction complete
      } else {
        console.log('First data row found but ANP_MTD is 0, skipping...');
      }
    } else {
      console.log('No data rows found after headers');
    }
  }

    // Strategy 3: If still no data found, try to find totals in header columns (common format)
    if (summary.totalAnpMtd === 0) {
      // Try to find totals directly in columns (some sheets have totals as column headers)
      const firstRow = rows[0] || [];
      const firstRowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        firstRowData[header] = firstRow[index] || '';
      });
      
      // Check if first row might contain totals (skip if it's a header row)
      if (isHeaderRow(firstRow, headers)) {
        // This is a header row, skip
      } else {
        const firstCellLower = (firstRowData[headers[0]] || '').toLowerCase().trim();
        if (!firstCellLower.includes('total') && !firstCellLower.includes('summary')) {
          // Try to extract from first row if it looks like totals
          // DO NOT use generic 'MTD' as it matches wrong columns
          summary.totalAnpMtd = parseFloat(findColumnValue(firstRowData, [
            'ANP_MTD', 'ANP MTD', 'ANPMTD', 'Total ANP MTD', 'TOTAL_ANP_MTD'
          ]) || '0') || 0;
          
          if (summary.totalAnpMtd > 0) {
            // Found totals in first row, extract all metrics
            summary.totalFypMtd = parseFloat(findColumnValue(firstRowData, [
            'FYPI MTD', 'FYPI_MTD', 'FYP MTD', 'FYP_MTD', 'FYPMTD', 'Total FYP MTD', 'TOTAL_FYP_MTD', 
            'FYP MTD SP at 10%', 'FYP', 'FYPI', 'First Year Premium Income MTD'
          ]) || '0') || 0;
          
            summary.totalFycMtd = parseFloat(findColumnValue(firstRowData, [
              'FYC MTD', 'FYC_MTD', 'FYCMTD', 'Total FYC MTD', 'TOTAL_FYC_MTD', 'FYC'
            ]) || '0') || 0;
            
            summary.totalCasesMtd = parseFloat(findColumnValue(firstRowData, [
              'Cases MTD', 'Cases_MTD', 'CASECNT_MTD', 'CASECNT MTD', 'Total Cases MTD', 'Cases'
            ]) || '0') || 0;
            
            // DO NOT use generic 'YTD' as it matches wrong columns
            summary.totalAnpYtd = parseFloat(findColumnValue(firstRowData, [
              'ANP_YTD', 'ANP YTD', 'ANPYTD', 'Total ANP YTD', 'TOTAL_ANP_YTD'
            ]) || '0') || 0;
            
            summary.totalFypYtd = parseFloat(findColumnValue(firstRowData, [
              'TOTAL YTD FYP SP at 10%', 'FYPI YTD', 'FYPI_YTD', 'FYP YTD', 'FYP_YTD', 'FYPYTD', 'Total FYP YTD', 'TOTAL_FYP_YTD',
              'FYPI', 'First Year Premium Income YTD'
            ]) || '0') || 0;
            
            summary.totalFycYtd = parseFloat(findColumnValue(firstRowData, [
              'FYC YTD', 'FYC_YTD', 'FYCYTD', 'Total FYC YTD', 'TOTAL_FYC_YTD'
            ]) || '0') || 0;
            
            summary.totalCasesYtd = parseFloat(findColumnValue(firstRowData, [
              'Cases YTD', 'Cases_YTD', 'CASECNT_YTD', 'CASECNT YTD', 'Total Cases YTD'
            ]) || '0') || 0;
            
            summary.persistencyMtd = parseFloat(findColumnValue(firstRowData, [
              'PERS', 'Persistency MTD', 'PERS_MTD', 'PERS MTD', 'Persistency'
            ]) || '0') || 0;
            
            summary.persistencyYtd = parseFloat(findColumnValue(firstRowData, [
              'PERS YTD', 'Persistency YTD', 'PERS_YTD', 'PERS YTD'
            ]) || '0') || 0;
            
            summary.producingAdvisorsMtd = parseFloat(findColumnValue(firstRowData, [
              'Producing Advisors MTD', 'Producing_Advisors_MTD', 'Producing Advisors', 'Prod Advisors MTD'
            ]) || '0') || 0;
            
            summary.totalManpowerMtd = parseFloat(findColumnValue(firstRowData, [
              'MANPOWERCN', 'MANPOWER_CN', 'Total Manpower MTD', 'Total_Manpower_MTD', 'Manpower MTD', 
              'Total Manpower', 'Manpower', 'Manpower Count'
            ]) || '0') || 0;
            
            summary.totalProducingAdvisorsMtd = parseFloat(findColumnValue(firstRowData, [
              'Total Producing Advisors MTD', 'Total_Producing_Advisors_MTD', 'Total Producing Advisors'
            ]) || '0') || 0;
            
            summary.producingAdvisorsYtd = parseFloat(findColumnValue(firstRowData, [
              'Producing Advisors YTD', 'Producing_Advisors_YTD', 'Prod Advisors YTD'
            ]) || '0') || 0;
            
            summary.totalManpowerYtd = parseFloat(findColumnValue(firstRowData, [
              'MANPOWERCN', 'MANPOWER_CN', 'Total Manpower YTD', 'Total_Manpower_YTD', 'Manpower YTD',
              'Manpower Count'
            ]) || '0') || 0;
            
            summary.totalProducingAdvisorsYtd = parseFloat(findColumnValue(firstRowData, [
              'Total Producing Advisors YTD', 'Total_Producing_Advisors_YTD'
            ]) || '0') || 0;
            
            console.log('Found totals in first row, extracted values:', summary);
          }
        }
      }
    }
    
    // If still no data found, calculate from all rows (fallback)
    if (summary.totalAnpMtd === 0 && rows.length > 1) {
      console.log('No summary row found, calculating from all rows...');
      const producingAdvisorsSet = new Set<string>();
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Skip empty rows
        if (!row || row.length === 0 || row.every(cell => !cell || cell.trim() === '')) {
          continue;
        }
        
        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });

        // Skip header rows (including hidden header rows)
        if (isHeaderRow(row, headers)) {
          continue;
        }
        
        const firstCell = (rowData[headers[0]] || '').toLowerCase().trim();
        
        // Skip summary/total rows when calculating from individual rows
        if (firstCell.includes('total') || firstCell.includes('summary')) {
          continue;
        }

        const anpMtd = parseFloat(findColumnValue(rowData, [
          'ANP_MTD', 'ANP MTD', 'ANPMTD', 'ANP'
        ]) || '0') || 0;
        const anpYtd = parseFloat(findColumnValue(rowData, [
          'ANP_YTD', 'ANP YTD', 'ANPYTD'
        ]) || '0') || 0;
        const agentName = findColumnValue(rowData, [
          'AGENT NAME', 'Agent Name', 'AgentName', 'Name', 'NAME', 'AGENCY_NAME'
        ]);

        summary.totalAnpMtd += anpMtd;
        summary.totalFypMtd += parseFloat(findColumnValue(rowData, [
          'FYPI MTD', 'FYPI_MTD', 'FYP MTD SP at 10%', 'FYP_MTD', 'FYP MTD', 'FYPMTD', 'FYP', 'FYPI'
        ]) || '0') || 0;
        summary.totalFycMtd += parseFloat(findColumnValue(rowData, [
          'FYC_MTD', 'FYC MTD', 'FYCMTD', 'FYC'
        ]) || '0') || 0;
        summary.totalCasesMtd += parseFloat(findColumnValue(rowData, [
          'CASECNT_MTD', 'CASECNT MTD', 'Cases MTD', 'Cases_MTD', 'Cases'
        ]) || '0') || 0;
        summary.totalAnpYtd += anpYtd;
        summary.totalFypYtd += parseFloat(findColumnValue(rowData, [
          'FYPI YTD', 'FYPI_YTD', 'FYP YTD', 'FYP_YTD', 'FYPYTD', 'FYPI'
        ]) || '0') || 0;
        summary.totalFycYtd += parseFloat(findColumnValue(rowData, [
          'FYC_YTD', 'FYC YTD', 'FYCYTD'
        ]) || '0') || 0;
        summary.totalCasesYtd += parseFloat(findColumnValue(rowData, [
          'CASECNT_YTD', 'CASECNT YTD', 'Cases YTD', 'Cases_YTD'
        ]) || '0') || 0;

        // Count producing advisors (those with ANP > 0)
        if (agentName && (anpMtd > 0 || anpYtd > 0)) {
          producingAdvisorsSet.add(agentName);
        }
      }

      summary.producingAdvisorsMtd = producingAdvisorsSet.size;
      summary.producingAdvisorsYtd = producingAdvisorsSet.size;
      summary.totalManpowerMtd = rows.length - 1; // Total rows minus header
      summary.totalManpowerYtd = rows.length - 1;
      summary.totalProducingAdvisorsMtd = producingAdvisorsSet.size;
      summary.totalProducingAdvisorsYtd = producingAdvisorsSet.size;
      
      console.log('Calculated totals from rows:', {
        totalAnpMtd: summary.totalAnpMtd,
        totalFypMtd: summary.totalFypMtd,
        totalCasesMtd: summary.totalCasesMtd,
        producingAdvisorsMtd: summary.producingAdvisorsMtd,
        totalManpowerMtd: summary.totalManpowerMtd,
      });
    } else {
      // If summary row was found earlier, ensure all metrics are populated
      // (Already handled in the first loop, but keeping for completeness)
    }

  console.log('Final Agency Summary:', {
    totalAnpMtd: summary.totalAnpMtd,
    totalFypMtd: summary.totalFypMtd,
    totalFycMtd: summary.totalFycMtd,
    totalCasesMtd: summary.totalCasesMtd,
    totalAnpYtd: summary.totalAnpYtd,
    totalFypYtd: summary.totalFypYtd,
    totalFycYtd: summary.totalFycYtd,
    totalCasesYtd: summary.totalCasesYtd,
    persistencyMtd: summary.persistencyMtd,
    persistencyYtd: summary.persistencyYtd,
    producingAdvisorsMtd: summary.producingAdvisorsMtd,
    producingAdvisorsYtd: summary.producingAdvisorsYtd,
    totalManpowerMtd: summary.totalManpowerMtd,
    totalManpowerYtd: summary.totalManpowerYtd,
    totalProducingAdvisorsMtd: summary.totalProducingAdvisorsMtd,
    totalProducingAdvisorsYtd: summary.totalProducingAdvisorsYtd,
  });
  
  // Check which fields are still zero
  const zeroFields: string[] = [];
  if (summary.totalFycMtd === 0) zeroFields.push('totalFycMtd');
  if (summary.totalAnpYtd === 0) zeroFields.push('totalAnpYtd');
  if (summary.totalFypYtd === 0) zeroFields.push('totalFypYtd');
  if (summary.totalFycYtd === 0) zeroFields.push('totalFycYtd');
  if (summary.totalCasesYtd === 0) zeroFields.push('totalCasesYtd');
  if (summary.producingAdvisorsMtd === 0) zeroFields.push('producingAdvisorsMtd');
  if (summary.producingAdvisorsYtd === 0) zeroFields.push('producingAdvisorsYtd');
  if (summary.totalManpowerYtd === 0) zeroFields.push('totalManpowerYtd');
  if (summary.totalProducingAdvisorsMtd === 0) zeroFields.push('totalProducingAdvisorsMtd');
  if (summary.totalProducingAdvisorsYtd === 0) zeroFields.push('totalProducingAdvisorsYtd');
  if (summary.persistencyMtd === 0) zeroFields.push('persistencyMtd');
  if (summary.persistencyYtd === 0) zeroFields.push('persistencyYtd');
  
  if (zeroFields.length > 0) {
    console.warn('⚠️ Fields still showing zero:', zeroFields.join(', '));
    }

  return summary;
}

// Load data from a specific Google Sheets CSV URL
async function loadCSVFromUrl(csvUrl: string): Promise<string[][]> {
  try {
  const response = await fetch(csvUrl, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-cache',
      headers: {
        'Accept': 'text/csv,text/plain,*/*',
      },
  });

  if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `HTTP ${response.status} ${response.statusText}. ${errorText || 'Make sure the sheet is published to web as CSV.'}`
      );
  }

  const csvText = await response.text();
    
    if (!csvText || csvText.trim().length === 0) {
      throw new Error('CSV file is empty. Make sure the sheet contains data and is published correctly.');
    }

  return parseCSV(csvText);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Network error: Cannot fetch from Google Sheets. This might be a CORS issue. Make sure:\n1. The sheet is published to web (File → Share → Publish to web)\n2. CSV format is selected\n3. The URL is correct\n\nOriginal error: ${error.message}`
      );
    }
    throw error;
  }
}

// Load agency summary data
export async function loadAgencySummary(csvUrl: string): Promise<AgencySummary> {
  const result = await loadAgencySummaryWithHeaders(csvUrl);
  return result.summary;
}

// Load agency summary data with headers for debugging
export async function loadAgencySummaryWithHeaders(csvUrl: string): Promise<{
  summary: AgencySummary;
  headers: string[];
}> {
  console.log('Loading Agency Summary from:', csvUrl);
  const lines = await loadCSVFromUrl(csvUrl);
  console.log(`Agency Summary CSV has ${lines.length} total rows`);
  
  if (lines.length < 6) {
    const errorMsg = `CSV file has only ${lines.length} rows, but needs at least 6 rows (Row 5 = headers, Row 6+ = data)`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Row 5 (index 4) is the header row in user's sheet
  const headers = lines[4]; // Row 5 = index 4
  if (!headers || headers.length === 0) {
    const errorMsg = 'Row 5 (header row) is empty or invalid';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  // Data starts from Row 6 (index 5)
  const dataRows = lines.slice(5);
  console.log('Using Row 5 as headers:', headers.slice(0, 15));
  console.log(`Data rows start from Row 6, ${dataRows.length} rows available`);
  
  if (dataRows.length === 0) {
    const errorMsg = 'No data rows found after Row 5 (headers)';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  console.log('First data row (Row 6) sample:', dataRows[0]?.slice(0, 10));
  
  const summary = mapRowToAgencySummary(headers, dataRows);
  console.log('Agency Summary parsed successfully:', {
    totalAnpMtd: summary.totalAnpMtd,
    totalFypMtd: summary.totalFypMtd,
    totalCasesMtd: summary.totalCasesMtd,
  });
  return { summary, headers };
}

// Load leaders data
// Note: Your sheet structure:
//   - Row 1-2: Blank (may be removed in CSV export)
//   - Row 3-5: Formatted headers (multi-level)
//   - Row 6+: Data
// We need to find the row with actual column names like "UM NAME", "ANP_MTD"
export async function loadLeadersData(csvUrl: string): Promise<{ 
  leaders: Leader[]; 
  headers: string[];
  agencyName?: string;
  debug?: {
    headers?: string[];
    firstFewHeaders?: string[];
    columnMatches?: {
      leaderName?: string;
      anp?: string;
      cases?: string;
    };
    anpHeaders?: string[];
    caseHeaders?: string[];
    fycMtdIndex?: number | null;
    fycMtdHeader?: string | null;
    columnOInfo?: {
      index: number;
      header: string;
      nextHeader: string;
    };
    sampleLeaders?: Array<{
      name: string;
      anpActual: number;
      recruitsActual: number;
      fypActual?: number;
      fycActual?: number;
    }>;
    totals?: {
      anp: number;
      cases: number;
      newRecruits?: number;
      fyp?: number;
      fyc?: number;
    };
  };
}> {
  const lines = await loadCSVFromUrl(csvUrl);
  console.log(`=== Leaders CSV: Total rows = ${lines.length} ===`);
  
  // Debug: Show first 10 rows to identify header row
  console.log('First 10 rows of CSV:');
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const row = lines[i];
    const firstFewCells = row.slice(0, 5).map(c => `"${c || ''}"`).join(', ');
    const isEmpty = !row || row.length === 0 || row.every(cell => !cell || cell.trim() === '');
    console.log(`  Row ${i + 1}: [${firstFewCells}${row.length > 5 ? '...' : ''}]${isEmpty ? ' (EMPTY)' : ''}`);
  }
  
  // Skip leading blank rows
  let startIndex = 0;
  while (startIndex < lines.length) {
    const row = lines[startIndex];
    if (row && row.length > 0 && !row.every(cell => !cell || cell.trim() === '')) {
      break;
    }
    startIndex++;
  }
  
  if (startIndex > 0) {
    console.log(`Skipped ${startIndex} blank rows at the start`);
  }
  
  if (lines.length - startIndex < 3) {
    throw new Error(`CSV file has only ${lines.length - startIndex} non-blank rows, but needs at least 3 rows (headers + data)`);
  }

  // Try to find the header row by looking for "UM NAME" or "ANP_MTD"
  // Check from the first non-blank row onwards (should be around index 2-4 in CSV, which is Row 3-5 in sheet)
  // NOTE: Data starts at column M (index 12), so we need to find where "UM NAME" appears
  let headerRowIndex = -1;
  let headers: string[] = [];
  let dataStartColumn = 0; // Column M = index 12
  
  // Search up to 5 rows from the first non-blank row
  for (let i = startIndex; i < Math.min(startIndex + 5, lines.length); i++) {
    const row = lines[i];
    if (!row || row.length === 0) continue;
    
    // Check if this row contains "LEADER_UM_NAME" or "ANP_MTD" (case-insensitive)
    // Look for it starting from column M (index 12) onwards
    const rowLower = row.map(c => (c || '').toLowerCase().trim());
    
    // Find column M index (where "LEADER_UM_NAME" should be)
    const umNameIndex = rowLower.findIndex((c, idx) => 
      idx >= 12 && (c === 'leader_um_name' || c === 'leader um name' || c === 'um name' || c === 'um_name')
    );
    
    // Also check for ANP_MTD
    const anpMtdIndex = rowLower.findIndex((c, idx) => 
      idx >= 12 && (c === 'anp_mtd' || c === 'anp mtd')
    );
    
    if (umNameIndex >= 0 || anpMtdIndex >= 0) {
      headerRowIndex = i;
      // Extract columns starting from column M (index 12) or where UM NAME/ANP_MTD is found
      // Use the actual index where the column was found, but ensure it's at least column M (12)
      dataStartColumn = umNameIndex >= 0 ? umNameIndex : anpMtdIndex;
      // Ensure we start from at least column M (index 12)
      if (dataStartColumn < 12) {
        dataStartColumn = 12;
      }
      headers = row.slice(dataStartColumn);
      const colLetter = dataStartColumn < 26 
        ? String.fromCharCode(65 + dataStartColumn) 
        : `Column ${dataStartColumn + 1}`;
      console.log(`✓ Found header row at CSV index ${i}, data starts at column ${dataStartColumn} (${colLetter})`);
      console.log(`  Found "UM NAME" at column ${umNameIndex >= 0 ? umNameIndex : 'N/A'}, "ANP_MTD" at column ${anpMtdIndex >= 0 ? anpMtdIndex : 'N/A'}`);
      break;
    }
  }
  
  // If not found, try the 3rd non-blank row (which should be Row 5 in sheet) and assume column M (index 12)
  if (headerRowIndex === -1) {
    const fallbackIndex = startIndex + 2; // 3rd non-blank row (Row 5 in sheet)
    if (fallbackIndex < lines.length) {
      console.log(`⚠️ Could not find header row by searching, using index ${fallbackIndex} (3rd non-blank row, should be Row 5)`);
      headerRowIndex = fallbackIndex;
      dataStartColumn = 12; // Column M (index 12)
      headers = lines[fallbackIndex].slice(dataStartColumn);
      console.log(`Using column M (index ${dataStartColumn}) as data start`);
    } else {
      throw new Error('Could not find header row. Make sure Row 5 contains column names like "UM NAME" and "ANP_MTD" starting at column M');
    }
  }
  
  if (!headers || headers.length === 0) {
    throw new Error(`Header row at index ${headerRowIndex} starting from column ${dataStartColumn} is empty or invalid`);
  }
  
  // Extract agency name from Leaders sheet
  // Check first few rows and columns (A-L, before column M where data starts)
  let agencyName: string | undefined;
  
  // Method 1: Check first row, first column (A1) - most common location
  if (lines.length > 0 && lines[0] && lines[0].length > 0) {
    const firstCell = (lines[0][0] || '').trim();
    if (firstCell && firstCell.length > 0 && !firstCell.toLowerCase().includes('um') && !firstCell.toLowerCase().includes('leader')) {
      agencyName = firstCell;
      console.log(`✓ Found agency name in A1: "${agencyName}"`);
    }
  }
  
  // Method 2: Check for "AGENCY_NAME" column header in columns before M (A-L)
  if (!agencyName && headerRowIndex >= 0) {
    const headerRow = lines[headerRowIndex];
    if (headerRow && headerRow.length > 0) {
      // Check columns A-L (indices 0-11) for agency name column
      for (let i = 0; i < Math.min(12, headerRow.length); i++) {
        const header = (headerRow[i] || '').toLowerCase().trim();
        if (header.includes('agency') && header.includes('name')) {
          // Found agency name column header, get value from first data row
          if (headerRowIndex + 1 < lines.length) {
            const firstDataRow = lines[headerRowIndex + 1];
            if (firstDataRow && firstDataRow.length > i) {
              const value = (firstDataRow[i] || '').trim();
              if (value && value.length > 0) {
                agencyName = value;
                console.log(`✓ Found agency name in column ${i} (header: "${headerRow[i]}"): "${agencyName}"`);
                break;
              }
            }
          }
        }
      }
    }
  }
  
  // Method 3: Check first few rows in column A for agency name pattern
  if (!agencyName) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const row = lines[i];
      if (row && row.length > 0) {
        const firstCell = (row[0] || '').trim();
        // Look for patterns like "Cebu Matunog Agency" or agency names
        if (firstCell && firstCell.length > 3 && 
            (firstCell.toLowerCase().includes('agency') || 
             firstCell.toLowerCase().includes('district') ||
             firstCell.match(/^[A-Z][a-z]+ [A-Z][a-z]+/))) {
          // Skip if it looks like a header or data label
          if (!firstCell.toLowerCase().includes('um') && 
              !firstCell.toLowerCase().includes('leader') &&
              !firstCell.toLowerCase().includes('name') &&
              !firstCell.toLowerCase().includes('anp')) {
            agencyName = firstCell;
            console.log(`✓ Found agency name in row ${i + 1}, column A: "${agencyName}"`);
            break;
          }
        }
      }
    }
  }
  
  if (agencyName) {
    console.log(`📌 Extracted Agency Name: "${agencyName}"`);
  } else {
    console.log(`⚠️ Could not extract agency name from Leaders sheet, will use default`);
  }
  
  // Data starts from the row after headers, and we only take columns from M onwards
  const dataRows = lines.slice(headerRowIndex + 1).map(row => row.slice(dataStartColumn));
  
  console.log(`=== Leaders CSV Headers (CSV index ${headerRowIndex}, starting from column ${dataStartColumn}) ===`);
  console.log('Total columns:', headers.length);
  console.log('First 20 headers:', headers.slice(0, 20).map((h, i) => `${i}: "${h}"`).join(', '));
  
  // Helper to convert index to Excel column letter
  const indexToColumnLetter = (index: number): string => {
    let result = '';
    let num = index;
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    }
    return result;
  };
  
  headers.forEach((h, i) => {
    const colIndex = dataStartColumn + i;
    const colLetter = indexToColumnLetter(colIndex);
    // Log first 30 columns and also check around Column AA (index 27, which is 15 from Column M) and Column CD (index 82, which is 70 from Column M)
    if (i < 30 || (i >= 13 && i <= 17) || (i >= 65 && i <= 75)) {
      console.log(`  Column ${i} (Sheet ${colLetter}, absolute index ${colIndex}): "${h}"`);
    }
  });
  if (headers.length > 30) {
    console.log(`  ... and ${headers.length - 30} more columns`);
  }
  
  // Specifically check Column P (absolute index 15, relative index 3 from Column M) for ANP_YTD
  const columnPRelativeIndex = 15 - dataStartColumn; // Column P = 15, relative to start column
  if (columnPRelativeIndex >= 0 && columnPRelativeIndex < headers.length) {
    const pHeader = headers[columnPRelativeIndex] || '';
    console.log(`\n=== Column P Check (absolute index 15, relative index ${columnPRelativeIndex}) ===`);
    console.log(`  Header at Column P: "${pHeader}"`);
    if (pHeader && (pHeader.toLowerCase().includes('anp') && pHeader.toLowerCase().includes('ytd'))) {
      console.log(`  ✓ Found ANP_YTD at Column P!`);
    } else {
      console.log(`  ⚠️ Column P header doesn't contain "anp" and "ytd" - might be different name`);
    }
  } else {
    console.log(`\n⚠️ Column P (index ${columnPRelativeIndex}) is out of range (headers.length = ${headers.length})`);
  }
  
  // Specifically check Column AA (absolute index 27 in 1-based, index 26 in 0-based) for FYP_MTD
  // Column AA absolute index = 27 (user specified)
  // Relative index from dataStartColumn = 27 - dataStartColumn - 1 (to convert to 0-based relative)
  const columnAARelativeIndex = 27 - dataStartColumn - 1; // Column AA = absolute index 27, convert to 0-based relative
  const columnAAAbsoluteIndex = dataStartColumn + columnAARelativeIndex;
  
  console.log(`\n🔍🔍🔍 COLUMN AA VERIFICATION 🔍🔍🔍`);
  console.log(`  dataStartColumn = ${dataStartColumn} (Column M)`);
  console.log(`  Column AA calculation: 27 - ${dataStartColumn} - 1 = ${columnAARelativeIndex} (relative index)`);
  console.log(`  Column AA absolute index: ${dataStartColumn} + ${columnAARelativeIndex} = ${columnAAAbsoluteIndex} (should be 27)`);
  
  if (columnAARelativeIndex >= 0 && columnAARelativeIndex < headers.length) {
    const aaHeader = headers[columnAARelativeIndex] || '';
    console.log(`\n=== Column AA Check (absolute index 27, relative index ${columnAARelativeIndex}) ===`);
    console.log(`  Header at Column AA: "${aaHeader}"`);
    
    // Show nearby columns to help identify the correct FYP column
    console.log(`  📊 Columns around Column AA (for reference):`);
    for (let i = Math.max(0, columnAARelativeIndex - 3); i <= Math.min(headers.length - 1, columnAARelativeIndex + 3); i++) {
      const hdr = headers[i] || '';
      const absIdx = dataStartColumn + i;
      const marker = i === columnAARelativeIndex ? ' 👈 THIS IS COLUMN AA' : '';
      console.log(`    Index ${i} (absolute ${absIdx}): "${hdr}"${marker}`);
    }
    
    // Check if this looks like FYP
    if (aaHeader && (aaHeader.toLowerCase().includes('fyp') || aaHeader.toLowerCase().includes('fypi'))) {
      console.log(`  ✓ Found FYP_MTD/FYPI_MTD at Column AA!`);
    } else {
      console.log(`  ⚠️ Column AA header doesn't contain "fyp" or "fypi" - might be different name`);
      console.log(`  💡 Looking for FYP columns in nearby indices...`);
      // Search for FYP in nearby columns
      for (let i = Math.max(0, columnAARelativeIndex - 5); i <= Math.min(headers.length - 1, columnAARelativeIndex + 5); i++) {
        const hdr = headers[i] || '';
        if (hdr && (hdr.toLowerCase().includes('fyp') || hdr.toLowerCase().includes('fypi'))) {
          const absIdx = dataStartColumn + i;
          console.log(`    Found FYP column at index ${i} (absolute ${absIdx}): "${hdr}"`);
        }
      }
    }
  } else {
    console.log(`\n⚠️ Column AA (index ${columnAARelativeIndex}) is out of range (headers.length = ${headers.length})`);
  }
  console.log(`🔍🔍🔍 END COLUMN AA VERIFICATION 🔍🔍🔍\n`);
  
  // Specifically check Column AE (absolute index 31, relative index 19 from Column M) for FYP_YTD
  const columnAERelativeIndex = 31 - dataStartColumn; // Column AE = 31, relative to start column
  if (columnAERelativeIndex >= 0 && columnAERelativeIndex < headers.length) {
    const aeHeader = headers[columnAERelativeIndex] || '';
    console.log(`\n=== Column AE Check (absolute index 31, relative index ${columnAERelativeIndex}) ===`);
    console.log(`  Header at Column AE: "${aeHeader}"`);
    if (aeHeader && (aeHeader.toLowerCase().includes('fyp') || aeHeader.toLowerCase().includes('fypi')) && aeHeader.toLowerCase().includes('ytd')) {
      console.log(`  ✓ Found FYP_YTD/FYPI_YTD at Column AE!`);
    } else {
      console.log(`  ⚠️ Column AE header doesn't contain "fyp"/"fypi" and "ytd" - might be different name`);
    }
  } else {
    console.log(`\n⚠️ Column AE (index ${columnAERelativeIndex}) is out of range (headers.length = ${headers.length})`);
  }
  
  // Specifically check Column CD (absolute index 82, relative index 70 from Column M) for CASECNT_MTD
  const columnCDRelativeIndex = 82 - dataStartColumn; // Column CD = 82, relative to start column
  if (columnCDRelativeIndex >= 0 && columnCDRelativeIndex < headers.length) {
    const cdHeader = headers[columnCDRelativeIndex] || '';
    console.log(`\n=== Column CD Check (absolute index 82, relative index ${columnCDRelativeIndex}) ===`);
    console.log(`  Header at Column CD: "${cdHeader}"`);
    if (cdHeader && cdHeader.toLowerCase().includes('casecnt')) {
      console.log(`  ✓ Found CASECNT_MTD at Column CD!`);
    } else {
      console.log(`  ⚠️ Column CD header doesn't contain "casecnt" - might be different name`);
    }
  } else {
    console.log(`\n⚠️ Column CD (index ${columnCDRelativeIndex}) is out of range (headers.length = ${headers.length})`);
  }
  
  // Specifically check Column DF (absolute index 110, relative index 98 from Column M) for FYC_YTD
  const columnDFRelativeIndex = 110 - dataStartColumn; // Column DF = 110, relative to start column
  if (columnDFRelativeIndex >= 0 && columnDFRelativeIndex < headers.length) {
    const dfHeader = headers[columnDFRelativeIndex] || '';
    console.log(`\n=== Column DF Check (absolute index 110, relative index ${columnDFRelativeIndex}) ===`);
    console.log(`  Header at Column DF: "${dfHeader}"`);
    if (dfHeader && dfHeader.toLowerCase().includes('fyc') && dfHeader.toLowerCase().includes('ytd')) {
      console.log(`  ✓ Found FYC_YTD at Column DF!`);
    } else {
      console.log(`  ⚠️ Column DF header doesn't contain "fyc" and "ytd" - might be different name`);
    }
  } else {
    console.log(`\n⚠️ Column DF (index ${columnDFRelativeIndex}) is out of range (headers.length = ${headers.length})`);
  }
  console.log(`Data rows start from CSV index ${headerRowIndex + 1}, ${dataRows.length} rows available`);
  
  // Find which columns match our expected names
  const findColumnIndex = (name: string): number => {
    const normalizedName = name.toLowerCase().trim();
    return headers.findIndex(h => {
      const normalizedHeader = h.toLowerCase().trim();
      return normalizedHeader === normalizedName;
    });
  };
  
  // Find ANP column - Column O (index 2 from M) should have "ANP_MTD"
  // Structure: Row 5 has actual headers, Column O = ANP_MTD, Column DD = FYC_MTD
  const findAnpColumn = (): number[] => {
    // First try exact matches
    const exactMatches = ['ANP_MTD', 'ANP MTD', 'ANPMTD'].map(findColumnIndex).filter(i => i >= 0);
    if (exactMatches.length > 0) return exactMatches;
    
    // Look for headers that contain both "ANP" and "MTD" together (case-insensitive)
    // Must NOT contain "MANPOWER" (to exclude "MANPOWER COUNT")
    // Must NOT contain "FYC" or "FYP" (to exclude FYC_MTD and FYP columns)
    const anpMtdHeaders = headers.map((h, i) => ({ index: i, header: h })).filter(({ header }) => {
      if (!header) return false;
      const lower = header.toLowerCase();
      return lower.includes('anp') && 
             lower.includes('mtd') && 
             !lower.includes('manpower') &&
             !lower.includes('fyc') &&
             !lower.includes('fyp');
    }).map(({ index }) => index);
    
    if (anpMtdHeaders.length > 0) return anpMtdHeaders;
    
    // Fallback: Use column position 2 (Column O) if it exists and doesn't contain FYC/FYP
    // Also check Column P (index 3) should be "YTD" for context (ANP_YTD)
    if (headers.length > 3) {
      const colOHeader = (headers[2] || '').toLowerCase();
      const colPHeader = (headers[3] || '').toLowerCase();
      const hasYtdNext = colPHeader === 'ytd' || colPHeader.includes('ytd');
      
      // Only use if:
      // 1. It doesn't contain FYC or FYP
      // 2. It's "MTD" with "YTD" next to it (ANP context), OR it contains "ANP"
      const looksLikeAnp = colOHeader.includes('anp') || 
                           (colOHeader === 'mtd' && hasYtdNext);
      
      if (!colOHeader.includes('fyc') && !colOHeader.includes('fyp') && looksLikeAnp) {
        return [2]; // Column O = index 2 from column M
      }
    }
    
    return [];
  };
  
  // Helper to check if a column matches FYP_MTD/FYPI_MTD (including position fallback for Column AA)
  const findFypColumn = (): number[] => {
    // First try name matching
    const nameMatches = ['FYPI_MTD', 'FYPI MTD', 'FYP_MTD', 'FYP MTD', 'FYP', 'FYPI'].map(findColumnIndex).filter(i => i >= 0);
    if (nameMatches.length > 0) {
      return nameMatches;
    }
    
    // Fallback: Check Column AA position if it's in range (Column AA = absolute index 27)
    // Note: columnAARelativeIndex is already calculated as 27 - dataStartColumn - 1 above (adjusted for off-by-one)
    if (columnAARelativeIndex >= 0 && columnAARelativeIndex < headers.length) {
      const aaHeader = headers[columnAARelativeIndex] || '';
      // Even if header doesn't match exactly, if it's Column AA, use it as FYP_MTD
      console.log(`  Using Column AA (absolute index 27, relative index ${columnAARelativeIndex}, header "${aaHeader}") as FYP_MTD fallback`);
      return [columnAARelativeIndex];
    }
    
    return [];
  };
  
  // Helper to check if a column matches CASECNT_MTD (including position fallback for Column CD)
  const findCasesColumn = (): number[] => {
    // First try name matching
    const nameMatches = ['CASECNT_MTD', 'CASECNT MTD', 'CASECNT', 'CASECNT_YTD', 'CASECNT YTD'].map(findColumnIndex).filter(i => i >= 0);
    if (nameMatches.length > 0) {
      return nameMatches;
    }
    
    // Fallback: Check Column CD position if it's in range
    if (columnCDRelativeIndex >= 0 && columnCDRelativeIndex < headers.length) {
      const cdHeader = headers[columnCDRelativeIndex] || '';
      // Even if header doesn't match exactly, if it's Column CD, use it as CASECNT_MTD
      console.log(`  Using Column CD (absolute index 82, relative index ${columnCDRelativeIndex}, header "${cdHeader}") as CASECNT_MTD fallback`);
      return [columnCDRelativeIndex];
    }
    
    return [];
  };
  
  const columnMatches = {
    leaderName: ['LEADER_UM_NAME', 'LEADER UM NAME', 'LEADERUMNAME', 'UM NAME', 'UM Name', 'UM_NAME', 'Leader Name', 'LEADER NAME', 'AGENT NAME'].map(findColumnIndex).filter(i => i >= 0),
    anp: findAnpColumn(),
    cases: findCasesColumn(),
    newRecruits: ['NEW_RECRUIT', 'NEW_RECRUITS', 'NEW_RECRUIT_MTD', 'NEW_RECRUIT MTD', 'NEW_RECRUITS_FTM', 'NEW_RECRUIT_YTD'].map(findColumnIndex).filter(i => i >= 0),
    fyp: findFypColumn(),
    fyc: ['FYC_MTD', 'FYC MTD', 'FYC'].map(findColumnIndex).filter(i => i >= 0),
  };
  
  console.log('=== Column Matches ===');
  console.log('Column matches found:', {
    leaderName: columnMatches.leaderName.length > 0 ? `Column ${columnMatches.leaderName[0]} ("${headers[columnMatches.leaderName[0]]}")` : 'NOT FOUND',
    anp: columnMatches.anp.length > 0 ? `Column ${columnMatches.anp[0]} ("${headers[columnMatches.anp[0]]}")` : 'NOT FOUND',
    cases: columnMatches.cases.length > 0 ? `Column ${columnMatches.cases[0]} ("${headers[columnMatches.cases[0]]}")` : 'NOT FOUND',
    newRecruits: columnMatches.newRecruits.length > 0 ? `Column ${columnMatches.newRecruits[0]} ("${headers[columnMatches.newRecruits[0]]}")` : 'NOT FOUND',
    fyp: columnMatches.fyp.length > 0 ? `Column ${columnMatches.fyp[0]} ("${headers[columnMatches.fyp[0]]}")` : 'NOT FOUND',
    fyc: columnMatches.fyc.length > 0 ? `Column ${columnMatches.fyc[0]} ("${headers[columnMatches.fyc[0]]}")` : 'NOT FOUND',
  });
  
  // Show all headers that contain "ANP" or "CASE" for debugging
  // IMPORTANT: Don't match "MANPOWER COUNT" - it contains "ANP" but it's not the ANP column
  // Look for headers that contain "ANP" AND are NOT "MANPOWER"
  const anpHeaders = headers.map((h, i) => ({ index: i, header: h })).filter(({ header }) => {
    if (!header) return false;
    const lower = header.toLowerCase();
    // Must contain "anp" but NOT "manpower" (to exclude "MANPOWER COUNT")
    return lower.includes('anp') && !lower.includes('manpower');
  });
  const caseHeaders = headers.map((h, i) => ({ index: i, header: h })).filter(({ header }) => 
    header && (header.toLowerCase().includes('case') || header.toLowerCase().includes('recruit'))
  );
  
  // Also check for FYC/FYP columns to see where they are (to avoid reading from them)
  const fycHeaders = headers.map((h, i) => ({ index: i, header: h })).filter(({ header }) => {
    if (!header) return false;
    const lower = header.toLowerCase();
    return lower.includes('fyc') || (lower.includes('mtd') && lower.includes('fyc'));
  });
  const fypHeaders = headers.map((h, i) => ({ index: i, header: h })).filter(({ header }) => {
    if (!header) return false;
    const lower = header.toLowerCase();
    return lower.includes('fyp') || (lower.includes('mtd') && lower.includes('fyp'));
  });
  
  // Find all columns with "MTD" to see the pattern
  const mtdHeaders = headers.map((h, i) => ({ index: i, header: h })).filter(({ header }) => {
    if (!header) return false;
    const lower = header.toLowerCase();
    return lower === 'mtd' || lower.includes('mtd');
  });
  
  if (anpHeaders.length > 0) {
    console.log('Headers containing "ANP":', anpHeaders.map(({ index, header }) => `Column ${index}: "${header}"`).join(', '));
  }
  if (caseHeaders.length > 0) {
    console.log('Headers containing "CASE" or "RECRUIT":', caseHeaders.map(({ index, header }) => `Column ${index}: "${header}"`).join(', '));
  }
  if (fycHeaders.length > 0) {
    console.log('⚠️ Headers containing "FYC":', fycHeaders.map(({ index, header }) => `Column ${index}: "${header}"`).join(', '));
    console.log('   Column O (index 2) should NOT be FYC. If Column 2 is in this list, we have a problem!');
  }
  if (fypHeaders.length > 0) {
    console.log('Headers containing "FYP":', fypHeaders.map(({ index, header }) => `Column ${index}: "${header}"`).join(', '));
  }
  if (mtdHeaders.length > 0) {
    console.log('📋 All headers containing "MTD" (first 10):', mtdHeaders.slice(0, 10).map(({ index, header }) => `Column ${index}: "${header}"`).join(', '));
    console.log(`   Total MTD columns found: ${mtdHeaders.length}`);
    console.log(`   Column 2 header: "${headers[2] || 'N/A'}", Column 3 header: "${headers[3] || 'N/A'}"`);
    
    // Calculate actual sheet column letters for reference
    // Column M = index 12, Column O = index 14 (index 2 from M), Column DD = index 107 (index 95 from M)
    // NOTE: Hidden columns are excluded from CSV export, so Column DD might be at a different index!
    const colOIndex = 2; // Index 2 from Column M = Column O
    console.log(`   Expected: Column O (index 2 from M) = ANP_MTD`);
    console.log(`   Note: Hidden columns are excluded from CSV, so Column DD (FYC_MTD) position may vary`);
    
    // Find where FYC_MTD actually is (since hidden columns shift indices)
    const fycMtdIndex = headers.findIndex(h => {
      if (!h) return false;
      const hLower = h.toLowerCase();
      return hLower.includes('fyc') && hLower.includes('mtd');
    });
    
    if (fycMtdIndex >= 0) {
      const colDDHeader = headers[fycMtdIndex] || '';
      console.log(`   ✓ Found FYC_MTD at index ${fycMtdIndex}: "${colDDHeader}"`);
      console.log(`   Column O (index 2) should be ANP_MTD, NOT FYC_MTD`);
      if (fycMtdIndex === colOIndex) {
        console.error(`   ⚠️ ERROR: FYC_MTD is at index ${fycMtdIndex}, which is Column O!`);
        console.error(`   This means Column O contains FYC_MTD, not ANP_MTD!`);
      } else {
        console.log(`   ✓ FYC_MTD is at index ${fycMtdIndex}, Column O is at index ${colOIndex} - different columns (good)`);
      }
    } else {
      console.log(`   ⚠️ FYC_MTD not found in headers - might be named differently or not in CSV`);
    }
  }
  
  // Check if Column O (index 2) might actually be FYC
  if (headers.length > 2) {
    const colOHeader = headers[2] || '';
    const colOHeaderLower = colOHeader.toLowerCase();
    if (colOHeaderLower.includes('fyc') || colOHeaderLower.includes('fyp')) {
      console.error('⚠️ ERROR: Column O (index 2) contains FYC/FYP! This is wrong!');
      console.error(`   Column O header: "${colOHeader}"`);
      console.error('   Column O should be ANP_MTD, not FYC_MTD');
      console.error('   This suggests the CSV export might be reading from the wrong row or column');
    } else {
      console.log(`✓ Column O (index 2) header: "${colOHeader}" - does NOT contain FYC/FYP (good)`);
    }
  }
  
  if (columnMatches.leaderName.length === 0) {
    console.error('⚠️ ERROR: Could not find UM NAME column!');
    console.error('Available headers:', headers.slice(0, 20).join(', '));
  }
  if (columnMatches.anp.length === 0) {
    console.error('⚠️ ERROR: Could not find ANP_MTD column!');
    console.error('Searching for headers containing "ANP"...');
  }
  if (columnMatches.cases.length === 0) {
    console.error('⚠️ ERROR: Could not find CASECNT_MTD column!');
    console.error('Searching for headers containing "CASECNT" or "CASE"...');
    // Show all headers that might be related
    const allCaseHeaders = headers.map((h, i) => ({ index: i, header: h })).filter(({ header }) => {
      if (!header) return false;
      const lower = header.toLowerCase();
      return lower.includes('casecnt') || (lower.includes('case') && !lower.includes('new'));
    });
    if (allCaseHeaders.length > 0) {
      console.error('Found headers that might be cases:', allCaseHeaders.map(({ index, header }) => `Column ${index}: "${header}"`).join(', '));
    } else {
      console.error('No headers found containing "CASECNT" or "CASE"');
      console.error('First 30 headers:', headers.slice(0, 30).map((h, i) => `[${i}]="${h || ''}"`).join(', '));
    }
  } else {
    console.log(`✓ Found cases column (CASECNT_MTD) at index ${columnMatches.cases[0]}: "${headers[columnMatches.cases[0]]}"`);
  }
  
  if (columnMatches.newRecruits.length === 0) {
    console.warn('⚠️ WARNING: Could not find NEW_RECRUIT column!');
    console.warn('Searching for headers containing "NEW_RECRUIT" or "NEW RECRUIT"...');
    // Show all headers that might be related
    const allNewRecruitHeaders = headers.map((h, i) => ({ index: i, header: h })).filter(({ header }) => {
      if (!header) return false;
      const lower = header.toLowerCase();
      return lower.includes('new') && (lower.includes('recruit') || lower.includes('rec'));
    });
    if (allNewRecruitHeaders.length > 0) {
      console.warn('Found headers that might be new recruits:', allNewRecruitHeaders.map(({ index, header }) => `Column ${index}: "${header}"`).join(', '));
    }
  } else {
    console.log(`✓ Found new recruits column (NEW_RECRUIT) at index ${columnMatches.newRecruits[0]}: "${headers[columnMatches.newRecruits[0]]}"`);
  }
  
  if (columnMatches.fyp.length === 0) {
    console.warn('⚠️ WARNING: Could not find FYPI_MTD column!');
    console.warn('Searching for headers containing "FYP" or "FYPI"...');
    const allFypHeaders = headers.map((h, i) => ({ index: i, header: h })).filter(({ header }) => {
      if (!header) return false;
      const lower = header.toLowerCase();
      return lower.includes('fyp') || lower.includes('fypi');
    });
    if (allFypHeaders.length > 0) {
      console.warn('Found headers that might be FYP:', allFypHeaders.map(({ index, header }) => `Column ${index}: "${header}"`).join(', '));
    }
  } else {
    console.log(`✓ Found FYP column (FYPI_MTD) at index ${columnMatches.fyp[0]}: "${headers[columnMatches.fyp[0]]}"`);
  }
  
  if (columnMatches.fyc.length === 0) {
    console.warn('⚠️ WARNING: Could not find FYC_MTD column!');
    console.warn('Searching for headers containing "FYC"...');
    const allFycHeaders = headers.map((h, i) => ({ index: i, header: h })).filter(({ header }) => {
      if (!header) return false;
      const lower = header.toLowerCase();
      return lower.includes('fyc');
    });
    if (allFycHeaders.length > 0) {
      console.warn('Found headers that might be FYC:', allFycHeaders.map(({ index, header }) => `Column ${index}: "${header}"`).join(', '));
    }
  } else {
    console.log(`✓ Found FYC column (FYC_MTD) at index ${columnMatches.fyc[0]}: "${headers[columnMatches.fyc[0]]}"`);
  }
  
  const leaders: Leader[] = [];
  const scoringInfoByLeader: Array<{ name: string; scoring: any }> = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const csvRowNumber = headerRowIndex + 1 + i + 1; // CSV row number (1-based)
    
    // Skip completely empty rows
    if (!row || row.length === 0 || row.every(cell => !cell || cell.trim() === '')) {
      console.log(`Skipped CSV row ${csvRowNumber} (completely empty)`);
      continue;
    }
    
    // Skip header rows (including hidden header rows) - check if row looks like a header
    if (isHeaderRow(row, headers)) {
      console.log(`Skipped CSV row ${csvRowNumber} (header row):`, row.slice(0, 5).map(c => `"${c || ''}"`).join(', '));
      continue;
    }
    
    // Log every row being processed for debugging
    console.log(`\n=== Processing CSV row ${csvRowNumber} (data row ${i + 1}/${dataRows.length}) ===`);
    console.log(`First 5 cells:`, row.slice(0, 5).map((c, idx) => `[${idx}]="${c || ''}"`).join(', '));

    // Debug: Show raw row data for first few rows
    if (i < 3) {
      console.log(`\n=== Processing CSV row ${csvRowNumber} ===`);
      console.log(`First 10 cells:`, row.slice(0, 10).map((c, idx) => `[${idx}]="${c}"`).join(', '));
    }

    const result = mapRowToLeader(headers, row, dataStartColumn);
    
    // AI ENHANCEMENT: Always try AI matching if:
    // 1. ANP not found (anpActual === 0), OR
    // 2. Traditional matching found something but it might be wrong (marked for AI verification)
    if (result.leader && dataRows.length > 0) {
      const needsAI = result.leader.anpActual === 0 || (result.scoringInfo && (result.scoringInfo as any).__useAIMatching === true);
      
      if (needsAI) {
        console.log(`🤖 ${result.leader.anpActual === 0 ? 'Traditional matching failed' : 'Verifying with AI matching'} for "${result.leader.name}"...`);
        
        // Build rowData for AI matcher
        const rowData: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowData[h] = row[idx] || '';
        });
        
        // Find FYC index and value for AI matcher
        const fycMtdIndex = headers.findIndex(h => {
          if (!h) return false;
          const hLower = h.toLowerCase().trim();
          return (hLower.includes('fyc') && hLower.includes('mtd')) ||
                 hLower === 'fyc_mtd' || hLower === 'fyc mtd';
        });
        const fycValue = fycMtdIndex >= 0 ? parseFloat((rowData[headers[fycMtdIndex]] || '').replace(/,/g, '')) || 0 : 0;
        
        console.log(`   FYC_MTD found at index ${fycMtdIndex >= 0 ? fycMtdIndex : 'NOT FOUND'}, value: ${fycValue}`);
        console.log(`   Current ANP value: ${result.leader.anpActual}`);
        
        // Use AI matcher
        const aiResult = findBestAnpColumn(headers, rowData, dataRows, fycMtdIndex >= 0 ? fycMtdIndex : undefined, fycValue);
        
        if (aiResult && aiResult.confidence > 0.3) {
          console.log(`✅ AI found ANP column: Column ${aiResult.index} ("${aiResult.header}") with ${(aiResult.confidence * 100).toFixed(0)}% confidence`);
          console.log(`   Reasoning: ${aiResult.reasoning}`);
          console.log(`   AI ANP value: ${aiResult.value}, Traditional ANP value: ${result.leader.anpActual}`);
          
          // Use AI result if:
          // 1. Traditional matching found nothing (anpActual === 0), OR
          // 2. AI confidence is high (>70%) and values differ significantly
          if (result.leader.anpActual === 0 || (aiResult.confidence > 0.7 && Math.abs(aiResult.value - result.leader.anpActual) > 1000)) {
            console.log(`   ✅ Using AI result (${aiResult.value}) instead of traditional result (${result.leader.anpActual})`);
            result.leader.anpActual = aiResult.value;
            // Update scoring info
            if (result.scoringInfo) {
              result.scoringInfo.bestMatch = {
                index: aiResult.index,
                header: aiResult.header,
                score: aiResult.confidence * 100,
                value: aiResult.value,
              };
              result.scoringInfo.aiUsed = true;
              result.scoringInfo.aiReasoning = aiResult.reasoning;
            }
          } else {
            console.log(`   ⚠️ Keeping traditional result (${result.leader.anpActual}) - AI confidence too low or values similar`);
          }
        } else {
          console.log(`⚠️ AI matching failed (confidence: ${aiResult?.confidence || 0})`);
          if (aiResult) {
            console.log(`   AI suggested: Column ${aiResult.index} ("${aiResult.header}") with value ${aiResult.value}`);
          }
        }
      }
    }
    
    if (result.leader) {
      leaders.push(result.leader);
      
      // Capture scoring info from mapRowToLeader
      if (result.scoringInfo) {
        scoringInfoByLeader.push({
          name: result.leader.name,
          scoring: result.scoringInfo,
        });
      }
          // Log first few leaders for debugging with detailed column info
          if (leaders.length <= 3) {
            const leaderNameCol = headers.findIndex(h => h && h.toLowerCase().includes('leader') && h.toLowerCase().includes('um'));
            const anpCol = headers.findIndex(h => {
              if (!h) return false;
              const hLower = h.toLowerCase();
              return (hLower.includes('anp') && hLower.includes('mtd') && !hLower.includes('fyc') && !hLower.includes('fyp')) ||
                     (hLower === 'anp_mtd' || hLower === 'anp mtd');
            });
            // Also check column position 2 (Column O) and find FYC_MTD dynamically (hidden columns shift indices)
            const colOIndex = 2;
            const colOHeader = headers[colOIndex] || '';
            const colOValue = parseFloat((row[colOIndex] || '').replace(/,/g, '')) || 0;
            
            // Find where FYC_MTD actually is (since hidden columns shift indices)
            const fycMtdIndex = headers.findIndex(h => {
              if (!h) return false;
              const hLower = h.toLowerCase();
              return hLower.includes('fyc') && hLower.includes('mtd');
            });
            
            console.log(`✓ Leader ${leaders.length} (CSV row ${csvRowNumber}):`, {
              name: result.leader.name,
              anpActual: result.leader.anpActual,
              casesActual: result.leader.casesActual || 0,
              recruitsActual: result.leader.recruitsActual,
              fypActual: result.leader.fypActual || 0,
              fycActual: result.leader.fycActual || 0,
            });
            console.log(`  - Leader name from column ${leaderNameCol} ("${headers[leaderNameCol] || 'N/A'}") = "${row[leaderNameCol] || ''}"`);
            if (anpCol >= 0) {
              console.log(`  - ANP from column ${anpCol} ("${headers[anpCol]}") = "${row[anpCol] || ''}"`);
            }
            // Debug cases column (CASECNT_MTD)
            const caseColIndex = columnMatches.cases.length > 0 ? columnMatches.cases[0] : -1;
            if (caseColIndex >= 0) {
              const caseValue = parseFloat((row[caseColIndex] || '').replace(/,/g, '')) || 0;
              const rawCaseValue = row[caseColIndex] || '';
              console.log(`  - Cases (CASECNT_MTD) from column ${caseColIndex} ("${headers[caseColIndex]}") = "${rawCaseValue}" (parsed: ${caseValue})`);
              console.log(`  - casesActual in leader object: ${result.leader.casesActual || 0}`);
              if (caseValue > 0 && (result.leader.casesActual || 0) === 0) {
                console.log(`  ⚠️ WARNING: Cases column has value ${caseValue} but casesActual is 0!`);
                console.log(`  - Checking findColumnValue matching...`);
                // Try to manually find the value
                const rowData: Record<string, string> = {};
                headers.forEach((h, idx) => {
                  rowData[h] = row[idx] || '';
                });
                const foundValue = findColumnValue(rowData, [
                  'CASECNT_MTD', 'CASECNT MTD', 'CASECNT_YTD', 'CASECNT YTD',
                  'CASECNT_EX_AH_MTD', 'CASECNT_EX_AH_YTD',
                  'Cases MTD', 'Cases_MTD', 'CASECNT', 'Cases'
                ]);
                console.log(`  - findColumnValue returned: "${foundValue}"`);
              } else if (caseValue === 0 && (result.leader.casesActual || 0) === 0) {
                console.log(`  - Both column value and casesActual are 0 - this leader has no cases`);
              } else {
                console.log(`  ✓ Cases value matches: ${caseValue} = ${result.leader.casesActual || 0}`);
              }
            } else {
              console.log(`  ⚠️ Cases column (CASECNT_MTD) NOT FOUND in columnMatches!`);
              // Try to find it manually
              const allCaseCols = headers.map((h, idx) => ({ index: idx, header: h, value: row[idx] })).filter(({ header }) => {
                if (!header) return false;
                const lower = header.toLowerCase();
                return lower.includes('casecnt') || (lower.includes('case') && !lower.includes('new'));
              });
              if (allCaseCols.length > 0) {
                console.log(`  Found potential case columns manually:`, allCaseCols.map(({ index, header, value }) => 
                  `Column ${index} ("${header}"): "${value}"`
                ).join(', '));
              } else {
                console.log(`  No columns found containing "CASECNT" or "CASE"`);
              }
            }
            
            // Debug new recruits column (NEW_RECRUIT)
            const newRecruitColIndex = columnMatches.newRecruits.length > 0 ? columnMatches.newRecruits[0] : -1;
            if (newRecruitColIndex >= 0) {
              const newRecruitValue = parseFloat((row[newRecruitColIndex] || '').replace(/,/g, '')) || 0;
              console.log(`  - New Recruits (NEW_RECRUIT) from column ${newRecruitColIndex} ("${headers[newRecruitColIndex]}") = "${row[newRecruitColIndex] || ''}" (parsed: ${newRecruitValue})`);
              if (newRecruitValue > 0 && result.leader.recruitsActual === 0) {
                console.log(`  ⚠️ WARNING: New Recruit column has value ${newRecruitValue} but recruitsActual is 0!`);
              }
            } else {
              console.log(`  ⚠️ New Recruits column (NEW_RECRUIT) NOT FOUND!`);
            }
            console.log(`  - Column O (index 2) header: "${colOHeader}", value: "${colOValue}"`);
            
            // Show scoring info if available
            if (result.scoringInfo) {
              console.log(`  📊 ANP Scoring Info:`);
              if (result.scoringInfo.bestMatch) {
                console.log(`    Best Match: Column ${result.scoringInfo.bestMatch.index} ("${result.scoringInfo.bestMatch.header}") - Score: ${result.scoringInfo.bestMatch.score}`);
              }
              if (result.scoringInfo.potentialColumns && result.scoringInfo.potentialColumns.length > 0) {
                console.log(`    All potential columns:`, result.scoringInfo.potentialColumns.map((c: any) => 
                  `Column ${c.index} ("${c.header}", score ${c.score})`
                ).join(', '));
              }
            }
            
            if (fycMtdIndex >= 0) {
              const colDDHeader = headers[fycMtdIndex] || '';
              const colDDValue = parseFloat((row[fycMtdIndex] || '').replace(/,/g, '')) || 0;
              console.log(`  - FYC_MTD found at index ${fycMtdIndex}: "${colDDHeader}", value: "${colDDValue}"`);
              
              // Compare values to see which column matches the ANP value
              const matchesColO = Math.abs(colOValue - result.leader.anpActual) < 1;
              const matchesColDD = Math.abs(colDDValue - result.leader.anpActual) < 1;
              
              if (matchesColDD && !matchesColO) {
                console.log(`  ⚠️ ERROR: ANP value ${result.leader.anpActual} matches FYC_MTD (${colDDValue}) but NOT Column O (${colOValue})!`);
                console.log(`     We are reading from the wrong column! Should read from Column O, not FYC_MTD!`);
              } else if (matchesColO && !matchesColDD) {
                console.log(`  ✓ Verified: ANP value ${result.leader.anpActual} matches Column O (${colOValue}), not FYC_MTD (${colDDValue})`);
              } else if (matchesColO && matchesColDD) {
                console.log(`  ⚠️ WARNING: ANP value ${result.leader.anpActual} matches BOTH Column O and FYC_MTD!`);
                console.log(`     Column O: ${colOValue}, FYC_MTD: ${colDDValue}`);
              }
            } else {
              console.log(`  - FYC_MTD not found in headers (might be named differently)`);
            }
            if (colOHeader.toLowerCase().includes('fyc') || colOHeader.toLowerCase().includes('fyp')) {
              console.log(`  ⚠️ WARNING: Column O contains FYC/FYP! This might be wrong column.`);
            }
            // Also check what value is actually being used for ANP
            if (result.leader.anpActual > 0) {
              const anpColIndex = headers.findIndex(h => {
                if (!h) return false;
                const hLower = h.toLowerCase();
                return (hLower.includes('anp') && hLower.includes('mtd') && !hLower.includes('fyc') && !hLower.includes('fyp')) ||
                       (hLower === 'anp_mtd' || hLower === 'anp mtd') ||
                       (hLower === 'mtd' && headers[3] && headers[3].toLowerCase().includes('ytd'));
              });
              if (anpColIndex >= 0) {
                console.log(`  - ANP value ${result.leader.anpActual} read from column ${anpColIndex} ("${headers[anpColIndex]}")`);
              } else {
                console.log(`  - ANP value ${result.leader.anpActual} read from column position fallback (index 2)`);
                // Verify the value matches Column O, not FYC_MTD
                if (fycMtdIndex >= 0) {
                  const colDDValue = parseFloat((row[fycMtdIndex] || '').replace(/,/g, '')) || 0;
                  if (Math.abs(colDDValue - result.leader.anpActual) < 1 && Math.abs(colOValue - result.leader.anpActual) > 1) {
                    console.log(`  ⚠️ ERROR: Value ${result.leader.anpActual} matches FYC_MTD (${colDDValue}) but NOT Column O (${colOValue})!`);
                    console.log(`     We are reading from the wrong column!`);
                  } else if (Math.abs(colOValue - result.leader.anpActual) < 1) {
                    console.log(`  ✓ Verified: Value ${result.leader.anpActual} matches Column O (${colOValue})`);
                  }
                } else {
                  // FYC_MTD not found, just verify Column O
                  if (Math.abs(colOValue - result.leader.anpActual) < 1) {
                    console.log(`  ✓ Verified: Value ${result.leader.anpActual} matches Column O (${colOValue})`);
                  } else {
                    console.log(`  ⚠️ WARNING: Value ${result.leader.anpActual} does NOT match Column O (${colOValue})`);
                  }
                }
              }
            }
          }
        } else {
          console.log(`✗ Skipped CSV row ${csvRowNumber} (no valid leader name)`);
          // Show why it was skipped
          const firstCell = row[0] || '';
          const leaderNameCol = headers.findIndex(h => h && (h.toLowerCase().includes('leader') || h.toLowerCase().includes('um')));
          const leaderNameValue = leaderNameCol >= 0 ? row[leaderNameCol] : 'N/A';
          console.log(`  First cell value: "${firstCell}"`);
          console.log(`  Leader name column (${leaderNameCol}): "${leaderNameValue}"`);
          console.log(`  Looking for column matching: LEADER_UM_NAME, UM NAME, etc.`);
          console.log(`  Available headers (first 5):`, headers.slice(0, 5).map((h, i) => `[${i}]="${h || ''}"`).join(', '));
        }
  }

  console.log(`=== Loaded ${leaders.length} leaders from CSV ===`);
  let totalAnp = 0;
  let totalCases = 0;
  let totalNewRecruits = 0;
  let totalFyp = 0;
  let totalFyc = 0;
  if (leaders.length > 0) {
    totalAnp = leaders.reduce((sum, l) => sum + (l.anpActual || 0), 0);
    totalCases = leaders.reduce((sum, l) => sum + (l.casesActual || 0), 0);
    totalNewRecruits = leaders.reduce((sum, l) => sum + (l.recruitsActual || 0), 0);
    totalFyp = leaders.reduce((sum, l) => sum + ((l as any).fypActual || 0), 0);
    totalFyc = leaders.reduce((sum, l) => sum + ((l as any).fycActual || 0), 0);
    console.log(`Totals: ANP=${totalAnp}, Cases=${totalCases}, New Recruits=${totalNewRecruits}, FYP=${totalFyp}, FYC=${totalFyc}`);
  } else {
    console.warn('⚠️ WARNING: No leaders were loaded! Check column names match.');
  }
  
      // Find FYC_MTD column index for debugging (hidden columns shift indices)
      // Search more broadly since CSV might have different header names
      let fycMtdIndex = headers.findIndex(h => {
        if (!h) return false;
        const hLower = h.toLowerCase().trim();
        return (hLower.includes('fyc') && hLower.includes('mtd')) ||
               hLower === 'fyc_mtd' || hLower === 'fyc mtd' || hLower === 'fycmtd';
      });
      
      // If not found, try finding any FYC column
      if (fycMtdIndex < 0) {
        fycMtdIndex = headers.findIndex(h => {
          if (!h) return false;
          const hLower = h.toLowerCase();
          return hLower.includes('fyc') && !hLower.includes('fyp');
        });
      }
      
      // Get Column O info for comparison
      const colOIndex = 2;
      const colOHeader = headers.length > colOIndex ? headers[colOIndex] || '' : '';
      const colPHeader = headers.length > 3 ? headers[3] || '' : '';
      
      // Return debug info for client-side display
      return { 
        leaders, 
        headers,
        agencyName,
        debug: {
          headers: headers,
          firstFewHeaders: headers.slice(0, 20),
          columnMatches: {
            leaderName: columnMatches.leaderName.length > 0 ? `Column ${columnMatches.leaderName[0]} ("${headers[columnMatches.leaderName[0]]}")` : 'NOT FOUND',
            anp: columnMatches.anp.length > 0 ? `Column ${columnMatches.anp[0]} ("${headers[columnMatches.anp[0]]}")` : 'NOT FOUND',
            cases: columnMatches.cases.length > 0 ? `Column ${columnMatches.cases[0]} ("${headers[columnMatches.cases[0]]}")` : 'NOT FOUND',
          },
          anpHeaders: anpHeaders.map(({ index, header }) => `Column ${index}: "${header}"`),
          caseHeaders: caseHeaders.map(({ index, header }) => `Column ${index}: "${header}"`),
          fycMtdIndex: fycMtdIndex >= 0 ? fycMtdIndex : null,
          fycMtdHeader: fycMtdIndex >= 0 ? headers[fycMtdIndex] : null,
          columnOInfo: {
            index: colOIndex,
            header: colOHeader,
            nextHeader: colPHeader,
          },
          sampleLeaders: leaders.slice(0, 3).map((l) => {
            // Get scoring info for this leader
            const scoringInfo = scoringInfoByLeader.find(s => s.name === l.name);
            
            return {
              name: l.name,
              anpActual: l.anpActual,
              recruitsActual: l.recruitsActual,
              fypActual: (l as any).fypActual || 0,
              fycActual: (l as any).fycActual || 0,
              anpScoring: scoringInfo ? scoringInfo.scoring : null,
            };
          }),
          totals: {
            anp: totalAnp,
            cases: totalCases,
            newRecruits: totalNewRecruits,
            fyp: totalFyp,
            fyc: totalFyc,
          },
        },
      };
}

// Load agents data
export async function loadAgentsData(csvUrl: string): Promise<{ agents: Agent[]; headers: string[] }> {
  const lines = await loadCSVFromUrl(csvUrl);
  if (lines.length < 2) {
    throw new Error('CSV file appears to be empty or invalid');
  }

  const headers = lines[0];
  console.log('Agents CSV Headers:', headers);
  const agents: Agent[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    
    // Skip completely empty rows
    if (!row || row.length === 0 || row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }
    
    // Skip header rows (including hidden header rows)
    if (isHeaderRow(row, headers)) {
      console.log(`Skipped row ${i + 1} (header row):`, row.slice(0, 3));
      continue;
    }

    const agent = mapRowToAgent(headers, row);
    if (agent) {
      agents.push(agent);
    } else {
      console.log(`Skipped row ${i + 1} (no valid agent name):`, row.slice(0, 3));
    }
  }

  console.log(`Loaded ${agents.length} agents from CSV`);
  return { agents, headers };
}

// Load all data from configured sheets
export async function loadAllDataFromSheets(configs: {
  agency: string | null;
  leaders: string | null;
  agents: string | null;
}): Promise<{
  agencySummary: AgencySummary | null;
  leaders: Leader[];
  agents: Agent[];
  headers: {
    agency?: string[];
    leaders?: string[];
    agents?: string[];
  };
  leadersDebug?: {
    headers?: string[];
    firstFewHeaders?: string[];
    columnMatches?: {
      leaderName?: string;
      anp?: string;
      cases?: string;
    };
    anpHeaders?: string[];
    caseHeaders?: string[];
    sampleLeaders?: Array<{
      name: string;
      anpActual: number;
      recruitsActual: number;
    }>;
    totals?: {
      anp: number;
      cases: number;
    };
  };
}> {
  const results = {
    agencySummary: null as AgencySummary | null,
    leaders: [] as Leader[],
    agents: [] as Agent[],
    headers: {} as { agency?: string[]; leaders?: string[]; agents?: string[] },
  };

  try {
    if (configs.agency) {
      console.log('Loading Agency Summary from URL:', configs.agency);
      const agencyResult = await loadAgencySummaryWithHeaders(configs.agency);
      console.log('Agency Summary loaded successfully:', {
        hasSummary: !!agencyResult.summary,
        totalAnpMtd: agencyResult.summary?.totalAnpMtd || 0,
        totalFypMtd: agencyResult.summary?.totalFypMtd || 0,
        headersCount: agencyResult.headers.length,
      });
      results.agencySummary = agencyResult.summary;
      results.headers.agency = agencyResult.headers;
    } else {
      console.log('No Agency Summary URL configured');
    }
  } catch (error) {
    console.error('Error loading agency summary:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
  }

  let agencyName: string | undefined;
  
  try {
    if (configs.leaders) {
      const leadersResult = await loadLeadersData(configs.leaders);
      results.leaders = leadersResult.leaders;
      results.headers.leaders = leadersResult.headers;
      agencyName = leadersResult.agencyName; // Extract agency name from Leaders sheet
      // Store debug info for client-side display
      (results as any).leadersDebug = leadersResult.debug;
    }
  } catch (error) {
    console.error('Error loading leaders data:', error);
  }

  try {
    if (configs.agents) {
      const agentsResult = await loadAgentsData(configs.agents);
      results.agents = agentsResult.agents;
      results.headers.agents = agentsResult.headers;
    }
  } catch (error) {
    console.error('Error loading agents data:', error);
  }

  // If no agency summary was loaded from agency sheet, calculate from Leaders
  // and include the extracted agency name
  if (!results.agencySummary && results.leaders.length > 0) {
    results.agencySummary = calculateAgencySummaryFromLeaders(results.leaders, results.agents, agencyName);
  } else if (results.agencySummary && agencyName) {
    // If agency summary exists but doesn't have agency name, add it
    results.agencySummary.agencyName = agencyName;
  }

  return results;
}


