/**
 * AI-Enhanced Column Matcher
 * Uses semantic similarity, pattern recognition, and context-aware matching
 * to identify columns even when headers are missing or ambiguous.
 */

interface ColumnCandidate {
  index: number;
  header: string;
  value: number;
  score: number;
  reasons: string[];
}

interface MatchingContext {
  headers: string[];
  rowData: Record<string, string>;
  allRows: string[][]; // All data rows for pattern analysis
  knownColumns: {
    fycIndex?: number;
    fycValue?: number;
    leaderNameIndex?: number;
  };
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a score between 0 and 1 (1 = exact match)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Simple token-based similarity
  const tokens1 = s1.split(/[\s_\-]+/);
  const tokens2 = s2.split(/[\s_\-]+/);
  
  const commonTokens = tokens1.filter(t => tokens2.includes(t));
  const totalTokens = new Set([...tokens1, ...tokens2]).size;
  
  return commonTokens.length / totalTokens;
}

/**
 * Semantic similarity for column names
 * Checks how well a header matches target patterns
 */
function semanticMatch(header: string, targets: string[]): number {
  if (!header) return 0;
  
  const headerLower = header.toLowerCase().trim();
  let maxScore = 0;
  
  for (const target of targets) {
    const targetLower = target.toLowerCase();
    const similarity = stringSimilarity(headerLower, targetLower);
    
    // Bonus for exact substring matches
    if (headerLower.includes(targetLower) || targetLower.includes(headerLower)) {
      maxScore = Math.max(maxScore, similarity + 0.2);
    } else {
      maxScore = Math.max(maxScore, similarity);
    }
  }
  
  return Math.min(maxScore, 1.0);
}

/**
 * Pattern recognition: Analyze value patterns across multiple rows
 * ANP values typically:
 * - Are positive numbers
 * - Are higher than FYC (usually 2-5x)
 * - Have consistent patterns across leaders
 * - Are not zero for most leaders
 */
function analyzeValuePattern(
  columnIndex: number,
  allRows: string[][],
  fycIndex?: number,
  fycValue?: number
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  if (allRows.length === 0) return { score: 0, reasons: [] };
  
  const values = allRows
    .map(row => parseFloat((row[columnIndex] || '').replace(/,/g, '')) || 0)
    .filter(v => v > 0);
  
  if (values.length === 0) {
    return { score: 0, reasons: ['No positive values found'] };
  }
  
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const nonZeroRatio = values.length / allRows.length;
  
  // Pattern 1: Most leaders should have non-zero ANP
  if (nonZeroRatio > 0.7) {
    score += 20;
    reasons.push(`High non-zero ratio: ${(nonZeroRatio * 100).toFixed(0)}%`);
  } else if (nonZeroRatio > 0.5) {
    score += 10;
    reasons.push(`Moderate non-zero ratio: ${(nonZeroRatio * 100).toFixed(0)}%`);
  }
  
  // Pattern 2: Values should be reasonably high (ANP is typically in thousands)
  if (avgValue > 10000) {
    score += 15;
    reasons.push(`High average value: ${avgValue.toLocaleString()}`);
  } else if (avgValue > 1000) {
    score += 10;
    reasons.push(`Moderate average value: ${avgValue.toLocaleString()}`);
  }
  
  // Pattern 3: Compare with FYC if available
  if (fycIndex !== undefined && fycValue !== undefined && fycValue > 0) {
    const fycValues = allRows
      .map(row => parseFloat((row[fycIndex] || '').replace(/,/g, '')) || 0)
      .filter(v => v > 0);
    
    if (fycValues.length > 0) {
      const avgFyc = fycValues.reduce((a, b) => a + b, 0) / fycValues.length;
      const ratio = avgValue / avgFyc;
      
      if (ratio > 2.0) {
        score += 25;
        reasons.push(`ANP/FYC ratio: ${ratio.toFixed(2)}x (expected 2-5x)`);
      } else if (ratio > 1.5) {
        score += 15;
        reasons.push(`ANP/FYC ratio: ${ratio.toFixed(2)}x (slightly low)`);
      } else if (ratio < 1.0) {
        score -= 20;
        reasons.push(`ANP/FYC ratio: ${ratio.toFixed(2)}x (ANP should be higher!)`);
      }
    }
  }
  
  // Pattern 4: Values should have reasonable variance (not all the same)
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avgValue, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = avgValue > 0 ? stdDev / avgValue : 0;
  
  if (coefficientOfVariation > 0.1 && coefficientOfVariation < 2.0) {
    score += 10;
    reasons.push(`Reasonable variance: CV=${coefficientOfVariation.toFixed(2)}`);
  }
  
  return { score, reasons };
}

