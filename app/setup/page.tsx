'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/lib/auth-service';
import { getAllUsers } from '@/lib/user-service';
import type { UserCreateData } from '@/types/user';

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [firebaseConfigured, setFirebaseConfigured] = useState<boolean | null>(null);
  const [formData, setFormData] = useState<UserCreateData>({
    email: '',
    password: '',
    name: '',
    role: 'admin',
    rank: 'ADMIN',
    unitManager: '',
    agencyName: 'Cebu Matunog Agency',
  });

  useEffect(() => {
    checkForAdmin();
  }, []);

  const checkForAdmin = async () => {
    try {
      // Check if Firebase is configured by checking for required env vars
      const requiredVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      ];
      
      const missingVars = requiredVars.filter(
        (varName) => !process.env[varName] || process.env[varName] === ''
      );
      
      if (missingVars.length > 0) {
        // Firebase not configured - allow setup to proceed but show warning
        console.warn('Firebase environment variables not configured:', missingVars);
        setFirebaseConfigured(false);
        setHasAdmin(false);
        setChecking(false);
        return;
      }
      
      // Firebase appears to be configured
      setFirebaseConfigured(true);

      // Try to get users - this might fail if Firestore rules require auth or Firebase isn't initialized
      // In that case, we'll allow setup to proceed
      try {
        const users = await getAllUsers();
        const adminExists = users.some(user => user.role === 'admin' && user.isActive);
        setHasAdmin(adminExists);
      } catch (fetchError) {
        // If getAllUsers fails (e.g., Firestore not initialized), allow setup to proceed
        console.warn('Could not check for existing admin users:', fetchError);
        setHasAdmin(false);
      }
      
      if (adminExists) {
        // If admin exists, redirect to login
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      console.error('Error checking for admin (this is OK for initial setup):', err);
      // If error (e.g., Firestore not initialized, rules require auth, or no users collection exists yet),
      // allow setup to proceed - this is expected for initial setup
      setHasAdmin(false);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    // Validate
    if (!formData.email || !formData.password || !formData.name || !formData.agencyName) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Create admin user with 'system' as createdBy since this is initial setup
      const result = await registerUser(formData, 'system');
      
      if (result.success) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(result.error || 'Failed to create admin user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D31145] mb-4"></div>
          <p className="text-slate-600">Checking setup status...</p>
        </div>
      </div>
    );
  }

  if (hasAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border-l-4 border-green-500">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Setup Complete</h2>
          <p className="text-slate-600 mb-4">
            An admin user already exists. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full border-l-4 border-[#D31145]">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🚀</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Initial Setup</h1>
          <p className="text-slate-600">
            Create your first admin user account to get started
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded">
            Admin user created successfully! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
              placeholder="admin@cma.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
              placeholder="Admin User"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Agency Name *
            </label>
            <input
              type="text"
              value={formData.agencyName}
              onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
              className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || success}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#D31145] to-red-600 text-white font-bold rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Admin User...' : success ? 'Success!' : 'Create Admin Account'}
            </button>
          </div>
        </form>

        {firebaseConfigured === false && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800 font-semibold mb-2">
              ⚠️ Firebase Configuration Required
            </p>
            <p className="text-sm text-yellow-700">
              Firebase environment variables are not configured. Please add the following environment variables:
            </p>
            <ul className="text-sm text-yellow-700 list-disc list-inside mt-2 space-y-1">
              <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
              <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
              <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
              <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
              <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
              <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
            </ul>
            <p className="text-sm text-yellow-700 mt-2">
              For local development, add them to <code className="bg-yellow-100 px-1 rounded">.env.local</code>. 
              For deployment, add them to your platform's environment variables.
            </p>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This page will only be accessible if no admin users exist. 
            After creating your admin account, you'll be able to manage all users from the User Management page.
          </p>
        </div>
      </div>
    </div>
  );
}

