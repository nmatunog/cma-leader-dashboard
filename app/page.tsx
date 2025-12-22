'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { DashboardMetrics } from '@/components/dashboard-metrics';
import { EditModeToggle } from '@/components/edit-mode-toggle';
import { PdfExportButton } from '@/components/pdf-export-button';
import { DashboardSkeleton } from '@/components/loading-skeleton';
import { useAuth } from '@/contexts/auth-context';

function AgencyNameDisplay() {
  const [agencyName, setAgencyName] = useState<string>('Cebu Matunog Agency Dashboard');

  useEffect(() => {
    const storedAgencyName = localStorage.getItem('agency_name');
    if (storedAgencyName) {
      setAgencyName(`${storedAgencyName} Dashboard`);
    }
  }, []);

  return <>{agencyName}</>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  // Show loading state while checking auth
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

  // If not authenticated, show nothing (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 pt-6 md:p-8">
        <div id="dashboard-content" className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col items-start justify-between md:flex-row md:items-center">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                <AgencyNameDisplay />
              </h1>
              <p className="mt-2 text-lg text-gray-600 font-medium">
                Welcome back, Admin! Here&apos;s your agency&apos;s performance.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2" data-export-hide>
              <EditModeToggle />
              <PdfExportButton />
            </div>
          </div>

          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardMetrics />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
