import {
  mockDashboardMetrics,
  mockRevenueTrends,
  mockSubscriptionGrowth,
  mockPaymentStatusDistribution,
  mockRecentSubscriptions,
  mockRecentPayments,
  mockRecentInvoices,
  mockUpcomingRenewals,
  mockOverdueInvoicesList,
  mockRecentCustomers,
  mockPlans,
  mockProducts,
  mockQuotations,
  mockDiscounts,
} from './mockData';

// Simulated delay to mimic real network latency for async components if needed
const delay = (ms: number = 200) => new Promise((resolve) => setTimeout(resolve, ms));

export const DashboardService = {
  async getMetrics() {
    await delay(100);
    return mockDashboardMetrics;
  },

  async getRevenueTrends() {
    await delay(100);
    return mockRevenueTrends;
  },

  async getSubscriptionGrowth() {
    await delay(100);
    return mockSubscriptionGrowth;
  },

  async getPaymentDistribution() {
    await delay(100);
    return mockPaymentStatusDistribution;
  },

  async getRecentSubscriptions() {
    await delay(100);
    return mockRecentSubscriptions;
  },

  async getRecentPayments() {
    await delay(100);
    return mockRecentPayments;
  },

  async getRecentInvoices() {
    await delay(100);
    return mockRecentInvoices;
  },

  async getUpcomingRenewals() {
    await delay(100);
    return mockUpcomingRenewals;
  },

  async getOverdueInvoices() {
    await delay(100);
    return mockOverdueInvoicesList;
  },

  async getRecentCustomers() {
    await delay(100);
    return mockRecentCustomers;
  },

  async getAllPlans() {
    await delay(100);
    return mockPlans;
  },

  async getAllProducts() {
    await delay(100);
    return mockProducts;
  },

  async getAllQuotations() {
    await delay(100);
    return mockQuotations;
  },

  async getAllDiscounts() {
    await delay(100);
    return mockDiscounts;
  },
};
