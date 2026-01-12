/**
 * Organizational Hierarchy Service
 * Stores and retrieves organizational structure (units, relationships, agencies)
 * This is imported separately from user accounts - users can sign up later and select their unit
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserRank } from '@/types/user';
import { HARDCODED_HIERARCHY_DATA } from '@/lib/hierarchy-data';

export interface OrganizationalHierarchyEntry {
  id?: string;                      // Document ID (will be generated)
  name: string;                     // Display name (e.g., "ANALYN D. GONZALES")
  displayName: string;              // Same as name for now
  rank: UserRank;                   // ADV, AUM, UM, SUM, ADD
  unitManager?: string;             // Name of supervisor (display name)
  agencyName: string;               // Agency name
  code?: string;                    // Advisor/Leader code (optional, can be set later)
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

const HIERARCHY_COLLECTION = 'organizational_hierarchy';

/**
 * Save hierarchy entry
 */
export async function saveHierarchyEntry(
  entry: Omit<OrganizationalHierarchyEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!db) {
      return { success: false, error: 'Firestore is not initialized' };
    }

    // Create a document ID from normalized name + agency
    const normalizedName = entry.name.toUpperCase().replace(/\s+/g, '_');
    const normalizedAgency = entry.agencyName.toUpperCase().replace(/\s+/g, '_');
    const docId = `${normalizedName}_${normalizedAgency}`;

    const docRef = doc(db, HIERARCHY_COLLECTION, docId);
    
    const entryData: OrganizationalHierarchyEntry = {
      ...entry,
      id: docId,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    // Use setDoc with merge to allow updates
    await setDoc(docRef, entryData, { merge: true });

    return { success: true, id: docId };
  } catch (error) {
    console.error('Error saving hierarchy entry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save hierarchy entry',
    };
  }
}

/**
 * Get all hierarchy entries for an agency (handles case-insensitive matching)
 */
export async function getHierarchyByAgency(agencyName: string): Promise<OrganizationalHierarchyEntry[]> {
  try {
    if (!db) {
      return [];
    }

    // Import agency name normalizer
    const { normalizeAgencyName, areAgencyNamesEqual, getAgencyNameVariations } = await import('@/lib/utils/agency-name-normalizer');
    
    // Get all possible variations to query (since Firestore queries are case-sensitive)
    const variations = getAgencyNameVariations(agencyName);
    const normalizedAgencyName = normalizeAgencyName(agencyName);
    variations.push(normalizedAgencyName, agencyName); // Add original and normalized
    
    console.log(`[getHierarchyByAgency] Querying hierarchy for agency: "${agencyName}" with variations:`, [...new Set(variations)]);
    
    // Query all variations and combine results
    const allEntries: OrganizationalHierarchyEntry[] = [];
    const seenEntryIds = new Set<string>();
    
    for (const variation of [...new Set(variations)]) { // Remove duplicates
      try {
        const q = query(
          collection(db, HIERARCHY_COLLECTION),
          where('agencyName', '==', variation),
          orderBy('rank', 'asc'),
          orderBy('name', 'asc')
        );

        const querySnapshot = await getDocs(q);
        console.log(`[getHierarchyByAgency] Variation "${variation}" returned ${querySnapshot.size} entries`);

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as OrganizationalHierarchyEntry;
          const entryId = docSnap.id || data.id;
          
          // Skip duplicates
          if (entryId && seenEntryIds.has(entryId)) {
            return;
          }
          if (entryId) {
            seenEntryIds.add(entryId);
          }
          
          // Only include if agency name matches (normalized comparison)
          if (areAgencyNamesEqual(data.agencyName || '', agencyName)) {
            allEntries.push({
              id: docSnap.id,
              ...data,
            } as OrganizationalHierarchyEntry);
          }
        });
      } catch (queryError) {
        console.warn(`[getHierarchyByAgency] Error querying variation "${variation}":`, queryError);
        // If orderBy fails (e.g., no index), try without orderBy
        try {
          const q = query(
            collection(db, HIERARCHY_COLLECTION),
            where('agencyName', '==', variation)
          );
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data() as OrganizationalHierarchyEntry;
            const entryId = docSnap.id || data.id;
            if (entryId && seenEntryIds.has(entryId)) {
              return;
            }
            if (entryId) {
              seenEntryIds.add(entryId);
            }
            if (areAgencyNamesEqual(data.agencyName || '', agencyName)) {
              allEntries.push({
                id: docSnap.id,
                ...data,
              } as OrganizationalHierarchyEntry);
            }
          });
        } catch (fallbackError) {
          console.warn(`[getHierarchyByAgency] Fallback query also failed for "${variation}":`, fallbackError);
        }
      }
    }

    // Sort by rank and name
    const sortedEntries = allEntries.sort((a, b) => {
      const rankOrder: Record<string, number> = { 'ADD': 1, 'SUM': 2, 'UM': 3, 'AUM': 4, 'ADV': 5 };
      const aRank = rankOrder[a.rank] || 99;
      const bRank = rankOrder[b.rank] || 99;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });
    
    console.log(`[getHierarchyByAgency] Returning ${sortedEntries.length} unique entries for agency "${agencyName}"`);
    return sortedEntries;
  } catch (error) {
    console.error('Error getting hierarchy by agency:', error);
    return [];
  }
}

