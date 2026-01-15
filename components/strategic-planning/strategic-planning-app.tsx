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

interface StrategicPlanningAppProps {
  initialTab?: string;
  initialView?: 'advisor' | 'leader';
}

export function StrategicPlanningApp({ initialTab, initialView }: StrategicPlanningAppProps = {}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [userState, setUserState] = useState<UserState | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModalContent, setAIModalContent] = useState('');
  const [aiModalTitle, setAIModalTitle] = useState('AI Assistant');
  const [simulationData, setSimulationData] = useState<{
    personalFYC?: number;
    tenuredCount?: number;
    tenuredProd?: number;
    newCount?: number;
    newProd?: number;
    // Advisor simulation data
    fyc?: number;
    cases?: number;
    persistency?: number;
  } | null>(null);

  // Update user state when auth user changes
  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not authenticated, redirect to login
        router.push('/login');
        return;
      }

      // Set user state from authenticated user
      // Handle initial view from URL params (for redirects from old Targets pages)
      let initialRole: 'advisor' | 'leader' = user.role === 'admin' ? 'advisor' : user.role;
      if (initialView === 'leader' && (user.role === 'admin' || user.role === 'leader')) {
        initialRole = 'leader';
      } else if (initialView === 'advisor') {
        initialRole = 'advisor';
      }
      
      setUserState({
        role: initialRole,
        rank: user.rank,
        name: user.name,
        um: user.unitManager || 'System',
        agency: user.agencyName,
        uid: user.uid,
      });
      
      // Set initial tab if provided via URL params
      if (initialTab && ['overview', 'advisor', 'leader', 'growth', 'goals'].includes(initialTab)) {
        setActiveTab(initialTab);
      }
    }
  }, [user, loading, router, initialTab, initialView]);

  // Redirect Advisors away from leader-only tabs
  useEffect(() => {
    if (userState && user && user.rank === 'ADV' && (activeTab === 'leader' || activeTab === 'growth')) {
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
  const canToggleToLeader = permissions.canToggleLeaderView && user.rank !== 'ADV';

  // Change view role (only for leaders/admins)
  const changeRole = (newRole: 'advisor' | 'leader') => {
    if (!userState || !permissions.canToggleLeaderView || user.rank === 'ADV') {
      return;
    }
    
    // Set view role, but keep original rank from user object
    setUserState({
      ...userState,
      role: newRole,
    });
  };

  return (
    <>
      <div className="mb-4 sm:mb-5 md:mb-6 lg:mb-8 flex flex-col gap-4 sm:gap-5 md:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 md:gap-5">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent leading-tight">
              ACS 3.0 Strategic Planning
            </h1>
            <p className="mt-2 sm:mt-2.5 md:mt-3 text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 font-medium break-words leading-relaxed">
              Welcome, {userState.name}! Plan your goals and simulate your income potential.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2">
          {canToggleToLeader ? (
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border-2 border-slate-200 shadow-sm">
              <label className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-md cursor-pointer transition-all whitespace-nowrap ${
                userState.role === 'advisor'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="viewMode"
                  value="advisor"
                  checked={userState.role === 'advisor'}
                  onChange={() => changeRole('advisor')}
                  className="sr-only"
                />
                <span className="text-base sm:text-lg">🛡️</span>
                <span className="text-xs sm:text-sm font-semibold">Advisor</span>
              </label>
              <label className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-md cursor-pointer transition-all whitespace-nowrap ${
                userState.role === 'leader'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="viewMode"
                  value="leader"
                  checked={userState.role === 'leader'}
                  onChange={() => changeRole('leader')}
                  className="sr-only"
                />
                <span className="text-base sm:text-lg">👑</span>
                <span className="text-xs sm:text-sm font-semibold">Leader</span>
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 border-2 border-slate-300 shadow-sm">
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-md bg-slate-300 text-slate-600 cursor-not-allowed whitespace-nowrap" title="Advisors can only view Advisor mode">
                <span className="text-base sm:text-lg">🛡️</span>
                <span className="text-xs sm:text-sm font-semibold">Advisor Only</span>
              </div>
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
        {activeTab === 'overview' && <OverviewTab userState={userState} />}
        {activeTab === 'advisor' && (
          <AdvisorSimTab 
            onPushToGoals={(data) => {
              setSimulationData(data);
              setActiveTab('goals');
            }}
          />
        )}
        {activeTab === 'leader' && (
          <LeaderHQTab 
            userState={userState} 
            onGenerateRecruitmentAd={() => showAI('Recruitment Ad', 'Recruitment ad generated (mock)')}
            onPushToGoals={(data) => {
              setSimulationData(data);
              setActiveTab('goals');
            }}
          />
        )}
        {activeTab === 'growth' && <PathToPremierTab userState={userState} />}
        {activeTab === 'goals' && (
          <GoalSettingTab 
            userState={userState}
            originalUserRole={user.role}
            onShowAI={showAI}
            simulationData={simulationData}
            onSimulationDataUsed={() => setSimulationData(null)}
          />
        )}
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
