import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let _authInstance: Auth | null = null;

// Lazy initialize Firebase
function getFirebaseApp(): FirebaseApp {
  if (!app) {
    // Skip initialization during SSR - environment variables may not be available
    if (typeof window === 'undefined') {
      return null as any;
    }

    // TypeScript now knows these exist, but we still need runtime checks
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

    // Validate required environment variables (client-side only)
    if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
      console.warn(
        `Missing required Firebase environment variables. Firebase features may not work.`
      );
      return null as any;
    }

    const firebaseConfig = {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId,
    };

    if (!getApps().length) {
      try {
        app = initializeApp(firebaseConfig);
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        // Return null instead of throwing - allows graceful degradation
        return null as any;
      }
    } else {
      app = getApps()[0];
    }
  }
  return app;
}

function getFirestoreDB(): Firestore | null {
  if (!dbInstance) {
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) {
      // Return null instead of throwing - allows graceful degradation
      return null;
    }
    try {
      dbInstance = getFirestore(firebaseApp);
    } catch (error) {
      console.error('Failed to get Firestore instance:', error);
      // Return null instead of throwing - allows graceful degradation
      return null;
    }
  }
  return dbInstance;
}

// Get Firebase Auth instance - checks env vars before initializing
function getAuthInstance(): Auth | null {
  // Only initialize on client side
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Check if environment variables are available
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  if (!apiKey || !authDomain || !projectId) {
    return null;
  }
  
  try {
    if (!_authInstance) {
      const firebaseApp = getFirebaseApp();
      if (!firebaseApp) {
        return null;
      }
      _authInstance = getAuth(firebaseApp);
    }
    return _authInstance;
  } catch (error) {
    console.warn('Firebase Auth initialization failed:', error);
    return null;
  }
}

// Export auth as a getter that checks environment variables first
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getAuthInstance();
    if (!instance) {
      throw new Error('Firebase Auth is not initialized. Please check Firebase environment variables in your .env.local file (for local development) or deployment platform settings (for production). Restart the dev server after updating .env.local.');
    }
    return (instance as any)[prop];
  }
});

// Export db - initialized lazily, won't throw on module load if Firebase isn't configured
// The service layer will catch errors when db is actually used
let _dbInstance: Firestore | null = null;
export const db = (() => {
  try {
    _dbInstance = getFirestoreDB();
    if (!_dbInstance) {
      // If Firebase isn't configured, return a proxy that throws helpful errors when used
      // This prevents throwing during module initialization (which causes 500 errors)
      return new Proxy({} as Firestore, {
        get() {
          throw new Error('Firebase is not initialized. Please check Firebase environment variables in your .env.local file (for local development) or deployment platform settings (for production). Restart the dev server after updating .env.local.');
        }
      });
    }
    return _dbInstance;
  } catch (error) {
    // Return proxy instead of throwing - prevents server-side crashes
    // Service layer will catch errors when db is actually used
    return new Proxy({} as Firestore, {
      get() {
        throw new Error(`Firebase is not available. Please check Firebase environment variables in your .env.local file (for local development) or deployment platform settings (for production). Restart the dev server after updating .env.local. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }
})();

