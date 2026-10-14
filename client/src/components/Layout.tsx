import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  BarChart3,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { GlobalSearch } from './GlobalSearch';
import { RoleBadge } from './Badge';
import { CookieNotice } from './CookieNotice';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Pipeline', path: '/pipeline', icon: Kanban },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  // Admin only navigation item
  if (user?.role === 'admin') {
    navItems.push({ name: 'Team & Roles', path: '/team', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base text-slate-900 tracking-tight">ClientFlow</span>
                <span className="ml-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">CRM</span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            {user?.role && <RoleBadge role={user.role} />}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <GlobalSearch />
          </div>

          <div className="flex items-center space-x-3">
            <NotificationDropdown />
            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Footer with Business & Legal Details */}
        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-400">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} ClientFlow CRM</span>
            <span>•</span>
            <NavLink to="/privacy" className="hover:text-indigo-600 transition-colors">
              Privacy Policy
            </NavLink>
            <span>•</span>
            <NavLink to="/terms" className="hover:text-indigo-600 transition-colors">
              Terms of Service
            </NavLink>
            <span>•</span>
            <NavLink to="/accessibility" className="hover:text-indigo-600 transition-colors">
              Accessibility Statement
            </NavLink>
          </div>
        </footer>

        {/* Essential Session Cookie Notice */}
        <CookieNotice />
      </div>
    </div>
  );
};
