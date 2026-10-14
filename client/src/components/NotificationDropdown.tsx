import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Clock, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { NotificationItem } from '../types';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Poll notifications every 60 seconds
  const { data } = useQuery<{ notifications: NotificationItem[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: () => apiRequest('/api/notifications'),
    refetchInterval: 60000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest('/api/notifications/mark-all-read', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.isRead) {
      markReadMutation.mutate(n._id);
    }
    setIsOpen(false);
    navigate('/tasks');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <p className="text-xs">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isOverdue = n.type === 'task_overdue';
                return (
                  <div
                    key={n._id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start space-x-3 ${
                      !n.isRead ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isOverdue
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {isOverdue ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                        <span className="flex items-center text-indigo-600 hover:underline">
                          View task <ExternalLink className="w-3 h-3 ml-0.5" />
                        </span>
                      </div>
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
