import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

// Lazy initialize Firebase
function getFirebaseApp(): FirebaseApp {
  if (!app) {
    // Use direct property access (not dynamic) so Next.js can replace at build time
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

    const firebaseConfig = {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId,
    };

    // Validate required environment variables using direct checks
    const missingVars = [];
    if (!apiKey || apiKey === '') missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
    if (!authDomain || authDomain === '') missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    if (!projectId || projectId === '') missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    if (!storageBucket || storageBucket === '') missingVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    if (!messagingSenderId || messagingSenderId === '') missingVars.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
    if (!appId || appId === '') missingVars.push('NEXT_PUBLIC_FIREBASE_APP_ID');
    
    if (missingVars.length > 0) {
      // Don't throw - return null to allow graceful degradation
      // This prevents server-side 500 errors when Firebase isn't configured yet
      console.warn(
        `Missing required Firebase environment variables: ${missingVars.join(', ')}. Firebase features may not work.`
      );
      return null as any;
    }

    if (!getApps().length) {
      try {
        app = initializeApp(firebaseConfig);
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        // Return null instead of throwing - allows graceful degradation
        // But log the actual error for debugging
        if (error instanceof Error) {
          console.error('Firebase initialization error details:', error.message);
        }
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

// Get Firebase Auth instance
function getFirebaseAuth(): Auth | null {
  try {
    if (!authInstance) {
      const firebaseApp = getFirebaseApp();
      if (!firebaseApp) {
        // Return null instead of throwing - allows graceful degradation
        return null;
      }
      try {
        authInstance = getAuth(firebaseApp);
      } catch (error) {
        console.error('Failed to get Firebase Auth instance:', error);
        // Return null instead of throwing - allows graceful degradation
        return null;
      }
    }
    return authInstance;
  } catch (error) {
    console.warn('Firebase Auth initialization failed:', error);
    // Return null instead of throwing - allows graceful degradation
    return null;
  }
}

// Export auth - initialized lazily, won't throw on module load if Firebase isn't configured
// The service layer will catch errors when auth is actually used
let _authInstance: Auth | null = null;

function getAuthInstance(): Auth {
  // Only initialize on client side
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth can only be used on the client side');
  }
  
  if (!_authInstance) {
    // Check if env vars are available first - use direct property access (not dynamic)
    // Next.js replaces NEXT_PUBLIC_* vars at build time, but only for static property access
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    
    const missingVars = [];
    if (!apiKey || apiKey === '') missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
    if (!authDomain || authDomain === '') missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    if (!projectId || projectId === '') missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    if (!storageBucket || storageBucket === '') missingVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    if (!messagingSenderId || messagingSenderId === '') missingVars.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
    if (!appId || appId === '') missingVars.push('NEXT_PUBLIC_FIREBASE_APP_ID');
    
    if (missingVars.length > 0) {
      throw new Error(`Firebase Auth is not initialized. Missing environment variables: ${missingVars.join(', ')}. Please check your .env.local file and restart the dev server.`);
    }
    
    try {
      _authInstance = getFirebaseAuth();
      if (!_authInstance) {
        throw new Error('Firebase Auth initialization failed. getFirebaseAuth() returned null. Please check your Firebase configuration.');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Firebase Auth initialization failed. Please check your Firebase configuration and restart the dev server.');
    }
  }
  return _authInstance;
}

// Create a proxy that lazily initializes auth when accessed
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getAuthInstance();
    const value = (instance as any)[prop];
    // If it's a function, bind it to the instance
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

// Export db - must be actual Firestore instance (not proxy) because it's passed to collection()
// Initialize eagerly on client side
export const db = (() => {
  if (typeof window === 'undefined') {
    // Server side - return empty object (will fail if used, but prevents SSR errors)
    return {} as Firestore;
  }
  
  // Client side - initialize Firestore immediately
  // This is OK because Firestore initialization is lightweight
  const dbInst = getFirestoreDB();
  if (!dbInst) {
    // If initialization failed, we still return empty object
    // It will fail when used, but that's better than module load error
    console.error('Firebase Firestore initialization failed. Check your Firebase configuration.');
    return {} as Firestore;
  }
  
  return dbInst;
})();