/**
 * Get hierarchy entry by name and agency
 */
export async function getHierarchyEntry(
  name: string, 
  agencyName: string
): Promise<OrganizationalHierarchyEntry | null> {
  try {
    if (!db) {
      return null;
    }

    const normalizedName = name.toUpperCase().replace(/\s+/g, '_');
    const normalizedAgency = agencyName.toUpperCase().replace(/\s+/g, '_');
    const docId = `${normalizedName}_${normalizedAgency}`;

    const docRef = doc(db, HIERARCHY_COLLECTION, docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as OrganizationalHierarchyEntry;
  } catch (error) {
    console.error('Error getting hierarchy entry:', error);
    return null;
  }
}

/**
 * Get all units (unique unitManager names) for an agency
 */
export async function getUnitsByAgency(agencyName: string): Promise<string[]> {
  try {
    const entries = await getHierarchyByAgency(agencyName);
    const units = new Set<string>();

    // Add unit managers (those who have people reporting to them)
    entries.forEach(entry => {
      if (entry.unitManager) {
        units.add(entry.unitManager);
      }
    });

    // Also add top-level people (ADDs, SUMs who might not have unitManager but are units themselves)
    entries.forEach(entry => {
      if (entry.rank === 'ADD' || entry.rank === 'SUM') {
        units.add(entry.name);
      }
    });

    // Also add UMs as selectable units (so UMs can select themselves)
    entries.forEach(entry => {
      if (entry.rank === 'UM') {
        units.add(entry.name);
      }
    });

    return Array.from(units).sort();
  } catch (error) {
    console.error('Error getting units by agency:', error);
    return [];
  }
}

/**
 * Get people in a specific unit (those who report to a specific unitManager)
 */
export async function getPeopleInUnit(
  unitManagerName: string,
  agencyName: string
): Promise<OrganizationalHierarchyEntry[]> {
  try {
    const entries = await getHierarchyByAgency(agencyName);
    return entries.filter(entry => entry.unitManager === unitManagerName);
  } catch (error) {
    console.error('Error getting people in unit:', error);
    return [];
  }
}

/**
 * Get all SUMs in an agency
 */
export async function getAllSUMsInAgency(agencyName: string): Promise<OrganizationalHierarchyEntry[]> {
  try {
    const entries = await getHierarchyByAgency(agencyName);
    return entries.filter(entry => entry.rank === 'SUM');
  } catch (error) {
    console.error('Error getting SUMs in agency:', error);
    return [];
  }
}

/**
 * Get all UMs (units) under a specific SUM
 */
export async function getUnitsUnderSUM(sumName: string, agencyName: string): Promise<string[]> {
  try {
    const entries = await getHierarchyByAgency(agencyName);
    const units: string[] = [];
    
    // Normalize SUM name for comparison (case-insensitive, trim spaces)
    const normalizedSumName = sumName.toUpperCase().trim();
    
    console.log(`[getUnitsUnderSUM] Looking for UMs under SUM "${sumName}" (normalized: "${normalizedSumName}") in agency "${agencyName}"`);
    console.log(`[getUnitsUnderSUM] Total entries in agency: ${entries.length}`);
    
    // Get all UMs who directly report to this SUM (case-insensitive match)
    const directUMs = entries.filter(entry => {
      const matchesRank = entry.rank === 'UM';
      const entryUnitManager = (entry.unitManager || '').toUpperCase().trim();
      const matches = matchesRank && entryUnitManager === normalizedSumName;
      
      if (matchesRank) {
        console.log(`[getUnitsUnderSUM] Checking UM "${entry.name}": unitManager="${entry.unitManager}" (normalized: "${entryUnitManager}") matches="${matches}"`);
      }
      
      return matches;
    });
    
    console.log(`[getUnitsUnderSUM] Found ${directUMs.length} UMs under SUM "${sumName}":`, directUMs.map(um => um.name));
    
    directUMs.forEach(um => units.push(um.name));
    
    return units.sort();
  } catch (error) {
    console.error('Error getting units under SUM:', error);
    return [];
  }
}

/**
 * Get direct advisors under a SUM (advisors who report directly to SUM, not through UMs)
 */
export async function getDirectAdvisorsUnderSUM(sumName: string, agencyName: string): Promise<OrganizationalHierarchyEntry[]> {
  try {
    const entries = await getHierarchyByAgency(agencyName);
    return entries.filter(
      entry => entry.unitManager === sumName && 
               entry.rank !== 'UM' && // Exclude UMs
               (entry.rank === 'ADV' || entry.rank === 'AUM')
    );
  } catch (error) {
    console.error('Error getting direct advisors under SUM:', error);
    return [];
  }
}

/**
 * Get direct advisors under an ADD (advisors who report directly to ADD, not through SUM or UM)
 */
export async function getDirectAdvisorsUnderADD(addName: string, agencyName: string): Promise<OrganizationalHierarchyEntry[]> {
  try {
    const entries = await getHierarchyByAgency(agencyName);
    return entries.filter(
      entry => entry.unitManager === addName && 
               entry.rank !== 'UM' && // Exclude UMs
               entry.rank !== 'SUM' && // Exclude SUMs
               (entry.rank === 'ADV' || entry.rank === 'AUM')
    );
  } catch (error) {
    console.error('Error getting direct advisors under ADD:', error);
    return [];
  }
}

/**
 * Get all subordinates recursively (for SUMs - gets all UMs, their teams, and direct advisors)
 * Returns array of names of all subordinates
 */
export async function getAllSubordinatesRecursive(leaderName: string, agencyName: string): Promise<string[]> {
  try {
    const entries = await getHierarchyByAgency(agencyName);
    const subordinates: string[] = [];
    const visited = new Set<string>();
    
    function collectSubordinates(name: string) {
      if (visited.has(name)) return;
      visited.add(name);
      
      entries.forEach(entry => {
        if (entry.unitManager === name) {
          subordinates.push(entry.name);
          // Recursively collect their subordinates
          collectSubordinates(entry.name);
        }
      });
    }
    
    collectSubordinates(leaderName);
    return subordinates;
  } catch (error) {
    console.error('Error getting all subordinates recursively:', error);
    return [];
  }
}

/**
 * Get direct subordinates of a leader (people who directly report to them)
 */
export async function getDirectSubordinates(leaderName: string, agencyName: string): Promise<OrganizationalHierarchyEntry[]> {
  try {
    const entries = await getHierarchyByAgency(agencyName);
    return entries.filter(entry => entry.unitManager === leaderName);
  } catch (error) {
    console.error('Error getting direct subordinates:', error);
    return [];
  }
}

/**
 * Get all UMs (units) that report directly to an ADD (not through SUM)
 */
export async function getUnitsUnderADD(addName: string, agencyName: string): Promise<string[]> {
  try {
    const entries = await getHierarchyByAgency(agencyName);
    const units: string[] = [];
    
    // Get all UMs who directly report to this ADD (unitManager === addName AND rank === 'UM')
    const directUMs = entries.filter(
      entry => entry.unitManager === addName && entry.rank === 'UM'
    );
    
    directUMs.forEach(um => units.push(um.name));
    
    return units.sort();
  } catch (error) {
    console.error('Error getting units under ADD:', error);
    return [];
  }
}

/**
 * Batch save multiple hierarchy entries
 */
export async function batchSaveHierarchyEntries(
  entries: Array<Omit<OrganizationalHierarchyEntry, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; saved: number; errors: string[] }> {
  try {
    if (!db) {
      return { success: false, saved: 0, errors: ['Firestore is not initialized'] };
    }

    const batch = writeBatch(db);
    const errors: string[] = [];
    let saved = 0;

    for (const entry of entries) {
      try {
        const normalizedName = entry.name.toUpperCase().replace(/\s+/g, '_');
        const normalizedAgency = entry.agencyName.toUpperCase().replace(/\s+/g, '_');
        const docId = `${normalizedName}_${normalizedAgency}`;

        const docRef = doc(db, HIERARCHY_COLLECTION, docId);
        
        // Build entry data, excluding undefined values (Firestore doesn't accept undefined)
        const entryData: any = {
          name: entry.name,
          displayName: entry.displayName,
          rank: entry.rank,
          agencyName: entry.agencyName,
          id: docId,
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp,
        };
        
        // Only include unitManager if it's defined
        if (entry.unitManager !== undefined && entry.unitManager !== null) {
          entryData.unitManager = entry.unitManager;
        }
        
        // Only include code if it's defined
        if (entry.code !== undefined && entry.code !== null) {
          entryData.code = entry.code;
        }

        batch.set(docRef, entryData, { merge: true });
        saved++;
      } catch (error) {
        errors.push(`Error processing ${entry.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    await batch.commit();
    return { success: true, saved, errors };
  } catch (error) {
    console.error('Error batch saving hierarchy entries:', error);
    return {
      success: false,
      saved: 0,
      errors: [error instanceof Error ? error.message : 'Failed to batch save hierarchy entries'],
    };
  }
}

/**
 * Initialize hierarchy from hardcoded data
 * This will seed the organizational_hierarchy collection with the hardcoded data
 */
export async function initializeHardcodedHierarchy(): Promise<{ success: boolean; saved: number; errors: string[] }> {
  try {
    if (!db) {
      return { success: false, saved: 0, errors: ['Firestore is not initialized'] };
    }

    if (HARDCODED_HIERARCHY_DATA.length === 0) {
      return { success: true, saved: 0, errors: ['No hardcoded hierarchy data to initialize'] };
    }

    // Convert hardcoded data to hierarchy entries format
    const entries = HARDCODED_HIERARCHY_DATA.map(entry => ({
      name: entry.name,
      displayName: entry.displayName,
      rank: entry.rank,
      unitManager: entry.unitManager,
      agencyName: entry.agencyName,
      code: entry.code,
    }));

    // Use batch save to save all entries
    const result = await batchSaveHierarchyEntries(entries);
    return result;
  } catch (error) {
    console.error('Error initializing hardcoded hierarchy:', error);
    return {
      success: false,
      saved: 0,
      errors: [error instanceof Error ? error.message : 'Failed to initialize hierarchy'],
    };
  }
}

/**
 * Update hierarchy entries based on corrected hierarchy data
 * This syncs Firestore entries with the corrected hierarchy-data.ts file
 */
export async function syncHierarchyFromData(): Promise<{ success: boolean; updated: number; errors: string[] }> {
  try {
    if (!db) {
      return { success: false, updated: 0, errors: ['Firestore is not initialized'] };
    }

    const { HARDCODED_HIERARCHY_DATA } = await import('@/lib/hierarchy-data');
    const { getCanonicalAgencyName } = await import('@/lib/utils/agency-name-normalizer');
    
    const results = {
      success: true,
      updated: 0,
      errors: [] as string[],
    };

    // Process in batches
    const batchSize = 500;
    const batches: Array<Array<typeof HARDCODED_HIERARCHY_DATA[0]>> = [];
    
    for (let i = 0; i < HARDCODED_HIERARCHY_DATA.length; i += batchSize) {
      batches.push(HARDCODED_HIERARCHY_DATA.slice(i, i + batchSize));
    }

    // First, find all existing entries by name to handle agency name changes
    // Query all hierarchy entries to find ones that need updating
    const allExistingEntriesQuery = query(collection(db, HIERARCHY_COLLECTION));
    const existingEntriesSnapshot = await getDocs(allExistingEntriesQuery);
    const entriesByName = new Map<string, { docId: string; data: any }>();
    
    existingEntriesSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const name = data.name?.toUpperCase().trim();
      if (name) {
        // Store by normalized name to find entries even if agency changed
        if (!entriesByName.has(name)) {
          entriesByName.set(name, { docId: docSnap.id, data });
        }
      }
    });

    for (const batch of batches) {
      const firestoreBatch = writeBatch(db);
      let batchUpdated = 0;
      const entriesToDelete = new Set<string>();

      for (const entryData of batch) {
        try {
          // Normalize agency name
          const canonicalAgencyName = getCanonicalAgencyName(entryData.agencyName);
          
          // Create new document ID with correct agency
          const normalizedName = entryData.name.toUpperCase().replace(/\s+/g, '_');
          const normalizedAgency = canonicalAgencyName.toUpperCase().replace(/\s+/g, '_');
          const newDocId = `${normalizedName}_${normalizedAgency}`;

          // Check if there's an existing entry with this name but different agency
          const existingEntry = entriesByName.get(entryData.name.toUpperCase().trim());
          if (existingEntry && existingEntry.docId !== newDocId) {
            // Old entry exists with different agency - delete it
            const oldDocRef = doc(db, HIERARCHY_COLLECTION, existingEntry.docId);
            firestoreBatch.delete(oldDocRef);
            entriesToDelete.add(existingEntry.docId);
            console.log(`[syncHierarchyFromData] Will delete old entry: ${existingEntry.docId} (agency: ${existingEntry.data.agencyName})`);
          }

          const docRef = doc(db, HIERARCHY_COLLECTION, newDocId);
          
          const entry: OrganizationalHierarchyEntry = {
            ...entryData,
            agencyName: canonicalAgencyName, // Use canonical agency name
            id: newDocId,
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
          };

          firestoreBatch.set(docRef, entry, { merge: true });
          batchUpdated++;
        } catch (error) {
          results.errors.push(`Error processing ${entryData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (batchUpdated > 0) {
        await firestoreBatch.commit();
        results.updated += batchUpdated;
        console.log(`[syncHierarchyFromData] Updated batch: ${batchUpdated} entries (deleted ${entriesToDelete.size} old entries)`);
      }
    }

    console.log(`[syncHierarchyFromData] Total updated: ${results.updated} entries`);
    results.success = results.errors.length === 0;
    return results;
  } catch (error) {
    console.error('[syncHierarchyFromData] Error syncing hierarchy:', error);
    return {
      success: false,
      updated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Delete all hierarchy entries for an agency (for re-import)
 */
export async function clearHierarchyForAgency(agencyName: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!db) {
      return { success: false, error: 'Firestore is not initialized' };
    }

    const entries = await getHierarchyByAgency(agencyName);
    const batch = writeBatch(db);

    entries.forEach(entry => {
      if (entry.id) {
        const docRef = doc(db, HIERARCHY_COLLECTION, entry.id);
        batch.delete(docRef);
      }
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error clearing hierarchy for agency:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear hierarchy',
    };
  }
}

