import { SubscriptionService } from './subscriptionService';
import { InvoiceService } from './invoiceService';
import { PaymentService } from './paymentService';
import { Subscription, Invoice, Payment, BillingCycle, SubscriptionStatus, InvoiceStatus } from '../types';
import { mockRecentCustomers } from './mockData';

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  subscriptionStatus?: 'ALL' | SubscriptionStatus;
  invoiceStatus?: 'ALL' | InvoiceStatus;
  billingPeriod?: 'ALL' | BillingCycle;
}

export interface MonthlyRevenuePoint {
  month: string; // e.g. "May 2026"
  monthKey: string; // "2026-05"
  revenue: number;
  paymentsCount: number;
}

export interface StatusDistributionPoint {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface AgingBucketPoint {
  label: string;
  count: number;
  amount: number;
  color: string;
}

export interface FinanceKPISummary {
  totalActiveSubscriptions: number;
  totalRevenueReceived: number;
  totalOutstandingAmount: number;
  totalOverdueInvoicesCount: number;
  totalOverdueAmount: number;
  mrr: number;
  totalCustomersCount: number;
  collectionRate: number; // percentage
  totalInvoicedAmount: number;
  paidInvoicesCount: number;
  partiallyPaidCount: number;
}

export interface FinanceDashboardAnalytics {
  kpis: FinanceKPISummary;
  revenueTrends: MonthlyRevenuePoint[];
  subscriptionDistribution: StatusDistributionPoint[];
  cadenceDistribution: StatusDistributionPoint[];
  paidVsOutstanding: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
  };
  overdueAging: AgingBucketPoint[];
  recentSubscriptions: Subscription[];
  recentPayments: Payment[];
  recentInvoices: Invoice[];
  overdueInvoicesList: Invoice[];
}

