import { Payment, PaymentStatus, FollowUpNote, Invoice } from '../types';
import { mockRecentPayments } from './mockData';
import { InvoiceService } from './invoiceService';

const PAYMENTS_STORAGE_KEY = 'brightloop_payments_v2';
const FOLLOWUPS_STORAGE_KEY = 'brightloop_payment_followups_v2';

export interface RecordPaymentParams {
  customerId: string;
  customerName?: string;
  companyName?: string;
  invoiceId: string;
  invoiceNumber?: string;
  subscriptionId?: string;
  subscriptionNumber?: string;
  amount: number;
  paymentDate: string;
  method: Payment['method'];
  transactionReference: string;
  status?: PaymentStatus;
  notes?: string;
  recordedBy?: string;
  allowAdvance?: boolean;
}

export interface PaymentSummary {
  totalReceived: number;
  totalOutstanding: number;
  totalOverdue: number;
  partiallyPaidCount: number;
  fullyPaidCount: number;
  totalPaymentsCount: number;
}

export interface OutstandingInvoiceItem {
  invoice: Invoice;
  daysOverdue: number;
  isOverdue: boolean;
}

export class PaymentService {
  /**
   * Fetch all payments from persistent storage.
   */
  public static getPayments(): Payment[] {
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(mockRecentPayments));
      return mockRecentPayments;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return mockRecentPayments;
    }
  }

  public static savePayments(payments: Payment[]): void {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
  }

  public static getPaymentById(id: string): Payment | undefined {
    return this.getPayments().find((p) => p.id === id);
  }

  /**
   * Generate next sequential payment reference: PAY-2026-XXXX
   */
  public static generatePaymentNumber(): string {
    const payments = this.getPayments();
    const numbers = payments
      .map((p) => {
        const match = p.paymentNumber?.match(/PAY-2026-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const nextSeq = (numbers.length > 0 ? Math.max(...numbers) : 8841) + 1;
    return `PAY-2026-${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Record a new payment with strict invoice validation, duplicate prevention, and balance reconciliation.
   */
  public static recordPayment(
    data: RecordPaymentParams,
    recordedBy = 'Billing Staff'
  ): Payment {
    // 1. Validations
    if (!data.customerId) {
      throw new Error('Customer is required.');
    }
    if (!data.invoiceId) {
      throw new Error('Invoice selection is required.');
    }
    if (!data.paymentDate) {
      throw new Error('Payment date is required.');
    }
    if (!data.method) {
      throw new Error('Payment method is required.');
    }
    if (!data.transactionReference || !data.transactionReference.trim()) {
      throw new Error('Transaction Reference / UTR / Gateway ID is required.');
    }
    if (typeof data.amount !== 'number' || data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    // 2. Duplicate Transaction Reference check
    const payments = this.getPayments();
    const cleanRef = data.transactionReference.trim().toUpperCase();
    const duplicate = payments.find(
      (p) =>
        p.transactionReference &&
        p.transactionReference.trim().toUpperCase() === cleanRef &&
        p.status !== 'Reversed' &&
        p.status !== 'Failed'
    );
    if (duplicate) {
      throw new Error(
        `Transaction Reference "${cleanRef}" has already been recorded under payment ${duplicate.paymentNumber}.`
      );
    }

    // 3. Locate Target Invoice
    const invoice = InvoiceService.getInvoiceById(data.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice with ID "${data.invoiceId}" not found.`);
    }

    // 4. Verify Invoice belongs to Selected Customer
    if (
      invoice.customerId &&
      invoice.customerId !== data.customerId &&
      invoice.companyName.toLowerCase() !== (data.companyName || '').toLowerCase()
    ) {
      throw new Error(
        `Selected invoice ${invoice.invoiceNumber} belongs to "${invoice.customerName}" (${invoice.companyName}), not the selected customer.`
      );
    }

    // 5. Balance Validation
    const currentOutstanding =
      invoice.amountDue !== undefined
        ? invoice.amountDue
        : Math.max(0, invoice.totalAmount - invoice.paidAmount);

    if (currentOutstanding <= 0) {
      throw new Error(`Invoice ${invoice.invoiceNumber} is already fully paid.`);
    }

    if (!data.allowAdvance && data.amount > currentOutstanding) {
      throw new Error(
        `Payment amount of $${data.amount.toLocaleString()} exceeds the current outstanding balance of $${currentOutstanding.toLocaleString()}.`
      );
    }

    const paymentNumber = this.generatePaymentNumber();
    const status: PaymentStatus = data.status || 'Recorded';
    const nowIso = new Date().toISOString();

    const newPayment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      paymentNumber,
      paymentReference: paymentNumber,
      transactionReference: cleanRef,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      subscriptionId: invoice.subscriptionId || data.subscriptionId,
      subscriptionNumber: invoice.subscriptionNumber || data.subscriptionNumber,
      customerId: invoice.customerId || data.customerId,
      customerName: invoice.customerName || data.customerName || 'Customer',
      companyName: invoice.companyName || data.companyName || '',
      amount: Math.round(data.amount * 100) / 100,
      paymentAmount: Math.round(data.amount * 100) / 100,
      paymentDate: data.paymentDate,
      method: data.method,
      paymentMethod: data.method,
      status,
      paymentStatus: status,
      notes: data.notes || '',
      referenceNote: data.notes || `Direct settlement for ${invoice.invoiceNumber}`,
      recordedBy: data.recordedBy || recordedBy,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 6. Transactional Reconciliation with Invoice
    // Recorded payments immediately adjust invoice balance
    if (status === 'Recorded' || (status as string) === 'Completed') {
      InvoiceService.recordPayment(invoice.id, newPayment.amount);
    }

    payments.unshift(newPayment);
    this.savePayments(payments);
    return newPayment;
  }

  /**
   * Reverses a recorded payment with an auditable reversal trail and adjusts the invoice balance back.
   */
  public static reversePayment(
    paymentId: string,
    params: { reason: string; reversedBy: string }
  ): Payment {
    const payments = this.getPayments();
    const index = payments.findIndex((p) => p.id === paymentId);
    if (index === -1) {
      throw new Error('Payment record not found.');
    }

    const payment = payments[index];
    if (payment.status === 'Reversed') {
      throw new Error(`Payment ${payment.paymentNumber} has already been reversed.`);
    }

    if (payment.status !== 'Recorded' && (payment.status as string) !== 'Completed') {
      throw new Error(`Only Recorded payments can be reversed. Current status is "${payment.status}".`);
    }

    if (!params.reason || !params.reason.trim()) {
      throw new Error('An audit reason for payment reversal is required.');
    }

    // 1. Reconcile Invoice Balance
    const invoice = InvoiceService.getInvoiceById(payment.invoiceId);
    if (invoice) {
      const todayStr = new Date().toISOString().split('T')[0];
      const newPaid = Math.max(0, invoice.paidAmount - payment.amount);
      const newOutstanding = Math.min(invoice.totalAmount, invoice.totalAmount - newPaid);

      let newStatus: Invoice['status'] = 'Confirmed';
      if (newPaid === 0) {
        newStatus = invoice.dueDate < todayStr ? 'Overdue' : 'Confirmed';
      } else if (newOutstanding > 0) {
        newStatus = 'Partially Paid';
      } else {
        newStatus = 'Paid';
      }

      InvoiceService.updateInvoice(invoice.id, {
        paidAmount: Math.round(newPaid * 100) / 100,
        amountDue: Math.round(newOutstanding * 100) / 100,
        outstandingAmount: Math.round(newOutstanding * 100) / 100,
        status: newStatus,
      });
    }

    // 2. Mark Payment as Reversed with audit metadata
    const nowIso = new Date().toISOString();
    payments[index] = {
      ...payment,
      status: 'Reversed',
      paymentStatus: 'Reversed',
      reversedAt: nowIso,
      reversedReason: params.reason.trim(),
      reversedBy: params.reversedBy,
      updatedAt: nowIso,
    };

    this.savePayments(payments);
    return payments[index];
  }

  /**
   * Update status of pending or failed payments (e.g. promoting Pending -> Recorded).
   */
  public static updatePaymentStatus(
    paymentId: string,
    newStatus: PaymentStatus,
    actor = 'Billing Staff'
  ): Payment {
    const payments = this.getPayments();
    const index = payments.findIndex((p) => p.id === paymentId);
    if (index === -1) throw new Error('Payment record not found.');

    const payment = payments[index];
    const prevStatus = payment.status;

    if (prevStatus === newStatus) return payment;
    if (prevStatus === 'Reversed') {
      throw new Error('Reversed payments cannot be re-activated.');
    }

    // If moving from Pending/Failed to Recorded -> apply to invoice
    if (newStatus === 'Recorded' && (prevStatus === 'Pending' || prevStatus === 'Failed')) {
      const invoice = InvoiceService.getInvoiceById(payment.invoiceId);
      if (invoice) {
        InvoiceService.recordPayment(invoice.id, payment.amount);
      }
    }

    payments[index] = {
      ...payment,
      status: newStatus,
      paymentStatus: newStatus,
      updatedAt: new Date().toISOString(),
      notes: payment.notes
        ? `${payment.notes} | Status updated to ${newStatus} by ${actor}`
        : `Status updated to ${newStatus} by ${actor}`,
    };

    this.savePayments(payments);
    return payments[index];
  }

  /**
   * Get list of outstanding and overdue invoices with computed daysOverdue.
   */
  public static getOutstandingInvoices(): OutstandingInvoiceItem[] {
    const invoices = InvoiceService.getInvoices();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    return invoices
      .filter((inv) => {
        if (inv.status === 'Cancelled' || inv.status === 'Paid') return false;
        const bal = inv.amountDue ?? (inv.totalAmount - inv.paidAmount);
        return bal > 0;
      })
      .map((inv) => {
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffMs = today.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const isOverdue = inv.dueDate < todayStr;

        return {
          invoice: inv,
          daysOverdue: Math.max(0, daysOverdue),
          isOverdue,
        };
      })
      .sort((a, b) => {
        // Sort overdue first, then by outstanding amount descending
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return (b.invoice.amountDue || 0) - (a.invoice.amountDue || 0);
      });
  }

  /**
   * Compute aggregate KPI metrics across payments and invoices.
   */
  public static getPaymentSummary(): PaymentSummary {
    const payments = this.getPayments();
    const invoices = InvoiceService.getInvoices();
    const todayStr = new Date().toISOString().split('T')[0];

    // Total Payments Received: Sum of Recorded or Completed payments
    const totalReceived = payments
      .filter((p) => p.status === 'Recorded' || (p.status as string) === 'Completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    let totalOutstanding = 0;
    let totalOverdue = 0;
    let partiallyPaidCount = 0;
    let fullyPaidCount = 0;

    invoices.forEach((inv) => {
      if (inv.status === 'Cancelled') return;

      const bal = inv.amountDue ?? (inv.totalAmount - inv.paidAmount);
      if (bal > 0) {
        totalOutstanding += bal;
        if (inv.dueDate < todayStr || inv.status === 'Overdue') {
          totalOverdue += bal;
        }
      }

      if (inv.status === 'Partially Paid') {
        partiallyPaidCount++;
      } else if (inv.status === 'Paid') {
        fullyPaidCount++;
      }
    });

    return {
      totalReceived: Math.round(totalReceived * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      partiallyPaidCount,
      fullyPaidCount,
      totalPaymentsCount: payments.length,
    };
  }

  // --- Follow-Up Notes Management ---

  public static getFollowUpNotes(invoiceId?: string): FollowUpNote[] {
    const raw = localStorage.getItem(FOLLOWUPS_STORAGE_KEY);
    let all: FollowUpNote[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }
    if (invoiceId) {
      return all.filter((n) => n.invoiceId === invoiceId);
    }
    return all;
  }

  public static addFollowUpNote(params: {
    invoiceId: string;
    invoiceNumber?: string;
    customerName?: string;
    note: string;
    actionTaken?: string;
    contactPerson?: string;
    recordedBy: string;
  }): FollowUpNote {
    const notes = this.getFollowUpNotes();
    const newNote: FollowUpNote = {
      id: `fn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      invoiceId: params.invoiceId,
      invoiceNumber: params.invoiceNumber,
      customerName: params.customerName,
      note: params.note.trim(),
      actionTaken: params.actionTaken,
      contactPerson: params.contactPerson,
      recordedBy: params.recordedBy,
      createdAt: new Date().toISOString(),
    };

    notes.unshift(newNote);
    localStorage.setItem(FOLLOWUPS_STORAGE_KEY, JSON.stringify(notes));
    return newNote;
  }
}
