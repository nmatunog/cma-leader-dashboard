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
 * Build a strict comparable key for "same person" matching.
 *
 * Key format: "FIRST[ FIRST2]|LAST" (canonical/uppercased)
 * - Ignores middle names/initials
 * - Supports up to 2 first-name parts
 * - Handles suffixes (JR, SR, II, III, IV, V)
 * - Removes duplicate words in the first-name area (e.g., "NIÑA GABITO NIÑA" -> "NIÑA GABITO")
 *
 * This is exported so callers can build fast Maps instead of repeated O(n) scans with
 * areNamesLikelySamePerson.
 */
export function getComparablePersonKey(name: string | null | undefined): string | null {
  if (!name) return null;

  const canonical = getCanonicalName(name);
  const parts = canonical.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length < 2) return null;

  // Handle suffixes (JR, SR, II, III, IV, V)
  let lastIdx = parts.length - 1;
  const lastClean = parts[lastIdx].replace(/\.$/, '').toUpperCase();
  if (['JR', 'SR', 'II', 'III', 'IV', 'V'].includes(lastClean) && parts.length >= 3) {
    lastIdx = parts.length - 2;
  }
  const last = parts[lastIdx];

  // Remove duplicates while preserving order
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

  // Determine first names conservatively (same strategy as previous matching logic)
  const getFirstNames = (p: string[], idxOfLast: number): string[] => {
    if (idxOfLast <= 0) return [];
    if (idxOfLast === 1) return [p[0]];

    const secondPart = p[1].replace(/\.$/, '');

    if (idxOfLast >= 3) {
      const firstParts = p.slice(0, idxOfLast);
      const uniqueFirstParts = removeDuplicates(firstParts);
      return uniqueFirstParts.slice(0, 2);
    }

    // Only 2 parts before last name
    if (secondPart.length === 1) {
      return [p[0]];
    }
    return [p[0], p[1]];
  };

  const firstNames = getFirstNames(parts, lastIdx);
  if (firstNames.length === 0) return null;

  return `${firstNames.join(' ')}|${last}`;
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

  const key1 = getComparablePersonKey(canonical1);
  const key2 = getComparablePersonKey(canonical2);
  if (!key1 || !key2) return false;
  return key1 === key2;
}






