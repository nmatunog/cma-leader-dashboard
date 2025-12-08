import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Leader, Agent, AgencyTargets } from '@/types';

const DASHBOARD_DOC_ID = 'dashboard';
const DATA_COLLECTION = 'data';

interface DashboardData {
  trackingData: Leader[];
  agentsData: Agent[];
  agencyAnpTarget: number;
  agencyRecruitsTarget: number;
}

// Load dashboard data from Firebase with caching
let cachedData: DashboardData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Clear cache (useful after syncing)
export function clearDashboardCache(): void {
  cachedData = null;
  cacheTimestamp = 0;
}

export async function loadDashboardData(useCache = true): Promise<DashboardData | null> {
  try {
    // Return cached data if still valid
    if (useCache && cachedData && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedData;
    }

    const docRef = doc(db, DATA_COLLECTION, DASHBOARD_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as DashboardData;
      cachedData = data;
      cacheTimestamp = Date.now();
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    // Return cached data on error if available
    if (cachedData) {
      return cachedData;
    }
    return null;
  }
}

// Save dashboard data to Firebase
export async function saveDashboardData(data: DashboardData): Promise<void> {
  try {
    const docRef = doc(db, DATA_COLLECTION, DASHBOARD_DOC_ID);
    await setDoc(docRef, data, { merge: true });
    // Update cache
    cachedData = data;
    cacheTimestamp = Date.now();
  } catch (error) {
    console.error('Error saving dashboard data:', error);
    throw error;
  }
}

// Subscribe to real-time updates
export function subscribeToDashboardData(
  callback: (data: DashboardData | null) => void
): () => void {
  const docRef = doc(db, DATA_COLLECTION, DASHBOARD_DOC_ID);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as DashboardData);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error subscribing to dashboard data:', error);
      callback(null);
    }
  );
}

