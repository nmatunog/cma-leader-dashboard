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




