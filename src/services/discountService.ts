import { Discount, DiscountUsage } from '../types';
import { mockDiscounts, mockDiscountUsages } from './mockData';

const DISCOUNTS_STORAGE_KEY = 'brightloop_discounts_v2';
const USAGE_STORAGE_KEY = 'brightloop_discount_usages_v2';

export interface EligibilityContext {
  customerId: string;
  subtotal: number;
  totalQuantity: number;
  productIds?: string[];
  planId?: string;
  isEntireSubscription?: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  discountAmount: number;
  finalAmount: number;
}

export class DiscountService {
  /**
   * Get all discounts from persistent storage.
   */
  public static getDiscounts(): Discount[] {
    const raw = localStorage.getItem(DISCOUNTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DISCOUNTS_STORAGE_KEY, JSON.stringify(mockDiscounts));
      return mockDiscounts;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return mockDiscounts;
    }
  }

  private static saveDiscounts(discounts: Discount[]): void {
    localStorage.setItem(DISCOUNTS_STORAGE_KEY, JSON.stringify(discounts));
  }

  public static getDiscountById(id: string): Discount | undefined {
    return this.getDiscounts().find((d) => d.id === id);
  }

  public static getDiscountByCode(code: string): Discount | undefined {
    if (!code) return undefined;
    return this.getDiscounts().find((d) => d.code && d.code.trim().toUpperCase() === code.trim().toUpperCase());
  }

  /**
   * Create a new discount rule (ADMIN only).
   */
  public static createDiscount(
    data: Omit<Discount, 'id' | 'createdAt' | 'usedCount'> & { code?: string }
  ): Discount {
    const discounts = this.getDiscounts();

    // Check code uniqueness if code is provided
    if (data.code && data.code.trim()) {
      const codeUpper = data.code.trim().toUpperCase();
      const existing = discounts.find((d) => d.code && d.code.toUpperCase() === codeUpper);
      if (existing) {
        throw new Error(`Discount code "${codeUpper}" is already in use by rule "${existing.name}".`);
      }
    }

    const newDiscount: Discount = {
      ...data,
      id: `disc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      usedCount: 0,
      createdAt: new Date().toISOString(),
      type: data.discountType,
      value: data.discountValue,
      isActive: data.status === 'Active',
    };

    discounts.unshift(newDiscount);
    this.saveDiscounts(discounts);
    return newDiscount;
  }

  /**
   * Update an existing discount rule.
   */
  public static updateDiscount(id: string, updates: Partial<Discount>): Discount {
    const discounts = this.getDiscounts();
    const index = discounts.findIndex((d) => d.id === id);
    if (index === -1) throw new Error('Discount rule not found.');

    if (updates.code && updates.code.trim()) {
      const codeUpper = updates.code.trim().toUpperCase();
      const existing = discounts.find((d) => d.id !== id && d.code && d.code.toUpperCase() === codeUpper);
      if (existing) {
        throw new Error(`Discount code "${codeUpper}" is already in use by rule "${existing.name}".`);
      }
      updates.code = codeUpper;
    }

    discounts[index] = {
      ...discounts[index],
      ...updates,
      type: updates.discountType || discounts[index].discountType,
      value: updates.discountValue !== undefined ? updates.discountValue : discounts[index].discountValue,
      isActive: (updates.status || discounts[index].status) === 'Active',
      updatedAt: new Date().toISOString(),
    };

    this.saveDiscounts(discounts);
    return discounts[index];
  }

  /**
   * Toggle active/inactive status.
   */
  public static toggleDiscountStatus(id: string): Discount {
    const discounts = this.getDiscounts();
    const index = discounts.findIndex((d) => d.id === id);
    if (index === -1) throw new Error('Discount rule not found.');

    const newStatus = discounts[index].status === 'Active' ? 'Inactive' : 'Active';
    discounts[index].status = newStatus;
    discounts[index].isActive = newStatus === 'Active';
    discounts[index].updatedAt = new Date().toISOString();

    this.saveDiscounts(discounts);
    return discounts[index];
  }

  /**
   * Delete an eligible discount rule (Admin only).
   */
  public static deleteDiscount(id: string): void {
    const discounts = this.getDiscounts();
    const target = discounts.find((d) => d.id === id);
    if (!target) return;

    if (target.usedCount > 0) {
      throw new Error(`Cannot delete discount "${target.name}" because it has already been used ${target.usedCount} times. Please deactivate it instead.`);
    }

    const filtered = discounts.filter((d) => d.id !== id);
    this.saveDiscounts(filtered);
  }

  // --- DISCOUNT USAGE HISTORY & AUDITING ---

  public static getUsageHistory(): DiscountUsage[] {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(mockDiscountUsages));
      return mockDiscountUsages;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return mockDiscountUsages;
    }
  }

  private static saveUsageHistory(usages: DiscountUsage[]): void {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usages));
  }

  /**
   * Record discount application and increment used counts atomically.
   */
  public static recordUsage(params: {
    discountId: string;
    customerId: string;
    customerName: string;
    companyName?: string;
    subscriptionId?: string;
    subscriptionNumber?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    originalAmount: number;
    discountAmount: number;
  }): DiscountUsage {
    const usages = this.getUsageHistory();

    // Idempotency: Prevent duplicate usage logging for the same invoice
    if (params.invoiceId) {
      const existing = usages.find((u) => u.invoiceId === params.invoiceId && u.discountId === params.discountId);
      if (existing) {
        return existing;
      }
    }

    const discount = this.getDiscountById(params.discountId);
    if (!discount) throw new Error('Discount not found for recording usage.');

    const finalAmount = Math.max(0, params.originalAmount - params.discountAmount);

    const newUsage: DiscountUsage = {
      id: `du_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      discountId: discount.id,
      discountName: discount.name,
      discountCode: discount.code,
      customerId: params.customerId,
      customerName: params.customerName,
      companyName: params.companyName,
      subscriptionId: params.subscriptionId,
      subscriptionNumber: params.subscriptionNumber,
      invoiceId: params.invoiceId,
      invoiceNumber: params.invoiceNumber,
      originalAmount: params.originalAmount,
      discountAmount: params.discountAmount,
      finalAmount,
      appliedAt: new Date().toISOString(),
      status: 'Applied',
    };

    usages.unshift(newUsage);
    this.saveUsageHistory(usages);

    // Atomically increment discount rule used count
    const discounts = this.getDiscounts();
    const dIndex = discounts.findIndex((d) => d.id === discount.id);
    if (dIndex !== -1) {
      discounts[dIndex].usedCount = (discounts[dIndex].usedCount || 0) + 1;
      discounts[dIndex].updatedAt = new Date().toISOString();
      this.saveDiscounts(discounts);
    }

    return newUsage;
  }

  public static clearUsageHistory(): void {
    localStorage.removeItem(USAGE_STORAGE_KEY);
  }

  // --- REUSABLE DISCOUNT ELIGIBILITY & CALCULATION ENGINE ---

  /**
   * Comprehensive validation and eligibility checking:
   * 1. Active status check
   * 2. Start date check (scheduled check)
   * 3. End date check (expiration check)
   * 4. Overall usage limit (maximumUses)
   * 5. Per-customer usage limit (maximumUsesPerCustomer)
   * 6. Minimum purchase amount requirement
   * 7. Minimum quantity requirement
   * 8. Applicable product constraint
   * 9. Applicable plan constraint
   */
  public static evaluateEligibility(
    discount: Discount,
    context: EligibilityContext
  ): EligibilityResult {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Inactive check
    if (discount.status !== 'Active' && !discount.isActive) {
      return {
        eligible: false,
        reason: `Discount "${discount.name}" is currently inactive.`,
        discountAmount: 0,
        finalAmount: context.subtotal,
      };
    }

    // 2. Validity start date check
    if (todayStr < discount.startDate) {
      return {
        eligible: false,
        reason: `Discount is scheduled and will become valid on ${discount.startDate}.`,
        discountAmount: 0,
        finalAmount: context.subtotal,
      };
    }

    // 3. Expiration date check
    if (todayStr > discount.endDate) {
      return {
        eligible: false,
        reason: `Discount expired on ${discount.endDate}.`,
        discountAmount: 0,
        finalAmount: context.subtotal,
      };
    }

    // 4. Overall usage limit check
    const maxUses = discount.maximumUses || discount.usageLimit;
    if (maxUses && discount.usedCount >= maxUses) {
      return {
        eligible: false,
        reason: `Discount has reached its total usage limit of ${maxUses} redemptions.`,
        discountAmount: 0,
        finalAmount: context.subtotal,
      };
    }

    // 5. Per-customer usage limit check
    if (discount.maximumUsesPerCustomer && context.customerId) {
      const history = this.getUsageHistory();
      const customerUses = history.filter(
        (u) => u.discountId === discount.id && u.customerId === context.customerId && u.status === 'Applied'
      ).length;

      if (customerUses >= discount.maximumUsesPerCustomer) {
        return {
          eligible: false,
          reason: `You have reached the maximum allowed redemption limit (${discount.maximumUsesPerCustomer}) for this coupon.`,
          discountAmount: 0,
          finalAmount: context.subtotal,
        };
      }
    }

    // 6. Minimum purchase requirement
    const minPurchase = discount.minimumPurchase || discount.minPurchaseAmount || 0;
    if (context.subtotal < minPurchase) {
      return {
        eligible: false,
        reason: `Order subtotal ($${context.subtotal.toLocaleString()}) does not meet the minimum purchase requirement of $${minPurchase.toLocaleString()}.`,
        discountAmount: 0,
        finalAmount: context.subtotal,
      };
    }

    // 7. Minimum quantity requirement
    const minQty = discount.minimumQuantity || discount.minPurchaseQuantity || 1;
    if (context.totalQuantity < minQty) {
      return {
        eligible: false,
        reason: `Order quantity (${context.totalQuantity}) does not satisfy the minimum requirement of ${minQty} items/seats.`,
        discountAmount: 0,
        finalAmount: context.subtotal,
      };
    }

    // 8. Applicable product constraint check
    if (discount.applicableProductIds && discount.applicableProductIds.length > 0) {
      if (!context.productIds || context.productIds.length === 0) {
        return {
          eligible: false,
          reason: `This discount applies only to designated product lines.`,
          discountAmount: 0,
          finalAmount: context.subtotal,
        };
      }
      const hasMatchingProduct = context.productIds.some((pId) => discount.applicableProductIds!.includes(pId));
      if (!hasMatchingProduct) {
        return {
          eligible: false,
          reason: `None of the selected products qualify for this discount rule.`,
          discountAmount: 0,
          finalAmount: context.subtotal,
        };
      }
    }

    // 9. Applicable plan constraint check
    if (discount.applicablePlanIds && discount.applicablePlanIds.length > 0) {
      if (!context.planId || !discount.applicablePlanIds.includes(context.planId)) {
        return {
          eligible: false,
          reason: `This promotion is not eligible for the selected subscription plan tier.`,
          discountAmount: 0,
          finalAmount: context.subtotal,
        };
      }
    }

    // 10. Accurate Mathematical Discount Calculation:
    let discountAmount = 0;
    const type = discount.discountType || discount.type || 'percentage';
    const val = discount.discountValue !== undefined ? discount.discountValue : (discount.value || 0);

    if (type === 'percentage') {
      // Percentage calculation: subtotal * (value / 100)
      const pct = Math.min(100, Math.max(0, val));
      discountAmount = Math.round(((context.subtotal * pct) / 100) * 100) / 100;
    } else {
      // Fixed amount calculation: min(subtotal, value)
      discountAmount = Math.min(context.subtotal, Math.max(0, val));
    }

    const finalAmount = Math.max(0, context.subtotal - discountAmount);

    return {
      eligible: true,
      discountAmount,
      finalAmount,
    };
  }

  /**
   * Helper to find and evaluate the best eligible discount rule for a subscription.
   */
  public static findBestEligibleDiscount(context: EligibilityContext): { discount: Discount; result: EligibilityResult } | null {
    const activeDiscounts = this.getDiscounts().filter((d) => d.status === 'Active' || d.isActive);
    let best: { discount: Discount; result: EligibilityResult } | null = null;

    for (const d of activeDiscounts) {
      const evaluation = this.evaluateEligibility(d, context);
      if (evaluation.eligible && evaluation.discountAmount > 0) {
        if (!best || evaluation.discountAmount > best.result.discountAmount) {
          best = { discount: d, result: evaluation };
        }
      }
    }

    return best;
  }
}
