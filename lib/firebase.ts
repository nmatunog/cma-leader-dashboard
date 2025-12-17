import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

// Lazy initialize Firebase
function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    // Validate required environment variables
    // Check both server-side and client-side availability
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
    ];
    
    const missingVars = requiredVars.filter(
      (varName) => !process.env[varName] || process.env[varName] === ''
    );
    
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
export const auth = (() => {
  try {
    _authInstance = getFirebaseAuth();
    if (!_authInstance) {
      // If Firebase isn't configured, return a proxy that throws helpful errors when used
      // This prevents throwing during module initialization (which causes 500 errors)
      return new Proxy({} as Auth, {
        get() {
          throw new Error('Firebase Auth is not initialized. Please check Firebase environment variables in your .env.local file (for local development) or deployment platform settings (for production). Restart the dev server after updating .env.local.');
        }
      });
    }
    return _authInstance;
  } catch (error) {
    // Return proxy instead of throwing - prevents server-side crashes
    // Service layer will catch errors when auth is actually used
    return new Proxy({} as Auth, {
      get() {
        throw new Error(`Firebase Auth is not available. Please check Firebase environment variables in your .env.local file (for local development) or deployment platform settings (for production). Restart the dev server after updating .env.local. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }
})();

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

