/**
 * Firebase Admin SDK Initialization
 * Server-side only - for administrative operations
 */

import admin from 'firebase-admin';

// Re-export types for convenience
type App = admin.app.App;

let adminApp: App | null = null;
let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.firestore.Firestore | null = null;

/**
 * Initialize Firebase Admin SDK
 * Uses service account key from environment variable or application default credentials
 */
export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const apps = admin.apps;
  if (apps.length > 0) {
    adminApp = apps[0];
    return adminApp;
  }

  try {
    // Option 1: Service account key JSON (from environment variable)
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        return adminApp;
      } catch (parseError) {
        console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
      }
    }

    // Option 2: Individual environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    console.log('🔍 Firebase Admin SDK Debug:');
    console.log('  - FIREBASE_PROJECT_ID:', projectId ? 'SET (' + projectId + ')' : 'NOT SET');
    console.log('  - FIREBASE_CLIENT_EMAIL:', clientEmail ? 'SET (' + clientEmail.substring(0, 30) + '...)' : 'NOT SET');
    console.log('  - FIREBASE_PRIVATE_KEY:', privateKey ? 'SET (length: ' + privateKey.length + ')' : 'NOT SET');

    if (projectId && clientEmail && privateKey) {
      try {
        adminApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        console.log('✅ Firebase Admin SDK initialized successfully');
        return adminApp;
      } catch (initError) {
        console.error('❌ Error initializing Firebase Admin SDK:', initError);
        throw initError;
      }
    }

    // Option 3: Application Default Credentials (for production/Cloud Run/GCP)
    // Only try this if we have a project ID - don't fall through if variables are missing
    const fallbackProjectId = projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (fallbackProjectId && (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT)) {
      // Only use Application Default Credentials if we're in a GCP environment
      console.log('🔄 Attempting to use Application Default Credentials...');
      adminApp = admin.initializeApp({
        projectId: fallbackProjectId,
      });
      return adminApp;
    }

    // If we get here, initialization failed
    const missingVars = [];
    if (!projectId) missingVars.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');
    
    const errorMsg = `Failed to initialize Firebase Admin SDK. Missing required environment variables: ${missingVars.join(', ')}. Please check your .env.local file and restart the dev server.`;
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Failed to initialize Firebase Admin SDK. Please check your environment variables.');
  }
}

/**
 * Get Firebase Admin Auth instance
 */
export function getAdminAuth(): admin.auth.Auth {
  if (adminAuth) {
    return adminAuth;
  }
  const app = getAdminApp();
  adminAuth = admin.auth(app);
  return adminAuth;
}

/**
 * Get Firebase Admin Firestore instance
 */
export function getAdminDb(): admin.firestore.Firestore {
  if (adminDb) {
    return adminDb;
  }
  const app = getAdminApp();
  adminDb = admin.firestore(app);
  return adminDb;
}