export class AnalyticsService {
  public static getDashboardAnalytics(filters: DashboardFilters = {}): FinanceDashboardAnalytics {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // 1. Fetch raw data from persistent services
    let allSubs = SubscriptionService.getSubscriptions();
    let allInvs = InvoiceService.getInvoices();
    let allPays = PaymentService.getPayments();

    // 2. Apply Filters
    // Date Range
    if (filters.dateFrom) {
      allSubs = allSubs.filter((s) => s.startDate >= filters.dateFrom!);
      allInvs = allInvs.filter((i) => (i.invoiceDate || i.issueDate) >= filters.dateFrom!);
      allPays = allPays.filter((p) => p.paymentDate >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      allSubs = allSubs.filter((s) => s.startDate <= filters.dateTo!);
      allInvs = allInvs.filter((i) => (i.invoiceDate || i.issueDate) <= filters.dateTo!);
      allPays = allPays.filter((p) => p.paymentDate <= filters.dateTo!);
    }

    // Subscription Status filter
    if (filters.subscriptionStatus && filters.subscriptionStatus !== 'ALL') {
      allSubs = allSubs.filter((s) => s.status === filters.subscriptionStatus);
    }

    // Invoice Status filter
    if (filters.invoiceStatus && filters.invoiceStatus !== 'ALL') {
      allInvs = allInvs.filter((i) => i.status === filters.invoiceStatus);
    }

    // Billing Period filter
    if (filters.billingPeriod && filters.billingPeriod !== 'ALL') {
      allSubs = allSubs.filter((s) => s.billingCycle === filters.billingPeriod);
    }

    // 3. Compute Core KPIs
    const activeSubs = allSubs.filter((s) => s.status === 'Active' || s.status === 'Confirmed');
    const totalActiveSubscriptions = activeSubs.length;

    // Realized Revenue: Strictly recorded or completed payments
    const verifiedPayments = allPays.filter(
      (p) => p.status === 'Recorded' || (p.status as string) === 'Completed'
    );
    const totalRevenueReceived = verifiedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Outstanding Balance: sum of unpaid balances across non-cancelled invoices
    let totalOutstandingAmount = 0;
    let totalOverdueAmount = 0;
    let totalOverdueInvoicesCount = 0;
    let paidInvoicesCount = 0;
    let partiallyPaidCount = 0;
    let totalInvoicedAmount = 0;
    const overdueInvoicesList: Invoice[] = [];

    allInvs.forEach((inv) => {
      if (inv.status === 'Cancelled') return;

      totalInvoicedAmount += inv.totalAmount;
      const bal = inv.amountDue ?? (inv.totalAmount - inv.paidAmount);

      if (bal > 0) {
        totalOutstandingAmount += bal;
        const isPastDue = inv.dueDate < todayStr;
        if (isPastDue || inv.status === 'Overdue') {
          totalOverdueAmount += bal;
          totalOverdueInvoicesCount++;
          overdueInvoicesList.push(inv);
        }
      }

      if (inv.status === 'Paid') {
        paidInvoicesCount++;
      } else if (inv.status === 'Partially Paid') {
        partiallyPaidCount++;
      }
    });

    const mrr = activeSubs.reduce((sum, s) => sum + (s.mrrAmount || 0), 0);
    const totalCustomersCount = mockRecentCustomers.length;
    const collectionRate =
      totalRevenueReceived + totalOutstandingAmount > 0
        ? Math.round((totalRevenueReceived / (totalRevenueReceived + totalOutstandingAmount)) * 1000) / 10
        : 100;

    const kpis: FinanceKPISummary = {
      totalActiveSubscriptions,
      totalRevenueReceived: Math.round(totalRevenueReceived * 100) / 100,
      totalOutstandingAmount: Math.round(totalOutstandingAmount * 100) / 100,
      totalOverdueInvoicesCount,
      totalOverdueAmount: Math.round(totalOverdueAmount * 100) / 100,
      mrr: Math.round(mrr * 100) / 100,
      totalCustomersCount,
      collectionRate,
      totalInvoicedAmount: Math.round(totalInvoicedAmount * 100) / 100,
      paidInvoicesCount,
      partiallyPaidCount,
    };

    // 4. Visualization 1: Revenue Overview Over Time (Monthly Groups from Verified Payments)
    const monthMap: Record<string, { month: string; monthKey: string; revenue: number; count: number }> = {};
    
    // Seed last 6 calendar months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthMap[key] = { month: monthName, monthKey: key, revenue: 0, count: 0 };
    }

    verifiedPayments.forEach((p) => {
      const pDate = p.paymentDate || p.createdAt;
      if (!pDate) return;
      const key = pDate.substring(0, 7);
      if (monthMap[key]) {
        monthMap[key].revenue += p.amount;
        monthMap[key].count += 1;
      } else {
        const d = new Date(pDate);
        if (!isNaN(d.getTime())) {
          const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          monthMap[key] = { month: monthName, monthKey: key, revenue: p.amount, count: 1 };
        }
      }
    });

    const revenueTrends: MonthlyRevenuePoint[] = Object.keys(monthMap)
      .sort()
      .map((k) => ({
        month: monthMap[k].month,
        monthKey: monthMap[k].monthKey,
        revenue: Math.round(monthMap[k].revenue * 100) / 100,
        paymentsCount: monthMap[k].count,
      }));

    // 5. Visualization 2: Active Subscription Overview (Status & Cadence distribution)
    const totalSubsCount = allSubs.length || 1;
    const statusCounts: Record<string, { count: number; color: string }> = {
      Active: { count: 0, color: '#10b981' },
      Confirmed: { count: 0, color: '#6366f1' },
      Paused: { count: 0, color: '#f59e0b' },
      Closed: { count: 0, color: '#94a3b8' },
      Draft: { count: 0, color: '#cbd5e1' },
    };

    allSubs.forEach((s) => {
      const st = s.status || 'Draft';
      if (statusCounts[st]) {
        statusCounts[st].count++;
      } else {
        statusCounts[st] = { count: 1, color: '#64748b' };
      }
    });

    const subscriptionDistribution: StatusDistributionPoint[] = Object.keys(statusCounts)
      .filter((k) => statusCounts[k].count > 0)
      .map((k) => ({
        status: k,
        count: statusCounts[k].count,
        percentage: Math.round((statusCounts[k].count / totalSubsCount) * 100),
        color: statusCounts[k].color,
      }));

    // Cadence breakdown
    const cadenceCounts: Record<string, { count: number; color: string }> = {
      monthly: { count: 0, color: '#4f46e5' },
      yearly: { count: 0, color: '#06b6d4' },
      weekly: { count: 0, color: '#8b5cf6' },
      daily: { count: 0, color: '#f43f5e' },
    };
    allSubs.forEach((s) => {
      const c = s.billingCycle || 'monthly';
      if (cadenceCounts[c]) cadenceCounts[c].count++;
    });
    const cadenceDistribution: StatusDistributionPoint[] = Object.keys(cadenceCounts).map((k) => ({
      status: k.charAt(0).toUpperCase() + k.slice(1),
      count: cadenceCounts[k].count,
      percentage: Math.round((cadenceCounts[k].count / totalSubsCount) * 100),
      color: cadenceCounts[k].color,
    }));

    // 6. Visualization 3: Paid vs Outstanding Invoice Summary
    const paidVsOutstanding = {
      totalInvoiced: Math.round(totalInvoicedAmount * 100) / 100,
      totalCollected: Math.round(totalRevenueReceived * 100) / 100,
      totalOutstanding: Math.round(totalOutstandingAmount * 100) / 100,
    };

    // 7. Visualization 4: Overdue Invoice Summary by Aging Buckets
    const agingBuckets = {
      '1-15 Days': { count: 0, amount: 0, color: '#fbbf24' },
      '16-30 Days': { count: 0, amount: 0, color: '#f97316' },
      '31-60 Days': { count: 0, amount: 0, color: '#ef4444' },
      '>60 Days': { count: 0, amount: 0, color: '#b91c1c' },
    };

    overdueInvoicesList.forEach((inv) => {
      const d = new Date(inv.dueDate);
      const diffDays = Math.max(1, Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
      const bal = inv.amountDue ?? (inv.totalAmount - inv.paidAmount);

      if (diffDays <= 15) {
        agingBuckets['1-15 Days'].count++;
        agingBuckets['1-15 Days'].amount += bal;
      } else if (diffDays <= 30) {
        agingBuckets['16-30 Days'].count++;
        agingBuckets['16-30 Days'].amount += bal;
      } else if (diffDays <= 60) {
        agingBuckets['31-60 Days'].count++;
        agingBuckets['31-60 Days'].amount += bal;
      } else {
        agingBuckets['>60 Days'].count++;
        agingBuckets['>60 Days'].amount += bal;
      }
    });

    const overdueAging: AgingBucketPoint[] = Object.keys(agingBuckets).map((k) => ({
      label: k,
      count: (agingBuckets as any)[k].count,
      amount: Math.round((agingBuckets as any)[k].amount * 100) / 100,
      color: (agingBuckets as any)[k].color,
    }));

    return {
      kpis,
      revenueTrends,
      subscriptionDistribution,
      cadenceDistribution,
      paidVsOutstanding,
      overdueAging,
      recentSubscriptions: allSubs.slice(0, 5),
      recentPayments: verifiedPayments.slice(0, 5),
      recentInvoices: allInvs.slice(0, 5),
      overdueInvoicesList: overdueInvoicesList.slice(0, 5),
    };
  }
}
