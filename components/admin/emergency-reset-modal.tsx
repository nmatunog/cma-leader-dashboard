/**
 * Emergency Password Reset Modal
 * Shows the hardcoded emergency password after resetting a user's password
 */

'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Copy, Check, AlertTriangle } from 'lucide-react';

interface EmergencyResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onPasswordReset: () => void;
}

export function EmergencyResetModal({
  isOpen,
  onClose,
  userId,
  userName,
  onPasswordReset,
}: EmergencyResetModalProps) {
  const [password, setPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleEmergencyReset = async () => {
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

      // Call API to reset password using emergency password
      const response = await fetch('/api/admin/emergency-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }

      if (!data.password) {
        throw new Error('No password returned from server');
      }

      setPassword(data.password);
      setShowPassword(true);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset password');
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

  const handleClose = () => {
    if (password) {
      onPasswordReset(); // Refresh users list
    }
    setPassword(null);
    setShowPassword(false);
    setError(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">
            Emergency Password Reset
          </h2>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-4">
            Resetting password for: <strong>{userName}</strong>
          </p>

          {!password ? (
            <>
              <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 mb-1">
                      Emergency Reset Password
                    </p>
                    <p className="text-xs text-amber-700">
                      This will reset the user's password to a hardcoded emergency password. 
                      The user will be required to change their password on next login.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleEmergencyReset}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Resetting...' : 'Reset with Emergency Password'}
                </button>
                <button
                  onClick={handleClose}
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
                  ⚠️ Emergency Password Set!
                </p>
                <p className="text-xs text-amber-700 mb-3">
                  The user's password has been reset to the emergency password. 
                  Share this password securely with the user. They will be required to change it on next login.
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
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700"
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

