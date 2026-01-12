'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { canAccessAdminPages } from '@/lib/permissions';
import { deleteAgencyData } from '@/services/agency-deletion-service';

export default function DeleteAgencyPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [agencyName, setAgencyName] = useState('Cebu Matunog Agency');
  const [deleteUsers, setDeleteUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!currentUser || !canAccessAdminPages(currentUser)) {
    router.push('/login');
    return null;
  }

  const handleDelete = async () => {
    if (!agencyName.trim()) {
      setError('Agency name is required');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${agencyName}"?\n\n` +
      `This will permanently delete:\n` +
      `- All strategic planning goals\n` +
      `- All organizational hierarchy entries\n` +
      `- The agency from the agencies list\n` +
      (deleteUsers ? `- ALL USERS associated with this agency\n` : `- Users will be kept\n`) +
      `\nThis action CANNOT be undone!`
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const deleteResult = await deleteAgencyData(agencyName, { deleteUsers });
      setResult(deleteResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Delete Agency</h1>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Agency Name
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                placeholder="Enter agency name"
              />
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteUsers}
                  onChange={(e) => setDeleteUsers(e.target.checked)}
                  className="w-4 h-4 text-[#D31145] border-slate-300 rounded focus:ring-[#D31145]"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Also delete all users associated with this agency
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1 ml-6">
                If unchecked, users will be kept but may have invalid agency references
              </p>
            </div>

            <button
              onClick={handleDelete}
              disabled={loading || !agencyName.trim()}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete Agency'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-semibold">Error:</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className={`bg-${result.success ? 'green' : 'yellow'}-50 border border-${result.success ? 'green' : 'yellow'}-200 rounded-lg p-6`}>
              <h2 className={`text-xl font-bold text-${result.success ? 'green' : 'yellow'}-900 mb-4`}>
                {result.success ? '✅ Deletion Complete' : '⚠️ Deletion Completed with Warnings'}
              </h2>

              <div className="mb-4">
                <h3 className="font-semibold text-slate-900 mb-2">Summary:</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li>Goals Deleted: {result.deleted.goals}</li>
                  <li>Hierarchy Entries Deleted: {result.deleted.hierarchyEntries}</li>
                  <li>Users Deleted: {result.deleted.users}</li>
                </ul>
              </div>

              {result.warnings && result.warnings.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">Warnings:</h3>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800">
                    {result.warnings.map((warning: string, idx: number) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Errors:</h3>
                  <ul className="list-disc list-inside space-y-1 text-red-800">
                    {result.errors.map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

