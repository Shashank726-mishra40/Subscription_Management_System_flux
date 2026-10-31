import { Invoice, InvoiceLine, InvoiceStatus } from '../types';
import { mockRecentInvoices } from './mockData';
import { TaxService } from './taxService';

const INVOICE_STORAGE_KEY = 'brightloop_invoices_v2';

export class InvoiceService {
  /**
   * Retrieve all invoices from persistent storage with automatic overdue evaluation.
   */
  public static getInvoices(): Invoice[] {
    const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
    let invoices: Invoice[] = [];

    if (!raw) {
      invoices = mockRecentInvoices;
      localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(invoices));
    } else {
      try {
        invoices = JSON.parse(raw);
      } catch {
        invoices = mockRecentInvoices;
      }
    }

    // Automatically identify overdue invoices:
    // If dueDate has passed, not Paid/Cancelled, and outstanding amount > 0
    const todayStr = new Date().toISOString().split('T')[0];
    let hasChanges = false;

    const evaluated = invoices.map((inv) => {
      const isPastDue = inv.dueDate < todayStr;
      const hasBalance = (inv.amountDue ?? inv.outstandingAmount ?? (inv.totalAmount - inv.paidAmount)) > 0;

      if (isPastDue && hasBalance && inv.status !== 'Paid' && inv.status !== 'Cancelled' && inv.status !== 'Overdue') {
        hasChanges = true;
        return {
          ...inv,
          status: 'Overdue' as InvoiceStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return inv;
    });

    if (hasChanges) {
      this.saveInvoices(evaluated);
      return evaluated;
    }

    return invoices;
  }

  private static saveInvoices(invoices: Invoice[]): void {
    localStorage.setItem(INVOICE_STORAGE_KEY, JSON.stringify(invoices));
  }

  public static getInvoiceById(id: string): Invoice | undefined {
    return this.getInvoices().find((i) => i.id === id);
  }

  public static getInvoiceByNumber(invoiceNumber: string): Invoice | undefined {
    return this.getInvoices().find((i) => i.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase());
  }

  /**
   * Generate next sequential Invoice Number: INV-2026-XXXX
   */
  public static generateInvoiceNumber(): string {
    const invoices = this.getInvoices();
    const nextSeq = 820 + invoices.length;
    return `INV-2026-${nextSeq.toString().padStart(4, '0')}`;
  }

  /**
   * Create a new invoice with atomic calculations and duplicate prevention check.
   */
  public static createInvoice(
    data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'subtotal' | 'taxTotal' | 'totalAmount' | 'amountDue'> & {
      items: InvoiceLine[];
      invoiceNumber?: string;
    }
  ): Invoice {
    const invoices = this.getInvoices();

    // Idempotency check: if billingPeriodKey already exists, prevent duplicate
    if (data.billingPeriodKey) {
      const existing = invoices.find((i) => i.billingPeriodKey === data.billingPeriodKey && i.status !== 'Cancelled');
      if (existing) {
        throw new Error(
          `Duplicate invoice detected: An active invoice (${existing.invoiceNumber}) already exists for this billing period key (${data.billingPeriodKey}).`
        );
      }
    }

    // Calculate itemized lines and totals
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = data.discountTotal || 0;

    const processedItems = data.items.map((item, idx) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const rate = item.taxRate !== undefined ? item.taxRate : TaxService.getTaxRateForProduct(item.productId);
      const taxAmount = TaxService.calculateTax(lineSubtotal, rate);
      const lineTotal = lineSubtotal + taxAmount - (item.discountAmount || 0);

      subtotal += lineSubtotal;
      taxTotal += taxAmount;

      return {
        ...item,
        id: item.id || `ili_${Date.now()}_${idx}`,
        taxRate: rate,
        taxAmount,
        lineTotal,
      };
    });

    const totalAmount = Math.max(0, subtotal + taxTotal - discountTotal);
    const paidAmount = data.paidAmount || 0;
    const amountDue = Math.max(0, totalAmount - paidAmount);

    const invoiceNumber = data.invoiceNumber || this.generateInvoiceNumber();
    const nowIso = new Date().toISOString();

    const newInvoice: Invoice = {
      ...data,
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber,
      invoiceDate: data.invoiceDate || nowIso.split('T')[0],
      issueDate: data.invoiceDate || nowIso.split('T')[0],
      dueDate: data.dueDate,
      items: processedItems,
      subtotal,
      taxTotal,
      discountTotal,
      totalAmount,
      grandTotal: totalAmount,
      paidAmount,
      amountDue,
      outstandingAmount: amountDue,
      status: data.status || 'Draft',
      createdAt: nowIso,
    };

    invoices.unshift(newInvoice);
    this.saveInvoices(invoices);
    return newInvoice;
  }

