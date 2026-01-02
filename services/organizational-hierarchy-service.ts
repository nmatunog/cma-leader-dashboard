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
 * Get all hierarchy entries for an agency
 */
export async function getHierarchyByAgency(agencyName: string): Promise<OrganizationalHierarchyEntry[]> {
  try {
    if (!db) {
      return [];
    }

    const q = query(
      collection(db, HIERARCHY_COLLECTION),
      where('agencyName', '==', agencyName),
      orderBy('rank', 'asc'),
      orderBy('name', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const entries: OrganizationalHierarchyEntry[] = [];

    querySnapshot.forEach((docSnap) => {
      entries.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as OrganizationalHierarchyEntry);
    });

    return entries;
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

