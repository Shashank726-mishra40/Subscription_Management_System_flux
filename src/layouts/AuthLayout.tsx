import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-800">
      {/* Top Navbar */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4" fill="white" />
                <path d="M12 4a8 8 0 0 1 7.8 6.2 1 1 0 1 0 1.96-.4A10 10 0 0 0 12 2v2zm0 16a8 8 0 0 1-7.8-6.2 1 1 0 1 0-1.96.4A10 10 0 0 0 12 22v-2z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight block leading-none">
                Brightloop
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block mt-0.5">
                Subscription Operations
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">256-bit Encrypted Session</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
          {/* Left Brand Feature Panel */}
          <div className="hidden lg:flex lg:col-span-5 bg-[#0f172a] text-slate-200 p-10 flex-col justify-between relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-indigo-400 mb-6">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Enterprise RBAC Platform
              </div>

              <h2 className="text-2xl font-bold text-white tracking-tight leading-snug">
                The digital backbone of modern recurring business.
              </h2>
              <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                Streamlining customer subscriptions, quotation-to-contract lifecycles, automated multi-rate invoicing, and instant payment reconciliation.
              </p>
            </div>

            <div className="space-y-3.5 my-8">
              {[
                'Three-tier RBAC for Admins, Staff & Customers',
                'Zero plain-text password storage (salted hashing)',
                'Automated customer self-service subscription portal',
                'Audit logging and staff permission management',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800/80 pt-6">
              <p className="text-[11px] text-slate-400">
                “Brightloop eliminated spreadsheet tracking and manual billing reconciliations entirely across our operations.”
              </p>
              <p className="text-xs font-semibold text-slate-200 mt-2">
                Finance Leadership Team · Brightloop Software
              </p>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/60 py-4 px-6 text-center text-xs text-slate-400">
        <p>© 2026 Brightloop Software. All rights reserved. Subscription Management Platform.</p>
      </footer>
    </div>
  );
};
