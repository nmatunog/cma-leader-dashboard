import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SheetConfig, SheetConfigs, SheetType } from '@/types';

const SHEETS_CONFIG_DOC_ID = 'sheets-config';
const CONFIG_COLLECTION = 'config';

// Convert Firestore Timestamp or Date to ISO string (serializable)
function convertTimestampToString(timestamp: any): string | undefined {
  if (!timestamp) return undefined;
  
  // If it's a Firestore Timestamp
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    const date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    return date.toISOString();
  }
  
  // If it's already a Date
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // If it's already an ISO string, return as-is
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  return undefined;
}

// Convert SheetConfig to plain object (serializable)
// Convert dates to ISO strings for serialization, then back to Date objects
function normalizeSheetConfig(config: any): SheetConfig | null {
  if (!config) return null;
  
  const lastUpdatedStr = convertTimestampToString(config.lastUpdated);
  
  // Return a plain object that can be serialized
  // We'll convert the ISO string back to Date in the component if needed
  const normalized: any = {
    id: config.id || '',
    type: config.type,
    name: config.name || '',
    csvUrl: config.csvUrl || '',
    isActive: config.isActive !== undefined ? config.isActive : true,
  };
  
  // Only add lastUpdated if it exists, and serialize it properly
  if (lastUpdatedStr) {
    // Store as ISO string for serialization, component will convert to Date
    normalized.lastUpdated = lastUpdatedStr;
  }
  
  return normalized as SheetConfig;
}

// Load sheet configurations from Firebase
export async function loadSheetConfigs(): Promise<SheetConfigs> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, SHEETS_CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        agency: normalizeSheetConfig(data.agency),
        leaders: normalizeSheetConfig(data.leaders),
        agents: normalizeSheetConfig(data.agents),
      };
    }

    return {
      agency: null,
      leaders: null,
      agents: null,
    };
  } catch (error) {
    console.error('Error loading sheet configs:', error);
    return {
      agency: null,
      leaders: null,
      agents: null,
    };
  }
}

// Save sheet configuration
export async function saveSheetConfig(
  type: SheetType,
  config: SheetConfig
): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, SHEETS_CONFIG_DOC_ID);
    const currentConfigs = await loadSheetConfigs();

    const updatedConfigs: SheetConfigs = {
      ...currentConfigs,
      [type]: {
        ...config,
        lastUpdated: new Date(),
      },
    };

    await setDoc(docRef, updatedConfigs, { merge: true });
  } catch (error) {
    console.error('Error saving sheet config:', error);
    throw error;
  }
}

// Delete sheet configuration
export async function deleteSheetConfig(type: SheetType): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, SHEETS_CONFIG_DOC_ID);
    const currentConfigs = await loadSheetConfigs();

    const updatedConfigs: SheetConfigs = {
      ...currentConfigs,
      [type]: null,
    };

    await setDoc(docRef, updatedConfigs, { merge: true });
  } catch (error) {
    console.error('Error deleting sheet config:', error);
    throw error;
  }
}

