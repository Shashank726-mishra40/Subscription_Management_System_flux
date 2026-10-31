import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Repeat,
  Receipt,
  CreditCard,
  Send,
  Plus,
  ShieldCheck,
  Check,
  Download,
  Printer,
  Eye,
  Tag,
  Copy,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LayoutDashboard,
  FileSpreadsheet,
  Clock,
  User,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { SubscriptionService } from '../../services/subscriptionService';
import { InvoiceService } from '../../services/invoiceService';
import { PaymentService } from '../../services/paymentService';
import { QuotationService } from '../../services/quotationService';
import { DiscountService } from '../../services/discountService';
import { PDFGenerator } from '../../utils/pdfGenerator';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Subscription,
  Invoice,
  Payment,
  Quotation,
  PaymentMethod,
} from '../../types';
import { CustomerSubscriptionRequest } from '../../types/auth';

type CustomerTab =
  | 'overview'
  | 'subscriptions'
  | 'quotations'
  | 'invoices'
  | 'payments'
  | 'discounts'
  | 'profile'
  | 'requests';

export const CustomerPortalPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab Sync with Query Param: /portal?tab=...
  const tabFromUrl = searchParams.get('tab') as CustomerTab | null;
  const [activeTab, setActiveTab] = useState<CustomerTab>(
    tabFromUrl &&
      ['overview', 'subscriptions', 'quotations', 'invoices', 'payments', 'discounts', 'profile', 'requests'].includes(tabFromUrl)
      ? tabFromUrl
      : 'overview'
  );

  useEffect(() => {
    if (
      tabFromUrl &&
      ['overview', 'subscriptions', 'quotations', 'invoices', 'payments', 'discounts', 'profile', 'requests'].includes(tabFromUrl)
    ) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: CustomerTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const customerId = user?.customerId || 'cust_01';
  const companyName = user?.companyName || 'Vertex Logic Inc.';
  const customerEmail = user?.email || 'sarah@vertexlogic.com';

  // Live Refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  // Dynamic Subscriptions for this Customer
  const customerSubs = useMemo(() => {
    const all = SubscriptionService.getSubscriptions();
    return all.filter(
      (s) =>
        s.customerId === customerId ||
        s.companyName.toLowerCase() === companyName.toLowerCase() ||
        (s.customerEmail && s.customerEmail.toLowerCase() === customerEmail.toLowerCase())
    );
  }, [customerId, companyName, customerEmail, refreshTrigger]);

  // Dynamic Invoices for this Customer
  const customerInvoices = useMemo(() => {
    const all = InvoiceService.getInvoices();
    return all.filter(
      (i) =>
        i.customerId === customerId ||
        i.companyName.toLowerCase() === companyName.toLowerCase() ||
        (i.customerEmail && i.customerEmail.toLowerCase() === customerEmail.toLowerCase())
    );
  }, [customerId, companyName, customerEmail, refreshTrigger]);

  // Dynamic Payments for this Customer
  const customerPayments = useMemo(() => {
    const all = PaymentService.getPayments();
    return all.filter(
      (p) =>
        p.customerId === customerId ||
        p.companyName.toLowerCase() === companyName.toLowerCase()
    );
  }, [customerId, companyName, refreshTrigger]);

  // Dynamic Quotations for this Customer
  const customerQuotes = useMemo(() => {
    const all = QuotationService.getQuotations();
    return all.filter(
      (q) =>
        q.customerId === customerId ||
        q.companyName.toLowerCase() === companyName.toLowerCase() ||
        (q.customerEmail && q.customerEmail.toLowerCase() === customerEmail.toLowerCase())
    );
  }, [customerId, companyName, customerEmail, refreshTrigger]);

  // Active Discounts
  const activePromotions = useMemo(() => {
    return DiscountService.getDiscounts().filter((d) => d.status === 'Active' || d.isActive);
  }, []);

  // Real-time Overview Statistics
  const overviewStats = useMemo(() => {
    const activeSubsCount = customerSubs.filter(
      (s) => s.status === 'Active' || s.status === 'Confirmed'
    ).length;

    const pendingQuotesCount = customerQuotes.filter(
      (q) => q.status === 'Sent' || q.status === 'Draft'
    ).length;

    const totalInvoicesCount = customerInvoices.length;

    const outstandingBalance = customerInvoices.reduce((sum, inv) => {
      if (inv.status === 'Cancelled' || inv.status === 'Paid') return sum;
      return sum + (inv.amountDue ?? (inv.totalAmount - inv.paidAmount));
    }, 0);

    const totalPaymentsMade = customerPayments
      .filter((p) => p.status === 'Recorded' || (p.status as string) === 'Completed')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      activeSubsCount,
      pendingQuotesCount,
      totalInvoicesCount,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      totalPaymentsMade: Math.round(totalPaymentsMade * 100) / 100,
    };
  }, [customerSubs, customerQuotes, customerInvoices, customerPayments]);

  // Modals State
  const [viewingCustomerInvoice, setViewingCustomerInvoice] = useState<Invoice | null>(null);
  const [viewingSubDetails, setViewingSubDetails] = useState<Subscription | null>(null);
  const [viewingQuoteDetails, setViewingQuoteDetails] = useState<Quotation | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Payment | null>(null);

  // Pay Invoice Modal State
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Credit Card');
  const [payCardNumber, setPayCardNumber] = useState('•••• •••• •••• 4118');
  const [payUpiId, setPayUpiId] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [paySuccess, setPaySuccess] = useState<Payment | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Subscription Request State
  const [requests, setRequests] = useState<CustomerSubscriptionRequest[]>([
    {
      id: 'req_01',
      customerId,
      customerName: user?.name || 'Sarah Jenkins',
      companyName,
      requestType: 'Add Seats',
      planName: customerSubs[0]?.planName || 'Enterprise Cloud Pro',
      requestedChanges: 'Add 10 additional seats for engineering team expansion',
      status: 'Approved',
      createdAt: '2026-10-25T10:00:00Z',
    },
    {
      id: 'req_02',
      customerId,
      customerName: user?.name || 'Sarah Jenkins',
      companyName,
      requestType: 'Add-on License',
      planName: customerSubs[0]?.planName || 'Enterprise Cloud Pro',
      requestedChanges: 'Enable Multi-Currency & Tax Engine Add-on module',
      status: 'Pending',
      createdAt: '2026-10-30T14:20:00Z',
    },
  ]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<'Add Seats' | 'Upgrade Plan' | 'Add-on License' | 'Cancellation Request'>('Add Seats');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Coupon Testing in Customer Portal
  const [testCouponCode, setTestCouponCode] = useState('');
  const [testSubId, setTestSubId] = useState(customerSubs[0]?.id || '');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    eligible: boolean;
    reason?: string;
    discountName?: string;
    originalAmount?: number;
    discountAmount?: number;
    finalAmount?: number;
  } | null>(null);

  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || 'Sarah Jenkins');
  const [profileEmail, setProfileEmail] = useState(user?.email || 'customer@vertexlogic.com');
  const [profileCompany, setProfileCompany] = useState(user?.companyName || 'Vertex Logic Inc.');
  const [profilePhone, setProfilePhone] = useState('+1 (555) 234-5678');
  const [profileAddress, setProfileAddress] = useState('500 Howard Street, Suite 300, San Francisco, CA 94105');
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  // Toast / Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Open Pay Invoice Modal
  const handleOpenPayInvoice = (inv: Invoice) => {
    setPayingInvoice(inv);
    const balance = inv.amountDue ?? (inv.totalAmount - inv.paidAmount);
    setPayAmount(balance);
    setPayMethod('Credit Card');
    setPayCardNumber('•••• •••• •••• 4118');
    setPayUpiId(`${user?.email?.split('@')[0] || 'sarah'}@okaxis`);
    setPayError(null);
    setPaySuccess(null);
  };

  // Submit Online Payment
  const handleProcessOnlinePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    setPayError(null);

    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      setPayError('Please enter a valid payment amount.');
      return;
    }

    setPaySubmitting(true);
    try {
      const demoRefNum = Math.floor(10000000 + Math.random() * 90000000);
      const txnRef =
        payMethod === 'Credit Card'
          ? `AUTH-CARD-${demoRefNum}`
          : payMethod === 'UPI'
          ? `UPI-PAY-${demoRefNum}`
          : `WIRE-TXN-${demoRefNum}`;

      const payment = PaymentService.recordPayment(
        {
          customerId,
          customerName: user?.name || payingInvoice.customerName,
          companyName,
          invoiceId: payingInvoice.id,
          invoiceNumber: payingInvoice.invoiceNumber,
          subscriptionId: payingInvoice.subscriptionId,
          subscriptionNumber: payingInvoice.subscriptionNumber,
          amount: amt,
          paymentDate: new Date().toISOString().split('T')[0],
          method: payMethod,
          transactionReference: txnRef,
          status: 'Recorded',
          notes: `Self-service online portal payment via ${payMethod}`,
          recordedBy: `${user?.name} (Customer Self-Service)`,
        },
        user?.name || 'Customer'
      );

      setPaySuccess(payment);
      triggerRefresh();
      showFeedback('success', `Payment of ${formatCurrency(payment.amount)} processed successfully!`);
    } catch (err: any) {
      setPayError(err?.message || 'Payment processing failed.');
    } finally {
      setPaySubmitting(false);
    }
  };

  // Accept Quotation Action
  const handleAcceptQuotation = (quote: Quotation) => {
    try {
      QuotationService.updateStatus(quote.id, 'Accepted');
      // Convert to subscription
      QuotationService.convertToSubscription(quote.id);
      triggerRefresh();
      if (viewingQuoteDetails?.id === quote.id) {
        setViewingQuoteDetails(null);
      }
      showFeedback(
        'success',
        `Proposal ${quote.quotationNumber} accepted! Subscription has been provisioned and confirmed.`
      );
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to accept quotation.');
    }
  };

  // Copy Promo Code Helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Validate Promo Coupon Code
  const handleValidateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = testCouponCode.trim().toUpperCase();
    if (!code) return;

    const discount = DiscountService.getDiscountByCode(code);
    if (!discount) {
      setTestResult({
        tested: true,
        eligible: false,
        reason: `Coupon "${code}" does not exist or is not recognized.`,
      });
      return;
    }

    const selectedSub = customerSubs.find((s) => s.id === testSubId) || customerSubs[0];
    const subtotal = selectedSub ? selectedSub.subtotal || selectedSub.mrrAmount : 5000;
    const totalQty = selectedSub?.items?.reduce((acc, l) => acc + l.quantity, 0) || 1;

    const evalRes = DiscountService.evaluateEligibility(discount, {
      customerId,
      subtotal,
      totalQuantity: totalQty,
      planId: selectedSub?.planId,
      productIds: selectedSub?.items?.map((i) => i.productId),
      isEntireSubscription: true,
    });

    setTestResult({
      tested: true,
      eligible: evalRes.eligible,
      reason: evalRes.reason,
      discountName: discount.name,
      originalAmount: subtotal,
      discountAmount: evalRes.discountAmount,
      finalAmount: evalRes.finalAmount,
    });
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updateProfile) {
      await updateProfile({
        name: profileName,
        email: profileEmail,
        companyName: profileCompany,
      });
    }
    setProfileFeedback('Profile details updated successfully.');
    setTimeout(() => setProfileFeedback(null), 3500);
  };

  // Submit Subscription Change Request
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const newReq: CustomerSubscriptionRequest = {
      id: `req_${Date.now()}`,
      customerId,
      customerName: user?.name || 'Customer User',
      companyName,
      requestType,
      planName: customerSubs[0]?.planName || 'Enterprise Plan',
      requestedChanges: requestNotes,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    setRequests([newReq, ...requests]);
    setRequestSuccess(true);
    setTimeout(() => {
      setRequestSuccess(false);
      setIsRequestModalOpen(false);
      setRequestNotes('');
    }, 1500);
  };

  // --- Subscriptions Columns ---
  const subCols: Column<Subscription>[] = [
    {
      header: 'Subscription #',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block font-mono text-xs">
            {row.subscriptionNumber}
          </span>
          <p className="text-[11px] text-slate-400 capitalize">{row.billingCycle} billing</p>
        </div>
      ),
    },
    {
      header: 'Plan Tier',
      cell: (row) => (
        <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
          {row.planName}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <Badge status={row.status}>{row.status}</Badge>,
    },
    {
      header: 'Recurring Rate',
      cell: (row) => (
        <div>
          <span className="font-bold text-slate-900">
            {formatCurrency(row.mrrAmount)}/mo
          </span>
          {row.discountTotal !== undefined && row.discountTotal > 0 && (
            <p className="text-[10px] text-emerald-600 font-medium">
              Saved {formatCurrency(row.discountTotal)} {row.discountCode ? `(${row.discountCode})` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Next Renewal',
      cell: (row) => (
        <div className="text-xs text-slate-600">
          <p className="font-medium text-slate-800">{formatDate(row.renewalDate || row.expiryDate)}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {row.autoRenew ? '✓ Auto-renews' : 'Manual invoice'}
          </span>
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setViewingSubDetails(row)}
            icon={<Eye className="w-3.5 h-3.5" />}
          >
            Details
          </Button>
        </div>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
  ];

  // --- Quotations Columns ---
  const quoteCols: Column<Quotation>[] = [
    {
      header: 'Quotation #',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 font-mono text-xs block">
            {row.quotationNumber}
          </span>
          <span className="text-[11px] text-slate-400">Created: {formatDate(row.quotationDate || row.createdAt)}</span>
        </div>
      ),
    },
    {
      header: 'Plan / Suite',
      cell: (row) => <span className="text-xs font-medium text-slate-800">{row.planName}</span>,
    },
    {
      header: 'Valid Until',
      cell: (row) => <span className="text-xs text-slate-600">{formatDate(row.validUntil)}</span>,
    },
    {
      header: 'Amount',
      cell: (row) => (
        <div className="text-right">
          <span className="font-bold text-slate-900">{formatCurrency(row.totalAmount)}</span>
          {row.discountTotal > 0 && (
            <p className="text-[10px] text-emerald-600 font-medium">
              -{formatCurrency(row.discountTotal)} promo
            </p>
          )}
        </div>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: 'Status',
      cell: (row) => <Badge status={row.status}>{row.status}</Badge>,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setViewingQuoteDetails(row)}
            icon={<Eye className="w-3.5 h-3.5" />}
          >
            Review
          </Button>
          {(row.status === 'Sent' || row.status === 'Draft') && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleAcceptQuotation(row)}
              icon={<Check className="w-3.5 h-3.5" />}
            >
              Accept Proposal
            </Button>
          )}
        </div>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
  ];

  // --- Invoices Columns ---
  const invCols: Column<Invoice>[] = [
    {
      header: 'Invoice #',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 font-mono text-xs block">{row.invoiceNumber}</span>
          {row.subscriptionNumber && (
            <p className="text-[11px] text-indigo-600 font-mono">Ref: {row.subscriptionNumber}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Issue Date',
      cell: (row) => <span className="text-xs text-slate-600">{formatDate(row.invoiceDate || row.issueDate)}</span>,
    },
    {
      header: 'Due Date',
      cell: (row) => (
        <span className={`text-xs font-semibold ${row.status === 'Overdue' ? 'text-rose-600' : 'text-slate-700'}`}>
          {formatDate(row.dueDate)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <Badge status={row.status}>{row.status}</Badge>,
    },
    {
      header: 'Amount',
      cell: (row) => {
        const bal = row.amountDue ?? (row.totalAmount - row.paidAmount);
        return (
          <div className="text-right">
            <span className="font-bold text-slate-900">{formatCurrency(row.totalAmount)}</span>
            {bal > 0 ? (
              <p className="text-[11px] text-rose-600 font-semibold">
                Due: {formatCurrency(bal)}
              </p>
            ) : (
              <p className="text-[11px] text-emerald-600 font-semibold">Paid in Full</p>
            )}
          </div>
        );
      },
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: 'Actions',
      cell: (row) => {
        const bal = row.amountDue ?? (row.totalAmount - row.paidAmount);
        return (
          <div className="flex items-center gap-1.5 justify-end">
            {bal > 0 && row.status !== 'Cancelled' && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleOpenPayInvoice(row)}
                icon={<CreditCard className="w-3.5 h-3.5" />}
              >
                Pay Now
              </Button>
            )}
            <button
              type="button"
              onClick={() => PDFGenerator.printInvoice(row)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => PDFGenerator.downloadInvoicePDF(row)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Download PDF Statement"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewingCustomerInvoice(row)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
      className: 'text-right',
      headerClassName: 'text-right',
    },
  ];

  // --- Payments Columns ---
  const payCols: Column<Payment>[] = [
    {
      header: 'Receipt #',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 font-mono text-xs block">{row.paymentNumber}</span>
          <span className="text-[11px] font-mono text-slate-400">{row.transactionReference}</span>
        </div>
      ),
    },
    {
      header: 'Invoice Reference',
      cell: (row) => <span className="text-xs font-mono text-indigo-600 font-medium">{row.invoiceNumber}</span>,
    },
    {
      header: 'Method',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
          <CreditCard className="w-3 h-3 text-slate-500" />
          {row.method}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.status === 'Recorded' || (row.status as string) === 'Completed' ? 'emerald' : 'amber'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Amount Paid',
      cell: (row) => (
        <span className="font-bold text-emerald-700">+{formatCurrency(row.amount)}</span>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: 'Date Processed',
      cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.paymentDate)}</span>,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={() => setViewingReceipt(row)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const inv = customerInvoices.find((i) => i.id === row.invoiceId);
              PDFGenerator.downloadPaymentReceiptPDF(row, inv);
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Download PDF Receipt"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Customer Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0f172a] via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-semibold text-indigo-400 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Customer Self-Service Billing Portal
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{companyName}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Account Representative:{' '}
              <span className="text-slate-200 font-medium">{user?.name || 'Customer Lead'}</span> · {user?.email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {overviewStats.outstandingBalance > 0 && (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  const firstUnpaid = customerInvoices.find(
                    (i) => (i.amountDue ?? (i.totalAmount - i.paidAmount)) > 0
                  );
                  if (firstUnpaid) handleOpenPayInvoice(firstUnpaid);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                icon={<CreditCard className="w-4 h-4" />}
              >
                Pay Outstanding ({formatCurrency(overviewStats.outstandingBalance)})
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsRequestModalOpen(true)}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<Plus className="w-4 h-4" />}
            >
              Subscription Request
            </Button>
          </div>
        </div>

        {/* Dynamic Quick Overview Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-800 text-left">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Active Plans</p>
            <p className="text-xl font-bold text-white mt-1">{overviewStats.activeSubsCount}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Open Quotations</p>
            <p className="text-xl font-bold text-indigo-300 mt-1">{overviewStats.pendingQuotesCount}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Invoices</p>
            <p className="text-xl font-bold text-white mt-1">{overviewStats.totalInvoicesCount}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Balance Due</p>
            <p
              className={`text-xl font-bold mt-1 ${
                overviewStats.outstandingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {formatCurrency(overviewStats.outstandingBalance)}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Paid</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              {formatCurrency(overviewStats.totalPaymentsMade)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Prompt Section 7: Exactly 1. Overview, 2. My Subscriptions, 3. My Quotations, 4. My Invoices, 5. My Payments, 6. Available Discounts, 7. My Profile) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview', count: null, icon: LayoutDashboard },
          { key: 'subscriptions', label: 'My Subscriptions', count: customerSubs.length, icon: Repeat },
          { key: 'quotations', label: 'My Quotations', count: customerQuotes.length, icon: FileSpreadsheet },
          { key: 'invoices', label: 'My Invoices', count: customerInvoices.length, icon: Receipt },
          { key: 'payments', label: 'My Payments', count: customerPayments.length, icon: CreditCard },
          { key: 'discounts', label: 'Available Discounts', count: activePromotions.length, icon: Tag },
          { key: 'profile', label: 'My Profile', count: null, icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key as CustomerTab)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Outstanding Balance Alert Box */}
          {overviewStats.outstandingBalance > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Outstanding Payment Pending</h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    You have an outstanding balance of <strong>{formatCurrency(overviewStats.outstandingBalance)}</strong> across unpaid invoices. Settle online to avoid service pause.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  const firstUnpaid = customerInvoices.find(
                    (i) => (i.amountDue ?? (i.totalAmount - i.paidAmount)) > 0
                  );
                  if (firstUnpaid) handleOpenPayInvoice(firstUnpaid);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white shrink-0"
                icon={<CreditCard className="w-3.5 h-3.5" />}
              >
                Pay Balance Online
              </Button>
            </div>
          )}

          {/* Upcoming Renewal Callout */}
          {customerSubs.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-indigo-950">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Next Scheduled Renewal</h4>
                  <p className="text-xs text-indigo-700">
                    Plan: <strong>{customerSubs[0].planName}</strong> ({formatCurrency(customerSubs[0].mrrAmount)}/mo) — Scheduled for{' '}
                    <strong>{formatDate(customerSubs[0].renewalDate || customerSubs[0].expiryDate)}</strong>
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-white rounded-md border border-indigo-200 text-indigo-700">
                {customerSubs[0].autoRenew ? '✓ Auto-Renew Enabled' : 'Manual Close Policy'}
              </span>
            </div>
          )}

          {/* Recent Invoices Table on Dashboard */}
          <Card>
            <CardHeader
              title="Recent Billing Statements"
              subtitle="Latest invoices generated for your software subscription"
              action={
                <button
                  type="button"
                  onClick={() => handleTabChange('invoices')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  View All ({customerInvoices.length}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              }
            />
            <CardContent className="p-0">
              <Table
                columns={invCols}
                data={customerInvoices.slice(0, 3)}
                keyExtractor={(i) => i.id}
              />
            </CardContent>
          </Card>

          {/* Recent Payments Table on Dashboard */}
          <Card>
            <CardHeader
              title="Recent Verified Payments"
              subtitle="Verified payment records settled through your payment method"
              action={
                <button
                  type="button"
                  onClick={() => handleTabChange('payments')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  View All ({customerPayments.length}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              }
            />
            <CardContent className="p-0">
              <Table
                columns={payCols}
                data={customerPayments.slice(0, 3)}
                keyExtractor={(p) => p.id}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 2: MY SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <Card>
          <CardHeader
            title="My Subscriptions & Licenses"
            subtitle={`Active software contracts and seats registered for ${companyName}`}
            action={
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsRequestModalOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Change Request
              </Button>
            }
          />
          <CardContent className="p-0">
            <Table
              columns={subCols}
              data={customerSubs}
              keyExtractor={(s) => s.id}
            />
          </CardContent>
        </Card>
      )}

      {/* SECTION 3: MY QUOTATIONS */}
      {activeTab === 'quotations' && (
        <Card>
          <CardHeader
            title="My Quotations & Upgrade Proposals"
            subtitle="Commercial offers and licensing proposals prepared for your team"
          />
          <CardContent className="p-0">
            <Table
              columns={quoteCols}
              data={customerQuotes}
              keyExtractor={(q) => q.id}
              emptyMessage="No quotations currently pending for your account."
            />
          </CardContent>
        </Card>
      )}

      {/* SECTION 4: MY INVOICES */}
      {activeTab === 'invoices' && (
        <Card>
          <CardHeader
            title="My Billing Statements & Invoices"
            subtitle="Itemized fee receipts, tax statements, and online balance payments"
          />
          <CardContent className="p-0">
            <Table
              columns={invCols}
              data={customerInvoices}
              keyExtractor={(i) => i.id}
            />
          </CardContent>
        </Card>
      )}

      {/* SECTION 5: MY PAYMENTS */}
      {activeTab === 'payments' && (
        <Card>
          <CardHeader
            title="Payment History & Official Receipts"
            subtitle="Historical financial receipts and gateway confirmations"
          />
          <CardContent className="p-0">
            <Table
              columns={payCols}
              data={customerPayments}
              keyExtractor={(p) => p.id}
              emptyMessage="No payment transactions recorded for your account yet."
            />
          </CardContent>
        </Card>
      )}

      {/* SECTION 6: AVAILABLE DISCOUNTS */}
      {activeTab === 'discounts' && (
        <div className="space-y-6">
          {/* Coupon Tester / Savings Calculator */}
          <Card>
            <CardHeader
              title="Promotional Coupon Checker & Savings Calculator"
              subtitle="Test coupon codes to calculate instant renewal and subscription discounts"
            />
            <CardContent>
              <form onSubmit={handleValidateCoupon} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Your Subscription Target
                  </label>
                  <select
                    value={testSubId}
                    onChange={(e) => setTestSubId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    {customerSubs.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.subscriptionNumber} — {sub.planName} ({formatCurrency(sub.subtotal || sub.mrrAmount)})
                      </option>
                    ))}
                    {customerSubs.length === 0 && (
                      <option value="custom">Standard Enterprise Tier ($5,000/mo)</option>
                    )}
                  </select>
                </div>

                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter Promotional Coupon Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WELCOME20, ANNUALPROMO, FLASH50"
                    value={testCouponCode}
                    onChange={(e) => setTestCouponCode(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs uppercase font-mono tracking-wider focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!testCouponCode.trim()}
                  className="whitespace-nowrap"
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Verify Coupon
                </Button>
              </form>

              {testResult && testResult.tested && (
                <div
                  className={`mt-4 p-4 rounded-xl border transition-all ${
                    testResult.eligible
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-rose-50/70 border-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {testResult.eligible ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold text-sm ${
                            testResult.eligible ? 'text-emerald-900' : 'text-rose-900'
                          }`}
                        >
                          {testResult.eligible ? 'Coupon Eligible!' : 'Coupon Cannot Be Applied'}
                        </span>
                        {testResult.eligible && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                            Save {formatCurrency(testResult.discountAmount || 0)}
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-1 ${
                          testResult.eligible ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {testResult.eligible
                          ? `Coupon "${testResult.discountName}" applies successfully to your subscription.`
                          : testResult.reason}
                      </p>

                      {testResult.eligible && (
                        <div className="mt-3 grid grid-cols-3 gap-2 bg-white/80 p-3 rounded-lg border border-emerald-200 text-slate-800 text-center">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Original Price</span>
                            <span className="font-semibold">{formatCurrency(testResult.originalAmount || 0)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 font-semibold block">Discount Savings</span>
                            <span className="font-bold text-emerald-600">-{formatCurrency(testResult.discountAmount || 0)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-indigo-600 font-semibold block">New Net Price</span>
                            <span className="font-bold text-indigo-700">{formatCurrency(testResult.finalAmount || 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Discounts Grid */}
          <Card>
            <CardHeader
              title="Active Customer Promotions"
              subtitle="Official Brightloop promotional discounts valid for enterprise software plans"
            />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePromotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white shadow-sm flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-block px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                          {promo.discountType === 'percentage'
                            ? `${promo.discountValue}% OFF`
                            : `${formatCurrency(promo.discountValue)} OFF`}
                        </span>
                        <Badge variant="emerald">Active</Badge>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{promo.name}</h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{promo.description}</p>

                      <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                        {promo.minimumPurchaseAmount && promo.minimumPurchaseAmount > 0 && (
                          <p>• Min purchase: {formatCurrency(promo.minimumPurchaseAmount)}</p>
                        )}
                        <p>• Valid through: {formatDate(promo.endDate)}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      {promo.code ? (
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                          <code className="text-xs font-mono font-bold text-slate-800">{promo.code}</code>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(promo.code!)}
                            className="p-1 text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Copy Coupon Code"
                          >
                            {copiedCode === promo.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Automatic rule</span>
                      )}

                      {promo.code && (
                        <button
                          type="button"
                          onClick={() => {
                            setTestCouponCode(promo.code!);
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          Test Coupon →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 7: MY PROFILE */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader
              title="Customer Profile & Organization"
              subtitle="Keep your company billing address, representative contacts, and tax IDs updated"
            />
            <CardContent>
              {profileFeedback && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {profileFeedback}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Company / Organization Name</label>
                    <input
                      type="text"
                      value={profileCompany}
                      onChange={(e) => setProfileCompany(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Account Representative Name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Billing Email Address</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Address & Postal Code</label>
                  <textarea
                    rows={2}
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <Button type="submit" variant="primary" size="sm">
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Account Security" subtitle="Role & Session Details" />
            <CardContent className="space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Access Tier</span>
                <span className="font-bold text-slate-900 text-sm">{user?.role || 'CUSTOMER'}</span>
                <p className="text-[11px] text-slate-500 mt-1">Authorized for self-service billing management</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer ID</span>
                <span className="font-mono font-semibold text-indigo-600">{customerId}</span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800">
                <span className="font-bold block">✓ Two-Factor Authentication</span>
                <p className="text-[11px] mt-0.5">Enforced across all organization logins</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Online Pay Invoice Modal */}
      {payingInvoice && (
        <Modal
          isOpen={!!payingInvoice}
          onClose={() => setPayingInvoice(null)}
          title={`Pay Invoice ${payingInvoice.invoiceNumber}`}
          description={`Immediate online card, UPI, or wire settlement for ${companyName}`}
          maxWidth="md"
        >
          {paySuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Payment Settled Successfully!</h4>
              <p className="text-xs text-slate-500">
                Payment reference <strong>{paySuccess.paymentNumber}</strong> has been allocated to invoice{' '}
                <strong>{payingInvoice.invoiceNumber}</strong>.
              </p>
              <div className="pt-3 flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => PDFGenerator.downloadPaymentReceiptPDF(paySuccess, payingInvoice)}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Download Official Receipt
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPayingInvoice(null);
                    setPaySuccess(null);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProcessOnlinePayment} className="space-y-4 text-xs">
              {payError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              {/* Invoice Balance Summary Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 block">Invoice Total</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(payingInvoice.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Already Paid</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(payingInvoice.paidAmount || 0)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Balance Due</span>
                  <span className="font-bold text-rose-600">
                    {formatCurrency(payingInvoice.amountDue ?? (payingInvoice.totalAmount - payingInvoice.paidAmount))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={payingInvoice.amountDue ?? (payingInvoice.totalAmount - payingInvoice.paidAmount)}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || '')}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Credit Card">Credit Card (Instant Settlement)</option>
                  <option value="UPI">UPI / QR Transfer</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Bank Transfer">Bank Wire / ACH Remittance</option>
                </select>
              </div>

              {payMethod === 'Credit Card' || payMethod === 'Debit Card' ? (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <span className="font-semibold text-[11px] text-slate-700 block">Card on File</span>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <input
                      type="text"
                      value={payCardNumber}
                      onChange={(e) => setPayCardNumber(e.target.value)}
                      className="w-full text-xs font-mono text-slate-800 focus:outline-none"
                    />
                    <span className="text-[10px] text-emerald-600 font-bold shrink-0">VERIFIED</span>
                  </div>
                </div>
              ) : payMethod === 'UPI' ? (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <span className="font-semibold text-[11px] text-slate-700 block">UPI Virtual ID</span>
                  <input
                    type="text"
                    value={payUpiId}
                    onChange={(e) => setPayUpiId(e.target.value)}
                    placeholder="username@okhdfcbank"
                    className="w-full text-xs font-mono bg-white p-2 rounded border border-slate-200 focus:outline-none"
                    required
                  />
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <span className="font-semibold text-slate-800 block">Beneficiary Remittance Details</span>
                  <p>Bank: Silicon Valley Bank, NA</p>
                  <p>Account: <strong>9842-1002-8819</strong> · Routing: <strong>121000358</strong></p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setPayingInvoice(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={paySubmitting}
                  icon={<CreditCard className="w-3.5 h-3.5" />}
                >
                  Pay {formatCurrency(Number(payAmount) || 0)} Now
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Subscription Details Modal */}
      {viewingSubDetails && (
        <Modal
          isOpen={!!viewingSubDetails}
          onClose={() => setViewingSubDetails(null)}
          title={`Subscription ${viewingSubDetails.subscriptionNumber}`}
          description={`Contract plan details for ${viewingSubDetails.planName}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Recurring Price</span>
                <span className="text-xl font-bold text-indigo-600">
                  {formatCurrency(viewingSubDetails.mrrAmount)}/mo
                </span>
                <p className="text-[11px] text-slate-500">Billing frequency: {viewingSubDetails.billingCycle}</p>
              </div>
              <Badge status={viewingSubDetails.status}>{viewingSubDetails.status}</Badge>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">Provisioned Product</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {viewingSubDetails.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5">
                        <span className="font-semibold text-slate-900 block">{item.productName}</span>
                        {item.variantName && (
                          <span className="text-[11px] text-indigo-600">Variant: {item.variantName}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">{item.quantity}</td>
                      <td className="p-2.5 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2.5 text-right font-semibold text-slate-900">
                        {formatCurrency(item.total || item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setViewingSubDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Quotation Review Modal */}
      {viewingQuoteDetails && (
        <Modal
          isOpen={!!viewingQuoteDetails}
          onClose={() => setViewingQuoteDetails(null)}
          title={`Quotation Proposal ${viewingQuoteDetails.quotationNumber}`}
          description={`Commercial offer prepared for ${companyName}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Quoted Amount</span>
                <span className="text-xl font-bold text-indigo-600">
                  {formatCurrency(viewingQuoteDetails.totalAmount)}
                </span>
                <p className="text-[11px] text-slate-500">Valid until: {formatDate(viewingQuoteDetails.validUntil)}</p>
              </div>
              <Badge status={viewingQuoteDetails.status}>{viewingQuoteDetails.status}</Badge>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">Proposed Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {viewingQuoteDetails.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5">
                        <span className="font-semibold text-slate-900 block">{item.productName}</span>
                        {item.variantName && (
                          <span className="text-[11px] text-indigo-600">Variant: {item.variantName}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">{item.quantity}</td>
                      <td className="p-2.5 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2.5 text-right font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div>
                {(viewingQuoteDetails.status === 'Sent' || viewingQuoteDetails.status === 'Draft') && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleAcceptQuotation(viewingQuoteDetails)}
                    icon={<Check className="w-3.5 h-3.5" />}
                  >
                    Accept & Confirm Proposal
                  </Button>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setViewingQuoteDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Customer View Invoice Modal */}
      {viewingCustomerInvoice && (
        <Modal
          isOpen={!!viewingCustomerInvoice}
          onClose={() => setViewingCustomerInvoice(null)}
          title={`Invoice ${viewingCustomerInvoice.invoiceNumber}`}
          description={`Issued to ${viewingCustomerInvoice.companyName}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-500">Status</span>
                <div className="mt-1">
                  <Badge status={viewingCustomerInvoice.status}>{viewingCustomerInvoice.status}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => PDFGenerator.printInvoice(viewingCustomerInvoice)}
                  icon={<Printer className="w-3.5 h-3.5" />}
                >
                  Print
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => PDFGenerator.downloadInvoicePDF(viewingCustomerInvoice)}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Download PDF
                </Button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {viewingCustomerInvoice.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2.5">
                        <span className="font-semibold text-slate-900 block">{item.productName}</span>
                        {item.variantName && (
                          <span className="text-[11px] text-indigo-600">Edition: {item.variantName}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">{item.quantity}</td>
                      <td className="p-2.5 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-700">
                  <tr>
                    <td colSpan={3} className="p-2 text-right">Gross Subtotal:</td>
                    <td className="p-2 text-right">{formatCurrency(viewingCustomerInvoice.subtotal)}</td>
                  </tr>
                  {viewingCustomerInvoice.discountTotal !== undefined && viewingCustomerInvoice.discountTotal > 0 && (
                    <tr className="bg-emerald-50/50">
                      <td colSpan={3} className="p-2 text-right text-emerald-800">Promotional Discount:</td>
                      <td className="p-2 text-right text-emerald-700 font-bold">-{formatCurrency(viewingCustomerInvoice.discountTotal)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="p-2 text-right">Tax Total (18%):</td>
                    <td className="p-2 text-right">{formatCurrency(viewingCustomerInvoice.taxTotal)}</td>
                  </tr>
                  <tr className="border-t border-slate-200 font-bold text-slate-900">
                    <td colSpan={3} className="p-2.5 text-right text-sm">Invoice Grand Total:</td>
                    <td className="p-2.5 text-right text-sm text-indigo-600">{formatCurrency(viewingCustomerInvoice.totalAmount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="p-2 text-right text-emerald-700">Paid:</td>
                    <td className="p-2 text-right text-emerald-700">{formatCurrency(viewingCustomerInvoice.paidAmount)}</td>
                  </tr>
                  <tr className="border-t border-dashed border-slate-300 font-bold">
                    <td colSpan={3} className="p-2 text-right">Balance Due:</td>
                    <td className={`p-2 text-right ${viewingCustomerInvoice.amountDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {formatCurrency(viewingCustomerInvoice.amountDue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setViewingCustomerInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Customer View Payment Receipt Modal */}
      {viewingReceipt && (
        <Modal
          isOpen={!!viewingReceipt}
          onClose={() => setViewingReceipt(null)}
          title={`Payment Receipt ${viewingReceipt.paymentNumber}`}
          description={`Verified transaction record for ${viewingReceipt.companyName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Amount Paid</span>
                <span className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(viewingReceipt.amount)}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">Method: {viewingReceipt.method}</p>
              </div>
              <Badge variant="emerald">{viewingReceipt.status}</Badge>
            </div>

            <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Reference:</span>
                <span className="font-mono font-semibold text-indigo-600">{viewingReceipt.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Ref / Auth ID:</span>
                <span className="font-mono text-slate-800">{viewingReceipt.transactionReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date:</span>
                <span className="text-slate-800">{formatDate(viewingReceipt.paymentDate)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const inv = customerInvoices.find((i) => i.id === viewingReceipt.invoiceId);
                  PDFGenerator.printPaymentReceipt(viewingReceipt, inv);
                }}
                icon={<Printer className="w-3.5 h-3.5" />}
              >
                Print Receipt
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  const inv = customerInvoices.find((i) => i.id === viewingReceipt.invoiceId);
                  PDFGenerator.downloadPaymentReceiptPDF(viewingReceipt, inv);
                }}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Subscription Request Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Submit Subscription Request"
        description="Request seat upgrades, add-ons, or tier adjustments without manual email threads"
        maxWidth="md"
      >
        {requestSuccess ? (
          <div className="py-6 text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Request Dispatched!</h4>
            <p className="text-xs text-slate-500">
              Brightloop account operations will review your request and adjust billing automatically.
            </p>
          </div>
        ) : (
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Request Category
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Add Seats">Add Additional User Seats</option>
                <option value="Upgrade Plan">Upgrade Subscription Tier</option>
                <option value="Add-on License">Enable Add-on Module License</option>
                <option value="Cancellation Request">Request Plan Closure / Pause</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Details & Quantity Notes
              </label>
              <textarea
                rows={3}
                placeholder="Describe seat count needed or module requirements..."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRequestModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!requestNotes.trim()}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Submit Request
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
