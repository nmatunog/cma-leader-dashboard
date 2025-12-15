'use client';

import { useState } from 'react';
import { UserState } from './strategic-planning-app';
import { verifyAdminCredentials } from '@/lib/admin-config';
import { signInAnonymouslyAuth } from '@/lib/auth';

interface LoginModalProps {
  onLogin: (role: 'advisor' | 'leader' | 'admin', name: string, um: string, agency: string) => void;
}

export function LoginModal({ onLogin }: LoginModalProps) {
  const [name, setName] = useState('');
  const [um, setUM] = useState('');
  const [agency, setAgency] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const toTitleCase = (str: string) => {
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handleLogin = async (role: 'advisor' | 'leader') => {
    if (!name.trim()) {
      alert('Enter Name');
      return;
    }
    if (!agency.trim()) {
      alert('Please select an Agency');
      return;
    }
    
    setIsSigningIn(true);
    try {
      // Sign in anonymously with Firebase Auth
      await signInAnonymouslyAuth();
      // Call the original login handler
      onLogin(role, toTitleCase(name), um || 'Cebu Matunog Agency', agency);
    } catch (error) {
      console.error('Error signing in:', error);
      alert(`Failed to sign in: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSigningIn(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!adminUsername.trim() || !adminPassword.trim()) {
      alert('Please enter both username and password');
      return;
    }
    
    if (verifyAdminCredentials(adminUsername.trim(), adminPassword)) {
      setIsSigningIn(true);
      try {
        // Sign in anonymously with Firebase Auth for admin too
        await signInAnonymouslyAuth();
        onLogin('admin', 'Admin', 'System', 'All Agencies');
        setAdminPassword(''); // Clear password for security
      } catch (error) {
        console.error('Error signing in admin:', error);
        alert(`Failed to sign in: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsSigningIn(false);
        setAdminPassword(''); // Clear password on failed attempt
      }
    } else {
      alert('Invalid admin credentials');
      setAdminPassword(''); // Clear password on failed attempt
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#D31145] via-red-600 to-pink-600 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border-2 border-white/20 p-4 sm:p-6 lg:p-8 max-w-md w-full animate-fade-in my-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-block mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#D31145] to-red-600 flex items-center justify-center shadow-lg mx-auto mb-2 sm:mb-3">
              <span className="text-2xl sm:text-3xl">🚀</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[#D31145] to-red-600 bg-clip-text text-transparent mb-1 sm:mb-2">
            1CMA 2026
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium">Strategic Planning & Goal Setting</p>
        </div>
        
        <div className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 sm:p-3.5 border-2 border-slate-200 rounded-lg sm:rounded-xl outline-none focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm sm:text-base"
              placeholder="e.g. Juan Dela Cruz"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleLogin('advisor');
                }
              }}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide">Unit Manager</label>
              <input
                type="text"
                value={um}
                onChange={(e) => setUM(e.target.value)}
                className="w-full p-3 sm:p-3.5 border-2 border-slate-200 rounded-lg sm:rounded-xl outline-none focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm sm:text-base"
                placeholder="e.g. Maria Clara"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide">Agency Name</label>
              <select
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full p-3 sm:p-3.5 border-2 border-slate-200 rounded-lg sm:rounded-xl outline-none focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm sm:text-base bg-white cursor-pointer"
              >
                <option value="">Select Agency</option>
                <option value="Cebu Matunog Agency">Cebu Matunog Agency</option>
                <option value="Cebu Ez Matunog Premier Agency">Cebu Ez Matunog Premier Agency</option>
              </select>
            </div>
          </div>

          <div className="pt-4 sm:pt-5 border-t-2 border-slate-200">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-3 sm:mb-4 text-center tracking-wide">Select Your Role</label>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <button
                onClick={() => handleLogin('advisor')}
                disabled={isSigningIn}
                className="p-4 sm:p-5 border-2 border-slate-200 rounded-lg sm:rounded-xl hover:border-[#D31145] hover:bg-gradient-to-br hover:from-red-50 hover:to-pink-50 transition-all group shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-2xl sm:text-3xl mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">🛡️</div>
                <div className="font-bold text-slate-700 group-hover:text-[#D31145] text-sm sm:text-base">{isSigningIn ? 'Signing in...' : 'Advisor'}</div>
                <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Agent View</div>
              </button>
              <button
                onClick={() => handleLogin('leader')}
                disabled={isSigningIn}
                className="p-4 sm:p-5 border-2 border-slate-200 rounded-lg sm:rounded-xl hover:border-[#D31145] hover:bg-gradient-to-br hover:from-red-50 hover:to-pink-50 transition-all group shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-2xl sm:text-3xl mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">👑</div>
                <div className="font-bold text-slate-700 group-hover:text-[#D31145] text-sm sm:text-base">{isSigningIn ? 'Signing in...' : 'Leader'}</div>
                <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Manager View</div>
              </button>
            </div>
            
            {/* Admin Login Section */}
            <div className="border-t border-slate-200 pt-3 sm:pt-4">
              <button
                onClick={() => setShowAdminLogin(!showAdminLogin)}
                className="w-full text-xs sm:text-sm text-slate-500 hover:text-[#D31145] transition-colors flex items-center justify-center gap-2"
              >
                <span>🔐</span>
                <span>{showAdminLogin ? 'Hide' : 'Show'} Admin Login</span>
                <span>{showAdminLogin ? '▲' : '▼'}</span>
              </button>
              
              {showAdminLogin && (
                <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide">Admin Username</label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="w-full p-3 sm:p-3.5 border-2 border-slate-200 rounded-lg sm:rounded-xl outline-none focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm sm:text-base"
                      placeholder="Enter admin username"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && adminUsername.trim() && adminPassword.trim()) {
                          handleAdminLogin();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide">Admin Password</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full p-3 sm:p-3.5 border-2 border-slate-200 rounded-lg sm:rounded-xl outline-none focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm sm:text-base"
                      placeholder="Enter admin password"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && adminUsername.trim() && adminPassword.trim()) {
                          handleAdminLogin();
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={handleAdminLogin}
                    disabled={isSigningIn}
                    className="w-full p-3 sm:p-3.5 bg-gradient-to-r from-[#D31145] to-red-600 text-white font-bold rounded-lg sm:rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSigningIn ? 'Signing in...' : '🔐 Login as Admin'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

