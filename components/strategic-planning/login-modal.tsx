'use client';

import { useState } from 'react';
import { UserState } from './strategic-planning-app';

interface LoginModalProps {
  onLogin: (role: 'advisor' | 'leader', name: string, um: string, agency: string) => void;
}

export function LoginModal({ onLogin }: LoginModalProps) {
  const [name, setName] = useState('');
  const [um, setUM] = useState('');
  const [agency, setAgency] = useState('');

  const toTitleCase = (str: string) => {
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const handleLogin = (role: 'advisor' | 'leader') => {
    if (!name.trim()) {
      alert('Enter Name');
      return;
    }
    onLogin(role, toTitleCase(name), um || 'Cebu Matunog Agency', agency || 'Cebu Matunog Agency');
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
              <input
                type="text"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                className="w-full p-3 sm:p-3.5 border-2 border-slate-200 rounded-lg sm:rounded-xl outline-none focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 transition-all shadow-sm text-sm sm:text-base"
                placeholder="e.g. Cebu Matunog"
              />
            </div>
          </div>

          <div className="pt-4 sm:pt-5 border-t-2 border-slate-200">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-3 sm:mb-4 text-center tracking-wide">Select Your Role</label>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={() => handleLogin('advisor')}
                className="p-4 sm:p-5 border-2 border-slate-200 rounded-lg sm:rounded-xl hover:border-[#D31145] hover:bg-gradient-to-br hover:from-red-50 hover:to-pink-50 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="text-2xl sm:text-3xl mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">🛡️</div>
                <div className="font-bold text-slate-700 group-hover:text-[#D31145] text-sm sm:text-base">Advisor</div>
                <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Agent View</div>
              </button>
              <button
                onClick={() => handleLogin('leader')}
                className="p-4 sm:p-5 border-2 border-slate-200 rounded-lg sm:rounded-xl hover:border-[#D31145] hover:bg-gradient-to-br hover:from-red-50 hover:to-pink-50 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="text-2xl sm:text-3xl mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform">👑</div>
                <div className="font-bold text-slate-700 group-hover:text-[#D31145] text-sm sm:text-base">Leader</div>
                <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">Manager View</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

