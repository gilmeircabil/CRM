import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  UserPlus,
  User,
  Mail,
  Lock,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { User as UserType, UserRole } from '../types';
import { RoleBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

export const TeamPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as UserRole,
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch all users (Admin endpoint)
  const { data, isLoading, error } = useQuery<{ users: UserType[] }>({
    queryKey: ['admin-team-users'],
    queryFn: () => apiRequest('/api/users'),
  });

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: (newUser: typeof formData) =>
      apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team-users'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => setFormError(err.message),
  });

  // Edit User Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<typeof formData> }) =>
      apiRequest(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team-users'] });
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: (err: any) => setFormError(err.message),
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/users/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-team-users'] });
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setDeleteError(null);
    },
    onError: (err: any) => {
      setDeleteError(err.message || 'Failed to delete team member');
    },
  });

  const openDeleteModal = (u: UserType) => {
    setUserToDelete(u);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      isActive: true,
    });
    setFormError(null);
    setSelectedUser(null);
  };

  const openEditModal = (u: UserType) => {
    setSelectedUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      isActive: u.isActive,
    });
    setIsEditModalOpen(true);
  };

  const toggleUserActive = (u: UserType) => {
    const id = u._id || u.id;
    if (id === currentUser?.id || id === currentUser?._id) {
      alert('You cannot deactivate your own administrative account.');
      return;
    }
    const willBeActive = !u.isActive;
    if (confirm(`Are you sure you want to ${willBeActive ? 'activate' : 'deactivate'} ${u.name}?`)) {
      editMutation.mutate({ id, updates: { isActive: willBeActive } });
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading team directory..." />;
  }

  const users = data?.users || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team & Roles</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage staff accounts, assign administrative roles, and control system access.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="px-6 py-3">Member</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Last Active</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const userId = u._id || u.id;
                const isSelf = userId === currentUser?.id || userId === currentUser?._id;

                return (
                  <tr key={userId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900 flex items-center space-x-2">
                        <span>{u.name}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-6 py-3.5">
                      {u.isActive ? (
                        <span className="inline-flex items-center text-emerald-700 text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 text-xs font-medium">
                          <XCircle className="w-3.5 h-3.5 mr-1 text-slate-400" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {u.lastLoginAt ? (
                        new Date(u.lastLoginAt).toLocaleString()
                      ) : (
                        <span className="text-slate-400">Never logged in</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      {!isSelf && (
                        <>
                          <button
                            onClick={() => toggleUserActive(u)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                              u.isActive
                                ? 'text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100'
                                : 'text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => openDeleteModal(u)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors inline-flex items-center space-x-1"
                            title={`Delete ${u.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}
        title={isCreateModalOpen ? 'Add New Team Member' : 'Edit Team Member'}
        maxWidth="md"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isCreateModalOpen) {
              createMutation.mutate(formData);
            } else if (selectedUser) {
              const updates: any = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                isActive: formData.isActive,
              };
              if (formData.password.trim()) {
                updates.password = formData.password.trim();
              }
              editMutation.mutate({ id: selectedUser._id || selectedUser.id, updates });
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="e.g. Alex Morgan"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="alex@clientflow.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isCreateModalOpen ? 'Password *' : 'Change Password (leave blank to keep current)'}
            </label>
            <input
              type="password"
              required={isCreateModalOpen}
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="staff">Staff</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
              <select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || editMutation.isPending}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm disabled:opacity-50"
            >
              {isCreateModalOpen ? 'Create Account' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
          setDeleteError(null);
        }}
        title="Delete Team Member"
        maxWidth="sm"
      >
        {deleteError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{deleteError}</span>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-slate-900 font-semibold">{userToDelete?.name}</strong>{' '}
            (<span className="text-slate-500">{userToDelete?.email}</span>)?
          </p>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 space-y-1">
            <p className="font-semibold text-amber-900 flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
              Automatic Record Reassignment:
            </p>
            <p>
              All customers, deals, and open tasks assigned to this team member will be safely reassigned to you (<strong>{currentUser?.name}</strong>) to prevent orphaned records.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
                setDeleteError(null);
              }}
              className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (userToDelete) {
                  deleteMutation.mutate(userToDelete._id || userToDelete.id);
                }
              }}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium shadow-sm disabled:opacity-50 inline-flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleteMutation.isPending ? 'Deleting...' : 'Delete Member'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
