import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  FileSpreadsheet,
  Repeat,
  Receipt,
  Percent,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  User,
  X,
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { UserRole } from '../types/auth';

export interface NavItemConfig {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  roles?: UserRole[]; // If specified, only shown to these roles
}

export const navigationItems: NavItemConfig[] = [
  // Operational Dashboard (Admin & Staff)
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'STAFF'] },
  { name: 'Customers', path: '/customers', icon: Users, badge: '1,248', roles: ['ADMIN', 'STAFF'] },
  { name: 'Staff Management', path: '/staff', icon: UserCheck, badge: 'Admin', badgeColor: 'bg-indigo-500/20 text-indigo-300', roles: ['ADMIN'] },
  { name: 'Products', path: '/products', icon: Package, roles: ['ADMIN', 'STAFF'] },
  { name: 'Plans', path: '/plans', icon: Layers, roles: ['ADMIN', 'STAFF'] },
  { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet, badge: '3', roles: ['ADMIN', 'STAFF'] },
  { name: 'Subscriptions', path: '/subscriptions', icon: Repeat, badge: 'Active', roles: ['ADMIN', 'STAFF'] },
  { name: 'Invoices', path: '/invoices', icon: Receipt, badge: '7 due', badgeColor: 'bg-rose-500/20 text-rose-300', roles: ['ADMIN', 'STAFF'] },
  { name: 'Discounts', path: '/discounts', icon: Percent, roles: ['ADMIN'] },
  { name: 'Payments', path: '/payments', icon: CreditCard, roles: ['ADMIN', 'STAFF'] },
  { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'STAFF'] },
  { name: 'Settings', path: '/settings', icon: Settings, roles: ['ADMIN'] },

  // Customer Self-Service Portal (Dedicated Customer Sidebar Navigation)
  { name: 'Overview', path: '/portal?tab=overview', icon: LayoutDashboard, roles: ['CUSTOMER'] },
  { name: 'My Subscriptions', path: '/portal?tab=subscriptions', icon: Repeat, roles: ['CUSTOMER'] },
  { name: 'My Quotations', path: '/portal?tab=quotations', icon: FileSpreadsheet, roles: ['CUSTOMER'] },
  { name: 'My Invoices', path: '/portal?tab=invoices', icon: Receipt, roles: ['CUSTOMER'] },
  { name: 'My Payments', path: '/portal?tab=payments', icon: CreditCard, roles: ['CUSTOMER'] },
  { name: 'Available Discounts', path: '/portal?tab=discounts', icon: Percent, roles: ['CUSTOMER'] },
  { name: 'My Profile', path: '/profile', icon: User, roles: ['CUSTOMER'] },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const {
    isSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
  } = useUI();
  const { role } = useAuth();

  // Filter items visible to current role
  const visibleItems = navigationItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0f172a] text-slate-300 border-r border-slate-800 transition-all duration-300 ease-in-out lg:static shadow-xl lg:shadow-none',
          isSidebarCollapsed ? 'w-20' : 'w-64',
          isMobileSidebarOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" fill="white" />
                <path d="M12 4a8 8 0 0 1 7.8 6.2 1 1 0 1 0 1.96-.4A10 10 0 0 0 12 2v2zm0 16a8 8 0 0 1-7.8-6.2 1 1 0 1 0-1.96.4A10 10 0 0 0 12 22v-2z" />
              </svg>
            </div>

            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <div className="min-w-0 transition-opacity duration-200">
                <h1 className="text-sm font-bold text-white tracking-tight leading-tight truncate">
                  Brightloop
                </h1>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase truncate">
                  {role === 'CUSTOMER' ? 'Customer Portal' : 'Subscription Ops'}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          <div className="pb-1">
            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <div className="flex items-center justify-between px-3 mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {role === 'CUSTOMER' ? 'Portal Services' : 'Core Modules'}
                </p>
                {role && (
                  <span
                    className={cn(
                      'text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider',
                      role === 'ADMIN'
                        ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                        : role === 'STAFF'
                        ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                        : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                    )}
                  >
                    {role}
                  </span>
                )}
              </div>
            )}
          </div>

          {visibleItems.map((item) => {
            const Icon = item.icon;
            const currentFull = `${location.pathname}${location.search}`;
            const isItemActive =
              item.path === currentFull ||
              (item.path === '/portal?tab=overview' &&
                location.pathname === '/portal' &&
                (!location.search || location.search === '?tab=overview')) ||
              (!item.path.includes('?') && location.pathname === item.path);

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isItemActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100',
                  isSidebarCollapsed && !isMobileSidebarOpen && 'justify-center px-0'
                )}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <Icon className="h-5 w-5 shrink-0 transition-colors" />

                {(!isSidebarCollapsed || isMobileSidebarOpen) && (
                  <span className="truncate flex-1">{item.name}</span>
                )}

                {(!isSidebarCollapsed || isMobileSidebarOpen) && item.badge && (
                  <span
                    className={cn(
                      'ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      item.badgeColor || 'bg-slate-800 text-slate-300'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Workspace info & Collapse Toggle */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          {(!isSidebarCollapsed || isMobileSidebarOpen) ? (
            <div className="mb-2 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50 flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  Role: {role || 'Guest'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {role === 'ADMIN' ? 'Full Authority' : role === 'STAFF' ? 'Staff Workspace' : 'Self-Service'}
                </p>
              </div>
            </div>
          ) : null}

          {/* Desktop Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              'hidden lg:flex w-full items-center gap-2.5 rounded-lg p-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors',
              isSidebarCollapsed && 'justify-center'
            )}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
