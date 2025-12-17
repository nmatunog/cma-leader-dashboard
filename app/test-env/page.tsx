'use client';

export default function TestEnvPage() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  const allPresent = apiKey && authDomain && projectId && storageBucket && messagingSenderId && appId;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
        
        <div className={`p-4 mb-4 rounded ${allPresent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <strong>Status:</strong> {allPresent ? '✅ All variables loaded' : '❌ Some variables missing'}
        </div>

        <div className="space-y-2">
          <div>
            <strong>NEXT_PUBLIC_FIREBASE_API_KEY:</strong>{' '}
            {apiKey ? (
              <span className="text-green-600">✅ Loaded ({apiKey.substring(0, 10)}...)</span>
            ) : (
              <span className="text-red-600">❌ Missing</span>
            )}
          </div>
          <div>
            <strong>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:</strong>{' '}
            {authDomain ? (
              <span className="text-green-600">✅ Loaded ({authDomain})</span>
            ) : (
              <span className="text-red-600">❌ Missing</span>
            )}
          </div>
          <div>
            <strong>NEXT_PUBLIC_FIREBASE_PROJECT_ID:</strong>{' '}
            {projectId ? (
              <span className="text-green-600">✅ Loaded ({projectId})</span>
            ) : (
              <span className="text-red-600">❌ Missing</span>
            )}
          </div>
          <div>
            <strong>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:</strong>{' '}
            {storageBucket ? (
              <span className="text-green-600">✅ Loaded ({storageBucket})</span>
            ) : (
              <span className="text-red-600">❌ Missing</span>
            )}
          </div>
          <div>
            <strong>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:</strong>{' '}
            {messagingSenderId ? (
              <span className="text-green-600">✅ Loaded ({messagingSenderId})</span>
            ) : (
              <span className="text-red-600">❌ Missing</span>
            )}
          </div>
          <div>
            <strong>NEXT_PUBLIC_FIREBASE_APP_ID:</strong>{' '}
            {appId ? (
              <span className="text-green-600">✅ Loaded ({appId.substring(0, 20)}...)</span>
            ) : (
              <span className="text-red-600">❌ Missing</span>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> If variables show as missing, make sure:
          </p>
          <ul className="text-sm text-blue-700 list-disc list-inside mt-2">
            <li>.env.local file exists in project root</li>
            <li>Dev server was restarted after creating/editing .env.local</li>
            <li>Browser was hard-refreshed (Cmd+Shift+R / Ctrl+Shift+R)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

