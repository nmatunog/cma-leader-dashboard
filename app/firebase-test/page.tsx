'use client';

export default function FirebaseTestPage() {
  // Test if Firebase can actually initialize
  const testFirebaseInit = async () => {
    try {
      const { auth } = await import('@/lib/firebase');
      console.log('✅ Firebase auth imported successfully');
      console.log('Auth object:', auth);
      // Try to access a property to trigger initialization
      const currentUser = auth.currentUser;
      console.log('✅ Firebase auth initialized, currentUser:', currentUser);
      return 'SUCCESS';
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      return error instanceof Error ? error.message : 'Unknown error';
    }
  };

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Firebase Initialization Test</h1>
        
        <div className="space-y-4">
          <div>
            <strong>Environment Variables:</strong>
            <div className="mt-2 space-y-1">
              <div>API Key: {apiKey ? `✅ Loaded (${apiKey.substring(0, 20)}...)` : '❌ Missing'}</div>
              <div>Project ID: {projectId ? `✅ Loaded (${projectId})` : '❌ Missing'}</div>
            </div>
          </div>

          <div>
            <button
              onClick={async () => {
                const result = await testFirebaseInit();
                alert(result);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Test Firebase Initialization
            </button>
          </div>

          <div className="p-4 bg-yellow-50 rounded">
            <p className="text-sm">
              <strong>Note:</strong> Check the browser console (F12) for detailed logs.
              If you see "Missing environment variables" but the test above shows they're loaded,
              your browser may have cached an old JavaScript bundle. Try:
            </p>
            <ul className="text-sm list-disc list-inside mt-2">
              <li>Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)</li>
              <li>Clear browser cache completely</li>
              <li>Try an incognito/private window</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

