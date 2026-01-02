'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';

export default function LeadersTargetsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Strategic Planning with leader view and goals tab
    router.replace('/strategic-planning?tab=goals&view=leader');
  }, [router]);

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 pt-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D31145] mb-4"></div>
              <p className="text-lg text-slate-600">Redirecting to Strategic Planning...</p>
              <p className="text-sm text-slate-500 mt-2">
                Leaders Targets has been consolidated into Strategic Planning
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
