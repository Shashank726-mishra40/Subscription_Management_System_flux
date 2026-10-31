import { Subscription, SubscriptionStatus, Quotation } from '../types';
import { mockRecentSubscriptions } from './mockData';

const SUBS_STORAGE_KEY = 'brightloop_subscriptions_v2';

export class SubscriptionService {
  public static getSubscriptions(): Subscription[] {
    const raw = localStorage.getItem(SUBS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SUBS_STORAGE_KEY, JSON.stringify(mockRecentSubscriptions));
      return mockRecentSubscriptions;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return mockRecentSubscriptions;
    }
  }

  private static saveSubscriptions(subs: Subscription[]): void {
    localStorage.setItem(SUBS_STORAGE_KEY, JSON.stringify(subs));
  }

  public static getSubscriptionById(id: string): Subscription | undefined {
    return this.getSubscriptions().find((s) => s.id === id);
  }

  public static createSubscription(data: Omit<Subscription, 'id' | 'subscriptionNumber' | 'createdAt'>): Subscription {
    const subs = this.getSubscriptions();
    const subNumber = `SUB-2026-${(1093 + subs.length).toString()}`;

    const newSub: Subscription = {
      ...data,
      id: `sub_${Date.now()}`,
      subscriptionNumber: subNumber,
      createdAt: new Date().toISOString(),
    };

    subs.unshift(newSub);
    this.saveSubscriptions(subs);
    return newSub;
  }

  public static createSubscriptionFromQuotation(quotation: Quotation): Subscription {
    const subs = this.getSubscriptions();
    const subNumber = `SUB-2026-${(1093 + subs.length).toString()}`;

    // Map quotation line items to subscription line items
    const subItems = quotation.items.map((item) => ({
      id: `sli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: item.productId,
      productName: item.productName,
      variant: item.variantName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      subtotal: item.quantity * item.unitPrice,
      total: item.lineTotal,
    }));

    // Calculate start & expiry dates based on cycle
    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const expiry = new Date(now);
    const billingCycle = quotation.items[0]?.planName?.toLowerCase().includes('year') ? 'yearly' : 'monthly';

    if (billingCycle === 'yearly') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }
    const expiryDate = expiry.toISOString().split('T')[0];

    const mrrAmount = billingCycle === 'yearly'
      ? Math.round(quotation.totalAmount / 12)
      : quotation.totalAmount;

    const newSub: Subscription = {
      id: `sub_${Date.now()}`,
      subscriptionNumber: subNumber,
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      companyName: quotation.companyName,
      customerEmail: quotation.customerEmail,
      planId: quotation.items[0]?.planId || 'plan_custom',
      planName: quotation.items[0]?.planName || quotation.planName || 'Custom Offer Suite',
      status: 'Confirmed', // Promoted to Confirmed upon quote conversion!
      startDate,
      expiryDate,
      renewalDate: expiryDate,
      billingCycle: billingCycle as any,
      paymentTerms: 'Net 30 Days',
      items: subItems,
      mrrAmount,
      subtotal: quotation.subtotal,
      taxTotal: quotation.taxTotal,
      discountTotal: quotation.discountTotal,
      totalAmount: quotation.totalAmount,
      autoRenew: true,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      createdAt: new Date().toISOString(),
    };

    subs.unshift(newSub);
    this.saveSubscriptions(subs);
    return newSub;
  }

  // --- Subscription Lifecycle State Transitions ---

  public static transitionStatus(id: string, newStatus: SubscriptionStatus): Subscription {
    const subs = this.getSubscriptions();
    const index = subs.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Subscription not found.');

    subs[index] = {
      ...subs[index],
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    this.saveSubscriptions(subs);
    return subs[index];
  }

  public static renewSubscription(id: string): Subscription {
    const subs = this.getSubscriptions();
    const index = subs.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Subscription not found.');

    const sub = subs[index];
    const currentExpiry = new Date(sub.expiryDate || sub.renewalDate);
    const newExpiry = new Date(currentExpiry);

    if (sub.billingCycle === 'yearly') {
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    } else if (sub.billingCycle === 'weekly') {
      newExpiry.setDate(newExpiry.getDate() + 7);
    } else if (sub.billingCycle === 'daily') {
      newExpiry.setDate(newExpiry.getDate() + 1);
    } else {
      newExpiry.setMonth(newExpiry.getMonth() + 1);
    }

    const nextDateStr = newExpiry.toISOString().split('T')[0];

    subs[index] = {
      ...sub,
      status: 'Active',
      expiryDate: nextDateStr,
      renewalDate: nextDateStr,
      updatedAt: new Date().toISOString(),
    };

    this.saveSubscriptions(subs);
    return subs[index];
  }

  public static toggleAutoRenew(id: string): Subscription {
    const subs = this.getSubscriptions();
    const index = subs.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Subscription not found.');

    subs[index].autoRenew = !subs[index].autoRenew;
    subs[index].updatedAt = new Date().toISOString();

    this.saveSubscriptions(subs);
    return subs[index];
  }

  public static updateSubscription(id: string, updates: Partial<Subscription>): Subscription {
    const subs = this.getSubscriptions();
    const index = subs.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Subscription not found.');

    subs[index] = {
      ...subs[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveSubscriptions(subs);
    return subs[index];
  }

  public static deleteSubscription(id: string): void {
    const subs = this.getSubscriptions();
    const filtered = subs.filter((s) => s.id !== id);
    this.saveSubscriptions(filtered);
  }
}
