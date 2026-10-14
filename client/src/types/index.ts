export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export type CustomerStatus = 'active' | 'inactive' | 'archived';

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  address?: string;
  status: CustomerStatus;
  ownerId: {
    _id: string;
    name: string;
    email: string;
  };
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type DealStage = 'New Lead' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost';

export interface Deal {
  _id: string;
  title: string;
  customerId: {
    _id: string;
    name: string;
    company: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  value: number;
  leadSource: string;
  stage: DealStage;
  expectedCloseDate: string;
  closedAt?: string;
  ownerId: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  _id: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  assignedTo: {
    _id: string;
    name: string;
    email: string;
  };
  customerId?: {
    _id: string;
    name: string;
    company?: string;
  };
  dealId?: {
    _id: string;
    title: string;
    value?: number;
  };
  isCompleted: boolean;
  completedAt?: string;
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = 'note' | 'call' | 'meeting' | 'deal_update' | 'system';

export interface Activity {
  _id: string;
  type: ActivityType;
  content: string;
  customerId: string;
  dealId?: {
    _id: string;
    title: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  userId: string;
  type: 'task_due_soon' | 'task_overdue';
  message: string;
  taskId: {
    _id: string;
    description: string;
    dueDate: string;
    priority: TaskPriority;
    isCompleted: boolean;
    customerId?: {
      _id: string;
      name: string;
      company: string;
    };
    dealId?: {
      _id: string;
      title: string;
    };
  };
  isRead: boolean;
  createdAt: string;
}

export interface DashboardMetrics {
  kpis: {
    totalCustomers: number;
    newLeads: number;
    activeDeals: number;
    wonDeals: number;
    revenue: number;
    conversionRate: number;
    overdueTasks: number;
  };
  pipelineSummary: Array<{
    stage: DealStage;
    count: number;
    totalValue: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    count: number;
  }>;
  recentDeals: Deal[];
}
