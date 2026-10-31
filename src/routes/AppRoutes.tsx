import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

// Lazy-loaded Public Auth Pages
const LoginPage = lazy(() => import('../pages/auth/Login').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('../pages/auth/Signup').then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPassword').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPassword').then((m) => ({ default: m.ResetPasswordPage })));
const UnauthorizedPage = lazy(() => import('../pages/auth/Unauthorized').then((m) => ({ default: m.UnauthorizedPage })));
const UserProfilePage = lazy(() => import('../pages/auth/Profile').then((m) => ({ default: m.UserProfilePage })));

// Lazy-loaded Dashboard & Operational Pages
const Dashboard = lazy(() => import('../pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const CustomersPage = lazy(() => import('../pages/Customers').then((m) => ({ default: m.CustomersPage })));
const StaffManagementPage = lazy(() => import('../pages/StaffManagement').then((m) => ({ default: m.StaffManagementPage })));
const ProductsPage = lazy(() => import('../pages/Products').then((m) => ({ default: m.ProductsPage })));
const PlansPage = lazy(() => import('../pages/Plans').then((m) => ({ default: m.PlansPage })));
const QuotationsPage = lazy(() => import('../pages/Quotations').then((m) => ({ default: m.QuotationsPage })));
const SubscriptionsPage = lazy(() => import('../pages/Subscriptions').then((m) => ({ default: m.SubscriptionsPage })));
const InvoicesPage = lazy(() => import('../pages/Invoices').then((m) => ({ default: m.InvoicesPage })));
const DiscountsPage = lazy(() => import('../pages/Discounts').then((m) => ({ default: m.DiscountsPage })));
const PaymentsPage = lazy(() => import('../pages/Payments').then((m) => ({ default: m.PaymentsPage })));
const ReportsPage = lazy(() => import('../pages/Reports').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('../pages/Settings').then((m) => ({ default: m.SettingsPage })));

// Lazy-loaded Customer Portal
const CustomerPortalPage = lazy(() => import('../pages/portal/CustomerPortal').then((m) => ({ default: m.CustomerPortalPage })));

// High-performance Skeleton Fallback
const PageLoadingFallback: React.FC = () => (
  <div className="w-full max-w-7xl mx-auto space-y-6 animate-pulse py-4">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-7 w-64 bg-slate-200 rounded-md" />
        <div className="h-4 w-96 bg-slate-100 rounded-md" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-28 bg-slate-200 rounded-lg" />
        <div className="h-9 w-32 bg-indigo-200 rounded-lg" />
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 bg-slate-100 rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-6 w-36 bg-slate-300 rounded" />
        </div>
      ))}
    </div>
    <div className="h-80 bg-slate-100 rounded-xl border border-slate-200" />
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* Public Authentication Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Unauthorized Access Fallback Page */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Authenticated Dashboard & Portal Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Main Dashboard (Admin & Staff) */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Customer Self-Service Portal */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                <CustomerPortalPage />
              </ProtectedRoute>
            }
          />

          {/* Customer Directory (Admin & Staff) */}
          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                <CustomersPage />
              </ProtectedRoute>
            }
          />

          {/* Staff Management (ADMIN ONLY) */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <StaffManagementPage />
              </ProtectedRoute>
            }
          />

          {/* Products (Admin & Staff) */}
          <Route
            path="/products"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                <ProductsPage />
              </ProtectedRoute>
            }
          />

          {/* Plans (Admin & Staff) */}
          <Route
            path="/plans"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                <PlansPage />
              </ProtectedRoute>
            }
          />

          {/* Quotations (Admin & Staff) */}
          <Route
            path="/quotations"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                <QuotationsPage />
              </ProtectedRoute>
            }
          />

          {/* Subscriptions (Admin & Staff) */}
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                <SubscriptionsPage />
              </ProtectedRoute>
            }
          />

          {/* Invoices (Admin & Staff) */}
          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                <InvoicesPage />
              </ProtectedRoute>
            }
          />

          {/* Discounts (Admin Only) */}
          <Route
            path="/discounts"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DiscountsPage />
              </ProtectedRoute>
            }
          />

          {/* Payments (Admin & Staff) */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                <PaymentsPage />
              </ProtectedRoute>
            }
          />

          {/* Reports (Admin & Staff) */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* System Settings (Admin Only) */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/:tab"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* User Profile (Accessible to All Roles) */}
          <Route path="/profile" element={<UserProfilePage />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