  /**
   * Confirm an invoice (moves from Draft to Confirmed).
   */
  public static confirmInvoice(id: string): Invoice {
    const invoices = this.getInvoices();
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Invoice not found.');

    invoices[index] = {
      ...invoices[index],
      status: 'Confirmed',
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveInvoices(invoices);
    return invoices[index];
  }

  /**
   * Send an invoice to the customer (moves to Sent status).
   */
  public static sendInvoice(id: string): Invoice {
    const invoices = this.getInvoices();
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Invoice not found.');

    invoices[index] = {
      ...invoices[index],
      status: 'Sent',
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveInvoices(invoices);
    return invoices[index];
  }

  /**
   * Cancel an eligible invoice.
   * A cancelled invoice must NOT be treated as outstanding revenue (amountDue & outstandingAmount = 0).
   */
  public static cancelInvoice(id: string, reason?: string): Invoice {
    const invoices = this.getInvoices();
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Invoice not found.');

    if (invoices[index].status === 'Paid') {
      throw new Error('A fully paid invoice cannot be cancelled.');
    }

    invoices[index] = {
      ...invoices[index],
      status: 'Cancelled',
      amountDue: 0,
      outstandingAmount: 0,
      notes: reason ? `${invoices[index].notes ? invoices[index].notes + ' | ' : ''}Cancelled: ${reason}` : invoices[index].notes,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveInvoices(invoices);
    return invoices[index];
  }

  /**
   * Record a payment against an invoice.
   */
  public static recordPayment(id: string, paymentAmount: number): Invoice {
    const invoices = this.getInvoices();
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Invoice not found.');

    const inv = invoices[index];
    const newPaid = Math.min(inv.totalAmount, inv.paidAmount + paymentAmount);
    const newOutstanding = Math.max(0, inv.totalAmount - newPaid);

    let newStatus: InvoiceStatus = inv.status;
    if (newOutstanding === 0) {
      newStatus = 'Paid';
    } else if (newPaid > 0) {
      newStatus = 'Partially Paid';
    }

    invoices[index] = {
      ...inv,
      paidAmount: newPaid,
      amountDue: newOutstanding,
      outstandingAmount: newOutstanding,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    this.saveInvoices(invoices);
    return invoices[index];
  }

  /**
   * Update arbitrary invoice fields.
   */
  public static updateInvoice(id: string, updates: Partial<Invoice>): Invoice {
    const invoices = this.getInvoices();
    const index = invoices.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Invoice not found.');

    invoices[index] = {
      ...invoices[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.saveInvoices(invoices);
    return invoices[index];
  }

  /**
   * Delete draft or cancelled invoice.
   */
  public static deleteInvoice(id: string): void {
    const invoices = this.getInvoices();
    const target = invoices.find((i) => i.id === id);
    if (!target) return;

    if (target.status !== 'Draft' && target.status !== 'Cancelled') {
      throw new Error(`Cannot delete an invoice in ${target.status} status. Only Draft or Cancelled invoices can be deleted.`);
    }

    const filtered = invoices.filter((i) => i.id !== id);
    this.saveInvoices(filtered);
  }
}
