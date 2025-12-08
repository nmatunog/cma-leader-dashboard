'use client';

import { useState, useEffect } from 'react';
import { LoginModal } from './login-modal';
import { AIModal } from './ai-modal';
import { TabNavigation } from './tab-navigation';
import { OverviewTab } from './tabs/overview-tab';
import { AdvisorSimTab } from './tabs/advisor-sim-tab';
import { LeaderHQTab } from './tabs/leader-hq-tab';
import { PathToPremierTab } from './tabs/path-to-premier-tab';
import { GoalSettingTab } from './tabs/goal-setting-tab';

export interface UserState {
  role: 'advisor' | 'leader' | 'admin';
  rank: string;
  name: string;
  um: string;
  agency: string;
}

export function StrategicPlanningApp() {
  const [userState, setUserState] = useState<UserState>({
    role: 'advisor',
    rank: 'LA',
    name: '',
    um: '',
    agency: '',
  });
  const [originalRank, setOriginalRank] = useState<string>('LA'); // Store original login rank
  const [activeTab, setActiveTab] = useState('overview');
  const [showLogin, setShowLogin] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModalContent, setAIModalContent] = useState('');
  const [aiModalTitle, setAIModalTitle] = useState('AI Assistant');

  useEffect(() => {
    // Mark as mounted to avoid hydration issues
    setIsMounted(true);
    
    // Check if user is already logged in (from localStorage) - only on client side
    if (typeof window === 'undefined') {
      return;
    }
    
    const savedName = localStorage.getItem('sp_user_name');
    const savedRole = localStorage.getItem('sp_user_role') as 'advisor' | 'leader' | null;
    const savedRank = localStorage.getItem('sp_user_rank') as string | null;
    
    // Only auto-login if we have valid saved data
    if (savedName && savedName.trim() && savedRole && (savedRole === 'advisor' || savedRole === 'leader' || savedRole === 'admin')) {
      let rank = savedRank || 'LA';
      if (savedRole === 'leader') rank = 'UM';
      else if (savedRole === 'admin') rank = 'ADMIN';
      
      setOriginalRank(rank);
      setUserState({
        role: savedRole,
        rank: rank,
        name: savedName,
        um: localStorage.getItem('sp_user_um') || (savedRole === 'admin' ? 'System' : 'Cebu Matunog Agency'),
        agency: localStorage.getItem('sp_user_agency') || (savedRole === 'admin' ? 'All Agencies' : 'Cebu Matunog Agency'),
      });
      setShowLogin(false);
      
      // If admin, redirect to reports page
      if (savedRole === 'admin') {
        window.location.href = '/reports';
      }
    } else {
      // Ensure login shows if no saved data or invalid data
      setShowLogin(true);
    }
  }, []);

  const handleLogin = (role: 'advisor' | 'leader' | 'admin', name: string, um: string, agency: string) => {
    let rank = 'LA';
    if (role === 'leader') {
      rank = 'UM';
    } else if (role === 'admin') {
      rank = 'ADMIN';
    }
    
    setOriginalRank(rank); // Store original rank from login
    const newState: UserState = {
      role,
      rank: rank,
      name,
      um: um || 'System',
      agency: agency || 'All Agencies',
    };
    setUserState(newState);
    setShowLogin(false);
    
    // Save to localStorage
    localStorage.setItem('sp_user_name', name);
    localStorage.setItem('sp_user_role', role);
    localStorage.setItem('sp_user_rank', rank); // Save original rank
    localStorage.setItem('sp_user_um', um || 'System');
    localStorage.setItem('sp_user_agency', agency || 'All Agencies');
    
    // If admin, redirect to reports page
    if (role === 'admin') {
      window.location.href = '/reports';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sp_user_name');
    localStorage.removeItem('sp_user_role');
    localStorage.removeItem('sp_user_rank');
    localStorage.removeItem('sp_user_um');
    localStorage.removeItem('sp_user_agency');
    setShowLogin(true);
    setOriginalRank('LA');
    setUserState({
      role: 'advisor',
      rank: 'LA',
      name: '',
      um: '',
      agency: '',
    });
    setActiveTab('overview');
  };

  const clearData = () => {
    if (confirm('Reset all strategic planning data?')) {
      // Only clear strategic planning specific data
      const keys = Object.keys(localStorage).filter(key => key.startsWith('sp_'));
      keys.forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }
  };

  const showAI = (title: string, content: string) => {
    setAIModalTitle(title);
    setAIModalContent(content);
    setShowAIModal(true);
  };

  const toggleRole = () => {
    // Only allow role toggle if user's original rank is Leader (UM), not Life Advisor (LA)
    // Leaders can view both Advisor and Leader views
    if (originalRank === 'LA') {
      // Life Advisors cannot switch to leader view
      return;
    }
    
    // Toggle view role only, keep original rank
    setUserState(prev => ({
      ...prev,
      role: prev.role === 'advisor' ? 'leader' : 'advisor',
      // Keep original rank, don't change it
    }));
    // Save updated view role (only for view toggle, not actual rank)
    localStorage.setItem('sp_user_role', userState.role === 'advisor' ? 'leader' : 'advisor');
  };
  
  // Check if user can toggle to leader view (only Leaders can, not Life Advisors)
  const canToggleToLeader = originalRank !== 'LA';
  
  // Redirect Life Advisors away from leader-only tabs
  useEffect(() => {
    if (!showLogin && originalRank === 'LA' && (activeTab === 'leader' || activeTab === 'growth')) {
      setActiveTab('overview');
    }
  }, [showLogin, originalRank, activeTab]);

  // Show login modal if showLogin is true
  // During initial mount, show login by default to avoid hydration issues
  if (!isMounted || showLogin) {
    return <LoginModal onLogin={handleLogin} />;
  }

  return (
    <>
      <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent leading-tight">
              ACS 3.0 Strategic Planning
            </h1>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base lg:text-lg text-gray-600 font-medium break-words">
              Welcome, {userState.name}! Plan your goals and simulate your income potential.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2">
          {canToggleToLeader && (
            <button
              onClick={toggleRole}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-xs sm:text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
              title={`Switch to ${userState.role === 'advisor' ? 'Leader' : 'Advisor'} view`}
            >
              <span className="hidden sm:inline">{userState.role === 'advisor' ? '👑 Leader View' : '🛡️ Advisor View'}</span>
              <span className="sm:hidden">{userState.role === 'advisor' ? '👑 Leader' : '🛡️ Advisor'}</span>
            </button>
          )}
          {!canToggleToLeader && (
            <div className="px-3 py-2 sm:px-4 sm:py-2 bg-slate-300 text-slate-600 rounded-lg text-xs sm:text-sm font-semibold cursor-not-allowed whitespace-nowrap" title="Life Advisors can only view Advisor mode">
              <span className="hidden sm:inline">🛡️ Advisor View Only</span>
              <span className="sm:hidden">🛡️ Advisor</span>
            </div>
          )}
          <button
            onClick={clearData}
            title="Reset Data"
            className="px-3 py-2 sm:px-4 sm:py-2 bg-slate-200 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-300 transition-all whitespace-nowrap"
          >
            ↺ Reset
          </button>
          <button
            onClick={() => alert('Infographic generation (mock)')}
            title="Generate Report"
            className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-[#D31145] to-red-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all whitespace-nowrap"
          >
            <span className="hidden sm:inline">⬇ Report</span>
            <span className="sm:hidden">📄</span>
          </button>
          <button
            onClick={handleLogout}
            title="Logout"
            className="px-3 py-2 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-red-700 transition-all whitespace-nowrap"
          >
            Exit
          </button>
        </div>
      </div>

      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isLeader={userState.role === 'leader'}
        canAccessLeaderTabs={originalRank === 'UM'}
      />
      
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'advisor' && <AdvisorSimTab />}
        {activeTab === 'leader' && <LeaderHQTab userState={userState} onGenerateRecruitmentAd={() => showAI('Recruitment Ad', 'Recruitment ad generated (mock)')} />}
        {activeTab === 'growth' && <PathToPremierTab userState={userState} />}
        {activeTab === 'goals' && <GoalSettingTab userState={userState} onShowAI={showAI} />}
      </div>

      <AIModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        title={aiModalTitle}
        content={aiModalContent}
      />
    </>
  );
}

