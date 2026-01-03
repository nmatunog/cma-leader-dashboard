/**
 * View Temporary Password Modal
 * Allows admins to retrieve and view a previously set temporary password
 */

'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Copy, Check, AlertCircle } from 'lucide-react';

interface ViewTempPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export function ViewTempPasswordModal({
  isOpen,
  onClose,
  userId,
  userName,
}: ViewTempPasswordModalProps) {
  const [password, setPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRetrievePassword = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get Firebase Auth token
      const { auth } = await import('@/lib/firebase');
      const { getIdToken } = await import('firebase/auth');
      
      if (!auth.currentUser) {
        setError('You must be logged in to perform this action');
        setLoading(false);
        return;
      }

      const token = await getIdToken(auth.currentUser);

      // Call API to retrieve temporary password
      const response = await fetch('/api/admin/get-temp-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to retrieve temporary password');
      }

      setPassword(data.tempPassword);
      setShowPassword(true);
    } catch (err) {
      console.error('Error retrieving temporary password:', err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve temporary password');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying password:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">
            View Temporary Password
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-4">
            Retrieving temporary password for: <strong>{userName}</strong>
          </p>

          {!password ? (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleRetrievePassword}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#D31145] text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Retrieving...' : 'Retrieve Password'}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  Temporary Password
                </p>

                <div className="flex items-center space-x-2 bg-white p-3 rounded border border-amber-300">
                  <code className="flex-1 text-lg font-mono font-bold text-slate-900">
                    {showPassword ? password : '••••••••••••'}
                  </code>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={handleCopyPassword}
                    className="text-slate-500 hover:text-slate-700"
                    title="Copy password"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-[#D31145] text-white rounded-lg font-semibold hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


