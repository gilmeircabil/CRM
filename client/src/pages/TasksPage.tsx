import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  User,
  Building,
  Edit2,
  AlertCircle,
  DollarSign,
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Task, TaskPriority, Customer, Deal, User as UserType } from '../types';
import { PriorityBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { FormField, getInputClassName } from '../components/FormField';
import { useAuth } from '../context/AuthContext';

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filter tab state
  const [filter, setFilter] = useState<'all' | 'mine' | 'overdue' | 'due_today' | 'completed' | 'open'>('open');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    description: '',
    priority: 'medium' as TaskPriority,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignedTo: '',
    customerId: '',
    dealId: '',
  });
  const [fieldErrors, setFieldErrors] = useState<{
    description?: string;
    dueDate?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleMutationError = (err: any) => {
    setFormError(err.message || 'An error occurred');
    if (err.details && Array.isArray(err.details)) {
      const errMap: typeof fieldErrors = {};
      err.details.forEach((d: { field: string; message: string }) => {
        (errMap as any)[d.field] = d.message;
      });
      setFieldErrors(errMap);
    }
  };

  // Fetch Tasks Query
  const { data: tasksData, isLoading } = useQuery<{ tasks: Task[] }>({
    queryKey: ['tasks', { filter }],
    queryFn: () => apiRequest(`/api/tasks?filter=${filter}`),
  });

  // Fetch active team members for assignment (Admin or staff dropdown)
  const { data: usersData } = useQuery<{ users: UserType[] }>({
    queryKey: ['team-members'],
    queryFn: () => apiRequest('/api/users'),
  });

  // Fetch customers for linking
  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ['customers-dropdown'],
    queryFn: () => apiRequest('/api/customers?limit=100&status=active'),
  });

  // Fetch deals for linking
  const { data: dealsData } = useQuery<{ deals: Deal[] }>({
    queryKey: ['deals-dropdown'],
    queryFn: () => apiRequest('/api/deals?limit=100'),
  });

  // Toggle complete / reopen mutation
  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/tasks/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Create Task Mutation
  const createMutation = useMutation({
    mutationFn: (newTask: typeof formData) =>
      apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...newTask,
          assignedTo: newTask.assignedTo || undefined,
          customerId: newTask.customerId || undefined,
          dealId: newTask.dealId || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: handleMutationError,
  });

  // Edit Task Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<typeof formData> }) =>
      apiRequest(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...updates,
          assignedTo: updates.assignedTo || undefined,
          customerId: updates.customerId || undefined,
          dealId: updates.dealId || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: handleMutationError,
  });

  const resetForm = () => {
    setFormData({
      description: '',
      priority: 'medium',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignedTo: '',
      customerId: '',
      dealId: '',
    });
    setFormError(null);
    setFieldErrors({});
    setSelectedTask(null);
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      description: task.description,
      priority: task.priority,
      dueDate: new Date(task.dueDate).toISOString().split('T')[0],
      assignedTo: task.assignedTo?._id || '',
      customerId: task.customerId?._id || '',
      dealId: task.dealId?._id || '',
    });
    setIsEditModalOpen(true);
  };

  const tasks = tasksData?.tasks || [];

  const getDueStatusText = (dueDateStr: string, isCompleted: boolean) => {
    if (isCompleted) return { label: 'Completed', color: 'text-slate-400' };

    const due = new Date(dueDateStr);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { label: 'Overdue', color: 'text-rose-600 font-bold' };
    }
    if (diffHours <= 24) {
      return { label: 'Due today / within 24h', color: 'text-amber-600 font-semibold' };
    }
    return {
      label: due.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      color: 'text-slate-500',
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Follow-up Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize customer action items, track deadlines, and delegate follow-ups.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-1.5">
        {[
          { id: 'open', label: 'Open' },
          { id: 'mine', label: 'My Tasks' },
          { id: 'due_today', label: 'Due Today' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'completed', label: 'Completed' },
          ...(user?.role === 'admin' ? [{ id: 'all', label: 'All Tasks (Team)' }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === tab.id
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Fetching task queue..." />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks found"
            description="You have no tasks matching this filter view."
            actionLabel="Create a Task"
            onAction={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const dueStatus = getDueStatusText(task.dueDate, task.isCompleted);
              return (
                <div
                  key={task._id}
                  className={`p-4 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors ${
                    task.isCompleted ? 'bg-slate-50/40' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => toggleMutation.mutate(task._id)}
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold transition-all ${
                          task.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.description}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {/* Due status */}
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className={dueStatus.color}>{dueStatus.label}</span>
                        </div>

                        {/* Assignee */}
                        <div className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{task.assignedTo?.name || 'Unassigned'}</span>
                        </div>

                        {/* Customer Link */}
                        {task.customerId && (
                          <div className="flex items-center space-x-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-slate-700">
                              {task.customerId.name}
                            </span>
                          </div>
                        )}

                        {/* Deal Link */}
                        {task.dealId && (
                          <div className="flex items-center space-x-1 text-indigo-600">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{task.dealId.title}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <PriorityBadge priority={task.priority} />
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title="Edit Task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Task Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}
        title={isCreateModalOpen ? 'Create New Task' : 'Edit Task'}
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
            const errors: typeof fieldErrors = {};
            if (!formData.description.trim()) errors.description = 'Task description is required';
            if (!formData.dueDate) errors.dueDate = 'Due date is required';

            if (Object.keys(errors).length > 0) {
              setFieldErrors(errors);
              return;
            }

            setFieldErrors({});
            if (isCreateModalOpen) {
              createMutation.mutate(formData);
            } else if (selectedTask) {
              editMutation.mutate({ id: selectedTask._id, updates: formData });
            }
          }}
          noValidate
          className="space-y-4"
        >
          <FormField
            label="Task Description"
            error={fieldErrors.description}
            required
            htmlFor="task-description"
          >
            <input
              id="task-description"
              type="text"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: undefined }));
              }}
              className={getInputClassName(fieldErrors.description)}
              placeholder="e.g. Follow up on contract signature"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Priority" htmlFor="task-priority">
              <select
                id="task-priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </FormField>

            <FormField
              label="Due Date"
              error={fieldErrors.dueDate}
              required
              htmlFor="task-due-date"
            >
              <input
                id="task-due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => {
                  setFormData({ ...formData, dueDate: e.target.value });
                  if (fieldErrors.dueDate) setFieldErrors((prev) => ({ ...prev, dueDate: undefined }));
                }}
                className={getInputClassName(fieldErrors.dueDate)}
              />
            </FormField>
          </div>

          {/* Assigned To (for Admin, or select from team) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee</label>
            <select
              value={formData.assignedTo}
              onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            >
              <option value="">Myself ({user?.name})</option>
              {usersData?.users.map((u: any) => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Link to Customer */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Related Customer (Optional)</label>
            <select
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            >
              <option value="">None</option>
              {customersData?.customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} — {c.company}
                </option>
              ))}
            </select>
          </div>

          {/* Link to Deal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Related Deal (Optional)</label>
            <select
              value={formData.dealId}
              onChange={(e) => setFormData({ ...formData, dealId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            >
              <option value="">None</option>
              {dealsData?.deals.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.title} (${d.value.toLocaleString()})
                </option>
              ))}
            </select>
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
              {isCreateModalOpen ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
