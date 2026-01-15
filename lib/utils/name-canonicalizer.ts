/**
 * Name Canonicalization Utilities
 * Converts names to canonical all-caps format for consistent comparison and display
 * Used for UM (Unit Manager) and SUM (Senior Unit Manager) names
 */

/**
 * Get canonical name (all caps) for UM/SUM names
 * This ensures consistent formatting and prevents discrepancies from case differences
 * 
 * @param name - The name to canonicalize
 * @returns The name in all caps format
 */
export function getCanonicalName(name: string | null | undefined): string {
  if (!name) return '';
  
  // Trim and normalize spaces, convert to uppercase
  return name.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Normalize name for comparison (removes extra spaces, converts to uppercase)
 * Alias for getCanonicalName for consistency
 */
export function normalizeNameForComparison(name: string | null | undefined): string {
  return getCanonicalName(name);
}

/**
 * Check if two names are equivalent (case-insensitive comparison)
 */
export function areNamesEqual(name1: string | null | undefined, name2: string | null | undefined): boolean {
  return getCanonicalName(name1) === getCanonicalName(name2);
}

/**
 * Check if two names likely refer to the same person by comparing first and last names,
 * ignoring middle initials. This handles cases like "JESSICA BACULAN" vs "JESSICA G. BACULAN"
 * 
 * @param name1 - First name to compare
 * @param name2 - Second name to compare
 * @returns true if the names likely refer to the same person
 */
export function areNamesLikelySamePerson(name1: string | null | undefined, name2: string | null | undefined): boolean {
  if (!name1 || !name2) return false;
  
  const canonical1 = getCanonicalName(name1);
  const canonical2 = getCanonicalName(name2);
  
  // Exact match
  if (canonical1 === canonical2) return true;
  
  // Extract first and last names (ignore middle names/initials)
  // Handle multiple first names and full middle names
  // Examples:
  // - "MARIA ESTRELLA C. MATUNOG" -> first="MARIA ESTRELLA", last="MATUNOG"
  // - "MARIA CRISTINA MONTEGRANDE MONDRAGON" -> first="MARIA CRISTINA", last="MONDRAGON"
  // - "MARIA CRISTINA M. MONDRAGON" -> first="MARIA CRISTINA", last="MONDRAGON"
  // Strategy: Compare by trying different combinations of first name parts (1-2 parts)
  // and matching against the other name, ignoring middle parts
  const extractFirstAndLast = (name: string): { first: string; last: string } | null => {
    const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
    if (parts.length < 2) return null;
    
    // Last name is always the last part (unless it's a suffix)
    let lastIndex = parts.length - 1;
    const lastPart = parts[lastIndex].replace(/\.$/, '').toUpperCase();
    
    // Check if last part is a suffix (JR, SR, II, III, IV, V)
    if (['JR', 'SR', 'II', 'III', 'IV', 'V'].includes(lastPart)) {
      // Last name is the second-to-last part
      if (parts.length < 3) return null;
      lastIndex = parts.length - 2;
    }
    
    const last = parts[lastIndex];
    
    // Extract first name(s) - try to identify where first names end
    // Common patterns:
    // - "FIRST LAST" (1 first name)
    // - "FIRST FIRST LAST" (2 first names)
    // - "FIRST MIDDLE LAST" (1 first, 1 middle)
    // - "FIRST FIRST MIDDLE LAST" (2 first, 1 middle)
    // - "FIRST M. LAST" (1 first, 1 middle initial)
    // - "FIRST FIRST M. LAST" (2 first, 1 middle initial)
    
    // Strategy: Try to match by comparing different interpretations
    // For matching purposes, we'll try both 1 and 2 parts as first names
    // and see which matches better with the other name
    
    // Default: assume first 1-2 parts are first names
    // If there are 3+ parts before last, assume first 2 are first names
    // If there are 2 parts before last, try both interpretations
    
    let firstNamesEndIndex = 1; // Default: first part is first name
    
    if (lastIndex >= 2) {
      // We have at least one part between first and last
      const secondPart = parts[1].replace(/\.$/, '');
      
      if (lastIndex >= 3) {
        // We have 3+ parts before last name
        // Pattern: "FIRST [FIRST|MIDDLE] [MIDDLE|INITIAL] LAST"
        // Assume first 2 parts are first names (handles "MARIA CRISTINA MONTEGRANDE MONDRAGON")
        // This works for both "MARIA CRISTINA M. MONDRAGON" and "MARIA CRISTINA MONTEGRANDE MONDRAGON"
        firstNamesEndIndex = 2;
      } else {
        // Only 2 parts before last name: "FIRST [FIRST|MIDDLE] LAST"
        // If second part is a single letter, it's a middle initial
        // But we still want to consider it could be part of first name if the other name has 2 first names
        // For now, assume first 2 parts are first names (will be compared flexibly)
        // This handles "MARIA CRISTINA M. MONDRAGON" where we want "MARIA CRISTINA" as first names
        firstNamesEndIndex = 2;
      }
    }
    
    // First name(s) are all parts from 0 to firstNamesEndIndex
    const first = parts.slice(0, firstNamesEndIndex).join(' ');
    
    return { first, last };
  };
  
  const name1Parts = extractFirstAndLast(canonical1);
  const name2Parts = extractFirstAndLast(canonical2);
  
  if (!name1Parts || !name2Parts) {
    // If we can't extract parts, fall back to exact match
    return canonical1 === canonical2;
  }
  
  // Compare first and last names
  if (name1Parts.first === name2Parts.first && name1Parts.last === name2Parts.last) {
    return true;
  }
  
  // If direct match fails, try flexible matching for first names
  // This handles cases where one name has full middle name and other has middle initial
  // Example: "MARIA CRISTINA MONTEGRANDE MONDRAGON" vs "MARIA CRISTINA M. MONDRAGON"
  // But IMPORTANT: "MARIA ROSARIO C. MATUNOG" should NOT match "MARIA ESTRELLA C. MATUNOG"
  // because "ROSARIO" ≠ "ESTRELLA" - ALL first name parts must match
  
  // Extract parts for alternative interpretations
  const parts1 = canonical1.trim().split(/\s+/).filter(p => p.length > 0);
  const parts2 = canonical2.trim().split(/\s+/).filter(p => p.length > 0);
  
  if (parts1.length < 2 || parts2.length < 2) {
    return false;
  }
  
  // Get last names (handling suffixes)
  let last1 = parts1[parts1.length - 1];
  let last2 = parts2[parts2.length - 1];
  const last1Clean = last1.replace(/\.$/, '').toUpperCase();
  const last2Clean = last2.replace(/\.$/, '').toUpperCase();
  
  let last1Idx = parts1.length - 1;
  let last2Idx = parts2.length - 1;
  
  if (['JR', 'SR', 'II', 'III', 'IV', 'V'].includes(last1Clean) && parts1.length >= 3) {
    last1 = parts1[parts1.length - 2];
    last1Idx = parts1.length - 2;
  }
  if (['JR', 'SR', 'II', 'III', 'IV', 'V'].includes(last2Clean) && parts2.length >= 3) {
    last2 = parts2[parts2.length - 2];
    last2Idx = parts2.length - 2;
  }
  
  // Last names must match
  if (last1 !== last2) {
    return false;
  }
  
  // Helper function to remove duplicate words from an array
  const removeDuplicates = (arr: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of arr) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
    return result;
  };
  
  // Determine how many parts are first names for each name
  // Strategy: If there are 3+ parts before last name, assume first 2 are first names
  // If there are 2 parts before last name, check if second is a middle initial (single letter)
  const getFirstNames = (parts: string[], lastIdx: number): string[] => {
    if (lastIdx === 0) return [];
    if (lastIdx === 1) return [parts[0]];
    
    // We have at least 2 parts before last name
    const secondPart = parts[1].replace(/\.$/, '');
    
    if (lastIdx >= 3) {
      // 3+ parts before last: assume first 2 are first names
      // Example: "MARIA ROSARIO C. MATUNOG" -> first names: ["MARIA", "ROSARIO"]
      // But also handle cases like "NIÑA GABITO NIÑA BOLINGOT" where "NIÑA" is duplicated
      // Remove duplicates to get ["NIÑA", "GABITO"]
      const firstParts = parts.slice(0, lastIdx);
      const uniqueFirstParts = removeDuplicates(firstParts);
      // Take first 2 unique parts as first names
      return uniqueFirstParts.slice(0, 2);
    } else {
      // Only 2 parts before last name
      if (secondPart.length === 1) {
        // Second part is a middle initial - only first part is first name
        return [parts[0]];
      } else {
        // Second part could be second first name or middle name
        // Be conservative: assume it's a second first name
        // Example: "MARIA ROSARIO MATUNOG" -> first names: ["MARIA", "ROSARIO"]
        return [parts[0], parts[1]];
      }
    }
  };
  
  const firstNames1 = getFirstNames(parts1, last1Idx);
  const firstNames2 = getFirstNames(parts2, last2Idx);
  
  // First names must match exactly (all parts must match)
  // "MARIA ROSARIO" should NOT match "MARIA ESTRELLA"
  // But "NIÑA GABITO NIÑA" (after removing duplicates) should match "NIÑA GABITO"
  if (firstNames1.length !== firstNames2.length) {
    return false;
  }
  
  // Compare all first name parts - ALL must match
  for (let i = 0; i < firstNames1.length; i++) {
    if (firstNames1[i] !== firstNames2[i]) {
      return false;
    }
  }
  
  return true;
}






