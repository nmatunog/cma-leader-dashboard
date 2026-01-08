/**
 * Name Matching Service
 * Provides intelligent name matching against hardcoded hierarchy data
 */

import { HARDCODED_HIERARCHY_DATA, type HierarchyEntryData } from '@/lib/hierarchy-data';
import type { OrganizationalHierarchyEntry } from './organizational-hierarchy-service';

/**
 * Normalize name for matching (remove extra spaces, convert to uppercase, handle common variations)
 */
export function normalizeNameForMatching(name: string): string {
  if (!name) return '';
  
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/\./g, '') // Remove periods
    .replace(/,/g, '') // Remove commas
    .trim();
}

/**
 * Extract name parts (first, middle, last) from a full name
 */
export function parseNameParts(fullName: string): {
  firstName: string;
  middleName?: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  
  if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] };
  }
  
  // 3+ parts: assume first, middle(s), last
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleName = parts.slice(1, -1).join(' ');
  
  return { firstName, middleName, lastName };
}

/**
 * Match name in hierarchy data
 * Searches for matches by first name + last name, with optional middle name
 * Returns array of potential matches sorted by relevance
 */
export function matchNameInHierarchy(
  firstName: string,
  lastName: string,
  middleName?: string
): OrganizationalHierarchyEntry[] {
  if (!firstName || !lastName) {
    return [];
  }

  const normalizedFirstName = normalizeNameForMatching(firstName);
  const normalizedLastName = normalizeNameForMatching(lastName);
  const normalizedMiddleName = middleName ? normalizeNameForMatching(middleName) : undefined;
  
  const matches: Array<{ entry: OrganizationalHierarchyEntry; score: number }> = [];

  // Search through hardcoded hierarchy data
  for (const entry of HARDCODED_HIERARCHY_DATA) {
    const entryNameParts = parseNameParts(entry.name);
    const entryFirstName = normalizeNameForMatching(entryNameParts.firstName);
    const entryLastName = normalizeNameForMatching(entryNameParts.lastName);
    const entryMiddleName = entryNameParts.middleName 
      ? normalizeNameForMatching(entryNameParts.middleName) 
      : undefined;

    // Check if first and last names match
    const firstLastMatch = entryFirstName === normalizedFirstName && entryLastName === normalizedLastName;
    
    if (!firstLastMatch) {
      continue; // Skip if first+last don't match
    }

    // Calculate match score
    let score = 100; // Base score for first+last match

    // If middle name provided, check for middle name match
    if (normalizedMiddleName && entryMiddleName) {
      // Exact middle name match
      if (entryMiddleName === normalizedMiddleName) {
        score += 50;
      } 
      // Middle initial match (e.g., "D" matches "D.")
      else if (
        (normalizedMiddleName.length === 1 && entryMiddleName.startsWith(normalizedMiddleName)) ||
        (entryMiddleName.length === 1 && normalizedMiddleName.startsWith(entryMiddleName))
      ) {
        score += 25;
      }
      // Partial middle name match
      else if (
        entryMiddleName.includes(normalizedMiddleName) ||
        normalizedMiddleName.includes(entryMiddleName)
      ) {
        score += 10;
      }
    } else if (!normalizedMiddleName && !entryMiddleName) {
      // Both don't have middle names - perfect match
      score += 30;
    } else if (normalizedMiddleName && !entryMiddleName) {
      // User provided middle name but entry doesn't have it - still good match
      score += 5;
    } else {
      // Entry has middle name but user didn't provide - slightly lower score
      score += 0;
    }

    // Convert to OrganizationalHierarchyEntry format
    const hierarchyEntry: OrganizationalHierarchyEntry = {
      id: entry.name.replace(/\s+/g, '_'),
      name: entry.name,
      displayName: entry.displayName,
      rank: entry.rank,
      unitManager: entry.unitManager,
      agencyName: entry.agencyName,
      code: entry.code,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    matches.push({ entry: hierarchyEntry, score });
  }

  // Sort by score (highest first) and return entries
  return matches
    .sort((a, b) => b.score - a.score)
    .map(m => m.entry);
}

/**
 * Match unit manager name in hierarchy
 * Searches for unit managers (leaders) by first and last name
 * Returns matches with full name including middle initial
 */
export function matchUnitManagerName(
  firstName: string,
  lastName: string
): OrganizationalHierarchyEntry[] {
  if (!firstName || !lastName) {
    return [];
  }

  const normalizedFirstName = normalizeNameForMatching(firstName);
  const normalizedLastName = normalizeNameForMatching(lastName);

  const matches: OrganizationalHierarchyEntry[] = [];

  // Search for entries that are leaders (UM, SUM, ADD) or have people reporting to them
  for (const entry of HARDCODED_HIERARCHY_DATA) {
    // Only consider leaders (not advisors)
    if (entry.rank === 'ADV') {
      continue;
    }

    const entryNameParts = parseNameParts(entry.name);
    const entryFirstName = normalizeNameForMatching(entryNameParts.firstName);
    const entryLastName = normalizeNameForMatching(entryNameParts.lastName);

    // Check if first and last names match
    if (entryFirstName === normalizedFirstName && entryLastName === normalizedLastName) {
      const hierarchyEntry: OrganizationalHierarchyEntry = {
        id: entry.name.replace(/\s+/g, '_'),
        name: entry.name,
        displayName: entry.displayName,
        rank: entry.rank,
        unitManager: entry.unitManager,
        agencyName: entry.agencyName,
        code: entry.code,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      matches.push(hierarchyEntry);
    }
  }

  return matches;
}

/**
 * Check if agency exists in hierarchy data
 */
export function checkAgencyExists(agencyName: string): boolean {
  if (!agencyName) return false;

  const normalizedAgency = normalizeNameForMatching(agencyName);
  
  const agencies = new Set<string>();
  for (const entry of HARDCODED_HIERARCHY_DATA) {
    const normalizedEntryAgency = normalizeNameForMatching(entry.agencyName);
    agencies.add(normalizedEntryAgency);
  }

  return agencies.has(normalizedAgency);
}

/**
 * Get all unique agencies from hierarchy data
 */
export function getAllAgenciesFromHierarchy(): string[] {
  const agencies = new Set<string>();
  for (const entry of HARDCODED_HIERARCHY_DATA) {
    agencies.add(entry.agencyName);
  }
  return Array.from(agencies).sort();
}

/**
 * Get all unique unit managers from hierarchy data
 */
export function getAllUnitManagersFromHierarchy(): string[] {
  const unitManagers = new Set<string>();
  for (const entry of HARDCODED_HIERARCHY_DATA) {
    if (entry.unitManager) {
      unitManagers.add(entry.unitManager);
    }
    // Also include leaders themselves as potential unit managers
    if (entry.rank === 'UM' || entry.rank === 'SUM' || entry.rank === 'ADD') {
      unitManagers.add(entry.name);
    }
  }
  return Array.from(unitManagers).sort();
}
