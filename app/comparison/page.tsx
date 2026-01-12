'use client';

import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { GoalComparisonView } from '@/components/goal-comparison/goal-comparison-view';

export default function ComparisonPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Only allow UM, SUM, ADD, and ADMIN to access comparisons
      const allowedRanks = ['UM', 'SUM', 'ADD', 'ADMIN'];
      if (!allowedRanks.includes(user.rank)) {
        router.push('/login');
        return;
      }
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex h-full min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 pt-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D31145]"></div>
              <p className="mt-4 text-slate-600">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 pt-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              Goal Comparison & Reconciliation
            </h1>
            <p className="mt-2 text-lg text-gray-600 font-medium">
              Compare Top-Down goals (set by leaders) vs Bottom-Up goals (sum of team members)
            </p>
            {user.rank === 'UM' || user.rank === 'SUM' ? (
              <p className="mt-1 text-sm text-gray-500">
                Viewing: Your Unit Comparison - Team Goals vs Individual Goals
              </p>
            ) : user.rank === 'ADD' ? (
              <p className="mt-1 text-sm text-gray-500">
                Viewing: Agency Comparison - Agency Goals vs Sum of All Units
              </p>
            ) : null}
          </div>

          <GoalComparisonView />
        </div>
      </main>
    </div>
  );
}

