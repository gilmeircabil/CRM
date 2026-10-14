import React from 'react';
import { DealStage, CustomerStatus, TaskPriority, UserRole } from '../types';

export const StageBadge: React.FC<{ stage: DealStage }> = ({ stage }) => {
  const styles: Record<DealStage, string> = {
    'New Lead': 'bg-sky-50 text-sky-700 border-sky-200',
    'Contacted': 'bg-blue-50 text-blue-700 border-blue-200',
    'Qualified': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Proposal': 'bg-purple-50 text-purple-700 border-purple-200',
    'Won': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Lost': 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[stage] || 'bg-slate-100 text-slate-700'}`}>
      {stage}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: CustomerStatus }> = ({ status }) => {
  const styles: Record<CustomerStatus, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-amber-50 text-amber-700 border-amber-200',
    archived: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${styles[status]}`}>
      {status}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const styles: Record<TaskPriority, string> = {
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs uppercase tracking-wide border ${styles[priority]}`}>
      {priority}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
  const isAdmin = role === 'admin';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
      isAdmin ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'
    }`}>
      {isAdmin ? 'Admin' : 'Staff'}
    </span>
  );
};
