/**
 * Temporary Password Display Modal
 * Shows the temporary password to admin (one-time view)
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Copy, Check } from 'lucide-react';

interface TempPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onPasswordSet: () => void;
}

export function TempPasswordModal({
  isOpen,
  onClose,
  userId,
  userName,
  onPasswordSet,
}: TempPasswordModalProps) {
  const [password, setPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [useReadable, setUseReadable] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens (but don't reset if password is already set - that means we're showing the result)
      if (!password) {
        setPassword(null);
        setShowPassword(false);
        setError(null);
        setCopied(false);
      }
    }
    // Note: We don't reset when modal closes - let the parent handle that
  }, [isOpen]); // Only depend on isOpen

  const handleGeneratePassword = async () => {
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

      // Call API to generate and set temporary password
      const response = await fetch('/api/admin/set-temp-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          useReadable,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to set temporary password');
      }

      console.log('✅ Password generated successfully:', data.tempPassword ? 'Password received' : 'No password in response');
      console.log('Response data:', { success: data.success, hasTempPassword: !!data.tempPassword });
      
      if (!data.tempPassword) {
        throw new Error('No password returned from server');
      }

      setPassword(data.tempPassword);
      setShowPassword(true);
      // Don't call onPasswordSet here - we'll call it when the modal closes
    } catch (err) {
      console.error('Error setting temporary password:', err);
      setError(err instanceof Error ? err.message : 'Failed to set temporary password');
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
            Set Temporary Password
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
            Setting temporary password for: <strong>{userName}</strong>
          </p>

          {!password ? (
            <>
              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={useReadable}
                    onChange={(e) => setUseReadable(e.target.checked)}
                    className="rounded border-slate-300 text-[#D31145] focus:ring-[#D31145]"
                  />
                  <span className="text-sm text-slate-700">
                    Use readable password format (e.g., "Blue-Car-42")
                  </span>
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-6">
                  Readable passwords are easier to communicate but less secure
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleGeneratePassword}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#D31145] text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Generate & Set Password'}
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
                  ⚠️ IMPORTANT: Save this password now!
                </p>
                <p className="text-xs text-amber-700 mb-3">
                  This password will only be shown once. Make sure to copy it and communicate it securely to the user.
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
                  onClick={() => {
                    onPasswordSet(); // Refresh users list when closing
                    onClose();
                  }}
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


