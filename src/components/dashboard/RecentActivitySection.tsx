import React, { useState } from 'react';
import { Subscription, Payment, Invoice } from '../../types';
import { Table, Column } from '../common/Table';
import { Badge } from '../common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CreditCard, RefreshCw, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RecentActivitySectionProps {
  subscriptions: Subscription[];
  payments: Payment[];
  invoices: Invoice[];
}

export const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({
  subscriptions,
  payments,
  invoices,
}) => {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'payments' | 'invoices'>('subscriptions');

  // Subscription Columns
  const subscriptionColumns: Column<Subscription>[] = [
    {
      header: 'Subscription #',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900">{row.subscriptionNumber}</span>
          <p className="text-xs text-slate-500 capitalize">{row.billingCycle} billing</p>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.companyName}</p>
          <p className="text-xs text-slate-500">{row.customerName}</p>
        </div>
      ),
    },
    {
      header: 'Plan',
      cell: (row) => (
        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded">
          {row.planName}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <Badge status={row.status}>{row.status}</Badge>,
    },
    {
      header: 'MRR / Value',
      cell: (row) => (
        <div className="text-right">
          <p className="font-semibold text-slate-900">{formatCurrency(row.mrrAmount)}/mo</p>
          <p className="text-xs text-slate-400">Total: {formatCurrency(row.totalAmount)}</p>
        </div>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: 'Start Date',
      cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.startDate)}</span>,
    },
  ];

  // Payment Columns
  const paymentColumns: Column<Payment>[] = [
    {
      header: 'Payment #',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900">{row.paymentNumber}</span>
          <p className="text-xs text-slate-400">Inv: {row.invoiceNumber}</p>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.companyName}</p>
          <p className="text-xs text-slate-500">{row.customerName}</p>
        </div>
      ),
    },
    {
      header: 'Method',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
          {row.method}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <Badge status={row.status}>{row.status}</Badge>,
    },
    {
      header: 'Amount',
      cell: (row) => (
        <span className="font-semibold text-emerald-700">
          +{formatCurrency(row.amount)}
        </span>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: 'Date',
      cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.paymentDate)}</span>,
    },
  ];

  // Invoice Columns
  const invoiceColumns: Column<Invoice>[] = [
    {
      header: 'Invoice #',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900">{row.invoiceNumber}</span>
          {row.subscriptionNumber && (
            <p className="text-xs text-slate-400">{row.subscriptionNumber}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.companyName}</p>
          <p className="text-xs text-slate-500">{row.customerName}</p>
        </div>
      ),
    },
    {
      header: 'Due Date',
      cell: (row) => (
        <div>
          <p className="text-xs text-slate-700">{formatDate(row.dueDate)}</p>
          <p className="text-[11px] text-slate-400">Issued: {formatDate(row.issueDate)}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <Badge status={row.status}>{row.status}</Badge>,
    },
    {
      header: 'Total Amount',
      cell: (row) => (
        <div className="text-right">
          <p className="font-semibold text-slate-900">{formatCurrency(row.totalAmount)}</p>
          {row.amountDue > 0 && (
            <p className="text-xs text-rose-600 font-medium">Due: {formatCurrency(row.amountDue)}</p>
          )}
        </div>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header and Tabs */}
      <div className="border-b border-slate-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Recent Operational Activity</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time feed of billing events, new subscriptions, and incoming settlements
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Subscriptions</span>
            <span className="ml-1 text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded-full">
              {subscriptions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'payments'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Payments</span>
            <span className="ml-1 text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded-full">
              {payments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'invoices'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Invoices</span>
            <span className="ml-1 text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded-full">
              {invoices.length}
            </span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="w-full">
        {activeTab === 'subscriptions' && (
          <Table
            columns={subscriptionColumns}
            data={subscriptions}
            keyExtractor={(sub) => sub.id}
          />
        )}

        {activeTab === 'payments' && (
          <Table
            columns={paymentColumns}
            data={payments}
            keyExtractor={(pay) => pay.id}
          />
        )}

        {activeTab === 'invoices' && (
          <Table
            columns={invoiceColumns}
            data={invoices}
            keyExtractor={(inv) => inv.id}
          />
        )}
      </div>

      {/* Footer Navigation */}
      <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Showing 5 latest entries</span>
        <Link
          to={`/${activeTab}`}
          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>View all {activeTab}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};