/**
 * Context-aware matching: Use surrounding columns to infer meaning
 */
function contextMatch(
  columnIndex: number,
  headers: string[],
  context: MatchingContext
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  
  // Context 1: Check previous column (should be leader name or similar)
  if (columnIndex > 0) {
    const prevHeader = (headers[columnIndex - 1] || '').toLowerCase();
    if (prevHeader.includes('name') || prevHeader.includes('leader') || prevHeader.includes('um')) {
      score += 5;
      reasons.push(`Previous column is name column`);
    }
  }
  
  // Context 2: Check next column (should be YTD for ANP_YTD)
  if (columnIndex < headers.length - 1) {
    const nextHeader = (headers[columnIndex + 1] || '').toLowerCase();
    if (nextHeader.includes('ytd') && !nextHeader.includes('fyc') && !nextHeader.includes('fyp')) {
      score += 15;
      reasons.push(`Next column is YTD (ANP_YTD context)`);
    }
  }
  
  // Context 3: Position-based (Column O = index 2 from column M)
  if (columnIndex === 2) {
    score += 10;
    reasons.push(`Column O position (index 2)`);
  }
  
  // Context 4: Check if header is empty but value exists (common with multi-level headers)
  const header = headers[columnIndex] || '';
  if (header === '' && context.rowData[header] && parseFloat(context.rowData[header].replace(/,/g, '')) > 0) {
    score += 5;
    reasons.push(`Empty header but has value (multi-level header)`);
  }
  
  return { score, reasons };
}

/**
 * AI-Enhanced ANP Column Matcher
 * Combines semantic matching, pattern recognition, and context awareness
 */
export function findAnpColumnAI(context: MatchingContext): ColumnCandidate[] {
  const { headers, rowData, allRows, knownColumns } = context;
  const candidates: ColumnCandidate[] = [];
  
  // Target patterns for ANP
  const anpPatterns = ['anp_mtd', 'anp mtd', 'anpmtd', 'anp', 'mtd'];
  
  headers.forEach((header, index) => {
    const value = parseFloat((rowData[header] || '').replace(/,/g, '')) || 0;
    
    // Skip if value is zero or header contains FYC/FYP
    const headerLower = (header || '').toLowerCase();
    if (value === 0 || headerLower.includes('fyc') || headerLower.includes('fyp')) {
      return;
    }
    
    const reasons: string[] = [];
    let totalScore = 0;
    
    // 1. Semantic matching (40% weight)
    const semanticScore = semanticMatch(header, anpPatterns);
    if (semanticScore > 0) {
      const weightedScore = semanticScore * 40;
      totalScore += weightedScore;
      reasons.push(`Semantic match: ${(semanticScore * 100).toFixed(0)}% (${header || '(empty)'})`);
    }
    
    // 2. Pattern recognition (35% weight)
    const patternResult = analyzeValuePattern(
      index,
      allRows,
      knownColumns.fycIndex,
      knownColumns.fycValue
    );
    if (patternResult.score > 0) {
      const weightedScore = patternResult.score;
      totalScore += weightedScore;
      reasons.push(...patternResult.reasons);
    }
    
    // 3. Context matching (25% weight)
    const contextResult = contextMatch(index, headers, context);
    if (contextResult.score > 0) {
      const weightedScore = contextResult.score;
      totalScore += weightedScore;
      reasons.push(...contextResult.reasons);
    }
    
    // Special handling for empty headers with good context/pattern
    if (header === '' && totalScore > 30) {
      totalScore += 10; // Bonus for empty header with strong signals
      reasons.push('Empty header with strong AI signals');
    }
    
    if (totalScore > 0) {
      candidates.push({
        index,
        header: header || '(empty)',
        value,
        score: totalScore,
        reasons,
      });
    }
  });
  
  // Sort by score (highest first)
  candidates.sort((a, b) => b.score - a.score);
  
  return candidates;
}

/**
 * Find the best ANP column using AI matching
 */
export function findBestAnpColumn(
  headers: string[],
  rowData: Record<string, string>,
  allRows: string[][],
  fycIndex?: number,
  fycValue?: number
): { index: number; header: string; value: number; confidence: number; reasoning: string } | null {
  const context: MatchingContext = {
    headers,
    rowData,
    allRows,
    knownColumns: {
      fycIndex,
      fycValue,
    },
  };
  
  const candidates = findAnpColumnAI(context);
  
  if (candidates.length === 0) {
    return null;
  }
  
  const best = candidates[0];
  const confidence = Math.min(best.score / 100, 1.0); // Normalize to 0-1
  
  return {
    index: best.index,
    header: best.header,
    value: best.value,
    confidence,
    reasoning: best.reasons.join('; '),
  };
}

