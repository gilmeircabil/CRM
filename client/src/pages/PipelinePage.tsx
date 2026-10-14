import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Kanban,
  Plus,
  DollarSign,
  Calendar,
  Building,
  User,
  Clock,
  Edit2,
  FileText,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { apiRequest, downloadFile } from '../api/client';
import { Deal, DealStage, Customer } from '../types';
import { StageBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';

const STAGES: DealStage[] = [
  'New Lead',
  'Contacted',
  'Qualified',
  'Proposal',
  'Won',
  'Lost',
];

export const PipelinePage: React.FC = () => {
  const queryClient = useQueryClient();

  // Filter tabs for the table
  const [tableFilter, setTableFilter] = useState<'all' | 'open' | 'won' | 'lost'>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Drag over stage tracking for UI highlight
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    customerId: '',
    value: 0,
    leadSource: 'Website',
    stage: 'New Lead' as DealStage,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch all deals
  const { data: dealsData, isLoading: isDealsLoading } = useQuery<{ deals: Deal[] }>({
    queryKey: ['deals'],
    queryFn: () => apiRequest('/api/deals'),
  });

  // Fetch customers for the create deal dropdown
  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ['customers-list'],
    queryFn: () => apiRequest('/api/customers?limit=100&status=active'),
  });

  // Drag and drop stage move mutation
  const moveStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: DealStage }) =>
      apiRequest(`/api/deals/${id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Create Deal Mutation
  const createMutation = useMutation({
    mutationFn: (newDeal: typeof formData) =>
      apiRequest('/api/deals', {
        method: 'POST',
        body: JSON.stringify({
          ...newDeal,
          value: Number(newDeal.value),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => setFormError(err.message),
  });

  // Edit Deal Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<typeof formData> }) =>
      apiRequest(`/api/deals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...updates,
          value: updates.value !== undefined ? Number(updates.value) : undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      customerId: '',
      value: 0,
      leadSource: 'Website',
      stage: 'New Lead',
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setFormError(null);
    setSelectedDeal(null);
  };

  const openEditModal = (deal: Deal) => {
    setSelectedDeal(deal);
    setFormData({
      title: deal.title,
      customerId: deal.customerId?._id || '',
      value: deal.value,
      leadSource: deal.leadSource,
      stage: deal.stage,
      expectedCloseDate: deal.expectedCloseDate
        ? new Date(deal.expectedCloseDate).toISOString().split('T')[0]
        : '',
    });
    setIsEditModalOpen(true);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
  };

  const handleDragOver = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stage: DealStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const dealId = e.dataTransfer.getData('text/plain');
    if (dealId) {
      moveStageMutation.mutate({ id: dealId, stage });
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      await downloadFile(`/api/export/deals?format=${format}`, `deals.${format}`);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  const deals = dealsData?.deals || [];

  // Filtered deals for the bottom table
  const filteredTableDeals = deals.filter((deal) => {
    if (tableFilter === 'open') return deal.stage !== 'Won' && deal.stage !== 'Lost';
    if (tableFilter === 'won') return deal.stage === 'Won';
    if (tableFilter === 'lost') return deal.stage === 'Lost';
    return true;
  });

  const totalPipelineValue = deals.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            Drag deals across stages or click to review and update opportunities. Total pipeline:{' '}
            <strong className="text-slate-900">${totalPipelineValue.toLocaleString()}</strong> ({deals.length} deals)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Export Buttons */}
          <div className="inline-flex rounded-lg shadow-2xs">
            <button
              onClick={() => handleExport('csv')}
              title="Export Deals as CSV"
              className="flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-l-lg hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              title="Export Deals as Excel"
              className="flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border-y border-r border-slate-200 rounded-r-lg hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Deal</span>
          </button>
        </div>
      </div>

      {/* Kanban Board with 6 Stages */}
      {isDealsLoading ? (
        <LoadingSpinner message="Loading sales pipeline..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage);
            const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
            const isTargeted = dragOverStage === stage;

            return (
              <div
                key={stage}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
                className={`bg-slate-100/70 rounded-xl p-3 flex flex-col min-h-[500px] border transition-colors ${
                  isTargeted ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-slate-200/80'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
                  <div className="flex items-center space-x-2">
                    <StageBadge stage={stage} />
                    <span className="text-xs font-semibold text-slate-500">
                      {stageDeals.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">
                    ${(stageValue / 1000).toFixed(0)}k
                  </span>
                </div>

                {/* Cards List */}
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {stageDeals.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[11px] text-slate-400">
                      Drop deals here
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal._id)}
                        onClick={() => openEditModal(deal)}
                        className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs hover:border-indigo-300 cursor-grab active:cursor-grabbing transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 line-clamp-2">
                            {deal.title}
                          </h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(deal);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center text-[11px] text-slate-500 font-medium">
                          <Building className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                          <span className="truncate">{deal.customerId?.name || 'Unknown'}</span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="font-bold text-indigo-700">
                            ${deal.value.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(deal.expectedCloseDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Deals Table with Stage Badges, Owner, Value, and Filter Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Deals Table View</h2>
            <p className="text-xs text-slate-500">Overview of all active and closed sales opportunities</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'open', 'won', 'lost'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setTableFilter(tab)}
                className={`px-3 py-1 text-xs font-semibold capitalize rounded-md transition-all ${
                  tableFilter === tab ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="px-6 py-3">Deal Title</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3">Lead Source</th>
                <th className="px-6 py-3">Stage</th>
                <th className="px-6 py-3">Target Close Date</th>
                <th className="px-6 py-3">Owner</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTableDeals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    No deals match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredTableDeals.map((deal) => (
                  <tr key={deal._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">{deal.title}</td>
                    <td className="px-6 py-3.5 text-slate-600 font-medium">
                      {deal.customerId?.name}
                      <span className="text-slate-400 ml-1">({deal.customerId?.company})</span>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      ${deal.value.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{deal.leadSource}</td>
                    <td className="px-6 py-3.5">
                      <StageBadge stage={deal.stage} />
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px]">
                      {new Date(deal.expectedCloseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">{deal.ownerId?.name}</td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => openEditModal(deal)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Deal Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}
        title={isCreateModalOpen ? 'Create New Deal' : 'Edit Deal'}
        maxWidth="lg"
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
            } else if (selectedDeal) {
              editMutation.mutate({ id: selectedDeal._id, updates: formData });
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              placeholder="e.g. Enterprise License Expansion"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer *</label>
            <select
              required
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            >
              <option value="">Select a Customer</option>
              {customersData?.customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} — {c.company}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Value ($) *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Source</label>
              <select
                value={formData.leadSource}
                onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pipeline Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as DealStage })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Close Date</label>
              <input
                type="date"
                required
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
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
              {isCreateModalOpen ? 'Create Deal' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
