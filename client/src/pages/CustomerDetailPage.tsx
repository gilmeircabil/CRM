import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  MessageSquare,
  PhoneCall,
  Users2,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Customer, Deal, Task, Activity, DealStage, TaskPriority } from '../types';
import { StageBadge, StatusBadge, PriorityBadge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Modals state
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // New Deal Form State
  const [dealForm, setDealForm] = useState({
    title: '',
    value: 0,
    leadSource: 'Website',
    stage: 'New Lead' as DealStage,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // New Task Form State
  const [taskForm, setTaskForm] = useState({
    description: '',
    priority: 'medium' as TaskPriority,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Activity Composer State
  const [activityType, setActivityType] = useState<'note' | 'call' | 'meeting'>('note');
  const [activityContent, setActivityContent] = useState('');
  const [activityError, setActivityError] = useState<string | null>(null);

  // Fetch customer details, deals, tasks, and activities
  const { data, isLoading, error } = useQuery<{
    customer: Customer;
    deals: Deal[];
    tasks: Task[];
    activities: Activity[];
  }>({
    queryKey: ['customer', id],
    queryFn: () => apiRequest(`/api/customers/${id}`),
    enabled: !!id,
  });

  // Create Activity Mutation
  const createActivityMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/activities', {
        method: 'POST',
        body: JSON.stringify({
          type: activityType,
          content: activityContent,
          customerId: id,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      setActivityContent('');
      setActivityError(null);
    },
    onError: (err: any) => setActivityError(err.message),
  });

  // Create Deal Mutation
  const createDealMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/deals', {
        method: 'POST',
        body: JSON.stringify({
          ...dealForm,
          value: Number(dealForm.value),
          customerId: id,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsDealModalOpen(false);
      setDealForm({
        title: '',
        value: 0,
        leadSource: 'Website',
        stage: 'New Lead',
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    },
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...taskForm,
          customerId: id,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsTaskModalOpen(false);
      setTaskForm({
        description: '',
        priority: 'medium',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    },
  });

  // Toggle Task Completion Mutation
  const toggleTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiRequest(`/api/tasks/${taskId}/toggle`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading customer record..." />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
        <p className="font-semibold">Unable to access customer details.</p>
        <p className="text-xs mt-1">{(error as any)?.message || 'Customer not found or access denied.'}</p>
        <Link to="/customers" className="inline-block mt-4 text-xs font-semibold text-indigo-600 hover:underline">
          &larr; Return to Customers
        </Link>
      </div>
    );
  }

  const { customer, deals, tasks, activities } = data;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'call':
        return <PhoneCall className="w-4 h-4 text-blue-600" />;
      case 'meeting':
        return <Users2 className="w-4 h-4 text-purple-600" />;
      case 'deal_update':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      default:
        return <Clock className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          to="/customers"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Customers
        </Link>
      </div>

      {/* Customer Header Profile Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
                <StatusBadge status={customer.status} />
              </div>
              <p className="text-sm font-medium text-slate-600 mt-0.5">
                {customer.jobTitle} at <span className="text-slate-900 font-semibold">{customer.company}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDealModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Deal</span>
            </button>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 text-xs">
          <div className="flex items-center space-x-2.5 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
          <div className="flex items-center space-x-2.5 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-mono">{customer.phone}</span>
          </div>
          <div className="flex items-center space-x-2.5 text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{customer.address || 'No address specified'}</span>
          </div>
          <div className="flex items-center space-x-2.5 text-slate-600">
            <Building className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Owner: <strong className="text-slate-900">{customer.ownerId?.name || 'Unassigned'}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Content: Left 2 cols (Deals & Tasks), Right 1 col (Activity Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Deals & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Associated Deals */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Associated Deals ({deals.length})</h2>
              </div>
              <button
                onClick={() => setIsDealModalOpen(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                + Add Deal
              </button>
            </div>

            {deals.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active deals for this customer yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {deals.map((deal) => (
                  <div key={deal._id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/60">
                    <div>
                      <p className="font-semibold text-slate-900">{deal.title}</p>
                      <p className="text-slate-400 mt-0.5">
                        Source: {deal.leadSource} • Expected Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-900">${deal.value.toLocaleString()}</span>
                      <StageBadge stage={deal.stage} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Associated Tasks */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Follow-up Tasks ({tasks.length})</h2>
              </div>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                + Add Task
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No tasks assigned for this customer.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <div key={task._id} className="p-4 flex items-start space-x-3 text-xs hover:bg-slate-50/60">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => toggleTaskMutation.mutate(task._id)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {task.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-400">
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Assigned to: {task.assignedTo?.name}</span>
                      </div>
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Reverse Chronological Activity History & Composer */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Log Activity</h2>

            {activityError && (
              <div className="mb-3 p-2 bg-rose-50 text-rose-700 text-xs rounded border border-rose-200">
                {activityError}
              </div>
            )}

            {/* Type selector tabs */}
            <div className="flex rounded-lg bg-slate-100 p-1 mb-3 text-xs">
              {(['note', 'call', 'meeting'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActivityType(t)}
                  className={`flex-1 py-1.5 capitalize font-medium rounded-md transition-all ${
                    activityType === t ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Activity textarea */}
            <div className="space-y-3">
              <textarea
                rows={3}
                value={activityContent}
                onChange={(e) => setActivityContent(e.target.value)}
                placeholder={
                  activityType === 'note'
                    ? 'Write internal notes...'
                    : activityType === 'call'
                    ? 'Log phone call outcomes...'
                    : 'Record meeting minutes and key takeaways...'
                }
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              <button
                type="button"
                disabled={!activityContent.trim() || createActivityMutation.isPending}
                onClick={() => createActivityMutation.mutate()}
                className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Activity</span>
              </button>
            </div>

            {/* Timeline */}
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Activity History
              </h3>

              {activities.length === 0 ? (
                <p className="text-xs text-slate-400">No recorded activities yet.</p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {activities.map((act) => (
                    <div key={act._id} className="relative text-xs">
                      {/* Timeline icon pip */}
                      <div className="absolute -left-6 mt-0.5 w-4 h-4 rounded-full bg-white border border-slate-300 flex items-center justify-center">
                        {getActivityIcon(act.type)}
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-700 capitalize">
                            {act.type.replace('_', ' ')}
                          </span>
                          <span>{new Date(act.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-800 font-medium leading-relaxed">{act.content}</p>
                        <p className="mt-1 text-[10px] text-slate-400 font-medium">by {act.createdBy?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Deal Modal */}
      <Modal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        title="Add Deal for Customer"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDealMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Title *</label>
            <input
              type="text"
              required
              value={dealForm.title}
              onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="e.g. Q4 Cloud Subscription"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Value ($) *</label>
              <input
                type="number"
                min="0"
                required
                value={dealForm.value}
                onChange={(e) => setDealForm({ ...dealForm, value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Source</label>
              <select
                value={dealForm.leadSource}
                onChange={(e) => setDealForm({ ...dealForm, leadSource: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="Website">Website</option>
                <option value="Referral">Referral</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Cold Call">Cold Call</option>
                <option value="Partner">Partner</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stage</label>
              <select
                value={dealForm.stage}
                onChange={(e) => setDealForm({ ...dealForm, stage: e.target.value as DealStage })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="New Lead">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Close Date</label>
              <input
                type="date"
                required
                value={dealForm.expectedCloseDate}
                onChange={(e) => setDealForm({ ...dealForm, expectedCloseDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsDealModalOpen(false)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createDealMutation.isPending}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-2xs"
            >
              Create Deal
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add Follow-up Task"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTaskMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Task Description *</label>
            <input
              type="text"
              required
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="e.g. Follow up on contract redlines"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                required
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-2xs"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
