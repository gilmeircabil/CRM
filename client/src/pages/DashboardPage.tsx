import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Flame,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { DashboardMetrics } from '../types';
import { StageBadge } from '../components/Badge';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const DashboardPage: React.FC = () => {
  const { data, isLoading, error } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest('/api/dashboard'),
  });

  if (isLoading) {
    return <LoadingSpinner message="Calculating real-time CRM performance..." />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
        <p className="font-semibold">Unable to load dashboard metrics.</p>
        <p className="text-sm mt-1">{(error as any)?.message || 'Please check your server connection.'}</p>
      </div>
    );
  }

  const { kpis, pipelineSummary, monthlyRevenue, recentDeals } = data;

  const kpiCards = [
    {
      title: 'Total Customers',
      value: kpis.totalCustomers.toString(),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'New Leads (30d)',
      value: kpis.newLeads.toString(),
      icon: UserPlus,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Active Pipeline Deals',
      value: kpis.activeDeals.toString(),
      icon: Flame,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Won Deals',
      value: kpis.wonDeals.toString(),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Total Revenue',
      value: `$${kpis.revenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Conversion Rate',
      value: `${kpis.conversionRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Overdue Tasks',
      value: kpis.overdueTasks.toString(),
      icon: AlertTriangle,
      color: kpis.overdueTasks > 0 ? 'text-rose-600' : 'text-slate-500',
      bg: kpis.overdueTasks > 0 ? 'bg-rose-50' : 'bg-slate-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">CRM Overview</h1>
        <p className="text-sm text-slate-500 mt-1">
          Real-time metrics, pipeline health, and revenue breakdown.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts & Pipeline Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Monthly Revenue Trend</h2>
              <p className="text-xs text-slate-500">Revenue closed from Won deals over time</p>
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              Last 12 Months
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: number) => [`$${val.toLocaleString()}`, 'Revenue']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f8',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compact Pipeline Summary (1 col) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">Pipeline Stages</h2>
              <Link
                to="/pipeline"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                Board <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-6">Current deal count and value by stage</p>

            <div className="space-y-3.5">
              {pipelineSummary.map((item) => (
                <div key={item.stage} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <StageBadge stage={item.stage} />
                    <span className="text-slate-500 font-medium">{item.count} deals</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    ${item.totalValue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Value</span>
            <span className="text-sm font-bold text-slate-900">
              ${pipelineSummary.reduce((acc, curr) => acc + curr.totalValue, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Deals Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Deals</h2>
            <p className="text-xs text-slate-500">Recently active and updated opportunities</p>
          </div>
          <Link
            to="/pipeline"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            View all deals <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="px-6 py-3">Deal Title</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3">Stage</th>
                <th className="px-6 py-3">Owner</th>
                <th className="px-6 py-3">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentDeals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No deals recorded yet.
                  </td>
                </tr>
              ) : (
                recentDeals.map((deal) => (
                  <tr key={deal._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      <Link to="/pipeline" className="hover:text-indigo-600">
                        {deal.title}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 font-medium">
                      {deal.customerId?.name || 'Unknown'}
                      <span className="text-slate-400 ml-1">({deal.customerId?.company})</span>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      ${deal.value.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <StageBadge stage={deal.stage} />
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">{deal.ownerId?.name}</td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {new Date(deal.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
