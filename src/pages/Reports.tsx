import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Search,
  Filter,
  DollarSign,
  Repeat,
  FileText,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PaymentService } from '../services/paymentService';
import { SubscriptionService } from '../services/subscriptionService';
import { InvoiceService } from '../services/invoiceService';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Payment, Subscription, Invoice } from '../types';

type ReportTab = 'revenue' | 'subscriptions' | 'invoices';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('revenue');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 8;

  // Raw data from services
  const payments = useMemo(() => PaymentService.getPayments(), []);
  const subscriptions = useMemo(() => SubscriptionService.getSubscriptions(), []);
  const invoices = useMemo(() => InvoiceService.getInvoices(), []);

  // Reset pagination when tab or filters change
  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('ALL');
    setCurrentPage(1);
    setSortField('date');
    setSortDirection('desc');
  };

  // 1. REVENUE REPORT DATA
  const filteredPayments = useMemo(() => {
    let list = payments.filter((p) => p.status === 'Recorded' || p.status === 'Completed');

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.customerName.toLowerCase().includes(q) ||
          p.paymentReference?.toLowerCase().includes(q) ||
          p.invoiceNumber.toLowerCase().includes(q) ||
          (p.transactionReference && p.transactionReference.toLowerCase().includes(q))
      );
    }

    if (dateFrom) {
      list = list.filter((p) => p.paymentDate >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((p) => p.paymentDate <= dateTo);
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((p) => p.paymentMethod === statusFilter);
    }

    return list.sort((a, b) => {
      let valA = sortField === 'amount' ? a.amount : a.paymentDate;
      let valB = sortField === 'amount' ? b.amount : b.paymentDate;
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [payments, searchTerm, dateFrom, dateTo, statusFilter, sortField, sortDirection]);

  // Monthly Revenue Grouping
  const monthlyRevenueGrouping = useMemo(() => {
    const map: { [monthKey: string]: { month: string; amount: number; count: number } } = {};
    filteredPayments.forEach((p) => {
      const date = new Date(p.paymentDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!map[key]) {
        map[key] = { month: monthName, amount: 0, count: 0 };
      }
      map[key].amount += p.amount;
      map[key].count += 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([_, v]) => v);
  }, [filteredPayments]);

  const totalRevenue = useMemo(
    () => filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    [filteredPayments]
  );

  // 2. SUBSCRIPTION REPORT DATA
  const filteredSubscriptions = useMemo(() => {
    let list = [...subscriptions];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.customerName.toLowerCase().includes(q) ||
          s.subscriptionNumber.toLowerCase().includes(q) ||
          s.planName.toLowerCase().includes(q)
      );
    }

    if (dateFrom) {
      list = list.filter((s) => s.startDate >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((s) => s.startDate <= dateTo);
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((s) => s.status === statusFilter);
    }

    return list.sort((a, b) => {
      let valA = sortField === 'amount' ? (a.totalAmount || a.mrrAmount) : a.startDate;
      let valB = sortField === 'amount' ? (b.totalAmount || b.mrrAmount) : b.startDate;
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [subscriptions, searchTerm, dateFrom, dateTo, statusFilter, sortField, sortDirection]);

  const subscriptionStats = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter((s) => s.status === 'Active').length;
    const paused = subscriptions.filter((s) => s.status === 'Paused').length;
    const closed = subscriptions.filter((s) => s.status === 'Closed').length;
    const totalMRR = subscriptions
      .filter((s) => s.status === 'Active')
      .reduce((sum, s) => {
        let amt = s.mrrAmount || s.totalAmount || 0;
        if (s.billingCycle === 'yearly') amt = amt / 12;
        if (s.billingCycle === 'weekly') amt = amt * 4.33;
        if (s.billingCycle === 'daily') amt = amt * 30;
        return sum + amt;
      }, 0);

    return { total, active, paused, closed, totalMRR };
  }, [subscriptions]);

  // 3. INVOICE REPORT DATA
  const filteredInvoices = useMemo(() => {
    let list = [...invoices];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (i) =>
          i.customerName.toLowerCase().includes(q) ||
          i.invoiceNumber.toLowerCase().includes(q) ||
          (i.subscriptionNumber && i.subscriptionNumber.toLowerCase().includes(q))
      );
    }

    if (dateFrom) {
      list = list.filter((i) => (i.invoiceDate || i.issueDate) >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((i) => (i.invoiceDate || i.issueDate) <= dateTo);
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((i) => i.status === statusFilter);
    }

    return list.sort((a, b) => {
      let valA = sortField === 'amount' ? a.totalAmount : (a.invoiceDate || a.issueDate);
      let valB = sortField === 'amount' ? b.totalAmount : (b.invoiceDate || b.issueDate);
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [invoices, searchTerm, dateFrom, dateTo, statusFilter, sortField, sortDirection]);

  const invoiceStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = invoices.length;
    const paidCount = invoices.filter((i) => i.status === 'Paid').length;
    const totalBilled = invoices.filter((i) => i.status !== 'Cancelled').reduce((sum, i) => sum + i.totalAmount, 0);
    const totalPaid = invoices.filter((i) => i.status !== 'Cancelled').reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const totalOutstanding = invoices.filter((i) => i.status !== 'Cancelled').reduce((sum, i) => sum + (i.amountDue || 0), 0);
    const overdueCount = invoices.filter((i) => i.status !== 'Cancelled' && (i.amountDue || 0) > 0 && i.dueDate < today).length;
    const overdueAmount = invoices
      .filter((i) => i.status !== 'Cancelled' && (i.amountDue || 0) > 0 && i.dueDate < today)
      .reduce((sum, i) => sum + (i.amountDue || 0), 0);

    return { total, paidCount, totalBilled, totalPaid, totalOutstanding, overdueCount, overdueAmount };
  }, [invoices]);

  // CSV Export Handler
  const handleExportCSV = () => {
    let csvContent = '';
    let filename = '';

    if (activeTab === 'revenue') {
      filename = `Brightloop_Revenue_Report_${new Date().toISOString().split('T')[0]}.csv`;
      const headers = ['Payment Reference,Payment Date,Customer Name,Invoice Number,Payment Method,Transaction ID,Amount,Status'];
      const rows = filteredPayments.map((p) =>
        `"${p.paymentReference}","${p.paymentDate}","${p.customerName}","${p.invoiceNumber}","${p.paymentMethod}","${p.transactionReference || 'N/A'}",${p.amount},"${p.status}"`
      );
      csvContent = [headers.join('\n'), ...rows].join('\n');
    } else if (activeTab === 'subscriptions') {
      filename = `Brightloop_Subscription_Report_${new Date().toISOString().split('T')[0]}.csv`;
      const headers = ['Subscription Number,Customer Name,Plan Name,Billing Cycle,Start Date,Renewal Date,Total Amount,Status'];
      const rows = filteredSubscriptions.map((s) =>
        `"${s.subscriptionNumber}","${s.customerName}","${s.planName}","${s.billingCycle}","${s.startDate}","${s.renewalDate || s.expiryDate || 'N/A'}",${s.totalAmount},"${s.status}"`
      );
      csvContent = [headers.join('\n'), ...rows].join('\n');
    } else {
      filename = `Brightloop_Invoice_Report_${new Date().toISOString().split('T')[0]}.csv`;
      const headers = ['Invoice Number,Customer Name,Issue Date,Due Date,Total Amount,Paid Amount,Balance Due,Status'];
      const rows = filteredInvoices.map((i) =>
        `"${i.invoiceNumber}","${i.customerName}","${i.invoiceDate || i.issueDate}","${i.dueDate}",${i.totalAmount},${i.paidAmount || 0},${i.amountDue || 0},"${i.status}"`
      );
      csvContent = [headers.join('\n'), ...rows].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination slicing
  const activeList =
    activeTab === 'revenue'
      ? filteredPayments
      : activeTab === 'subscriptions'
      ? filteredSubscriptions
      : filteredInvoices;

  const totalPages = Math.ceil(activeList.length / itemsPerPage) || 1;
  const paginatedList = activeList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Financial & Subscription Reports
            </h2>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Audit-Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconciliation ledgers, revenue recognition, subscription cohort states, and receivable summaries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportCSV}
          >
            Export {activeTab === 'revenue' ? 'Revenue' : activeTab === 'subscriptions' ? 'Subscriptions' : 'Invoices'} (CSV)
          </Button>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => handleTabChange('revenue')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'revenue'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Revenue Report</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {payments.filter((p) => p.status === 'Recorded' || p.status === 'Completed').length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('subscriptions')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'subscriptions'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>Subscription Report</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {subscriptions.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('invoices')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'invoices'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Invoice Report</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {invoices.length}
          </span>
        </button>
      </div>

      {/* KPI Highlight Strip for Active Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Realized Revenue
                </span>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
                <p className="text-[11px] text-emerald-600 font-medium">From verified payment receipts</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Transactions
                </span>
                <p className="text-2xl font-bold text-slate-900">{filteredPayments.length}</p>
                <p className="text-[11px] text-slate-500 font-medium">Processed receipts</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Avg. Payment Size
                </span>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(filteredPayments.length > 0 ? totalRevenue / filteredPayments.length : 0)}
                </p>
                <p className="text-[11px] text-indigo-600 font-medium">Per processed payment</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Collection Channel
                </span>
                <p className="text-2xl font-bold text-slate-900">Multi-Method</p>
                <p className="text-[11px] text-slate-500 font-medium">UPI, Bank, Card & Cash</p>
              </CardContent>
            </Card>
          </div>

          {/* Grouped Monthly Revenue Breakdown Card */}
          <Card>
            <CardHeader
              title="Revenue Grouped by Month"
              subtitle="Realized cash receipts aggregated across billing cycles"
            />
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {monthlyRevenueGrouping.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                    <span className="text-xs font-bold text-slate-600 block">{m.month}</span>
                    <span className="text-sm font-bold text-indigo-600 mt-1 block">
                      {formatCurrency(m.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{m.count} payments</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Subscriptions
              </span>
              <p className="text-2xl font-bold text-slate-900">{subscriptionStats.total}</p>
              <p className="text-[11px] text-slate-500">Across all plans</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
                Active Subscriptions
              </span>
              <p className="text-2xl font-bold text-emerald-600">{subscriptionStats.active}</p>
              <p className="text-[11px] text-emerald-700">Currently generating MRR</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">
                Paused Subscriptions
              </span>
              <p className="text-2xl font-bold text-amber-600">{subscriptionStats.paused}</p>
              <p className="text-[11px] text-amber-700">Temporarily suspended</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">
                Closed Subscriptions
              </span>
              <p className="text-2xl font-bold text-rose-600">{subscriptionStats.closed}</p>
              <p className="text-[11px] text-rose-700">Churned or expired</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">
                Normalized MRR
              </span>
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(subscriptionStats.totalMRR)}</p>
              <p className="text-[11px] text-indigo-700">Monthly recurring base</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Invoiced
              </span>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(invoiceStats.totalBilled)}</p>
              <p className="text-[11px] text-slate-500">{invoiceStats.total} total invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
                Paid Invoices
              </span>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(invoiceStats.totalPaid)}</p>
              <p className="text-[11px] text-emerald-700">{invoiceStats.paidCount} fully paid</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">
                Outstanding Balance
              </span>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(invoiceStats.totalOutstanding)}</p>
              <p className="text-[11px] text-amber-700">Awaiting customer clearance</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">
                Overdue Invoices
              </span>
              <p className="text-2xl font-bold text-rose-600">{formatCurrency(invoiceStats.overdueAmount)}</p>
              <p className="text-[11px] text-rose-700">{invoiceStats.overdueCount} past due date</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">
                Collection Ratio
              </span>
              <p className="text-2xl font-bold text-indigo-600">
                {invoiceStats.totalBilled > 0
                  ? Math.round((invoiceStats.totalPaid / invoiceStats.totalBilled) * 100)
                  : 100}
                %
              </p>
              <p className="text-[11px] text-indigo-700">Overall clearance rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter and Search Controls */}
      <Card>
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search in ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date range filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 text-[11px]">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs rounded-md border border-slate-300 px-2 py-1 focus:border-indigo-500"
              />
              <span className="text-slate-500 text-[11px]">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs rounded-md border border-slate-300 px-2 py-1 focus:border-indigo-500"
              />
            </div>

            {/* Status / Method Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs rounded-md border border-slate-300 px-2.5 py-1 focus:border-indigo-500"
              >
                {activeTab === 'revenue' ? (
                  <>
                    <option value="ALL">All Payment Methods</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Cash">Cash</option>
                  </>
                ) : activeTab === 'subscriptions' ? (
                  <>
                    <option value="ALL">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Paused">Paused</option>
                    <option value="Closed">Closed</option>
                  </>
                ) : (
                  <>
                    <option value="ALL">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Posted">Posted</option>
                    <option value="Draft">Draft</option>
                    <option value="Cancelled">Cancelled</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase border-y border-slate-200">
              {activeTab === 'revenue' ? (
                <tr>
                  <th className="py-3 px-4">Payment Ref</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('date')}>
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('amount')}>
                    <div className="flex items-center gap-1">
                      <span>Amount</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              ) : activeTab === 'subscriptions' ? (
                <tr>
                  <th className="py-3 px-4">Subscription #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan Details</th>
                  <th className="py-3 px-4">Billing Cycle</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('date')}>
                    <div className="flex items-center gap-1">
                      <span>Start Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Next Billing</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('amount')}>
                    <div className="flex items-center gap-1">
                      <span>Recurring Amount</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              ) : (
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('date')}>
                    <div className="flex items-center gap-1">
                      <span>Issue Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('amount')}>
                    <div className="flex items-center gap-1">
                      <span>Total Billed</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No records found matching the current criteria.
                  </td>
                </tr>
              ) : activeTab === 'revenue' ? (
                (paginatedList as Payment[]).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.paymentReference}</td>
                    <td className="py-3 px-4">{formatDate(p.paymentDate)}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{p.customerName}</td>
                    <td className="py-3 px-4 text-indigo-600 font-mono">{p.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(p.amount)}</td>
                    <td className="py-3 px-4">
                      <Badge status={p.status}>{p.status}</Badge>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'subscriptions' ? (
                (paginatedList as Subscription[]).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-indigo-600 font-mono">
                      {s.subscriptionNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{s.customerName}</td>
                    <td className="py-3 px-4 text-slate-700">{s.planName}</td>
                    <td className="py-3 px-4 capitalize">{s.billingCycle}</td>
                    <td className="py-3 px-4">{formatDate(s.startDate)}</td>
                    <td className="py-3 px-4">{s.renewalDate ? formatDate(s.renewalDate) : formatDate(s.expiryDate)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(s.totalAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={s.status}>{s.status}</Badge>
                    </td>
                  </tr>
                ))
              ) : (
                (paginatedList as Invoice[]).map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-indigo-600 font-mono">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{inv.customerName}</td>
                    <td className="py-3 px-4">{formatDate(inv.invoiceDate || inv.issueDate)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          inv.dueDate < new Date().toISOString().split('T')[0] && (inv.amountDue || 0) > 0
                            ? 'text-rose-600 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {formatDate(inv.dueDate)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-emerald-600 font-medium">
                      {formatCurrency(inv.paidAmount || 0)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(inv.amountDue || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={inv.status}>{inv.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, activeList.length)} of {activeList.length} records
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
