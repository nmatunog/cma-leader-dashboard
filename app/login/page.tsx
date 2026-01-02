'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser, resetPassword } from '@/lib/auth-service';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from '@/components/sidebar';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [useCode, setUseCode] = useState(false); // Default to email-based login (better for admin)
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        router.push('/reports');
      } else {
        router.push('/strategic-planning');
      }
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let loginEmail = '';
      
      if (useCode) {
        // Convert code to email format
        if (!code.trim()) {
          setError('Please enter your code');
          setIsLoading(false);
          return;
        }
        loginEmail = `${code.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@cma.local`;
      } else {
        // Use email directly
        if (!email.trim()) {
          setError('Please enter your email');
          setIsLoading(false);
          return;
        }
        loginEmail = email.trim();
      }

      const result = await loginUser(loginEmail, password);
      
      if (result.success && result.user) {
        // Redirect based on role
        if (result.user.role === 'admin') {
          router.push('/reports');
        } else {
          router.push('/strategic-planning');
        }
      } else {
        setError(result.error || 'Failed to log in');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!resetEmail.trim()) {
      setError('Please enter your email address or code');
      return;
    }

    try {
      // Check if it looks like a code (no @ symbol) or email
      let emailToUse = resetEmail.trim();
      if (!emailToUse.includes('@')) {
        // It's a code, convert to email format
        emailToUse = `${emailToUse.toLowerCase().replace(/[^a-z0-9]/g, '')}@cma.local`;
      }

      const result = await resetPassword(emailToUse);
      if (result.success) {
        setResetSent(true);
        setError('');
      } else {
        setError(result.error || 'Failed to send password reset email');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Password reset error:', err);
    }
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#D31145] via-red-600 to-pink-600">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If already logged in, don't show login form (redirect will happen)
  if (user) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#D31145] via-red-600 to-pink-600 p-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border-2 border-white/20 p-6 sm:p-8 lg:p-10 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#D31145] to-red-600 flex items-center justify-center shadow-lg mx-auto mb-3">
                <span className="text-3xl sm:text-4xl">🚀</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-2">
              1CMA 2026
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-medium">
              {showForgotPassword ? 'Reset Your Password' : 'Login to Continue'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          )}

          {resetSent ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-green-800 text-sm font-medium">
                  Password reset email sent! Check your inbox and follow the instructions to reset your password.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSent(false);
                  setResetEmail('');
                }}
                className="text-[#D31145] hover:text-red-600 font-medium text-sm"
              >
                Back to Login
              </button>
            </div>
          ) : showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide">
                  Code or Email Address
                </label>
                <input
                  type="text"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full p-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-base"
                  placeholder="Enter your code or email"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter your advisor/leader code or email address
                </p>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full p-3.5 bg-gradient-to-r from-[#D31145] to-red-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-[#D31145] hover:text-red-600 font-medium text-sm"
                disabled={isLoading}
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="flex items-center justify-center gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseCode(true);
                    setEmail('');
                    setError('');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    useCode
                      ? 'bg-[#D31145] text-white shadow-md'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                  disabled={isLoading}
                >
                  Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseCode(false);
                    setCode('');
                    setError('');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    !useCode
                      ? 'bg-[#D31145] text-white shadow-md'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                  disabled={isLoading}
                >
                  Email
                </button>
              </div>

              {useCode ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide">
                    Advisor/Leader Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full p-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-base"
                    placeholder="Enter your code"
                    required
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-base"
                    placeholder="Enter your email"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-base"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-[#D31145] hover:text-red-600 font-medium text-right w-full"
                disabled={isLoading}
              >
                Forgot Password?
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full p-3.5 bg-gradient-to-r from-[#D31145] to-red-600 text-white font-bold rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Logging in...</span>
                  </>
                ) : (
                  'Login'
                )}
              </button>
              <p className="text-center text-sm text-slate-600 mt-4">
                Don't have an account?{' '}
                <a href="/signup" className="text-[#D31145] font-semibold hover:underline">
                  Sign up
                </a>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}


