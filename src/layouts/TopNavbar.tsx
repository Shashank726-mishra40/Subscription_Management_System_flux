import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User as UserIcon,
  Settings,
  LogOut,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils/formatters';
import { UserRole } from '../types/auth';

export const TopNavbar: React.FC = () => {
  const { setMobileSidebarOpen, searchQuery, setSearchQuery, notificationsCount } = useUI();
  const { user, role, logout, switchUserQuick } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute Breadcrumb items based on current path
  const pathnames = location.pathname.split('/').filter(Boolean);
  const breadcrumbTitle =
    pathnames.length === 0
      ? 'Dashboard'
      : pathnames[0].charAt(0).toUpperCase() + pathnames[0].slice(1).replace('-', ' ');

  const handleLogout = () => {
    setProfileDropdownOpen(false);
    logout();
    navigate('/login');
  };

  const handleRoleSwitch = async (targetRole: UserRole) => {
    setSwitcherOpen(false);
    setProfileDropdownOpen(false);
    await switchUserQuick(targetRole);
    if (targetRole === 'CUSTOMER') {
      navigate('/portal');
    } else {
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Menu Toggle & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
          <Link
            to={role === 'CUSTOMER' ? '/portal' : '/'}
            className="font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Brightloop
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">{breadcrumbTitle}</span>
        </nav>
      </div>

      {/* Middle: Search Field */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search subscriptions, invoices, customers... (Cmd+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-12 text-xs text-slate-800 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
            <kbd className="hidden sm:inline-block rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right: Quick Role Switcher, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Role Switcher for seamless testing */}
        <div className="relative hidden sm:block" ref={switcherRef}>
          <button
            type="button"
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
            title="Switch authenticated role for testing"
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] text-slate-500">Role:</span>
            <span className="font-bold text-slate-900">{role || 'None'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {switcherOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Active Role (Demo)
                </p>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('ADMIN')}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                    role === 'ADMIN' ? 'font-bold text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <p>Admin (Alex Mercer)</p>
                    <p className="text-[10px] text-slate-400">admin@brightloop.io · Full system</p>
                  </div>
                  {role === 'ADMIN' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSwitch('STAFF')}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                    role === 'STAFF' ? 'font-bold text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <p>Staff (Marcus Vance)</p>
                    <p className="text-[10px] text-slate-400">staff@brightloop.io · Operations</p>
                  </div>
                  {role === 'STAFF' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSwitch('CUSTOMER')}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                    role === 'CUSTOMER' ? 'font-bold text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <p>Customer (Sarah Jenkins)</p>
                    <p className="text-[10px] text-slate-400">customer@vertexlogic.com · Portal</p>
                  </div>
                  {role === 'CUSTOMER' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {notificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                {notificationsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <span className="font-semibold text-xs text-slate-900">Notifications</span>
                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  3 unread
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                <div className="p-3 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer">
                  <div className="rounded-full bg-emerald-50 p-1.5 text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800">
                      Payment Received: $28,800
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Vertex Logic Inc. paid invoice #INV-2026-0819 via Stripe
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">12 minutes ago</p>
                  </div>
                </div>

                <div className="p-3 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer">
                  <div className="rounded-full bg-rose-50 p-1.5 text-rose-600 shrink-0">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800">
                      Invoice Past Due: $4,012
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Solstice Media has not settled #INV-2026-0792 (6 days overdue)
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">1 hour ago</p>
                  </div>
                </div>

                <div className="p-3 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer">
                  <div className="rounded-full bg-indigo-50 p-1.5 text-indigo-600 shrink-0">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800">
                      New Subscription Signed
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Aero Dynamics Global started Growth Team Tier ($750/mo)
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">3 hours ago</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 p-2 text-center bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-semibold text-xs shadow-sm">
              {user ? getInitials(user.name) : 'AM'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-none">
                {user?.name || 'Alex Mercer'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 leading-none flex items-center gap-1">
                <span>{user?.companyName || user?.department || 'Operations'}</span>
                <span className="font-semibold text-indigo-600">({role})</span>
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* User Menu Dropdown */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      role === 'ADMIN'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : role === 'STAFF'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {role} ACCESS
                  </span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <UserIcon className="h-4 w-4 text-slate-400" />
                  <span>Account & Profile</span>
                </Link>

                {role === 'ADMIN' && (
                  <>
                    <Link
                      to="/staff"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <UserCheck className="h-4 w-4 text-slate-400" />
                      <span>Staff Management</span>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                      <span>Company Settings</span>
                    </Link>
                  </>
                )}

                {role === 'CUSTOMER' && (
                  <Link
                    to="/portal"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    <span>My Customer Portal</span>
                  </Link>
                )}
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
