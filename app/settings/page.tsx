import { Sidebar } from '@/components/sidebar';
import { SheetsManager } from '@/components/sheets-manager';

export default function SettingsPage() {
  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 pt-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <SheetsManager />
        </div>
      </main>
    </div>
  );
}

