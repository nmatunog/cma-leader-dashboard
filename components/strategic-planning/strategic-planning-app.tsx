'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AIModal } from './ai-modal';
import { TabNavigation } from './tab-navigation';
import { OverviewTab } from './tabs/overview-tab';
import { AdvisorSimTab } from './tabs/advisor-sim-tab';
import { LeaderHQTab } from './tabs/leader-hq-tab';
import { PathToPremierTab } from './tabs/path-to-premier-tab';
import { GoalSettingTab } from './tabs/goal-setting-tab';
import { useAuth } from '@/contexts/auth-context';
import { signOutUser } from '@/lib/auth-service';
import { getUserPermissions } from '@/lib/user-service';

export interface UserState {
  role: 'advisor' | 'leader' | 'admin';
  rank: string;
  name: string;
  um: string;
  agency: string;
  uid: string;
}

export function StrategicPlanningApp() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [userState, setUserState] = useState<UserState | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModalContent, setAIModalContent] = useState('');
  const [aiModalTitle, setAIModalTitle] = useState('AI Assistant');

  // Update user state when auth user changes
  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not authenticated, redirect to login
        router.push('/login');
        return;
      }

      // Check if admin - redirect to reports
      if (user.role === 'admin') {
        router.push('/reports');
        return;
      }

      // Set user state from authenticated user
      setUserState({
        role: user.role,
        rank: user.rank,
        name: user.name,
        um: user.unitManager || 'System',
        agency: user.agencyName,
        uid: user.uid,
      });
    }
  }, [user, loading, router]);

  // Redirect Life Advisors away from leader-only tabs
  useEffect(() => {
    if (userState && user && user.rank === 'LA' && (activeTab === 'leader' || activeTab === 'growth')) {
      setActiveTab('overview');
    }
  }, [userState, user, activeTab]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Still redirect to login even if sign out fails
      router.push('/login');
    }
  };

  const clearData = () => {
    if (confirm('Reset all strategic planning data?')) {
      // Only clear strategic planning specific data from localStorage
      const keys = Object.keys(localStorage).filter(key => key.startsWith('sp_') || key.startsWith('advisor_sim_'));
      keys.forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }
  };

  const showAI = (title: string, content: string) => {
    setAIModalTitle(title);
    setAIModalContent(content);
    setShowAIModal(true);
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // If no user (will redirect), show nothing
  if (!userState || !user) {
    return null;
  }

  // Get user permissions
  const permissions = getUserPermissions(user.role);
  const canToggleToLeader = permissions.canToggleLeaderView && user.rank !== 'LA';

  // Toggle between advisor and leader view (only for leaders/admins)
  const toggleRole = () => {
    if (!userState || !permissions.canToggleLeaderView || user.rank === 'LA') {
      return;
    }
    
    // Toggle view role, but keep original rank from user object
    setUserState({
      ...userState,
      role: userState.role === 'advisor' ? 'leader' : 'advisor',
    });
  };

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
        canAccessLeaderTabs={permissions.canAccessLeaderTabs}
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
