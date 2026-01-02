'use client';

import { Sidebar } from '@/components/sidebar';
import { StrategicPlanningApp } from '@/components/strategic-planning/strategic-planning-app';
import { useSearchParams } from 'next/navigation';

export default function StrategicPlanningPage() {
  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab');
  const view = searchParams?.get('view') as 'advisor' | 'leader' | null;

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-3 pt-4 sm:p-4 sm:pt-6 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <StrategicPlanningApp 
            initialTab={tab || undefined}
            initialView={view || undefined}
          />
        </div>
      </main>
    </div>
  );
}

