import { useState, useEffect } from 'react';
import { DashboardService } from '../services/api';
import {
  DashboardMetricSummary,
  RevenueDataPoint,
  GrowthDataPoint,
  PaymentStatusDataPoint,
  Subscription,
  Payment,
  Invoice,
  Customer,
} from '../types';

export function useDashboardData() {
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<DashboardMetricSummary | null>(null);
  const [revenueTrends, setRevenueTrends] = useState<RevenueDataPoint[]>([]);
  const [subscriptionGrowth, setSubscriptionGrowth] = useState<GrowthDataPoint[]>([]);
  const [paymentDistribution, setPaymentDistribution] = useState<PaymentStatusDataPoint[]>([]);
  const [recentSubscriptions, setRecentSubscriptions] = useState<Subscription[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState<any[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadAllData() {
      try {
        const [
          m,
          rev,
          growth,
          payDist,
          recSubs,
          recPays,
          recInvs,
          renewals,
          overdue,
          customers,
        ] = await Promise.all([
          DashboardService.getMetrics(),
          DashboardService.getRevenueTrends(),
          DashboardService.getSubscriptionGrowth(),
          DashboardService.getPaymentDistribution(),
          DashboardService.getRecentSubscriptions(),
          DashboardService.getRecentPayments(),
          DashboardService.getRecentInvoices(),
          DashboardService.getUpcomingRenewals(),
          DashboardService.getOverdueInvoices(),
          DashboardService.getRecentCustomers(),
        ]);

        if (isMounted) {
          setMetrics(m);
          setRevenueTrends(rev);
          setSubscriptionGrowth(growth);
          setPaymentDistribution(payDist);
          setRecentSubscriptions(recSubs);
          setRecentPayments(recPays);
          setRecentInvoices(recInvs);
          setUpcomingRenewals(renewals);
          setOverdueInvoices(overdue);
          setRecentCustomers(customers);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (isMounted) setLoading(false);
      }
    }

    loadAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    loading,
    metrics,
    revenueTrends,
    subscriptionGrowth,
    paymentDistribution,
    recentSubscriptions,
    recentPayments,
    recentInvoices,
    upcomingRenewals,
    overdueInvoices,
    recentCustomers,
  };
}
