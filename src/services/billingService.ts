import { BillingHistory, Invoice } from '../types';
import { SubscriptionService } from './subscriptionService';
import { InvoiceService } from './invoiceService';
import { TaxService } from './taxService';
import { DiscountService } from './discountService';

const BILLING_HISTORY_STORAGE_KEY = 'brightloop_billing_history_v2';

export class BillingService {
  private static schedulerIntervalId: any = null;
  private static isProcessing = false;
  private static listeners: Array<(result: { processedCount: number; invoicesCreated: Invoice[] }) => void> = [];

  /**
   * Get all billing history execution records.
   */
  public static getBillingHistory(): BillingHistory[] {
    const raw = localStorage.getItem(BILLING_HISTORY_STORAGE_KEY);
    if (!raw) {
      // Seed with realistic demo billing execution logs
      const seed: BillingHistory[] = [
        {
          id: 'bh_01',
          subscriptionId: 'sub_01',
          subscriptionNumber: 'SUB-2026-1092',
          customerId: 'cust_01',
          customerName: 'Sarah Jenkins',
          companyName: 'Vertex Logic Inc.',
          invoiceId: 'inv_01',
          invoiceNumber: 'INV-2026-0819',
          billingPeriod: '2026-10-29 → 2027-10-29',
          executionDate: '2026-10-29T00:00:00Z',
          status: 'Success',
          billedAmount: 28800,
          createdAt: '2026-10-29T00:01:00Z',
        },
        {
          id: 'bh_02',
          subscriptionId: 'sub_02',
          subscriptionNumber: 'SUB-2026-1091',
          customerId: 'cust_02',
          customerName: 'Marcus Vance',
          companyName: 'Aero Dynamics Global',
          invoiceId: 'inv_02',
          invoiceNumber: 'INV-2026-0818',
          billingPeriod: '2026-10-28 → 2026-11-28',
          executionDate: '2026-10-28T00:00:00Z',
          status: 'Success',
          billedAmount: 750,
          createdAt: '2026-10-28T00:01:00Z',
        },
      ];
      localStorage.setItem(BILLING_HISTORY_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private static saveBillingHistory(history: BillingHistory[]): void {
    localStorage.setItem(BILLING_HISTORY_STORAGE_KEY, JSON.stringify(history));
  }

  public static addHistoryRecord(record: Omit<BillingHistory, 'id' | 'createdAt'>): BillingHistory {
    const history = this.getBillingHistory();
    const newRecord: BillingHistory = {
      ...record,
      id: `bh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    history.unshift(newRecord);
    this.saveBillingHistory(history);
    return newRecord;
  }

  public static clearBillingHistory(): void {
    localStorage.removeItem(BILLING_HISTORY_STORAGE_KEY);
  }

  /**
   * Subscribe to billing execution completion events.
   */
  public static subscribe(listener: (result: { processedCount: number; invoicesCreated: Invoice[] }) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notifyListeners(result: { processedCount: number; invoicesCreated: Invoice[] }): void {
    this.listeners.forEach((listener) => {
      try {
        listener(result);
      } catch (err) {
        console.error('Error in billing listener:', err);
      }
    });
  }

  /**
   * Calculate next billing / expiry date by advancing 1 cycle.
   */
  public static calculateNextBillingDate(currentDateStr: string, cycle: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
    const d = new Date(currentDateStr);
    if (cycle === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    } else if (cycle === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else if (cycle === 'daily') {
      d.setDate(d.getDate() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString().split('T')[0];
  }

  /**
   * Main Automatic Recurring Billing Engine.
   * Scans all subscriptions, detects due accounts, applies idempotent duplicate locks,
   * generates itemized invoices, computes taxes, advances next billing dates transactionally,
   * and logs complete audit history.
   */
  public static processRecurringBilling(): {
    processedCount: number;
    invoicesCreated: Invoice[];
    skippedCount: number;
    failedCount: number;
  } {
    // Prevent simultaneous/overlapping executions
    if (this.isProcessing) {
      return { processedCount: 0, invoicesCreated: [], skippedCount: 0, failedCount: 0 };
    }
    this.isProcessing = true;

    const invoicesCreated: Invoice[] = [];
    let skippedCount = 0;
    let failedCount = 0;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const allSubscriptions = SubscriptionService.getSubscriptions();

      // 1. Identify active subscriptions that are due for billing
      // Condition: status === 'Active' AND (renewalDate <= today OR expiryDate <= today)
      // Must NOT be paused or closed.
      const dueSubscriptions = allSubscriptions.filter((sub) => {
        if (sub.status !== 'Active') return false;
        const billingDate = sub.renewalDate || sub.expiryDate;
        if (!billingDate) return false;
        return billingDate <= todayStr;
      });

      for (const sub of dueSubscriptions) {
        const periodStart = sub.renewalDate || sub.expiryDate;
        const periodEnd = this.calculateNextBillingDate(periodStart, sub.billingCycle);
        const billingPeriod = `${periodStart} → ${periodEnd}`;
        const billingPeriodKey = `${sub.id}_${periodStart}_${periodEnd}`;

        // 2. Duplicate Billing Prevention & Idempotency Check:
        // Verify no invoice with billingPeriodKey already exists
        const existingInvoices = InvoiceService.getInvoices();
        const duplicateInvoice = existingInvoices.find(
          (inv) => inv.billingPeriodKey === billingPeriodKey && inv.status !== 'Cancelled'
        );

        if (duplicateInvoice) {
          skippedCount++;
          this.addHistoryRecord({
            subscriptionId: sub.id,
            subscriptionNumber: sub.subscriptionNumber,
            customerId: sub.customerId,
            customerName: sub.customerName,
            companyName: sub.companyName,
            invoiceId: duplicateInvoice.id,
            invoiceNumber: duplicateInvoice.invoiceNumber,
            billingPeriod,
            executionDate: new Date().toISOString(),
            status: 'Skipped',
            errorMessage: `Duplicate prevented: Invoice ${duplicateInvoice.invoiceNumber} already billed for period ${billingPeriod}.`,
            billedAmount: duplicateInvoice.totalAmount,
          });
          continue;
        }

        // 3. Transactional Generation of Invoice from Subscription with Discount Integration:
        try {
          let grossSubtotal = 0;
          let totalQuantity = 0;
          const productIds: string[] = [];

          if (sub.items && sub.items.length > 0) {
            sub.items.forEach((item) => {
              grossSubtotal += item.quantity * item.unitPrice;
              totalQuantity += item.quantity;
              if (item.productId) productIds.push(item.productId);
            });
          } else {
            grossSubtotal = sub.mrrAmount;
            totalQuantity = 1;
            if (sub.planId) productIds.push(sub.planId);
          }

          // Evaluate applicable discounts
          let applicableDiscountAmount = sub.discountTotal || 0;
          let matchedDiscountId: string | undefined = (sub as any).discountId;

          if (!applicableDiscountAmount) {
            const bestMatch = DiscountService.findBestEligibleDiscount({
              customerId: sub.customerId,
              subtotal: grossSubtotal,
              totalQuantity,
              productIds,
              planId: sub.planId,
            });
            if (bestMatch) {
              applicableDiscountAmount = bestMatch.result.discountAmount;
              matchedDiscountId = bestMatch.discount.id;
            }
          }

          // Map line items from subscription, resolving dynamic tax rules for each product
          const invoiceLines = (sub.items && sub.items.length > 0)
            ? sub.items.map((item, idx) => {
                const taxRate = TaxService.getTaxRateForProduct(item.productId);
                const subtotal = item.quantity * item.unitPrice;
                // Pro-rata line discount allocation if order-level discount
                const lineDiscount = grossSubtotal > 0
                  ? Math.round((subtotal / grossSubtotal) * applicableDiscountAmount * 100) / 100
                  : 0;
                const taxableAmount = Math.max(0, subtotal - lineDiscount);
                const taxAmount = TaxService.calculateTax(taxableAmount, taxRate);
                return {
                  id: `ili_${Date.now()}_${idx}`,
                  productId: item.productId,
                  productName: item.productName,
                  variantId: item.variant,
                  variantName: item.variantName || item.variant,
                  description: `${item.productName}${item.variantName ? ` (${item.variantName})` : ''} - ${sub.billingCycle} recurring service`,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  taxRate,
                  taxAmount,
                  discountAmount: lineDiscount,
                  lineTotal: taxableAmount + taxAmount,
                };
              })
            : [
                {
                  id: `ili_${Date.now()}_0`,
                  productId: sub.planId || 'prod_plan',
                  productName: sub.planName,
                  description: `${sub.planName} - ${sub.billingCycle} recurring subscription package`,
                  quantity: 1,
                  unitPrice: sub.mrrAmount,
                  taxRate: 18,
                  taxAmount: TaxService.calculateTax(Math.max(0, sub.mrrAmount - applicableDiscountAmount), 18),
                  discountAmount: applicableDiscountAmount,
                  lineTotal: Math.max(0, sub.mrrAmount - applicableDiscountAmount) + TaxService.calculateTax(Math.max(0, sub.mrrAmount - applicableDiscountAmount), 18),
                },
              ];

          // Compute due date based on payment terms
          const dueDateObj = new Date(periodStart);
          if (sub.paymentTerms?.toLowerCase().includes('15')) {
            dueDateObj.setDate(dueDateObj.getDate() + 15);
          } else if (sub.paymentTerms?.toLowerCase().includes('60')) {
            dueDateObj.setDate(dueDateObj.getDate() + 60);
          } else if (sub.paymentTerms?.toLowerCase().includes('receipt')) {
            // Due immediately
          } else {
            // Default Net 30 Days
            dueDateObj.setDate(dueDateObj.getDate() + 30);
          }
          const dueDateStr = dueDateObj.toISOString().split('T')[0];

          // Atomic invoice creation:
          const invoice = InvoiceService.createInvoice({
            customerId: sub.customerId,
            customerName: sub.customerName,
            companyName: sub.companyName,
            customerEmail: sub.customerEmail,
            subscriptionId: sub.id,
            subscriptionNumber: sub.subscriptionNumber,
            invoiceDate: periodStart,
            issueDate: periodStart,
            dueDate: dueDateStr,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            billingPeriodKey,
            items: invoiceLines,
            status: 'Confirmed', // Created and confirmed by recurring automation
            paymentTerms: sub.paymentTerms || 'Net 30 Days',
            notes: `Auto-generated recurring billing for contract ${sub.subscriptionNumber} (${billingPeriod}).${
              applicableDiscountAmount > 0 ? ` Promotional discount of $${applicableDiscountAmount} applied.` : ''
            }`,
            discountTotal: applicableDiscountAmount,
            paidAmount: 0,
          });

          // Record discount usage audit if discount was applied
          if (applicableDiscountAmount > 0 && matchedDiscountId) {
            try {
              DiscountService.recordUsage({
                discountId: matchedDiscountId,
                customerId: sub.customerId,
                customerName: sub.customerName,
                companyName: sub.companyName,
                subscriptionId: sub.id,
                subscriptionNumber: sub.subscriptionNumber,
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                originalAmount: grossSubtotal,
                discountAmount: applicableDiscountAmount,
              });
            } catch (dErr) {
              console.warn('Discount usage logging warning:', dErr);
            }
          }

          // 4. Advance Subscription Next Billing Date only AFTER invoice creation succeeds:
          SubscriptionService.updateSubscription(sub.id, {
            renewalDate: periodEnd,
            expiryDate: periodEnd,
          });

          invoicesCreated.push(invoice);

          // 5. Record successful billing history audit:
          this.addHistoryRecord({
            subscriptionId: sub.id,
            subscriptionNumber: sub.subscriptionNumber,
            customerId: sub.customerId,
            customerName: sub.customerName,
            companyName: sub.companyName,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            billingPeriod,
            executionDate: new Date().toISOString(),
            status: 'Success',
            billedAmount: invoice.totalAmount,
          });
        } catch (err: any) {
          failedCount++;
          // Transactional rollback: Do NOT update subscription billing date if invoice creation fails
          this.addHistoryRecord({
            subscriptionId: sub.id,
            subscriptionNumber: sub.subscriptionNumber,
            customerId: sub.customerId,
            customerName: sub.customerName,
            companyName: sub.companyName,
            billingPeriod,
            executionDate: new Date().toISOString(),
            status: 'Failed',
            errorMessage: err?.message || 'Invoice generation failed.',
          });
        }
      }

      const result = {
        processedCount: dueSubscriptions.length,
        invoicesCreated,
        skippedCount,
        failedCount,
      };

      if (invoicesCreated.length > 0) {
        this.notifyListeners(result);
      }

      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Initialize automated background cron/scheduler.
   * Runs recurring billing in the background every intervalMs without depending on page renders.
   */
  public static startBackgroundScheduler(intervalMs = 30000): void {
    if (this.schedulerIntervalId) return;

    // Run once immediately on start
    this.processRecurringBilling();

    this.schedulerIntervalId = setInterval(() => {
      this.processRecurringBilling();
    }, intervalMs);
  }

  public static stopBackgroundScheduler(): void {
    if (this.schedulerIntervalId) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
  }

  public static isSchedulerRunning(): boolean {
    return this.schedulerIntervalId !== null;
  }
}
