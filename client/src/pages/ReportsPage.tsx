import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  FileText,
  FileSpreadsheet,
  Download,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiRequest, downloadFile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StageBadge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();

  // Date range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch report data
  const { data, isLoading, refetch } = useQuery<{
    summary: {
      wonCount: number;
      wonValue: number;
      lostCount: number;
      totalClosed: number;
      winRate: number;
    };
    dealsByStage: Array<{ stage: any; count: number; totalValue: number }>;
    revenueByLeadSource: Array<{ source: string; revenue: number; dealCount: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number; count: number }>;
    revenueByOwner: Array<{ ownerName: string; ownerEmail: string; totalRevenue: number; wonDeals: number }>;
  }>({
    queryKey: ['sales-report', { startDate, endDate }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return apiRequest(`/api/reports/sales?${params.toString()}`);
    },
  });

  const handleExport = async (entity: 'customers' | 'deals', format: 'csv' | 'xlsx') => {
    try {
      await downloadFile(`/api/export/${entity}?format=${format}`, `${entity}.${format}`);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Generating sales intelligence and performance reports..." />;
  }

  const summary = data?.summary || {
    wonCount: 0,
    wonValue: 0,
    lostCount: 0,
    totalClosed: 0,
    winRate: 0,
  };

  const dealsByStage = data?.dealsByStage || [];
  const revenueByLeadSource = data?.revenueByLeadSource || [];
  const monthlyRevenue = data?.monthlyRevenue || [];
  const revenueByOwner = data?.revenueByOwner || [];

  return (
    <div className="space-y-8">
      {/* Page Title & Export Center */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Conversion metrics, monthly revenues, and lead source breakdown.
          </p>
        </div>

        {/* Global Export Options */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase">Customers:</span>
            <button
              onClick={() => handleExport('customers', 'csv')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded"
            >
              CSV
            </button>
            <button
              onClick={() => handleExport('customers', 'xlsx')}
              className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded"
            >
              Excel
            </button>
          </div>

          <div className="flex items-center space-x-1 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase">Deals:</span>
            <button
              onClick={() => handleExport('deals', 'csv')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded"
            >
              CSV
            </button>
            <button
              onClick={() => handleExport('deals', 'xlsx')}
              className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded"
            >
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-semibold">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-semibold">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-indigo-600 hover:underline text-xs font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Role Scope: <strong className="text-slate-700 capitalize">{user?.role}</strong>
        </div>
      </div>

      {/* Summary Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold uppercase tracking-wider">Won Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${summary.wonValue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{summary.wonCount} deals won</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold uppercase tracking-wider">Win Rate</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">
            {summary.winRate}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary.wonCount} won / {summary.totalClosed} closed
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold uppercase tracking-wider">Lost Deals</span>
            <Award className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {summary.lostCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Opportunities marked as Lost</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold uppercase tracking-wider">Total Closed</span>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {summary.totalClosed}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Concluded pipeline negotiations</p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Monthly Revenue Closed</h2>
          <p className="text-xs text-slate-500 mb-6">Historical won revenues by closing month</p>
          <div className="h-64 w-full">
            {monthlyRevenue.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No closed deals for this range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: number) => [`$${val.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f8' }}
                  />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Deals by Pipeline Stage */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Deals by Stage</h2>
          <p className="text-xs text-slate-500 mb-6">Volume and value distribution across funnel</p>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {dealsByStage.map((d) => (
              <div key={d.stage} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50">
                <div className="flex items-center space-x-2">
                  <StageBadge stage={d.stage} />
                  <span className="font-semibold text-slate-700">{d.count} deals</span>
                </div>
                <span className="font-bold text-slate-900">${d.totalValue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue by Lead Source & Revenue by Owner (Admin) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Lead Source */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900 mb-1">Revenue by Lead Source</h2>
          <p className="text-xs text-slate-500 mb-4">Channel performance on closed-won revenue</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="py-2.5">Source</th>
                  <th className="py-2.5">Won Deals</th>
                  <th className="py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revenueByLeadSource.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">
                      No won deals recorded yet.
                    </td>
                  </tr>
                ) : (
                  revenueByLeadSource.map((s) => (
                    <tr key={s.source} className="hover:bg-slate-50">
                      <td className="py-2.5 font-semibold text-slate-800">{s.source}</td>
                      <td className="py-2.5 text-slate-600">{s.dealCount}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-700">
                        ${s.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue by Owner (Admin Only) */}
        {user?.role === 'admin' ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Rep Performance (By Owner)</h2>
            <p className="text-xs text-slate-500 mb-4">Won revenue generated per sales rep</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5">Team Member</th>
                    <th className="py-2.5">Won Deals</th>
                    <th className="py-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revenueByOwner.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400">
                        No individual rep data available.
                      </td>
                    </tr>
                  ) : (
                    revenueByOwner.map((o) => (
                      <tr key={o.ownerName} className="hover:bg-slate-50">
                        <td className="py-2.5">
                          <span className="font-semibold text-slate-800">{o.ownerName}</span>
                          <span className="text-[10px] text-slate-400 block">{o.ownerEmail}</span>
                        </td>
                        <td className="py-2.5 text-slate-600">{o.wonDeals}</td>
                        <td className="py-2.5 text-right font-bold text-indigo-700">
                          ${o.totalRevenue.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50/70 p-6 rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-slate-500">
              Team rep performance leaderboards are visible to Administrators only.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
