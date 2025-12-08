'use client';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isLeader: boolean;
  canAccessLeaderTabs: boolean; // True if user's original rank is UM (Leader), false if LA (Life Advisor)
}

export function TabNavigation({ activeTab, onTabChange, isLeader, canAccessLeaderTabs }: TabNavigationProps) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'advisor', label: 'Advisor Sim', icon: '🛡️' },
    // Only show leader tabs if user can access them (original rank is UM) AND currently viewing leader mode
    ...(isLeader && canAccessLeaderTabs ? [
      { id: 'leader', label: 'Leader HQ', icon: '👑' },
      { id: 'growth', label: 'Path to Premier', icon: '⭐' },
    ] : []),
    { id: 'goals', label: 'Goal Setting', icon: '🎯' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-2 sm:p-3 mb-4 sm:mb-6 overflow-x-auto">
      <nav className="flex gap-1.5 sm:gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#D31145] to-red-600 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-100 hover:text-[#D31145]'
            }`}
          >
            <span className="text-base sm:text-lg">{tab.icon}</span>
            <span className="hidden xs:inline">{tab.label}</span>
            <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

