/**
 * Agency Name Normalizer
 * Normalizes agency names to handle case variations and ensure consistent matching
 */

/**
 * Normalizes an agency name to a standard format for comparison
 * - Removes extra spaces
 * - Converts to uppercase
 * - Handles common variations (e.g., "EZ" vs "EZ-")
 */
export function normalizeAgencyName(agencyName: string): string {
  if (!agencyName) return '';
  
  // Trim and normalize whitespace
  let normalized = agencyName.trim().replace(/\s+/g, ' ');
  
  // Convert to uppercase for consistent comparison
  normalized = normalized.toUpperCase();
  
  // Handle common variations
  // "CEBU-EZ MATUNOG AGENCY" vs "CEBU EZ MATUNOG AGENCY" -> both become "CEBU-EZ MATUNOG AGENCY"
  normalized = normalized.replace(/\s+EZ\s+/g, '-EZ ');
  normalized = normalized.replace(/\s+EZ$/g, '-EZ');
  
  return normalized;
}

/**
 * Checks if two agency names refer to the same agency (case-insensitive)
 */
export function areAgencyNamesEqual(name1: string, name2: string): boolean {
  return normalizeAgencyName(name1) === normalizeAgencyName(name2);
}

/**
 * Gets all possible variations of an agency name for querying
 * This helps find documents even if the casing doesn't match exactly
 */
export function getAgencyNameVariations(agencyName: string): string[] {
  const normalized = normalizeAgencyName(agencyName);
  const variations = new Set<string>([normalized, agencyName.trim()]);
  
  // Add original with different case variations
  const parts = normalized.split(' ');
  if (parts.length > 0) {
    // Title case: "Cebu Matunog Agency"
    const titleCase = parts.map(p => p.charAt(0) + p.slice(1).toLowerCase()).join(' ');
    variations.add(titleCase);
    
    // All uppercase: "CEBU MATUNOG AGENCY"
    variations.add(normalized);
    
    // All lowercase: "cebu matunog agency"
    variations.add(normalized.toLowerCase());
  }
  
  return Array.from(variations);
}

/**
 * Standard agency name mapping (as a constant map)
 * Maps normalized variations to canonical names
 */
const AGENCY_NAME_MAPPING = new Map<string, string>();
// Initialize the map
AGENCY_NAME_MAPPING.set('CEBU MATUNOG AGENCY', 'CEBU-MATUNOG AGENCY');
AGENCY_NAME_MAPPING.set('CEBU MATUNOG', 'CEBU-MATUNOG AGENCY');
AGENCY_NAME_MAPPING.set('CEBU-MATUNOG AGENCY', 'CEBU-MATUNOG AGENCY');
AGENCY_NAME_MAPPING.set('CEBU-MATUNOG', 'CEBU-MATUNOG AGENCY');
AGENCY_NAME_MAPPING.set('CEBU-EZ MATUNOG AGENCY', 'CEBU-EZ MATUNOG AGENCY');
AGENCY_NAME_MAPPING.set('CEBU EZ MATUNOG AGENCY', 'CEBU-EZ MATUNOG AGENCY');
AGENCY_NAME_MAPPING.set('CEBU-EZ MATUNOG', 'CEBU-EZ MATUNOG AGENCY');

/**
 * Gets the canonical agency name for a given agency name
 * Returns the standard form if known, otherwise returns normalized version
 */
export function getCanonicalAgencyName(agencyName: string): string {
  if (!agencyName) return '';
  
  const normalized = normalizeAgencyName(agencyName);
  
  // Check if we have a mapping for this normalized name
  if (AGENCY_NAME_MAPPING.has(normalized)) {
    return AGENCY_NAME_MAPPING.get(normalized)!;
  }
  
  // Return normalized version, but try to preserve some casing
  // Convert to Title Case if it's all uppercase
  if (normalized === normalized.toUpperCase() && normalized.length > 0) {
    const parts = normalized.split(' ');
    return parts.map(p => {
      // Handle hyphenated parts like "EZ"
      if (p.includes('-')) {
        return p.split('-').map(sub => sub.charAt(0) + sub.slice(1).toLowerCase()).join('-');
      }
      return p.charAt(0) + p.slice(1).toLowerCase();
    }).join(' ');
  }
  
  return agencyName.trim();
}

