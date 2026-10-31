import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Download,
  Search,
  Eye,
  RotateCcw,
  Printer,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Send,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Payment, PaymentMethod, PaymentStatus, Invoice, FollowUpNote } from '../types';
import { PaymentService, PaymentSummary } from '../services/paymentService';
import { InvoiceService } from '../services/invoiceService';
import { mockRecentCustomers } from '../services/mockData';
import { PDFGenerator } from '../utils/pdfGenerator';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const PAYMENT_METHODS: ('ALL' | PaymentMethod)[] = [
  'ALL',
  'Cash',
  'Bank Transfer',
  'UPI',
  'Credit Card',
  'Debit Card',
  'Other',
];

const PAYMENT_STATUSES: ('ALL' | PaymentStatus)[] = [
  'ALL',
  'Recorded',
  'Pending',
  'Failed',
  'Reversed',
];

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'transactions' | 'outstanding'>('transactions');

  // Core Data State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalReceived: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    partiallyPaidCount: 0,
    fullyPaidCount: 0,
    totalPaymentsCount: 0,
  });

  // Filter & Search State for Payments Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'ALL' | PaymentMethod>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | PaymentStatus>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'paymentDate' | 'amount' | 'paymentNumber' | 'customerName'>('paymentDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter & Search State for Outstanding Tab
  const [outstandingSearch, setOutstandingSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [outstandingSort, setOutstandingSort] = useState<'amountDue' | 'dueDate' | 'daysOverdue'>('amountDue');

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const [reversingPayment, setReversingPayment] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [activeFollowUpInvoice, setActiveFollowUpInvoice] = useState<Invoice | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState<FollowUpNote[]>([]);
  const [newFollowUpNote, setNewFollowUpNote] = useState('');
  const [newFollowUpAction, setNewFollowUpAction] = useState('Payment Reminder Email');
  const [newFollowUpContact, setNewFollowUpContact] = useState('');

  // Record Payment Form State
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formInvoiceId, setFormInvoiceId] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formPaymentDate, setFormPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMethod, setFormMethod] = useState<PaymentMethod>('Bank Transfer');
  const [formTransactionRef, setFormTransactionRef] = useState('');
  const [formStatus, setFormStatus] = useState<PaymentStatus>('Recorded');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast / Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Reload data from service
  const reloadData = () => {
    setPayments(PaymentService.getPayments());
    setInvoices(InvoiceService.getInvoices());
    setSummary(PaymentService.getPaymentSummary());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Customer List (derived from mock customers + invoices)
  const customersList = useMemo(() => {
    const list = [...mockRecentCustomers];
    invoices.forEach((inv) => {
      if (!list.some((c) => c.id === inv.customerId || c.companyName === inv.companyName)) {
        list.push({
          id: inv.customerId || `cust_${inv.companyName.toLowerCase().replace(/\s+/g, '_')}`,
          name: inv.customerName,
          companyName: inv.companyName,
          email: inv.customerEmail || 'billing@customer.com',
          phone: '+1 (555) 000-0000',
          customerType: 'Enterprise',
          activeSubscriptionsCount: 1,
          totalSpent: inv.totalAmount,
          createdAt: '2026-01-01',
        });
      }
    });
    return list;
  }, [invoices]);

  // Selected Invoice object in the Form
  const selectedFormInvoice = useMemo(() => {
    if (!formInvoiceId) return null;
    return invoices.find((inv) => inv.id === formInvoiceId) || null;
  }, [formInvoiceId, invoices]);

  // Candidate Unpaid Invoices for the Selected Customer in Form
  const customerUnpaidInvoices = useMemo(() => {
    if (!formCustomerId) return [];
    const cust = customersList.find((c) => c.id === formCustomerId);
    return invoices.filter((inv) => {
      const matchCustomer =
        inv.customerId === formCustomerId ||
        (cust && inv.companyName.toLowerCase() === cust.companyName.toLowerCase());
      const hasBalance = (inv.amountDue ?? (inv.totalAmount - inv.paidAmount)) > 0;
      return matchCustomer && hasBalance && inv.status !== 'Cancelled';
    });
  }, [formCustomerId, invoices, customersList]);

  // When customer changes in form, reset invoice or auto-select first unpaid invoice
  const handleCustomerChange = (customerId: string) => {
    setFormCustomerId(customerId);
    const cust = customersList.find((c) => c.id === customerId);
    const unpaid = invoices.filter((inv) => {
      const matchCustomer =
        inv.customerId === customerId ||
        (cust && inv.companyName.toLowerCase() === cust.companyName.toLowerCase());
      const hasBalance = (inv.amountDue ?? (inv.totalAmount - inv.paidAmount)) > 0;
      return matchCustomer && hasBalance && inv.status !== 'Cancelled';
    });

    if (unpaid.length > 0) {
      setFormInvoiceId(unpaid[0].id);
      const balance = unpaid[0].amountDue ?? (unpaid[0].totalAmount - unpaid[0].paidAmount);
      setFormAmount(balance);
    } else {
      setFormInvoiceId('');
      setFormAmount('');
    }
  };

  // When invoice selection changes in form, auto-fill amount with outstanding balance
  const handleInvoiceChange = (invoiceId: string) => {
    setFormInvoiceId(invoiceId);
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv) {
      const balance = inv.amountDue ?? (inv.totalAmount - inv.paidAmount);
      setFormAmount(balance);
    }
  };

  // Quick helper to generate a demo transaction reference
  const handleGenerateDemoRef = () => {
    const prefixes: Record<string, string> = {
      'Bank Transfer': 'UTR-',
      UPI: 'UPI-',
      'Credit Card': 'AUTH-',
      'Debit Card': 'POS-',
      Cash: 'CASH-REC-',
      Other: 'TXN-',
      Stripe: 'STR-',
      'Direct Debit': 'ACH-',
      PayPal: 'PP-',
    };
    const prefix = prefixes[formMethod] || 'TXN-';
    const num = Math.floor(100000000 + Math.random() * 900000000);
    setFormTransactionRef(`${prefix}${num}`);
  };

  // Open Record Payment Modal (optionally pre-filled for a specific invoice)
  const handleOpenRecordModal = (prefillInvoice?: Invoice) => {
    setFormError(null);
    if (prefillInvoice) {
      setFormCustomerId(prefillInvoice.customerId || '');
      setFormInvoiceId(prefillInvoice.id);
      const balance = prefillInvoice.amountDue ?? (prefillInvoice.totalAmount - prefillInvoice.paidAmount);
      setFormAmount(balance);
      setFormNotes(`Payment settlement for invoice ${prefillInvoice.invoiceNumber}`);
    } else {
      const defaultCust = customersList[0];
      if (defaultCust) {
        handleCustomerChange(defaultCust.id);
      }
      setFormNotes('');
    }
    setFormPaymentDate(new Date().toISOString().split('T')[0]);
    setFormMethod('Bank Transfer');
    setFormStatus('Recorded');
    const demoNum = Math.floor(100000000 + Math.random() * 900000000);
    setFormTransactionRef(`UTR-${demoNum}`);
    setIsRecordModalOpen(true);
  };

  // Submit Payment Record
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCustomerId) {
      setFormError('Please select a customer.');
      return;
    }
    if (!formInvoiceId) {
      setFormError('Please select an outstanding invoice.');
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      setFormError('Payment amount must be greater than zero.');
      return;
    }
    if (!formTransactionRef.trim()) {
      setFormError('Transaction Reference (UTR / Auth Code) is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cust = customersList.find((c) => c.id === formCustomerId);
      const inv = invoices.find((i) => i.id === formInvoiceId);

      const newPayment = PaymentService.recordPayment(
        {
          customerId: formCustomerId,
          customerName: cust?.name || inv?.customerName,
          companyName: cust?.companyName || inv?.companyName,
          invoiceId: formInvoiceId,
          invoiceNumber: inv?.invoiceNumber,
          subscriptionId: inv?.subscriptionId,
          subscriptionNumber: inv?.subscriptionNumber,
          amount: Number(formAmount),
          paymentDate: formPaymentDate,
          method: formMethod,
          transactionReference: formTransactionRef.trim(),
          status: formStatus,
          notes: formNotes.trim(),
          recordedBy: user?.name || 'Staff Member',
        },
        user?.name || 'Staff Member'
      );

      reloadData();
      setIsRecordModalOpen(false);
      showFeedback(
        'success',
        `Payment ${newPayment.paymentNumber} of ${formatCurrency(newPayment.amount)} recorded successfully!`
      );
    } catch (err: any) {
      setFormError(err?.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Payment Reversal
  const handleConfirmReversal = () => {
    if (!reversingPayment) return;
    if (!reversalReason.trim()) {
      showFeedback('error', 'Please provide a reason for reversing this payment.');
      return;
    }

    try {
      PaymentService.reversePayment(reversingPayment.id, {
        reason: reversalReason.trim(),
        reversedBy: user?.name || 'Authorized Admin',
      });
      reloadData();
      setReversingPayment(null);
      setReversalReason('');
      showFeedback(
        'success',
        `Payment ${reversingPayment.paymentNumber} was successfully reversed and invoice balance was restored.`
      );
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to reverse payment.');
    }
  };

  // Open Follow-Up Log Modal
  const handleOpenFollowUp = (inv: Invoice) => {
    setActiveFollowUpInvoice(inv);
    setFollowUpNotes(PaymentService.getFollowUpNotes(inv.id));
    setNewFollowUpNote('');
    setNewFollowUpContact(inv.customerName);
    setNewFollowUpAction('Payment Reminder Email');
  };

  // Save Follow-Up Note
  const handleSaveFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFollowUpInvoice || !newFollowUpNote.trim()) return;

    PaymentService.addFollowUpNote({
      invoiceId: activeFollowUpInvoice.id,
      invoiceNumber: activeFollowUpInvoice.invoiceNumber,
      customerName: activeFollowUpInvoice.customerName,
      note: newFollowUpNote,
      actionTaken: newFollowUpAction,
      contactPerson: newFollowUpContact,
      recordedBy: user?.name || 'Billing Specialist',
    });

    setFollowUpNotes(PaymentService.getFollowUpNotes(activeFollowUpInvoice.id));
    setNewFollowUpNote('');
    showFeedback('success', 'Follow-up interaction logged successfully.');
  };

  // Export payments to CSV
  const handleExportCSV = () => {
    const headers = [
      'Payment #',
      'Transaction Ref',
      'Invoice #',
      'Subscription #',
      'Customer',
      'Company',
      'Amount',
      'Method',
      'Status',
      'Payment Date',
      'Recorded By',
      'Notes',
    ];

    const rows = filteredPayments.map((p) => [
      p.paymentNumber,
      p.transactionReference,
      p.invoiceNumber,
      p.subscriptionNumber || '',
      `"${p.customerName}"`,
      `"${p.companyName}"`,
      p.amount,
      p.method,
      p.status,
      p.paymentDate,
      `"${p.recordedBy || ''}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Brightloop_Payments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNumber = p.paymentNumber?.toLowerCase().includes(q);
          const matchCustomer = p.customerName?.toLowerCase().includes(q);
          const matchCompany = p.companyName?.toLowerCase().includes(q);
          const matchInvoice = p.invoiceNumber?.toLowerCase().includes(q);
          const matchTxn = p.transactionReference?.toLowerCase().includes(q);
          if (!matchNumber && !matchCustomer && !matchCompany && !matchInvoice && !matchTxn) {
            return false;
          }
        }

        // Method Filter
        if (selectedMethod !== 'ALL' && p.method !== selectedMethod) {
          return false;
        }

        // Status Filter
        if (selectedStatus !== 'ALL') {
          if (selectedStatus === 'Recorded') {
            if (p.status !== 'Recorded' && (p.status as string) !== 'Completed') return false;
          } else if (p.status !== selectedStatus) {
            return false;
          }
        }

        // Date Range
        if (dateFrom && p.paymentDate < dateFrom) return false;
        if (dateTo && p.paymentDate > dateTo) return false;

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy];
        let valB: any = b[sortBy];
        if (sortBy === 'amount') {
          valA = a.amount;
          valB = b.amount;
        }
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [payments, searchQuery, selectedMethod, selectedStatus, dateFrom, dateTo, sortBy, sortOrder]);

  // Paginated Payments
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage, itemsPerPage]);

  // Filtered Outstanding Invoices List
  const outstandingInvoices = useMemo(() => {
    const all = PaymentService.getOutstandingInvoices();
    return all
      .filter((item) => {
        if (overdueOnly && !item.isOverdue) return false;
        if (outstandingSearch.trim()) {
          const q = outstandingSearch.toLowerCase();
          const matchInv = item.invoice.invoiceNumber.toLowerCase().includes(q);
          const matchCust = item.invoice.customerName.toLowerCase().includes(q);
          const matchComp = item.invoice.companyName.toLowerCase().includes(q);
          return matchInv || matchCust || matchComp;
        }
        return true;
      })
      .sort((a, b) => {
        if (outstandingSort === 'amountDue') {
          return (b.invoice.amountDue || 0) - (a.invoice.amountDue || 0);
        }
        if (outstandingSort === 'daysOverdue') {
          return b.daysOverdue - a.daysOverdue;
        }
        return a.invoice.dueDate.localeCompare(b.invoice.dueDate);
      });
  }, [invoices, outstandingSearch, overdueOnly, outstandingSort]);

  // Status Badge Helper
  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Recorded':
      case 'Completed':
        return <Badge variant="emerald">Recorded</Badge>;
      case 'Pending':
        return <Badge variant="amber">Pending</Badge>;
      case 'Failed':
        return <Badge variant="rose">Failed</Badge>;
      case 'Reversed':
        return <Badge variant="slate">Reversed</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  // Payment Table Columns
  const paymentColumns: Column<Payment>[] = [
    {
      header: 'Payment Reference',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block font-mono text-xs">
            {row.paymentNumber}
          </span>
          <span className="text-[11px] font-mono text-slate-400 truncate block">
            {row.transactionReference}
          </span>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.companyName}</p>
          <p className="text-xs text-slate-500">{row.customerName}</p>
        </div>
      ),
    },
    {
      header: 'Invoice #',
      cell: (row) => (
        <div>
          <span className="font-mono text-indigo-600 font-semibold text-xs block">
            {row.invoiceNumber}
          </span>
          {row.subscriptionNumber && (
            <span className="text-[10px] text-slate-400 block font-mono">
              {row.subscriptionNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Payment Date',
      cell: (row) => <span className="text-xs text-slate-600">{formatDate(row.paymentDate)}</span>,
    },
    {
      header: 'Method',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
          {row.method}
        </span>
      ),
    },
    {
      header: 'Amount',
      cell: (row) => (
        <span
          className={`font-bold ${
            row.status === 'Reversed'
              ? 'text-slate-400 line-through'
              : row.status === 'Failed'
              ? 'text-rose-600'
              : 'text-emerald-700'
          }`}
        >
          {row.status === 'Reversed' ? '' : '+'}
          {formatCurrency(row.amount)}
        </span>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: 'Status',
      cell: (row) => getPaymentStatusBadge(row.status),
    },
    {
      header: 'Recorded By',
      cell: (row) => (
        <span className="text-xs text-slate-500">{row.recordedBy || 'System Admin'}</span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={() => setViewingPayment(row)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="View Payment Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const inv = invoices.find((i) => i.id === row.invoiceId);
              PDFGenerator.downloadPaymentReceiptPDF(row, inv);
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Download PDF Receipt"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const inv = invoices.find((i) => i.id === row.invoiceId);
              PDFGenerator.printPaymentReceipt(row, inv);
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Print Receipt"
          >
            <Printer className="w-4 h-4" />
          </button>
          {row.status === 'Recorded' || (row.status as string) === 'Completed' ? (
            <button
              type="button"
              onClick={() => {
                setReversingPayment(row);
                setReversalReason('');
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Reverse Payment"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          ) : null}
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
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-xl shadow-md shadow-indigo-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Payment Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Reconcile collections, track customer remittances, allocate payments to invoices, and audit transactions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleOpenRecordModal()}
            icon={<Plus className="w-4 h-4" />}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* KPI Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Payments Received
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-2">
            {formatCurrency(summary.totalReceived)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary.totalPaymentsCount} verified receipts
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-amber-600 mt-2">
            {formatCurrency(summary.totalOutstanding)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Accounts receivable balance
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Overdue Amount
            </span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-rose-600 mt-2">
            {formatCurrency(summary.totalOverdue)}
          </p>
          <p className="text-[11px] text-rose-600 font-semibold mt-1">
            Requires follow-up action
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Partially Paid
            </span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            {summary.partiallyPaidCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Invoices with partial credits
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Fully Settled
            </span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-indigo-600 mt-2">
            {summary.fullyPaidCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Paid-in-full invoices
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'transactions'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payment History & Transactions</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'transactions' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {payments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('outstanding')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'outstanding'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Outstanding & Overdue Invoices</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'outstanding' ? 'bg-indigo-700 text-white' : 'bg-rose-100 text-rose-700 font-bold'
            }`}
          >
            {outstandingInvoices.length}
          </span>
        </button>
      </div>

      {/* Tab 1: All Payment Transactions */}
      {activeTab === 'transactions' && (
        <Card>
          <CardHeader
            title="Processed Payments & Settlements"
            subtitle="Full ledger of remittances, gate transactions, wire transfers, and cash receipts"
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {filteredPayments.length} of {payments.length} payments
                </span>
              </div>
            }
          />
          <CardContent className="space-y-4">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search payment #, customer, invoice #, or UTR..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={selectedMethod}
                  onChange={(e) => {
                    setSelectedMethod(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ALL">All Methods</option>
                  {PAYMENT_METHODS.filter((m) => m !== 'ALL').map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  {PAYMENT_STATUSES.filter((s) => s !== 'ALL').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-1/2 rounded-lg border border-slate-300 py-1.5 px-2 text-[11px] text-slate-700 focus:border-indigo-500 focus:outline-none"
                  title="Date From"
                />
                <span className="text-slate-400 text-xs">→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-1/2 rounded-lg border border-slate-300 py-1.5 px-2 text-[11px] text-slate-700 focus:border-indigo-500 focus:outline-none"
                  title="Date To"
                />
              </div>

              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="paymentDate">Date</option>
                  <option value="amount">Amount</option>
                  <option value="paymentNumber">Ref #</option>
                  <option value="customerName">Customer</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                  className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-200 text-slate-600 shrink-0"
                  title={`Order: ${sortOrder.toUpperCase()}`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <Table
                columns={paymentColumns}
                data={paginatedPayments}
                keyExtractor={(row) => row.id}
                emptyMessage="No payment transactions found matching the selected criteria."
              />
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>
                  Page {currentPage} of {totalPages} ({filteredPayments.length} records)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    icon={<ChevronLeft className="w-3.5 h-3.5" />}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Outstanding & Overdue Invoices */}
      {activeTab === 'outstanding' && (
        <Card>
          <CardHeader
            title="Outstanding Collections & Receivables"
            subtitle="Track pending invoices, days overdue, customer follow-ups, and initiate instant settlements"
            action={
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-rose-700 cursor-pointer bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                  <input
                    type="checkbox"
                    checked={overdueOnly}
                    onChange={(e) => setOverdueOnly(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>Show Overdue Only</span>
                </label>
              </div>
            }
          />
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by invoice # or customer..."
                  value={outstandingSearch}
                  onChange={(e) => setOutstandingSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Sort By:</span>
                <select
                  value={outstandingSort}
                  onChange={(e) => setOutstandingSort(e.target.value as any)}
                  className="rounded-lg border border-slate-300 py-1 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="amountDue">Outstanding Amount</option>
                  <option value="daysOverdue">Days Overdue</option>
                  <option value="dueDate">Due Date</option>
                </select>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Invoice & Dates</th>
                    <th className="p-3 text-right">Invoice Total</th>
                    <th className="p-3 text-right">Paid Amount</th>
                    <th className="p-3 text-right">Balance Due</th>
                    <th className="p-3 text-center">Overdue Aging</th>
                    <th className="p-3 text-center">Follow-ups</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {outstandingInvoices.length > 0 ? (
                    outstandingInvoices.map(({ invoice: inv, daysOverdue, isOverdue }) => {
                      const notesCount = PaymentService.getFollowUpNotes(inv.id).length;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <span className="font-semibold text-slate-900 block">{inv.companyName}</span>
                            <span className="text-slate-500 text-[11px]">{inv.customerName}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-semibold text-indigo-600 block">
                              {inv.invoiceNumber}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              Due: {formatDate(inv.dueDate)}
                            </span>
                          </td>
                          <td className="p-3 text-right text-slate-600 font-medium">
                            {formatCurrency(inv.totalAmount)}
                          </td>
                          <td className="p-3 text-right text-emerald-700 font-semibold">
                            {formatCurrency(inv.paidAmount || 0)}
                          </td>
                          <td className="p-3 text-right font-bold text-rose-600">
                            {formatCurrency(inv.amountDue || inv.outstandingAmount || 0)}
                          </td>
                          <td className="p-3 text-center">
                            {isOverdue ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                {daysOverdue} days overdue
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Current (Within terms)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenFollowUp(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                              <span>{notesCount}</span>
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenRecordModal(inv)}
                                icon={<CreditCard className="w-3.5 h-3.5" />}
                              >
                                Record Payment
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No outstanding or overdue invoices found. All customer accounts are settled!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Incoming Payment"
        description="Allocate received funds to outstanding invoices and update financial balances transactionally"
        maxWidth="lg"
      >
        {formError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Customer *
              </label>
              <select
                value={formCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                required
              >
                <option value="">-- Choose Customer --</option>
                {customersList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Outstanding Invoice *
              </label>
              <select
                value={formInvoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                required
              >
                <option value="">-- Choose Invoice --</option>
                {customerUnpaidInvoices.map((inv) => {
                  const bal = inv.amountDue ?? (inv.totalAmount - inv.paidAmount);
                  return (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — Due: {formatCurrency(bal)} (Total: {formatCurrency(inv.totalAmount)})
                    </option>
                  );
                })}
              </select>
              {formCustomerId && customerUnpaidInvoices.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Selected customer has no unpaid invoices.
                </p>
              )}
            </div>
          </div>

          {/* Auto-populated Invoice Allocation Preview */}
          {selectedFormInvoice && (
            <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200 text-xs">
              <span className="font-bold text-indigo-950 uppercase tracking-wider text-[11px] block mb-2">
                Live Invoice Reconciliation Preview
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-500 block">Invoice Total</span>
                  <span className="font-semibold">{formatCurrency(selectedFormInvoice.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Already Paid</span>
                  <span className="font-semibold text-emerald-700">
                    {formatCurrency(selectedFormInvoice.paidAmount || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Outstanding</span>
                  <span className="font-bold text-rose-600">
                    {formatCurrency(selectedFormInvoice.amountDue ?? selectedFormInvoice.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Remaining Balance</span>
                  <span className="font-bold text-indigo-700">
                    {formatCurrency(
                      Math.max(
                        0,
                        (selectedFormInvoice.amountDue ?? selectedFormInvoice.totalAmount) -
                          (Number(formAmount) || 0)
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Amount ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formAmount}
                onChange={(e) => setFormAmount(parseFloat(e.target.value) || '')}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none font-semibold"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                required
              >
                <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/Wire)</option>
                <option value="UPI">UPI / Instant Pay</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cash">Cash Receipt</option>
                <option value="Other">Other / Cheque</option>
              </select>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={formPaymentDate}
                onChange={(e) => setFormPaymentDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Transaction Reference */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Transaction Reference / UTR Number *
              </label>
              <button
                type="button"
                onClick={handleGenerateDemoRef}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto-Generate Reference
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. UTR-9842104921, AUTH-88219482, UPI-REF-441029"
              value={formTransactionRef}
              onChange={(e) => setFormTransactionRef(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono uppercase text-slate-900 focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Settlement Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
              >
                <option value="Recorded">Recorded (Verified funds, reduce invoice balance)</option>
                <option value="Pending">Pending (Awaiting clearance, do not reduce balance)</option>
                <option value="Failed">Failed (Rejected transaction log)</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Remarks / Reference Note
              </label>
              <input
                type="text"
                placeholder="e.g. Received via Citi account batch #19"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRecordModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm & Post Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment Details Modal */}
      {viewingPayment && (
        <Modal
          isOpen={!!viewingPayment}
          onClose={() => setViewingPayment(null)}
          title={`Payment Receipt ${viewingPayment.paymentNumber}`}
          description={`Processed remittance record for ${viewingPayment.companyName}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Receipt Summary Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  Amount Received
                </span>
                <span className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(viewingPayment.amount)}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Method: <strong>{viewingPayment.method}</strong> · Transaction Ref:{' '}
                  <code className="text-indigo-600 font-mono font-bold">
                    {viewingPayment.transactionReference}
                  </code>
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-1">
                {getPaymentStatusBadge(viewingPayment.status)}
                <span className="text-slate-400 text-[11px]">
                  Processed on {formatDate(viewingPayment.paymentDate)}
                </span>
              </div>
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Payer Details
                </span>
                <p className="font-semibold text-slate-900">{viewingPayment.companyName}</p>
                <p className="text-slate-600">Contact: {viewingPayment.customerName}</p>
                <p className="text-slate-400 text-[11px]">Customer ID: {viewingPayment.customerId}</p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Reconciliation Allocation
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Reference:</span>
                  <span className="font-mono font-semibold text-indigo-600">
                    {viewingPayment.invoiceNumber}
                  </span>
                </div>
                {viewingPayment.subscriptionNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subscription:</span>
                    <span className="font-mono text-slate-700">
                      {viewingPayment.subscriptionNumber}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Recorded By:</span>
                  <span className="font-medium text-slate-800">{viewingPayment.recordedBy || 'System'}</span>
                </div>
              </div>
            </div>

            {viewingPayment.notes && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Audit Notes
                </span>
                <p className="text-slate-700 mt-1">{viewingPayment.notes}</p>
              </div>
            )}

            {viewingPayment.status === 'Reversed' && (
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>Payment Formally Reversed</span>
                </div>
                <p className="text-xs">
                  Reversed on {formatDate(viewingPayment.reversedAt || '')} by {viewingPayment.reversedBy}.
                </p>
                <p className="text-xs italic">Reason: "{viewingPayment.reversedReason}"</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div>
                {(viewingPayment.status === 'Recorded' || (viewingPayment.status as string) === 'Completed') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReversingPayment(viewingPayment);
                      setViewingPayment(null);
                    }}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Reverse This Payment
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const inv = invoices.find((i) => i.id === viewingPayment.invoiceId);
                    PDFGenerator.printPaymentReceipt(viewingPayment, inv);
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
                    const inv = invoices.find((i) => i.id === viewingPayment.invoiceId);
                    PDFGenerator.downloadPaymentReceiptPDF(viewingPayment, inv);
                  }}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Download Receipt PDF
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Reversal Confirmation Modal */}
      {reversingPayment && (
        <Modal
          isOpen={!!reversingPayment}
          onClose={() => setReversingPayment(null)}
          title={`Reverse Payment ${reversingPayment.paymentNumber}?`}
          description="Auditable financial reversal restores the outstanding balance on the associated invoice"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Important Accounting Reversal Notice</p>
                <p className="mt-1">
                  Reversing this payment of <strong>{formatCurrency(reversingPayment.amount)}</strong> will
                  automatically restore the balance due on Invoice{' '}
                  <strong>{reversingPayment.invoiceNumber}</strong>. The payment history record will not be deleted,
                  maintaining a permanent audit trail.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Reversal Reason *
              </label>
              <textarea
                rows={3}
                placeholder="Explain reason for reversal (e.g. Bank chargeback, customer duplicate wire, bounced cheque)..."
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReversingPayment(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!reversalReason.trim()}
                onClick={handleConfirmReversal}
                className="bg-rose-600 hover:bg-rose-700 text-white"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Confirm Financial Reversal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Follow-up Notes Modal */}
      {activeFollowUpInvoice && (
        <Modal
          isOpen={!!activeFollowUpInvoice}
          onClose={() => setActiveFollowUpInvoice(null)}
          title={`Collection Follow-up: ${activeFollowUpInvoice.invoiceNumber}`}
          description={`Payment communication logs with ${activeFollowUpInvoice.companyName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {/* New Follow-up Form */}
            <form onSubmit={handleSaveFollowUp} className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                Log New Communication
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">Action Taken</label>
                  <select
                    value={newFollowUpAction}
                    onChange={(e) => setNewFollowUpAction(e.target.value)}
                    className="w-full rounded-md border border-slate-300 py-1 px-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="Payment Reminder Email">Payment Reminder Email</option>
                    <option value="Phone Call with Finance">Phone Call with Finance</option>
                    <option value="Account Escalation Notice">Account Escalation Notice</option>
                    <option value="Promised Payment Date">Promised Payment Date</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-0.5">Contact Person</label>
                  <input
                    type="text"
                    value={newFollowUpContact}
                    onChange={(e) => setNewFollowUpContact(e.target.value)}
                    className="w-full rounded-md border border-slate-300 py-1 px-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5">Notes & Outcome *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Spoke with accounts payable lead, promised wire transfer by Thursday..."
                  value={newFollowUpNote}
                  onChange={(e) => setNewFollowUpNote(e.target.value)}
                  className="w-full rounded-md border border-slate-300 py-1 px-2 text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newFollowUpNote.trim()}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Log Interaction
                </Button>
              </div>
            </form>

            {/* Past Interactions List */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                Interaction History ({followUpNotes.length})
              </span>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {followUpNotes.length > 0 ? (
                  followUpNotes.map((note) => (
                    <div key={note.id} className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{note.actionTaken}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(note.createdAt)}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{note.note}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Logged by {note.recordedBy} · Contact: {note.contactPerson || 'N/A'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-slate-400 italic">
                    No follow-up interactions logged yet for this invoice.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveFollowUpInvoice(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
