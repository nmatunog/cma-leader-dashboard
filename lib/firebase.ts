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
      // Only throw error on server-side (build time)
      // On client-side, log warning but allow graceful degradation
      if (typeof window === 'undefined') {
        console.error(
          `Missing required Firebase environment variables: ${missingVars.join(', ')}`
        );
        throw new Error(
          `Firebase configuration incomplete. Missing: ${missingVars.join(', ')}`
        );
      } else {
        // Client-side: log warning but don't throw (allows app to load)
        console.warn(
          `Missing required Firebase environment variables: ${missingVars.join(', ')}. Firebase features may not work.`
        );
        // Don't initialize Firebase if config is incomplete
        // Return a mock app instance that will fail gracefully on operations
        return null as any;
      }
    }

    if (!getApps().length) {
      try {
        app = initializeApp(firebaseConfig);
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        if (typeof window === 'undefined') {
          throw error;
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
      // On client-side, return null instead of throwing to allow app to load
      if (typeof window !== 'undefined') {
        return null;
      }
      // Server-side should throw
      throw new Error('Firebase is not initialized. Please check environment variables.');
    }
    try {
      dbInstance = getFirestore(firebaseApp);
    } catch (error) {
      console.error('Failed to get Firestore instance:', error);
      if (typeof window !== 'undefined') {
        return null;
      }
      throw new Error('Failed to initialize Firestore. Please check Firebase configuration.');
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
        if (typeof window !== 'undefined') {
          return null;
        }
        throw new Error('Firebase is not initialized. Please check environment variables.');
      }
      try {
        authInstance = getAuth(firebaseApp);
      } catch (error) {
        console.error('Failed to get Firebase Auth instance:', error);
        if (typeof window !== 'undefined') {
          return null;
        }
        throw new Error('Failed to initialize Firebase Auth. Please check Firebase configuration.');
      }
    }
    return authInstance;
  } catch (error) {
    if (typeof window !== 'undefined') {
      console.warn('Firebase Auth initialization failed:', error);
      return null;
    }
    throw error;
  }
}

// Export auth - initialized lazily
let _authInstance: Auth | null = null;
export const auth = (() => {
  try {
    _authInstance = getFirebaseAuth();
    if (!_authInstance && typeof window !== 'undefined') {
      // Return proxy that throws helpful error on client-side when used
        return new Proxy({} as Auth, {
                        get() {
                            throw new Error('Firebase Auth is not initialized. Please check Firebase environment variables in your .env.local file (for local development) or deployment platform settings (for production). Restart the dev server after updating .env.local.');
                        }
                    });
    }
    if (!_authInstance) {
      throw new Error('Firebase Auth is not available');
    }
    return _authInstance;
  } catch (error) {
    if (typeof window !== 'undefined') {
      return new Proxy({} as Auth, {
        get() {
          throw new Error(`Firebase Auth is not available. Please check Firebase environment variables in Netlify and trigger a new deployment. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
    }
    throw error;
  }
})();

// Export db - initialized lazily, won't throw on client-side if Firebase isn't configured
// The service layer will catch errors when db is actually used
let _dbInstance: Firestore | null = null;
export const db = (() => {
  try {
    _dbInstance = getFirestoreDB();
    if (!_dbInstance && typeof window !== 'undefined') {
      // On client-side, if Firebase isn't configured, create a proxy that throws helpful errors when used
      return new Proxy({} as Firestore, {
        get() {
          throw new Error('Firebase is not initialized. Please check Firebase environment variables in Netlify settings and trigger a new deployment after adding them.');
        }
      });
    }
    if (!_dbInstance) {
      throw new Error('Firestore is not available');
    }
    return _dbInstance;
  } catch (error) {
    if (typeof window !== 'undefined') {
      // Return proxy that throws helpful error on client-side
      return new Proxy({} as Firestore, {
        get() {
          throw new Error(`Firebase is not available. Please check Firebase environment variables in Netlify and trigger a new deployment. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
    }
    throw error;
  }
})();

