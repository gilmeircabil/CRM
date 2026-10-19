import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Archive,
  RefreshCw,
  Edit2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import Papa from 'papaparse';
import { apiRequest, downloadFile } from '../api/client';
import { Customer, CustomerStatus } from '../types';
import { StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { FormField, getInputClassName } from '../components/FormField';
import { useAuth } from '../context/AuthContext';

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Customer Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    address: '',
    status: 'active' as CustomerStatus,
  });
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    company?: string;
    jobTitle?: string;
    phone?: string;
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

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Fetch Customers Query
  const { data, isLoading, error } = useQuery<{
    customers: Customer[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['customers', { page, status: statusFilter, search }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '10');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      return apiRequest(`/api/customers?${params.toString()}`);
    },
  });

  // Create Customer Mutation
  const createMutation = useMutation({
    mutationFn: (newCustomer: typeof formData) =>
      apiRequest('/api/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: handleMutationError,
  });

  // Edit Customer Mutation
  const editMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<typeof formData> }) =>
      apiRequest(`/api/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: handleMutationError,
  });

  // Archive Mutation (Soft Delete)
  const archiveMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/customers/${id}/archive`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/customers/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Import Mutation
  const importMutation = useMutation({
    mutationFn: (contacts: any[]) =>
      apiRequest<{ imported: number; skipped: number; errors: any[] }>('/api/import/customers', {
        method: 'POST',
        body: JSON.stringify({ contacts }),
      }),
    onSuccess: (res) => {
      setImportResult(res);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => setImportError(err.message),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      jobTitle: '',
      address: '',
      status: 'active',
    });
    setFormError(null);
    setFieldErrors({});
    setSelectedCustomer(null);
  };

  const openEditModal = (c: Customer) => {
    setSelectedCustomer(c);
    setFormData({
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      jobTitle: c.jobTitle,
      address: c.address || '',
      status: c.status,
    });
    setIsEditModalOpen(true);
  };

  // CSV File Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setImportError('File size exceeds the 2 MB limit.');
      return;
    }

    setImportFile(file);
    setImportError(null);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedRows(results.data);
      },
      error: (err) => {
        setImportError(`CSV parsing failed: ${err.message}`);
      },
    });
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      await downloadFile(`/api/export/customers?format=${format}`, `customers.${format}`);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your client profiles, contact histories, and associated pipelines.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Export Buttons */}
          <div className="inline-flex rounded-lg shadow-2xs">
            <button
              onClick={() => handleExport('csv')}
              title="Export as CSV"
              className="flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-l-lg hover:bg-slate-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              title="Export as Excel"
              className="flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border-y border-r border-slate-200 rounded-r-lg hover:bg-slate-50 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
          </div>

          {/* Import Button */}
          <button
            onClick={() => {
              setImportFile(null);
              setParsedRows([]);
              setImportResult(null);
              setImportError(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>Import</span>
          </button>

          {/* Create Button */}
          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100/70 rounded-lg w-full sm:w-auto">
          {['all', 'active', 'inactive', 'archived'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-md transition-all ${
                statusFilter === status
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, company..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Fetching customers..." />
        ) : error ? (
          <div className="p-8 text-center text-rose-600">Failed to load customers.</div>
        ) : !data || data.customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description={
              search || statusFilter !== 'all'
                ? 'Try adjusting your search query or filter settings.'
                : 'Get started by creating your first customer contact or importing from a CSV.'
            }
            actionLabel={!search && statusFilter === 'all' ? 'Create Customer' : undefined}
            onAction={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Company & Title</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Owner</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.customers.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5">
                        <Link
                          to={`/customers/${c._id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600"
                        >
                          {c.name}
                        </Link>
                        <div className="text-[11px] text-slate-400">{c.email}</div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-medium text-slate-800">{c.company}</span>
                        <div className="text-[11px] text-slate-400">{c.jobTitle}</div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px]">{c.phone}</td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{c.ownerId?.name || 'Unassigned'}</td>
                      <td className="px-6 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {c.status === 'archived' ? (
                          <button
                            onClick={() => restoreMutation.mutate(c._id)}
                            className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                            title="Restore Customer"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (confirm(`Archive ${c.name}? You can restore them anytime.`)) {
                                archiveMutation.mutate(c._id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Archive (Soft Delete)"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {data.pagination.totalPages > 1 && (
              <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Customer Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}
        title={isCreateModalOpen ? 'Create New Customer' : 'Edit Customer'}
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
            const errors: typeof fieldErrors = {};
            if (!formData.name.trim()) errors.name = 'Full name is required';
            if (!formData.email.trim()) {
              errors.email = 'Email address is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
              errors.email = 'Valid email is required';
            }
            if (!formData.company.trim()) errors.company = 'Company is required';
            if (!formData.jobTitle.trim()) errors.jobTitle = 'Job title is required';
            if (!formData.phone.trim()) errors.phone = 'Phone number is required';

            if (Object.keys(errors).length > 0) {
              setFieldErrors(errors);
              return;
            }

            setFieldErrors({});
            if (isCreateModalOpen) {
              createMutation.mutate(formData);
            } else if (selectedCustomer) {
              editMutation.mutate({ id: selectedCustomer._id, updates: formData });
            }
          }}
          noValidate
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Full Name"
              error={fieldErrors.name}
              required
              htmlFor="customer-name"
            >
              <input
                id="customer-name"
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                className={getInputClassName(fieldErrors.name)}
                placeholder="Jane Doe"
              />
            </FormField>

            <FormField
              label="Email Address"
              error={fieldErrors.email}
              required
              htmlFor="customer-email"
            >
              <input
                id="customer-email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={getInputClassName(fieldErrors.email)}
                placeholder="jane@company.com"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Company Name"
              error={fieldErrors.company}
              required
              htmlFor="customer-company"
            >
              <input
                id="customer-company"
                type="text"
                value={formData.company}
                onChange={(e) => {
                  setFormData({ ...formData, company: e.target.value });
                  if (fieldErrors.company) setFieldErrors((prev) => ({ ...prev, company: undefined }));
                }}
                className={getInputClassName(fieldErrors.company)}
                placeholder="Acme Corp"
              />
            </FormField>

            <FormField
              label="Job Title"
              error={fieldErrors.jobTitle}
              required
              htmlFor="customer-job-title"
            >
              <input
                id="customer-job-title"
                type="text"
                value={formData.jobTitle}
                onChange={(e) => {
                  setFormData({ ...formData, jobTitle: e.target.value });
                  if (fieldErrors.jobTitle) setFieldErrors((prev) => ({ ...prev, jobTitle: undefined }));
                }}
                className={getInputClassName(fieldErrors.jobTitle)}
                placeholder="Director of Sales"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Phone Number"
              error={fieldErrors.phone}
              required
              htmlFor="customer-phone"
            >
              <input
                id="customer-phone"
                type="text"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                className={getInputClassName(fieldErrors.phone)}
                placeholder="+1 (555) 000-0000"
              />
            </FormField>

            <FormField label="Status" htmlFor="customer-status">
              <select
                id="customer-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </FormField>
          </div>

          <FormField label="Office Address" htmlFor="customer-address">
            <input
              id="customer-address"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              placeholder="123 Corporate Blvd, Suite 400"
            />
          </FormField>

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
              {isCreateModalOpen ? 'Create Customer' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal (Feature 10) */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Contacts from CSV"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Upload a CSV file containing contact records. Columns should include{' '}
            <code className="text-indigo-600 font-mono font-semibold">
              name, email, phone, company, jobTitle
            </code>
            . Duplicates matching existing emails will be safely skipped. (Max file size: 2 MB)
          </p>

          {importError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importResult && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-700 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Import Batch Processed Successfully</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800 font-medium">
                  Imported: <span className="font-bold">{importResult.imported}</span>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg text-amber-800 font-medium">
                  Skipped (Duplicates): <span className="font-bold">{importResult.skipped}</span>
                </div>
                <div className="p-2 bg-rose-50 rounded-lg text-rose-800 font-medium">
                  Errors: <span className="font-bold">{importResult.errors.length}</span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-2 text-[11px] text-rose-600 max-h-32 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, i) => (
                    <div key={i}>
                      Row {err.row}: {err.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50/50 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csvFileInput"
            />
            <label
              htmlFor="csvFileInput"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <Upload className="w-8 h-8 text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-600">
                {importFile ? importFile.name : 'Choose CSV file to upload'}
              </span>
              <span className="text-[11px] text-slate-400">CSV files up to 2 MB</span>
            </label>
          </div>

          {parsedRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">
                  Preview ({parsedRows.length} rows detected)
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-50 sticky top-0 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Company</th>
                      <th className="p-2">Job Title</th>
                      <th className="p-2">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 font-medium">{row.name || '-'}</td>
                        <td className="p-2">{row.email || '-'}</td>
                        <td className="p-2">{row.company || '-'}</td>
                        <td className="p-2">{row.jobTitle || '-'}</td>
                        <td className="p-2 font-mono">{row.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 5 && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Showing first 5 rows of {parsedRows.length} rows.
                </p>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              disabled={parsedRows.length === 0 || importMutation.isPending}
              onClick={() => importMutation.mutate(parsedRows)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-sm disabled:opacity-50"
            >
              {importMutation.isPending ? 'Importing...' : `Import ${parsedRows.length} Contacts`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
