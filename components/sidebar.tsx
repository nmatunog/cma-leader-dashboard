'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { signOutUser } from '@/lib/auth-service';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const baseNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: 'chart-pie' },
  { name: 'Leaders Targets', href: '/leaders-targets', icon: 'users' },
  { name: 'Agents Targets', href: '/agents-targets', icon: 'user-group' },
  { name: 'Comparison', href: '/comparison', icon: 'chart-bar' },
  { name: 'Strategic Planning', href: '/strategic-planning', icon: 'lightbulb' },
  { name: 'Reports', href: '/reports', icon: 'file-contract' },
  { name: 'Settings', href: '/settings', icon: 'gear' },
];

const adminNavItems: NavItem[] = [
  { name: 'User Management', href: '/admin/users', icon: 'users-cog' },
  { name: 'Import Data', href: '/admin/import', icon: 'file-import' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [agencyName, setAgencyName] = useState<string>('Cebu Matunog Agency');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOutUser();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Still redirect to login even if sign out fails
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    // Load agency name from localStorage (set when sheets are synced)
    const storedAgencyName = localStorage.getItem('agency_name');
    if (storedAgencyName) {
      setAgencyName(storedAgencyName);
    } else {
      // Try to load from Firebase if available
      // This will be set when data is synced
      setAgencyName('Cebu Matunog Agency');
    }
  }, []);

  return (
    <nav className="hidden w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl md:flex">
      <div className="flex items-center space-x-3 border-b border-slate-700/50 pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white shadow-inner">
          <i className="fa-solid fa-rocket text-2xl"></i>
        </div>
        <span className="text-2xl font-bold">CMA Dash</span>
      </div>

      <ul className="mt-8 flex-1 space-y-3">
        {baseNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 rounded-lg p-3 font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-red-700 font-semibold text-white shadow-lg'
                    : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
                )}
              >
                <i className={`fa-solid fa-${item.icon} w-6 text-center text-lg`}></i>
                <span>{item.name}</span>
              </Link>
            </li>
          );
        })}
        
        {/* Admin-only navigation items */}
        {user?.role === 'admin' && (
          <>
            <li className="pt-4 mt-4 border-t border-slate-700/50">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
            </li>
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 rounded-lg p-3 font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 font-semibold text-white shadow-lg'
                        : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
                    )}
                  >
                    <i className={`fa-solid fa-${item.icon} w-6 text-center text-lg`}></i>
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </>
        )}
      </ul>

      <div className="mt-10 border-t border-slate-700/50 pt-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700"></div>
          <div className="flex-1">
            <p className="font-semibold text-white">{user?.name || 'User'}</p>
            <p className="text-sm text-gray-400">{user?.agencyName || agencyName}</p>
            {user?.role && (
              <p className="text-xs text-gray-500 capitalize mt-1">{user.role}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center space-x-2 rounded-lg bg-red-600/90 hover:bg-red-700 px-4 py-2.5 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fa-solid fa-sign-out-alt"></i>
          <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </nav>
  );
}

