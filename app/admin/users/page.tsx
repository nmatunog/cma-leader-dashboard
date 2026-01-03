'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { registerUser } from '@/lib/auth-service';
import { 
  getAllUsers, 
  updateUser, 
  deactivateUser, 
  reactivateUser, 
  deleteUser,
  promoteUser
} from '@/lib/user-service';
import type { User, UserCreateData, UserUpdateData, UserRole, UserRank } from '@/types/user';
import { getAgencies, addAgency, removeAgency, type Agency } from '@/services/agency-service';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterAgency, setFilterAgency] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [agencyError, setAgencyError] = useState<string | null>(null);
  const [promotingUser, setPromotingUser] = useState<User | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/login');
      }
    }
  }, [currentUser, authLoading, router]);

  // Load users and agencies
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      loadUsers();
      loadAgencies();
    }
  }, [currentUser]);

  const loadAgencies = async () => {
    try {
      const agencyList = await getAgencies();
      setAgencies(agencyList);
    } catch (error) {
      console.error('Error loading agencies:', error);
      // Fallback to empty array or default agencies
      setAgencies([]);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: UserCreateData) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };

    try {
      setActionLoading('create');
      const result = await registerUser(userData, currentUser.uid);
      if (result.success) {
        setShowCreateModal(false);
        await loadUsers();
        return { success: true };
      }
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create user',
      };
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateUser = async (uid: string, updates: UserUpdateData) => {
    try {
      setActionLoading(`edit-${uid}`);
      const result = await updateUser(uid, updates);
      if (result.success) {
        setShowEditModal(false);
        setEditingUser(null);
        await loadUsers();
        return { success: true };
      }
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update user',
      };
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivateUser = async (uid: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      setActionLoading(`deactivate-${uid}`);
      const result = await deactivateUser(uid);
      if (result.success) {
        await loadUsers();
      } else {
        alert(result.error || 'Failed to deactivate user');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivateUser = async (uid: string) => {
    try {
      setActionLoading(`reactivate-${uid}`);
      const result = await reactivateUser(uid);
      if (result.success) {
        await loadUsers();
      } else {
        alert(result.error || 'Failed to reactivate user');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reactivate user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetTempPassword = async (uid: string, setTemp: boolean) => {
    const action = setTemp ? 'set' : 'clear';
    const confirmMessage = setTemp 
      ? 'Set temporary password flag? The user will be required to change their password on next login. Note: You must communicate the temporary password to the user separately (Firebase Admin SDK is required to set passwords directly).'
      : 'Clear temporary password flag?';
    
    if (!confirm(confirmMessage)) return;

    try {
      setActionLoading(`temp-password-${uid}`);
      const result = await updateUser(uid, { isTempPassword: setTemp });
      if (result.success) {
        await loadUsers();
        alert(setTemp 
          ? 'Temporary password flag set. User must change password on next login. Remember to communicate the temporary password to the user.'
          : 'Temporary password flag cleared.');
      } else {
        alert(result.error || `Failed to ${action} temporary password flag`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} temporary password flag`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;
    if (!confirm('This will delete the user from the system. Are you absolutely sure?')) return;

    try {
      setActionLoading(`delete-${uid}`);
      const result = await deleteUser(uid);
      if (result.success) {
        await loadUsers();
      } else {
        alert(result.error || 'Failed to delete user');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddAgency = async () => {
    if (!newAgencyName.trim()) {
      setAgencyError('Please enter an agency name');
      return;
    }

    setAgencyError(null);
    setActionLoading('add-agency');

    try {
      const result = await addAgency(newAgencyName.trim(), currentUser?.uid);
      if (result.success) {
        setNewAgencyName('');
        setShowAgencyModal(false);
        await loadAgencies(); // Reload agencies list
      } else {
        setAgencyError(result.error || 'Failed to add agency');
      }
    } catch (error) {
      setAgencyError('An unexpected error occurred');
      console.error('Error adding agency:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromoteUser = async () => {
    if (!promotingUser) return;

    try {
      setActionLoading(`promote-${promotingUser.uid}`);
      const result = await promoteUser(promotingUser.uid);
      if (result.success) {
        await loadUsers();
        setShowPromoteModal(false);
        setPromotingUser(null);
        alert(`Successfully promoted ${promotingUser.name} to ${result.newRank}`);
      } else {
        alert(result.error || 'Failed to promote user');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to promote user');
    } finally {
      setActionLoading(null);
    }
  };

  // Get next rank for promotion path
  const getNextRank = (currentRank: UserRank): UserRank | null => {
    const promotionPath: Record<UserRank, UserRank | null> = {
      'ADV': 'AUM',
      'AUM': 'UM',
      'UM': 'SUM',
      'SUM': 'ADD',
      'ADD': null,
      'ADMIN': null,
    };
    return promotionPath[currentRank] || null;
  };

  // Get rank display name
  const getRankDisplayName = (rank: UserRank): string => {
    const rankNames: Record<UserRank, string> = {
      'ADMIN': 'Admin',
      'ADD': 'Agency/District Director',
      'SUM': 'Senior Unit Manager',
      'UM': 'Unit Manager',
      'AUM': 'Associate Unit Manager',
      'ADV': 'Advisor',
    };
    return rankNames[rank] || rank;
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    if (filterAgency !== 'all' && user.agencyName !== filterAgency) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.agencyName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Use agencies from service (loaded from Firestore)
  // Fallback to unique agencies from users if service fails
  const displayAgencies = agencies.length > 0 ? agencies : Array.from(new Set(users.map(u => u.agencyName))).sort();

  if (authLoading || loading) {
    return (
      <div className="flex h-full min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
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

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex h-full min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">User Management</h1>
              <p className="text-slate-600">Manage user accounts, roles, and permissions</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAgencyModal(true)}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                + Add Agency
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-[#D31145] to-red-600 text-white font-bold rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg"
              >
                + Create New User
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search by name, email, or agency..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="leader">Leader</option>
                  <option value="advisor">Advisor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Filter by Agency</label>
                <select
                  value={filterAgency}
                  onChange={(e) => setFilterAgency(e.target.value)}
                  className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                >
                  <option value="all">All Agencies</option>
                  {displayAgencies.map(agency => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadUsers}
                  className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-300 text-red-800 p-4 rounded-lg mb-6">
              <p className="font-semibold">Error: {error}</p>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Role</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Rank</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Agency</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Unit Manager</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Created</th>
                    <th className="text-center p-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        {searchQuery || filterRole !== 'all' || filterAgency !== 'all' 
                          ? 'No users found matching your filters.'
                          : 'No users found. Create your first user to get started.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.uid} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-medium">{user.name}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'leader' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">{user.rank}</td>
                        <td className="p-4">{user.agencyName}</td>
                        <td className="p-4">{user.unitManager || '-'}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {user.isActive ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">Active</span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">Inactive</span>
                            )}
                            {user.isTempPassword && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-semibold">Temp Password</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                          {(() => {
                            if (!user.createdAt) return '-';
                            if (user.createdAt instanceof Date) {
                              return user.createdAt.toLocaleDateString();
                            }
                            // Handle Firestore Timestamp
                            if (typeof user.createdAt === 'object' && 'toDate' in user.createdAt) {
                              return (user.createdAt as any).toDate().toLocaleDateString();
                            }
                            // Fallback to string date
                            return new Date(user.createdAt as any).toLocaleDateString();
                          })()}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setShowEditModal(true);
                              }}
                              disabled={actionLoading !== null}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Edit user"
                            >
                              Edit
                            </button>
                            {user.isActive ? (
                              <button
                                onClick={() => handleDeactivateUser(user.uid)}
                                disabled={actionLoading !== null || user.uid === currentUser.uid}
                                className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Deactivate user"
                              >
                                {actionLoading === `deactivate-${user.uid}` ? '...' : 'Deactivate'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivateUser(user.uid)}
                                disabled={actionLoading !== null}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reactivate user"
                              >
                                {actionLoading === `reactivate-${user.uid}` ? '...' : 'Activate'}
                              </button>
                            )}
                            {user.isTempPassword ? (
                              <button
                                onClick={() => handleSetTempPassword(user.uid, false)}
                                disabled={actionLoading !== null}
                                className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Clear temporary password flag"
                              >
                                {actionLoading === `temp-password-${user.uid}` ? '...' : 'Clear Temp'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSetTempPassword(user.uid, true)}
                                disabled={actionLoading !== null}
                                className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Set temporary password flag"
                              >
                                {actionLoading === `temp-password-${user.uid}` ? '...' : 'Set Temp'}
                              </button>
                            )}
                            {getNextRank(user.rank) && (
                              <button
                                onClick={() => {
                                  setPromotingUser(user);
                                  setShowPromoteModal(true);
                                }}
                                disabled={actionLoading !== null}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Promote user"
                              >
                                Promote
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.uid)}
                              disabled={actionLoading !== null || user.uid === currentUser.uid}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete user"
                            >
                              {actionLoading === `delete-${user.uid}` ? '...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create User Modal */}
          {showCreateModal && (
            <UserCreateModal
              agencies={displayAgencies}
              onClose={() => setShowCreateModal(false)}
              onSubmit={handleCreateUser}
              loading={actionLoading === 'create'}
            />
          )}

          {/* Edit User Modal */}
          {showEditModal && editingUser && (
            <UserEditModal
              user={editingUser}
              agencies={displayAgencies}
              onClose={() => {
                setShowEditModal(false);
                setEditingUser(null);
              }}
              onSubmit={handleUpdateUser}
              loading={actionLoading?.startsWith('edit-') || false}
            />
          )}

          {/* Agency Modal */}
          {showAgencyModal && (
            <AgencyModal
              onClose={() => {
                setShowAgencyModal(false);
                setNewAgencyName('');
                setAgencyError(null);
              }}
              onAdd={handleAddAgency}
              newAgencyName={newAgencyName}
              setNewAgencyName={setNewAgencyName}
              error={agencyError}
              loading={actionLoading === 'add-agency'}
            />
          )}

          {/* Promote User Modal */}
          {showPromoteModal && promotingUser && getNextRank(promotingUser.rank) && (
            <PromoteUserModal
              user={promotingUser}
              nextRank={getNextRank(promotingUser.rank)!}
              onClose={() => {
                setShowPromoteModal(false);
                setPromotingUser(null);
              }}
              onPromote={handlePromoteUser}
              loading={actionLoading === `promote-${promotingUser.uid}`}
              getRankDisplayName={getRankDisplayName}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Create User Modal Component
function UserCreateModal({
  agencies,
  onClose,
  onSubmit,
  loading,
}: {
  agencies: string[];
  onClose: () => void;
  onSubmit: (data: UserCreateData) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<UserCreateData>({
    email: '',
    code: '',
    password: '',
    name: '',
    role: 'advisor',
    rank: 'ADV',
    unitManager: '',
    agencyName: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!formData.email || !formData.password || !formData.name || !formData.agencyName) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Adjust rank based on role
    let finalRank: UserRank = formData.rank;
    if (formData.role === 'admin') {
      finalRank = 'ADMIN';
    }

    const result = await onSubmit({
      ...formData,
      rank: finalRank,
    });

    if (result.success) {
      // Reset form
      setFormData({
        email: '',
        code: '',
        password: '',
        name: '',
        role: 'advisor',
        rank: 'ADV',
        unitManager: '',
        agencyName: '',
      });
      onClose();
    } else {
      setError(result.error || 'Failed to create user');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#D31145] text-white p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold">Create New User</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Advisor/Leader Code (Optional)</label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                placeholder="Enter advisor/leader code"
              />
              <p className="text-xs text-slate-500 mt-1">
                If provided, user can sign in with either code or email
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const role = e.target.value as UserRole;
                  setFormData({
                    ...formData,
                    role,
                    rank: role === 'admin' ? 'ADMIN' : role === 'leader' ? 'UM' : 'ADV',
                  });
                }}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                required
              >
                <option value="advisor">Advisor</option>
                <option value="leader">Leader</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Rank *</label>
              <select
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: e.target.value as UserRank })}
                disabled={formData.role === 'admin'}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 disabled:bg-slate-100"
                required
              >
                {formData.role === 'admin' ? (
                  <option value="ADMIN">ADMIN</option>
                ) : formData.role === 'leader' ? (
                  <>
                    <option value="ADD">Agency/District Director</option>
                    <option value="SUM">Senior Unit Manager</option>
                    <option value="UM">Unit Manager</option>
                    <option value="AUM">Associate Unit Manager</option>
                  </>
                ) : (
                  <option value="ADV">Advisor</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Agency Name *</label>
              <select
                value={formData.agencyName}
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                required
              >
                <option value="">Select Agency</option>
                {agencies.map(agency => (
                  <option key={agency} value={agency}>{agency}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Unit Manager</label>
              <input
                type="text"
                value={formData.unitManager}
                onChange={(e) => setFormData({ ...formData, unitManager: e.target.value })}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-4 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 font-semibold"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#D31145] text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function UserEditModal({
  user,
  agencies,
  onClose,
  onSubmit,
  loading,
}: {
  user: User;
  agencies: string[];
  onClose: () => void;
  onSubmit: (uid: string, data: UserUpdateData) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<UserUpdateData>({
    name: user.name,
    role: user.role,
    rank: user.rank,
    unitManager: user.unitManager || '',
    agencyName: user.agencyName,
    isActive: user.isActive,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!formData.name || !formData.agencyName) {
      setError('Please fill in all required fields');
      return;
    }

    // Adjust rank based on role
    let finalRank: UserRank | undefined = formData.rank;
    if (formData.role === 'admin') {
      finalRank = 'ADMIN';
    } else if (formData.role === 'leader' && formData.rank === 'LA') {
      finalRank = 'UM';
    }

    const result = await onSubmit(user.uid, {
      ...formData,
      rank: finalRank,
    });

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to update user');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#D31145] text-white p-4 flex justify-between items-center">
          <h3 className="text-xl font-bold">Edit User - {user.name}</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              {error}
            </div>
          )}

          <div className="mb-4 p-3 bg-slate-100 rounded">
            <p className="text-sm text-slate-600">Email: <span className="font-semibold">{user.email}</span></p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const role = e.target.value as UserRole;
                  setFormData({
                    ...formData,
                    role,
                    rank: role === 'admin' ? 'ADMIN' : role === 'leader' ? 'UM' : 'ADV',
                  });
                }}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                required
              >
                <option value="advisor">Advisor</option>
                <option value="leader">Leader</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Rank *</label>
              <select
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: e.target.value as UserRank })}
                disabled={formData.role === 'admin'}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20 disabled:bg-slate-100"
                required
              >
                {formData.role === 'admin' ? (
                  <option value="ADMIN">ADMIN</option>
                ) : formData.role === 'leader' ? (
                  <>
                    <option value="ADD">Agency/District Director</option>
                    <option value="SUM">Senior Unit Manager</option>
                    <option value="UM">Unit Manager</option>
                    <option value="AUM">Associate Unit Manager</option>
                  </>
                ) : (
                  <option value="ADV">Advisor</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Agency Name *</label>
              <select
                value={formData.agencyName}
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                required
              >
                <option value="">Select Agency</option>
                {agencies.map(agency => (
                  <option key={agency} value={agency}>{agency}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Unit Manager</label>
              <input
                type="text"
                value={formData.unitManager}
                onChange={(e) => setFormData({ ...formData, unitManager: e.target.value })}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Status *</label>
              <select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                className="w-full p-2 border-2 border-slate-200 rounded-lg focus:border-[#D31145] focus:ring-2 focus:ring-[#D31145]/20"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-4 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 font-semibold"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#D31145] text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Promote User Modal Component
function PromoteUserModal({
  user,
  nextRank,
  onClose,
  onPromote,
  loading,
  getRankDisplayName,
}: {
  user: User;
  nextRank: UserRank;
  onClose: () => void;
  onPromote: () => Promise<void>;
  loading: boolean;
  getRankDisplayName: (rank: UserRank) => string;
}) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onPromote();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 flex justify-between items-center rounded-t-lg">
          <h3 className="text-xl font-bold">Promote User</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-slate-600 mb-2">User:</p>
            <p className="font-semibold text-lg text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>

          <div className="mb-4 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Current Rank:</span>
              <span className="font-bold text-slate-900">{getRankDisplayName(user.rank)}</span>
            </div>
            <div className="flex items-center justify-center my-2">
              <span className="text-2xl">↓</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">New Rank:</span>
              <span className="font-bold text-green-600 text-lg">{getRankDisplayName(nextRank)}</span>
            </div>
          </div>

          {user.rank === 'ADV' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Promoting from Advisor to AUM will change the user's role from 'advisor' to 'leader'. 
                The user will remain in their current unit and can manage advisors while still being counted as part of the unit.
              </p>
            </div>
          )}

          {user.rank === 'AUM' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The user will be promoted to Unit Manager. They will continue managing their current advisors and unit structure.
              </p>
            </div>
          )}

          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 font-semibold"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Promoting...' : 'Confirm Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
