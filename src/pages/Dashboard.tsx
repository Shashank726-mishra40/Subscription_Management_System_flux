import React, { useState, useMemo } from 'react';
import {
  Repeat,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  Download,
  Filter,
  X,
  Plus,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnalyticsService, DashboardFilters } from '../services/analyticsService';
import {
  RevenueOverviewChart,
  SubscriptionOverviewVisual,
  PaidVsOutstandingVisual,
  OverdueSummaryVisual,
} from '../components/dashboard/FinanceVisualizations';
import { SummaryCard } from '../components/dashboard/SummaryCard';
import { RecentActivitySection } from '../components/dashboard/RecentActivitySection';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { formatCurrency } from '../utils/formatters';

export const Dashboard: React.FC = () => {
  // Filter state
  const [filters, setFilters] = useState<DashboardFilters>({
    dateFrom: '',
    dateTo: '',
    subscriptionStatus: 'ALL',
    invoiceStatus: 'ALL',
    billingPeriod: 'ALL',
  });

  // Calculate dynamic analytics based on selected filters
  const analytics = useMemo(() => {
    return AnalyticsService.getDashboardAnalytics(filters);
  }, [filters]);

  const hasActiveFilters = Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.subscriptionStatus !== 'ALL' ||
      filters.invoiceStatus !== 'ALL' ||
      filters.billingPeriod !== 'ALL'
  );

  const handleClearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      subscriptionStatus: 'ALL',
      invoiceStatus: 'ALL',
      billingPeriod: 'ALL',
    });
  };

  const handleExportSummaryCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'Metric,Value',
        `Total Active Subscriptions,${analytics.kpis.totalActiveSubscriptions}`,
        `Total Revenue Received,${analytics.kpis.totalRevenueReceived}`,
        `Total Outstanding Amount,${analytics.kpis.totalOutstandingAmount}`,
        `Total Overdue Invoices Count,${analytics.kpis.totalOverdueInvoicesCount}`,
        `Total Overdue Amount,${analytics.kpis.totalOverdueAmount}`,
        `Monthly Recurring Revenue (MRR),${analytics.kpis.mrr}`,
        `Collection Efficiency (%),${analytics.kpis.collectionRate}%`,
        `Exported On,${new Date().toISOString()}`,
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Brightloop_Finance_KPI_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Finance & Subscription Dashboard
            </h2>
            <span className="hidden sm:inline-block rounded-md bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              Live Application Data
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time financial performance, revenue recognition, invoice receivables, and subscription analytics for Brightloop Software.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            icon={<Download className="h-4 w-4 text-slate-500" />}
            onClick={handleExportSummaryCSV}
          >
            Export Summary
          </Button>
          <Link to="/subscriptions">
            <Button variant="primary" size="md" icon={<Plus className="h-4 w-4" />}>
              Manage Subscriptions
            </Button>
          </Link>
        </div>
      </div>

      {/* Dynamic Filter Bar */}
      <Card className="border-indigo-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>Financial Analytics Filter Engine</span>
              {hasActiveFilters && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-800">
                  Filters Active
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium transition"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
            {/* Date From */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Date From
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Date To
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Subscription Status */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Subscription Status
              </label>
              <select
                value={filters.subscriptionStatus || 'ALL'}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    subscriptionStatus: e.target.value as DashboardFilters['subscriptionStatus'],
                  })
                }
                className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Subscriptions</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Paused">Paused</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Invoice Status */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Invoice Status
              </label>
              <select
                value={filters.invoiceStatus || 'ALL'}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    invoiceStatus: e.target.value as DashboardFilters['invoiceStatus'],
                  })
                }
                className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Invoices</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Posted">Posted</option>
                <option value="Draft">Draft</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Billing Period */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Billing Period
              </label>
              <select
                value={filters.billingPeriod || 'ALL'}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    billingPeriod: e.target.value as DashboardFilters['billingPeriod'],
                  })
                }
                className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Billing Periods</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* 1. Main Required 4 Finance KPI Cards (+ 2 supplementary SaaS KPIs) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* KPI 1: Total Active Subscriptions */}
        <SummaryCard
          title="Active Subscriptions"
          value={analytics.kpis.totalActiveSubscriptions.toLocaleString()}
          icon={<Repeat className="h-5 w-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600"
        />

        {/* KPI 2: Total Revenue Received (Realized Cash Flow) */}
        <SummaryCard
          title="Revenue Received"
          value={formatCurrency(analytics.kpis.totalRevenueReceived)}
          icon={<DollarSign className="h-5 w-5" />}
          iconBgColor="bg-indigo-50 text-indigo-600"
        />

        {/* KPI 3: Total Outstanding Amount */}
        <SummaryCard
          title="Outstanding Amount"
          value={formatCurrency(analytics.kpis.totalOutstandingAmount)}
          icon={<Clock className="h-5 w-5" />}
          iconBgColor="bg-amber-50 text-amber-600"
        />

        {/* KPI 4: Total Overdue Invoices */}
        <SummaryCard
          title="Overdue Invoices"
          value={formatCurrency(analytics.kpis.totalOverdueAmount)}
          badge={
            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
              {analytics.kpis.totalOverdueInvoicesCount} unpaid
            </span>
          }
          icon={<AlertCircle className="h-5 w-5" />}
          iconBgColor="bg-rose-50 text-rose-600"
          highlightAlert={analytics.kpis.totalOverdueInvoicesCount > 0}
        />

        {/* Supplementary KPI: Monthly Recurring Revenue (MRR) */}
        <SummaryCard
          title="Normalized MRR"
          value={formatCurrency(analytics.kpis.mrr)}
          icon={<TrendingUp className="h-5 w-5" />}
          iconBgColor="bg-blue-50 text-blue-600"
        />

        {/* Supplementary KPI: Collection Efficiency Rate */}
        <SummaryCard
          title="Collection Rate"
          value={`${analytics.kpis.collectionRate}%`}
          icon={<ShieldCheck className="h-5 w-5" />}
          iconBgColor="bg-purple-50 text-purple-600"
        />
      </div>

      {/* 2. Visualizations Section (4 Primary Visualizations) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visualization 1: Revenue Overview Over Time (8 columns) */}
        <div className="lg:col-span-8">
          <Card className="h-full">
            <CardHeader
              title="Revenue Overview Over Time"
              subtitle="Realized cash flow from completed and recorded customer payments"
              action={
                <Link
                  to="/reports"
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Full Report <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
            <CardContent>
              <RevenueOverviewChart data={analytics.revenueTrends} />
            </CardContent>
          </Card>
        </div>

        {/* Visualization 3: Paid vs Outstanding Invoice Summary (4 columns) */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader
              title="Paid vs. Outstanding Invoices"
              subtitle="Billed receivables vs collected cash balance"
            />
            <CardContent>
              <PaidVsOutstandingVisual data={analytics.paidVsOutstanding} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visualization 2: Active Subscription Overview (7 columns) */}
        <div className="lg:col-span-7">
          <Card className="h-full">
            <CardHeader
              title="Subscription Base Overview"
              subtitle="Distribution by lifecycle state and recurring billing cadence"
              action={
                <Link
                  to="/subscriptions"
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Manage <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
            <CardContent>
              <SubscriptionOverviewVisual
                statusData={analytics.subscriptionDistribution}
                cadenceData={analytics.cadenceDistribution}
                totalActive={analytics.kpis.totalActiveSubscriptions}
              />
            </CardContent>
          </Card>
        </div>

        {/* Visualization 4: Overdue Invoice Summary (5 columns) */}
        <div className="lg:col-span-5">
          <Card className="h-full">
            <CardHeader
              title="Overdue Invoices & Aging Delinquency"
              subtitle="Uncollected balances segmented by days past due"
              action={
                <Link
                  to="/payments"
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium"
                >
                  Collect <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              }
            />
            <CardContent>
              <OverdueSummaryVisual
                buckets={analytics.overdueAging}
                totalOverdueAmount={analytics.kpis.totalOverdueAmount}
                totalOverdueCount={analytics.kpis.totalOverdueInvoicesCount}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. Recent Real Application Activity */}
      <RecentActivitySection
        subscriptions={analytics.recentSubscriptions}
        payments={analytics.recentPayments}
        invoices={analytics.recentInvoices}
      />
    </div>
  );
};
