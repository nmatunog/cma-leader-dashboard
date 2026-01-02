import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AGENCIES as DEFAULT_AGENCIES } from '@/lib/constants';

const AGENCIES_COLLECTION = 'agencies';
const AGENCIES_DOC_ID = 'agency_list';

export interface Agency {
  id: string;
  name: string;
  createdAt: Date;
  createdBy?: string;
  isActive: boolean;
}

// Get all agencies from Firestore (with fallback to constants)
export async function getAgencies(): Promise<string[]> {
  try {
    if (!db || typeof db === 'undefined' || !('type' in db) || !('app' in db)) {
      // Firebase not initialized, return default agencies
      return [...DEFAULT_AGENCIES];
    }

    const docRef = doc(db, AGENCIES_COLLECTION, AGENCIES_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const agencies = data.agencies as string[];
      if (Array.isArray(agencies) && agencies.length > 0) {
        return agencies;
      }
    }

    // If no agencies in Firestore, initialize with defaults
    await initializeAgencies();
    return [...DEFAULT_AGENCIES];
  } catch (error) {
    console.error('Error loading agencies:', error);
    // Fallback to default agencies on error
    return [...DEFAULT_AGENCIES];
  }
}

// Initialize agencies collection with default values
async function initializeAgencies(): Promise<void> {
  try {
    const docRef = doc(db, AGENCIES_COLLECTION, AGENCIES_DOC_ID);
    await setDoc(docRef, {
      agencies: DEFAULT_AGENCIES,
      updatedAt: new Date(),
    }, { merge: true });
  } catch (error) {
    console.error('Error initializing agencies:', error);
    throw error;
  }
}

// Add a new agency
export async function addAgency(agencyName: string, createdBy?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!agencyName || !agencyName.trim()) {
      return { success: false, error: 'Agency name is required' };
    }

    const normalizedName = agencyName.trim();
    const currentAgencies = await getAgencies();

    // Check if agency already exists
    if (currentAgencies.includes(normalizedName)) {
      return { success: false, error: 'Agency already exists' };
    }

    // Add new agency to the list
    const updatedAgencies = [...currentAgencies, normalizedName].sort();

    const docRef = doc(db, AGENCIES_COLLECTION, AGENCIES_DOC_ID);
    await setDoc(docRef, {
      agencies: updatedAgencies,
      updatedAt: new Date(),
      lastModifiedBy: createdBy,
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error adding agency:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add agency',
    };
  }
}

// Remove an agency (only if no users are using it)
export async function removeAgency(agencyName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentAgencies = await getAgencies();

    // Check if agency exists
    if (!currentAgencies.includes(agencyName)) {
      return { success: false, error: 'Agency not found' };
    }

    // Remove agency from the list
    const updatedAgencies = currentAgencies.filter(name => name !== agencyName);

    const docRef = doc(db, AGENCIES_COLLECTION, AGENCIES_DOC_ID);
    await setDoc(docRef, {
      agencies: updatedAgencies,
      updatedAt: new Date(),
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error removing agency:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove agency',
    };
  }
}

// Update agency name (rename)
export async function updateAgency(oldName: string, newName: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newName || !newName.trim()) {
      return { success: false, error: 'New agency name is required' };
    }

    const normalizedName = newName.trim();
    const currentAgencies = await getAgencies();

    // Check if old agency exists
    if (!currentAgencies.includes(oldName)) {
      return { success: false, error: 'Agency not found' };
    }

    // Check if new name already exists
    if (currentAgencies.includes(normalizedName) && normalizedName !== oldName) {
      return { success: false, error: 'New agency name already exists' };
    }

    // Update agency name in the list
    const updatedAgencies = currentAgencies.map(name => name === oldName ? normalizedName : name).sort();

    const docRef = doc(db, AGENCIES_COLLECTION, AGENCIES_DOC_ID);
    await setDoc(docRef, {
      agencies: updatedAgencies,
      updatedAt: new Date(),
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error updating agency:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update agency',
    };
  }
}

