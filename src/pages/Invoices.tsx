import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Eye,
  Download,
  Printer,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Repeat,
  Percent,
  Play,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  TaxRule,
  TaxType,
  BillingHistory,
  Subscription,
  Product,
} from '../types';
import { InvoiceService } from '../services/invoiceService';
import { TaxService } from '../services/taxService';
import { BillingService } from '../services/billingService';
import { SubscriptionService } from '../services/subscriptionService';
import { ProductService } from '../services/productService';
import { mockRecentCustomers } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { PDFGenerator } from '../utils/pdfGenerator';
import { formatCurrency, formatDate } from '../utils/formatters';

const STATUS_FILTERS: ('ALL' | InvoiceStatus)[] = [
  'ALL',
  'Draft',
  'Confirmed',
  'Sent',
  'Paid',
  'Partially Paid',
  'Overdue',
  'Cancelled',
];

const TAX_TYPES: TaxType[] = ['GST', 'VAT', 'Sales Tax', 'Corporate', 'Custom'];

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Active Tab: 'pipeline' | 'tax' | 'billing'
  const [activeTab, setActiveTab] = useState<'pipeline' | 'tax' | 'billing'>('pipeline');

  // Core Data State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Search, Filters & Sorting (Invoices)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [dueDateFilter, setDueDateFilter] = useState('');
  const [sortBy, setSortBy] = useState<'invoiceNumber' | 'customerName' | 'invoiceDate' | 'dueDate' | 'totalAmount' | 'amountDue'>('invoiceDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Tax Rule Modals
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [editingTaxRule, setEditingTaxRule] = useState<TaxRule | null>(null);
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState<number>(18);
  const [taxType, setTaxType] = useState<TaxType>('GST');
  const [taxDescription, setTaxDescription] = useState('');
  const [taxSelectedProducts, setTaxSelectedProducts] = useState<string[]>([]);
  const [taxStatus, setTaxStatus] = useState<'Active' | 'Inactive'>('Active');
  const [taxFormError, setTaxFormError] = useState<string | null>(null);

  // Create Invoice Form State
  const [associatedSubId, setAssociatedSubId] = useState<string>('');
  const [formCustomerId, setFormCustomerId] = useState<string>('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formCustomerEmail, setFormCustomerEmail] = useState('');
  const [formInvoiceDate, setFormInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30 Days');
  const [formNotes, setFormNotes] = useState('');
  const [formLines, setFormLines] = useState<InvoiceLine[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Data on Mount & Listen to Billing Engine Events
  useEffect(() => {
    refreshAllData();

    // Start background scheduler if not already running
    BillingService.startBackgroundScheduler(30000);

    // Subscribe to background billing triggers
    const unsubscribe = BillingService.subscribe((result) => {
      refreshAllData();
      if (result.invoicesCreated.length > 0) {
        showFeedback(
          'success',
          `Background billing cycle generated ${result.invoicesCreated.length} recurring invoice(s).`
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshAllData = () => {
    setInvoices(InvoiceService.getInvoices());
    setTaxRules(TaxService.getTaxRules());
    setBillingHistory(BillingService.getBillingHistory());
    setSubscriptions(SubscriptionService.getSubscriptions());
    setProducts(ProductService.getProducts());
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const validInvoices = invoices.filter((i) => i.status !== 'Cancelled');
    const totalInvoiced = validInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const paidRevenue = validInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const outstandingAmount = validInvoices.reduce((sum, i) => sum + (i.amountDue ?? (i.totalAmount - i.paidAmount)), 0);
    const overdueList = invoices.filter((i) => i.status === 'Overdue');
    const overdueAmount = overdueList.reduce((sum, i) => sum + (i.amountDue ?? (i.totalAmount - i.paidAmount)), 0);

    return {
      totalCount: invoices.length,
      totalInvoiced,
      paidRevenue,
      outstandingAmount,
      overdueCount: overdueList.length,
      overdueAmount,
    };
  }, [invoices]);

  // Compute Create Form Totals dynamically using TaxService
  const formTotals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    formLines.forEach((line) => {
      const lineSubtotal = line.quantity * line.unitPrice;
      const taxAmt = TaxService.calculateTax(lineSubtotal, line.taxRate);
      subtotal += lineSubtotal;
      taxTotal += taxAmt;
      discountTotal += line.discountAmount || 0;
    });

    const grandTotal = Math.max(0, subtotal + taxTotal - discountTotal);
    return { subtotal, taxTotal, discountTotal, grandTotal };
  }, [formLines]);

  // Handle Associated Subscription Change in Create Form
  const handleSelectAssociatedSubscription = (subId: string) => {
    setAssociatedSubId(subId);
    if (!subId) return;

    const sub = subscriptions.find((s) => s.id === subId);
    if (!sub) return;

    // Automatically pre-populate customer details from subscription
    setFormCustomerId(sub.customerId);
    setFormCustomerName(sub.customerName);
    setFormCompanyName(sub.companyName);
    setFormCustomerEmail(sub.customerEmail || '');
    setFormPaymentTerms(sub.paymentTerms || 'Net 30 Days');

    // Calculate due date based on payment terms
    const invDate = new Date(formInvoiceDate);
    if (sub.paymentTerms?.toLowerCase().includes('15')) {
      invDate.setDate(invDate.getDate() + 15);
    } else if (sub.paymentTerms?.toLowerCase().includes('60')) {
      invDate.setDate(invDate.getDate() + 60);
    } else if (sub.paymentTerms?.toLowerCase().includes('receipt')) {
      // Due immediately
    } else {
      invDate.setDate(invDate.getDate() + 30);
    }
    setFormDueDate(invDate.toISOString().split('T')[0]);

    // Automatically pre-populate product lines from subscription
    if (sub.items && sub.items.length > 0) {
      const lines: InvoiceLine[] = sub.items.map((item, idx) => {
        const taxRate = TaxService.getTaxRateForProduct(item.productId);
        const subtotal = item.quantity * item.unitPrice;
        const taxAmount = TaxService.calculateTax(subtotal, taxRate);
        return {
          id: `form_line_${idx}`,
          productId: item.productId,
          productName: item.productName,
          variantId: item.variant,
          variantName: item.variantName || item.variant,
          description: `${item.productName}${item.variantName ? ` (${item.variantName})` : ''} — ${sub.billingCycle} recurring service`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate,
          taxAmount,
          discountAmount: 0,
          lineTotal: subtotal + taxAmount,
        };
      });
      setFormLines(lines);
    } else {
      // Plan bundled line
      const taxRate = TaxService.getTaxRateForProduct(sub.planId);
      const subtotal = sub.mrrAmount;
      const taxAmount = TaxService.calculateTax(subtotal, taxRate);
      setFormLines([
        {
          id: `form_line_0`,
          productId: sub.planId || 'plan_bundle',
          productName: sub.planName,
          description: `${sub.planName} (${sub.billingCycle}) bundled subscription plan`,
          quantity: 1,
          unitPrice: sub.mrrAmount,
          taxRate,
          taxAmount,
          discountAmount: 0,
          lineTotal: subtotal + taxAmount,
        },
      ]);
    }
  };

  // Open Create Invoice Modal
  const handleOpenCreateInvoice = () => {
    const defaultCust = mockRecentCustomers[0];
    const defaultProduct = products[0];
    const today = new Date().toISOString().split('T')[0];

    const due = new Date();
    due.setDate(due.getDate() + 30);

    setAssociatedSubId('');
    setFormCustomerId(defaultCust ? defaultCust.id : '');
    setFormCustomerName(defaultCust ? defaultCust.name : '');
    setFormCompanyName(defaultCust ? defaultCust.companyName : '');
    setFormCustomerEmail(defaultCust ? defaultCust.email : '');
    setFormInvoiceDate(today);
    setFormDueDate(due.toISOString().split('T')[0]);
    setFormPaymentTerms('Net 30 Days');
    setFormNotes('Thank you for choosing Brightloop Software.');

    if (defaultProduct) {
      const taxRate = TaxService.getTaxRateForProduct(defaultProduct.id);
      const price = defaultProduct.salesPrice || 250;
      const taxAmount = TaxService.calculateTax(price, taxRate);
      setFormLines([
        {
          id: `line_${Date.now()}`,
          productId: defaultProduct.id,
          productName: defaultProduct.name,
          variantName: defaultProduct.variants?.[0]?.name,
          description: defaultProduct.description || `${defaultProduct.name} software license`,
          quantity: 1,
          unitPrice: price,
          taxRate,
          taxAmount,
          discountAmount: 0,
          lineTotal: price + taxAmount,
        },
      ]);
    } else {
      setFormLines([]);
    }

    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Line item helpers
  const handleAddLine = () => {
    const p = products[0];
    if (!p) return;
    const taxRate = TaxService.getTaxRateForProduct(p.id);
    const unitPrice = p.salesPrice || 100;
    const taxAmount = TaxService.calculateTax(unitPrice, taxRate);

    setFormLines((prev) => [
      ...prev,
      {
        id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: p.id,
        productName: p.name,
        variantName: p.variants?.[0]?.name,
        description: p.name,
        quantity: 1,
        unitPrice,
        taxRate,
        taxAmount,
        discountAmount: 0,
        lineTotal: unitPrice + taxAmount,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (formLines.length === 1) {
      setFormError('An invoice must contain at least one line item.');
      return;
    }
    setFormLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateLine = (
    index: number,
    field: 'productId' | 'variantName' | 'quantity' | 'unitPrice' | 'taxRate' | 'discountAmount',
    val: any
  ) => {
    setFormLines((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (field === 'productId') {
        const prod = products.find((p) => p.id === val);
        if (prod) {
          target.productId = prod.id;
          target.productName = prod.name;
          target.variantName = prod.variants?.[0]?.name;
          target.description = prod.description || prod.name;
          target.unitPrice = prod.salesPrice;
          target.taxRate = TaxService.getTaxRateForProduct(prod.id);
        }
      } else if (field === 'variantName') {
        target.variantName = val;
        const prod = products.find((p) => p.id === target.productId);
        const variantObj = prod?.variants?.find((v) => v.name === val);
        if (prod) {
          target.unitPrice = prod.salesPrice + (variantObj?.priceAdjustment || 0);
        }
      } else if (field === 'quantity') {
        target.quantity = Math.max(1, parseInt(val, 10) || 1);
      } else if (field === 'unitPrice') {
        target.unitPrice = Math.max(0, parseFloat(val) || 0);
      } else if (field === 'taxRate') {
        target.taxRate = Math.max(0, parseFloat(val) || 0);
      } else if (field === 'discountAmount') {
        target.discountAmount = Math.max(0, parseFloat(val) || 0);
      }

      const lineSub = target.quantity * target.unitPrice;
      target.taxAmount = TaxService.calculateTax(lineSub, target.taxRate);
      target.lineTotal = Math.max(0, lineSub + target.taxAmount - (target.discountAmount || 0));

      updated[index] = target;
      return updated;
    });
  };

  // Submit Create Invoice
  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCustomerId) {
      setFormError('Please select a customer for this invoice.');
      return;
    }
    if (formLines.length === 0) {
      setFormError('Invoice must contain at least one line item.');
      return;
    }
    if (!formDueDate) {
      setFormError('Please specify a payment due date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const sub = subscriptions.find((s) => s.id === associatedSubId);
      const newInv = InvoiceService.createInvoice({
        customerId: formCustomerId,
        customerName: formCustomerName,
        companyName: formCompanyName,
        customerEmail: formCustomerEmail,
        subscriptionId: sub?.id,
        subscriptionNumber: sub?.subscriptionNumber,
        invoiceDate: formInvoiceDate,
        issueDate: formInvoiceDate,
        dueDate: formDueDate,
        paymentTerms: formPaymentTerms,
        notes: formNotes,
        status: 'Draft',
        items: formLines,
        paidAmount: 0,
        discountTotal: formTotals.discountTotal,
      });

      setInvoices((prev) => [newInv, ...prev]);
      setIsCreateModalOpen(false);
      showFeedback('success', `Invoice ${newInv.invoiceNumber} drafted successfully.`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Invoice Pipeline Actions
  const handleConfirmInvoice = (inv: Invoice) => {
    try {
      const updated = InvoiceService.confirmInvoice(inv.id);
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      if (viewingInvoice?.id === inv.id) setViewingInvoice(updated);
      showFeedback('success', `Invoice ${inv.invoiceNumber} confirmed.`);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to confirm invoice.');
    }
  };

  const handleSendInvoice = (inv: Invoice) => {
    try {
      const updated = InvoiceService.sendInvoice(inv.id);
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      if (viewingInvoice?.id === inv.id) setViewingInvoice(updated);
      showFeedback(
        'success',
        `Invoice ${inv.invoiceNumber} sent to ${inv.customerEmail || inv.customerName}.`
      );
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to send invoice.');
    }
  };

  const handleConfirmCancelInvoice = () => {
    if (!cancellingInvoice) return;
    try {
      const updated = InvoiceService.cancelInvoice(cancellingInvoice.id, cancelReason);
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      if (viewingInvoice?.id === cancellingInvoice.id) setViewingInvoice(updated);
      showFeedback('success', `Invoice ${cancellingInvoice.invoiceNumber} has been cancelled.`);
      setCancellingInvoice(null);
      setCancelReason('');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to cancel invoice.');
    }
  };

  // PDF & Print Actions
  const handlePrint = (inv: Invoice) => {
    PDFGenerator.printInvoice(inv);
  };

  const handleDownloadPDF = (inv: Invoice) => {
    PDFGenerator.downloadInvoicePDF(inv);
    showFeedback('success', `Downloading invoice PDF for ${inv.invoiceNumber}...`);
  };

  // Trigger Manual Recurring Billing Execution
  const handleRunRecurringBilling = () => {
    try {
      const result = BillingService.processRecurringBilling();
      refreshAllData();
      if (result.invoicesCreated.length > 0) {
        showFeedback(
          'success',
          `Billing engine run complete! Generated ${result.invoicesCreated.length} invoice(s). Skipped ${result.skippedCount} duplicates.`
        );
      } else {
        showFeedback(
          'success',
          `Billing engine scan complete. No subscriptions were due today (${result.skippedCount} active subscriptions verified).`
        );
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Recurring billing execution failed.');
    }
  };

  // Tax Rules Actions (ADMIN Only)
  const handleOpenCreateTax = () => {
    setEditingTaxRule(null);
    setTaxName('');
    setTaxRate(18);
    setTaxType('GST');
    setTaxDescription('');
    setTaxSelectedProducts([]);
    setTaxStatus('Active');
    setTaxFormError(null);
    setIsTaxModalOpen(true);
  };

  const handleOpenEditTax = (rule: TaxRule) => {
    setEditingTaxRule(rule);
    setTaxName(rule.name);
    setTaxRate(rule.rate);
    setTaxType(rule.type);
    setTaxDescription(rule.description);
    setTaxSelectedProducts(rule.applicableProducts || []);
    setTaxStatus(rule.status);
    setTaxFormError(null);
    setIsTaxModalOpen(true);
  };

  const handleTaxRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTaxFormError(null);

    if (!taxName.trim()) {
      setTaxFormError('Tax rule name is required.');
      return;
    }
    if (taxRate < 0) {
      setTaxFormError('Tax rate cannot be negative.');
      return;
    }

    try {
      if (editingTaxRule) {
        const updated = TaxService.updateTaxRule(editingTaxRule.id, {
          name: taxName,
          rate: Number(taxRate),
          type: taxType,
          description: taxDescription,
          applicableProducts: taxSelectedProducts,
          status: taxStatus,
        });
        setTaxRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        showFeedback('success', `Tax rule "${updated.name}" updated.`);
      } else {
        const created = TaxService.createTaxRule({
          name: taxName,
          rate: Number(taxRate),
          type: taxType,
          description: taxDescription,
          applicableProducts: taxSelectedProducts,
          status: taxStatus,
        });
        setTaxRules((prev) => [created, ...prev]);
        showFeedback('success', `Tax rule "${created.name}" created.`);
      }
      setIsTaxModalOpen(false);
    } catch (err: any) {
      setTaxFormError(err?.message || 'Failed to save tax rule.');
    }
  };

  const handleToggleTaxStatus = (rule: TaxRule) => {
    try {
      const updated = TaxService.toggleTaxRuleStatus(rule.id);
      setTaxRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showFeedback('success', `Tax rule "${updated.name}" is now ${updated.status}.`);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to toggle tax status.');
    }
  };

  const handleDeleteTaxRule = (rule: TaxRule) => {
    try {
      TaxService.deleteTaxRule(rule.id);
      setTaxRules((prev) => prev.filter((r) => r.id !== rule.id));
      showFeedback('success', `Tax rule "${rule.name}" deleted.`);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to delete tax rule.');
    }
  };

  // Filter & Sort Invoices
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        const matchesSearch =
          inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inv.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (inv.subscriptionNumber && inv.subscriptionNumber.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
        const matchesSub = subscriptionFilter === 'ALL' || inv.subscriptionId === subscriptionFilter || inv.subscriptionNumber === subscriptionFilter;
        const matchesStart = !startDateFilter || (inv.invoiceDate || inv.issueDate) >= startDateFilter;
        const matchesDue = !dueDateFilter || inv.dueDate <= dueDateFilter;

        return matchesSearch && matchesStatus && matchesSub && matchesStart && matchesDue;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy];
        let valB: any = b[sortBy];

        if (sortBy === 'invoiceDate' || sortBy === 'dueDate') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [invoices, searchQuery, statusFilter, subscriptionFilter, startDateFilter, dueDateFilter, sortBy, sortOrder]);

  // Paginated Data
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Helper Badge Color
  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="emerald">Paid</Badge>;
      case 'Confirmed':
        return <Badge variant="blue">Confirmed</Badge>;
      case 'Sent':
        return <Badge variant="blue">Sent</Badge>;
      case 'Partially Paid':
        return <Badge variant="purple">Partially Paid</Badge>;
      case 'Draft':
        return <Badge variant="amber">Draft</Badge>;
      case 'Overdue':
        return <Badge variant="rose">Overdue</Badge>;
      case 'Cancelled':
        return <Badge variant="slate">Cancelled</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  // Table Columns (Invoices)
  const columns: Column<Invoice>[] = [
    {
      header: (
        <button
          onClick={() => toggleSort('invoiceNumber')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>Invoice #</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => (
        <div className="space-y-0.5">
          <span className="font-semibold text-slate-900">{row.invoiceNumber}</span>
          {row.subscriptionNumber && (
            <p className="text-[11px] text-indigo-600 font-mono font-medium">
              Sub: {row.subscriptionNumber}
            </p>
          )}
        </div>
      ),
    },
    {
      header: (
        <button
          onClick={() => toggleSort('customerName')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>Customer</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.companyName}</p>
          <p className="text-xs text-slate-500">{row.customerName}</p>
        </div>
      ),
    },
    {
      header: (
        <button
          onClick={() => toggleSort('invoiceDate')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>Invoice Date</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => (
        <span className="text-xs text-slate-600">{formatDate(row.invoiceDate || row.issueDate)}</span>
      ),
    },
    {
      header: (
        <button
          onClick={() => toggleSort('dueDate')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>Due Date</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => (
        <span
          className={`text-xs font-semibold ${
            row.status === 'Overdue' ? 'text-rose-600' : 'text-slate-700'
          }`}
        >
          {formatDate(row.dueDate)}
        </span>
      ),
    },
    {
      header: 'Subtotal & Tax',
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <p className="text-slate-700 font-medium">{formatCurrency(row.subtotal)}</p>
          <p className="text-[11px] text-slate-500">+Tax: {formatCurrency(row.taxTotal)}</p>
        </div>
      ),
    },
    {
      header: (
        <button
          onClick={() => toggleSort('totalAmount')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 ml-auto"
        >
          <span>Total Amount</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => (
        <div className="text-right">
          <span className="font-bold text-slate-900 text-sm">
            {formatCurrency(row.totalAmount)}
          </span>
          {row.discountTotal > 0 && (
            <p className="text-[10px] text-emerald-600 font-medium">
              Save {formatCurrency(row.discountTotal)}
            </p>
          )}
        </div>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: (
        <button
          onClick={() => toggleSort('amountDue')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 ml-auto"
        >
          <span>Outstanding</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => {
        const balance = row.amountDue ?? row.outstandingAmount ?? (row.totalAmount - row.paidAmount);
        return (
          <div className="text-right">
            <span
              className={`font-bold text-xs ${
                balance > 0 ? (row.status === 'Overdue' ? 'text-rose-600' : 'text-slate-900') : 'text-emerald-600'
              }`}
            >
              {formatCurrency(balance)}
            </span>
            <p className="text-[10px] text-slate-400">
              Paid: {formatCurrency(row.paidAmount)}
            </p>
          </div>
        );
      },
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: 'Status',
      cell: (row) => getStatusBadge(row.status),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          {/* Quick Status Transitions */}
          {row.status === 'Draft' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleConfirmInvoice(row)}
              className="text-[11px] h-7 px-2"
              title="Confirm Draft Invoice"
            >
              Confirm
            </Button>
          )}

          {(row.status === 'Draft' || row.status === 'Confirmed') && (
            <button
              type="button"
              onClick={() => handleSendInvoice(row)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Send to Customer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Print & Download */}
          <button
            type="button"
            onClick={() => handlePrint(row)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Print A4 Invoice"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleDownloadPDF(row)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* View Details */}
          <button
            type="button"
            onClick={() => setViewingInvoice(row)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Full Breakdown"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Cancel Eligible Invoice */}
          {row.status !== 'Paid' && row.status !== 'Cancelled' && (
            <button
              type="button"
              onClick={() => setCancellingInvoice(row)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Cancel Invoice"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all text-xs font-medium animate-in fade-in slide-in-from-bottom-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Invoices & Billing</h2>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {invoices.filter((i) => i.status === 'Paid').length} Settled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated recurring invoicing, tax computation engine, and billing lifecycle management.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunRecurringBilling}
            icon={<Repeat className="w-4 h-4 text-indigo-600" />}
            title="Scan active subscriptions and execute due billing immediately"
          >
            Run Billing Engine
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateInvoice}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Main View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'pipeline'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Invoices Pipeline</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'pipeline' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {invoices.length}
          </span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTab === 'tax'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Tax Management (Admin)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'tax' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {taxRules.length}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'billing'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Billing Automation & Logs</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'billing' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {billingHistory.length}
          </span>
        </button>
      </div>

      {/* TAB 1: INVOICES PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Total Invoiced
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {formatCurrency(metrics.totalInvoiced)}
                </span>
                <span className="text-xs text-slate-500">gross</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Total billings generated across all active contracts
              </p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Paid Revenue
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(metrics.paidRevenue)}
                </span>
                <span className="text-xs text-emerald-600 font-semibold">collected</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Total cash collected and cleared in bank
              </p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Outstanding Balance
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(metrics.outstandingAmount)}
                </span>
                <span className="text-xs text-slate-400">A/R</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Pending receivables awaiting customer settlement
              </p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                Overdue Invoices
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-600">
                  {formatCurrency(metrics.overdueAmount)}
                </span>
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  {metrics.overdueCount} past due
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Automatically flagged invoices with passed payment grace terms
              </p>
            </Card>
          </div>

          {/* Filter Toolbar */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Search */}
                <div className="md:col-span-5 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoice #, customer, company, or subscription..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Filter Subscription */}
                <div className="md:col-span-3">
                  <select
                    value={subscriptionFilter}
                    onChange={(e) => {
                      setSubscriptionFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg py-2 px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="ALL">All Subscriptions</option>
                    {subscriptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subscriptionNumber} — {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date range inputs */}
                <div className="md:col-span-2">
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => {
                      setStartDateFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="From Date"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg py-2 px-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    title="Filter by Invoice Date from"
                  />
                </div>

                <div className="md:col-span-2">
                  <input
                    type="date"
                    value={dueDateFilter}
                    onChange={(e) => {
                      setDueDateFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Due Before"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg py-2 px-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    title="Filter by Due Date before"
                  />
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                {STATUS_FILTERS.map((st) => {
                  const count =
                    st === 'ALL'
                      ? invoices.length
                      : invoices.filter((i) => i.status === st).length;

                  const isSelected = statusFilter === st;

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setStatusFilter(st);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      <span>{st === 'ALL' ? 'All Statuses' : st}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card>
            <CardHeader
              title="Tax Invoices Pipeline"
              subtitle={`Showing ${filteredInvoices.length} invoices matching criteria`}
            />
            <Table
              columns={columns}
              data={paginatedInvoices}
              keyExtractor={(row) => row.id}
            />

            {/* Empty State */}
            {paginatedInvoices.length === 0 && (
              <div className="py-12 text-center space-y-3">
                <div className="p-3 bg-slate-100 text-slate-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                  <Receipt className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">No invoices found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No invoices matched your current search and filter filters. Try resetting the criteria.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setSubscriptionFilter('ALL');
                    setStartDateFilter('');
                    setDueDateFilter('');
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredInvoices.length > 0 && (
              <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing{' '}
                  <strong className="text-slate-800 font-semibold">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-slate-800 font-semibold">
                    {Math.min(currentPage * itemsPerPage, filteredInvoices.length)}
                  </strong>{' '}
                  of <strong className="text-slate-800 font-semibold">{filteredInvoices.length}</strong> entries
                </div>

                <div className="flex items-center gap-1.5">
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

                  <div className="px-3 py-1 text-xs font-semibold text-slate-800 bg-slate-100 rounded-lg">
                    Page {currentPage} of {totalPages}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                    iconPosition="right"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: TAX MANAGEMENT (ADMIN ONLY) */}
      {activeTab === 'tax' && (
        <div className="space-y-6">
          {!isAdmin ? (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="font-bold text-slate-900">Restricted Administration Access</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Tax Management and dynamic rate configuration is restricted to System Administrators.
              </p>
            </div>
          ) : (
            <>
              {/* Formula & Policy Card */}
              <Card className="bg-indigo-50/60 border border-indigo-200 p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-indigo-600" />
                      <span>Automated Backend Tax Formula Engine</span>
                    </h4>
                    <p className="text-xs text-indigo-900/80">
                      Taxes are calculated automatically per line item and summed to the invoice total:
                    </p>
                    <div className="p-2.5 bg-white rounded-lg border border-indigo-200 font-mono text-[11px] text-indigo-950 space-y-1">
                      <div>Tax Amount = Taxable Amount × (Tax Rate / 100)</div>
                      <div>Invoice Grand Total = Subtotal + Total Tax - Total Discount</div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleOpenCreateTax}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    New Tax Rule
                  </Button>
                </div>
              </Card>

              {/* Tax Rules List */}
              <Card>
                <CardHeader
                  title="Configured Tax Rules"
                  subtitle="Active tax brackets applied across products, subscriptions, and auto-billing invoices"
                />
                <div className="divide-y divide-slate-100">
                  {taxRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{rule.name}</h4>
                          <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded border border-indigo-200">
                            {rule.rate}%
                          </span>
                          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {rule.type}
                          </span>
                          <Badge variant={rule.status === 'Active' ? 'emerald' : 'slate'}>
                            {rule.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">{rule.description}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {rule.applicableProducts && rule.applicableProducts.length > 0 ? (
                            rule.applicableProducts.map((pId) => {
                              const p = products.find((prod) => prod.id === pId);
                              return (
                                <span
                                  key={pId}
                                  className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                                >
                                  Applied to: {p?.name || pId}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Applies globally to all standard products & licenses
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditTax(rule)}
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                        >
                          Edit
                        </Button>

                        <button
                          type="button"
                          onClick={() => handleToggleTaxStatus(rule)}
                          className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                            rule.status === 'Active'
                              ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={rule.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {rule.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTaxRule(rule)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* TAB 3: BILLING AUTOMATION & LOGS */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Status & Manual Trigger Header */}
          <Card className="p-5 bg-white border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="font-bold text-sm text-slate-900">
                    Recurring Billing Background Daemon: ACTIVE
                  </h4>
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    30s Cron Poll Cycle
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  The automated recurring billing service scans active subscriptions continuously.
                  When a contract reaches its scheduled renewal date, an itemized invoice is created,
                  taxes are calculated, and the subscription next billing date is automatically advanced.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleRunRecurringBilling}
                  icon={<Play className="w-3.5 h-3.5" />}
                >
                  Execute Billing Run Now
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    BillingService.clearBillingHistory();
                    setBillingHistory([]);
                    showFeedback('success', 'Billing execution history cleared.');
                  }}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Clear Logs
                </Button>
              </div>
            </div>
          </Card>

          {/* Duplicate Prevention & Idempotency Explainer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Idempotent Billing Locks</span>
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Each contract period generates a unique composite key: <code className="text-indigo-600 font-mono text-[10px]">{`{subId}_{startDate}_{endDate}`}</code>.
                Subsequent triggers for the same period are safely skipped.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Transactional Safety</span>
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                If invoice generation encounters any validation issue, the subscription billing date is never advanced,
                ensuring zero lost revenue and allowing safe retry.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Non-Active Filter Exclusions</span>
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Subscriptions in <strong>Paused</strong> or <strong>Closed</strong> status are strictly excluded from automated billing runs.
              </p>
            </div>
          </div>

          {/* Billing Execution History Table */}
          <Card>
            <CardHeader
              title="Execution History & Audit Trail"
              subtitle={`Recorded ${billingHistory.length} billing cycle events`}
            />
            <div className="divide-y divide-slate-100 overflow-x-auto">
              {billingHistory.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Subscription & Client</th>
                      <th className="py-2.5 px-4">Billing Period</th>
                      <th className="py-2.5 px-4">Generated Invoice</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {billingHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {formatDate(item.executionDate)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">{item.companyName}</span>
                          <span className="text-[11px] text-indigo-600 font-mono">{item.subscriptionNumber}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {item.billingPeriod}
                        </td>
                        <td className="py-3 px-4">
                          {item.invoiceNumber ? (
                            <span className="font-semibold text-slate-900 font-mono">
                              {item.invoiceNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          {item.billedAmount ? formatCurrency(item.billedAmount) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              item.status === 'Success'
                                ? 'emerald'
                                : item.status === 'Skipped'
                                ? 'amber'
                                : 'rose'
                            }
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {item.errorMessage || 'Billing successfully generated and committed.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No billing history logs recorded yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* VIEW INVOICE DETAILS MODAL */}
      {viewingInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setViewingInvoice(null)}
          title={`Invoice ${viewingInvoice.invoiceNumber}`}
          description={`Tax Invoice for ${viewingInvoice.companyName}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Top Status & Fast Actions */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Status:</span>
                  {getStatusBadge(viewingInvoice.status)}
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs font-bold text-slate-900">
                    Grand Total: {formatCurrency(viewingInvoice.totalAmount)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Issued: {formatDate(viewingInvoice.invoiceDate || viewingInvoice.issueDate)} · Due:{' '}
                  <strong className={viewingInvoice.status === 'Overdue' ? 'text-rose-600' : 'text-slate-800'}>
                    {formatDate(viewingInvoice.dueDate)}
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrint(viewingInvoice)}
                  icon={<Printer className="w-3.5 h-3.5" />}
                >
                  Print
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPDF(viewingInvoice)}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  PDF
                </Button>

                {(viewingInvoice.status === 'Draft' || viewingInvoice.status === 'Confirmed') && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleSendInvoice(viewingInvoice)}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    Send Invoice
                  </Button>
                )}
              </div>
            </div>

            {/* Client & Contract Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Billed To
                </span>
                <p className="font-semibold text-slate-900">{viewingInvoice.companyName}</p>
                <p className="text-slate-600">Attn: {viewingInvoice.customerName}</p>
                <p className="text-slate-500 font-mono text-[11px]">{viewingInvoice.customerEmail || 'No email specified'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Payment Remittance & Terms
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Terms:</span>
                  <span className="font-semibold text-slate-900">{viewingInvoice.paymentTerms || 'Net 30 Days'}</span>
                </div>
                {viewingInvoice.subscriptionNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subscription:</span>
                    <span className="font-mono font-semibold text-indigo-600">{viewingInvoice.subscriptionNumber}</span>
                  </div>
                )}
                {viewingInvoice.billingPeriodStart && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billing Period:</span>
                    <span className="text-slate-700 font-medium">
                      {formatDate(viewingInvoice.billingPeriodStart)} → {formatDate(viewingInvoice.billingPeriodEnd || '')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Itemized Product Lines ({viewingInvoice.items?.length || 0})
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Item & Variant</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Tax (Rate)</th>
                      <th className="py-2 px-3 text-right">Discount</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {viewingInvoice.items && viewingInvoice.items.length > 0 ? (
                      viewingInvoice.items.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-900 block">{line.productName}</span>
                            {line.variantName && (
                              <span className="text-[11px] text-indigo-600 font-medium">Variant: {line.variantName}</span>
                            )}
                            {line.description && (
                              <span className="text-[11px] text-slate-400 block">{line.description}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-medium">{line.quantity}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(line.unitPrice)}</td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {line.taxRate}% ({formatCurrency(line.taxAmount)})
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-600">
                            {line.discountAmount ? `-${formatCurrency(line.discountAmount)}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(line.lineTotal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400">
                          No itemized product lines.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 text-xs">
                    <tr>
                      <td colSpan={5} className="py-1.5 px-3 text-right font-semibold text-slate-600">
                        Subtotal:
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold text-slate-900">
                        {formatCurrency(viewingInvoice.subtotal)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="py-1.5 px-3 text-right font-semibold text-slate-600">
                        Taxes (GST/VAT):
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold text-slate-900">
                        {formatCurrency(viewingInvoice.taxTotal)}
                      </td>
                    </tr>
                    {viewingInvoice.discountTotal > 0 && (
                      <tr>
                        <td colSpan={5} className="py-1.5 px-3 text-right font-semibold text-emerald-600">
                          Total Discount:
                        </td>
                        <td className="py-1.5 px-3 text-right font-semibold text-emerald-600">
                          -{formatCurrency(viewingInvoice.discountTotal)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t border-slate-200">
                      <td colSpan={5} className="py-2 px-3 text-right font-bold text-slate-900 text-sm">
                        Invoice Grand Total:
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-indigo-600 text-base">
                        {formatCurrency(viewingInvoice.totalAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="py-1.5 px-3 text-right font-semibold text-emerald-700">
                        Amount Paid:
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold text-emerald-700">
                        {formatCurrency(viewingInvoice.paidAmount)}
                      </td>
                    </tr>
                    <tr className="border-t border-dashed border-slate-300">
                      <td colSpan={5} className="py-2 px-3 text-right font-bold text-slate-900">
                        Balance Outstanding:
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold text-sm ${
                          viewingInvoice.amountDue > 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(viewingInvoice.amountDue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {viewingInvoice.notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-0.5">
                <span className="font-semibold text-slate-700">Invoice Notes:</span>
                <p>{viewingInvoice.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setViewingInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE INVOICE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Generate Tax Invoice"
        description="Select subscription to pre-populate line items or create custom billings"
        maxWidth="2xl"
      >
        {formError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Quick Load From Subscription Banner */}
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-950 font-semibold">
            <Repeat className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Pre-populate from Subscription:</span>
          </div>

          <select
            value={associatedSubId}
            onChange={(e) => handleSelectAssociatedSubscription(e.target.value)}
            className="text-xs bg-white border border-indigo-200 rounded-lg py-1.5 px-2.5 text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-xs"
          >
            <option value="">Select an active subscription...</option>
            {subscriptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subscriptionNumber} — {s.companyName} ({s.planName})
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleCreateInvoiceSubmit} className="space-y-5">
          {/* Section 1: Customer Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Customer & Company Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer / Company *
                </label>
                <select
                  value={formCustomerId}
                  onChange={(e) => {
                    const cust = mockRecentCustomers.find((c) => c.id === e.target.value);
                    if (cust) {
                      setFormCustomerId(cust.id);
                      setFormCustomerName(cust.name);
                      setFormCompanyName(cust.companyName);
                      setFormCustomerEmail(cust.email);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="" disabled>Select customer...</option>
                  {mockRecentCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={formCustomerEmail}
                  onChange={(e) => setFormCustomerEmail(e.target.value)}
                  placeholder="billing@company.com"
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Invoice Schedule & Terms */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Dates & Payment Terms</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  value={formInvoiceDate}
                  onChange={(e) => setFormInvoiceDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Terms
                </label>
                <select
                  value={formPaymentTerms}
                  onChange={(e) => setFormPaymentTerms(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Product Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Product Line Items ({formLines.length})
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Line
              </Button>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 bg-slate-50 space-y-2">
              {formLines.map((line, idx) => {
                const prod = products.find((p) => p.id === line.productId);
                const hasVariants = prod && prod.variants && prod.variants.length > 0;

                return (
                  <div key={line.id} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Product</label>
                        <select
                          value={line.productId}
                          onChange={(e) => handleUpdateLine(idx, 'productId', e.target.value)}
                          className="w-full border border-slate-300 rounded py-1 px-2 text-xs"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${p.salesPrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Variant</label>
                        {hasVariants ? (
                          <select
                            value={line.variantName || ''}
                            onChange={(e) => handleUpdateLine(idx, 'variantName', e.target.value)}
                            className="w-full border border-slate-300 rounded py-1 px-2 text-xs"
                          >
                            {prod?.variants?.map((v) => (
                              <option key={v.id} value={v.name}>
                                {v.name} (+${v.priceAdjustment})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic block py-1">Standard</span>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleUpdateLine(idx, 'quantity', e.target.value)}
                          className="w-full border border-slate-300 rounded py-1 px-2 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => handleUpdateLine(idx, 'unitPrice', e.target.value)}
                          className="w-full border border-slate-300 rounded py-1 px-2 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-1 text-right pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs pt-1 border-t border-slate-100">
                      <div className="sm:col-span-6 flex items-center gap-2">
                        <label className="text-[10px] font-semibold text-slate-500">Tax Rate (%):</label>
                        <input
                          type="number"
                          value={line.taxRate}
                          onChange={(e) => handleUpdateLine(idx, 'taxRate', e.target.value)}
                          className="w-16 border border-slate-300 rounded py-0.5 px-1.5 text-xs font-semibold"
                        />
                        <span className="text-[11px] text-slate-500">
                          = {formatCurrency(line.taxAmount)}
                        </span>
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-1 justify-end">
                        <label className="text-[10px] font-semibold text-slate-500">Disc ($):</label>
                        <input
                          type="number"
                          value={line.discountAmount || 0}
                          onChange={(e) => handleUpdateLine(idx, 'discountAmount', e.target.value)}
                          className="w-16 border border-slate-300 rounded py-0.5 px-1.5 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-3 text-right font-bold text-slate-900">
                        Line Total: {formatCurrency(line.lineTotal)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Totals Summary */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="text-slate-600">Subtotal: {formatCurrency(formTotals.subtotal)}</p>
              <p className="text-slate-600">Applicable Tax (GST/VAT): {formatCurrency(formTotals.taxTotal)}</p>
              {formTotals.discountTotal > 0 && (
                <p className="text-emerald-700">Total Discount: -{formatCurrency(formTotals.discountTotal)}</p>
              )}
            </div>

            <div className="text-right">
              <span className="text-slate-500 text-[11px] block">Calculated Invoice Total:</span>
              <span className="text-base font-bold text-indigo-600 block">
                {formatCurrency(formTotals.grandTotal)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invoice Terms & Notes
            </label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Generate Draft Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREATE / EDIT TAX RULE MODAL */}
      <Modal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
        title={editingTaxRule ? `Edit Tax Rule: ${editingTaxRule.name}` : 'Create Tax Rule'}
        description="Configure dynamic tax rates and product associations for automated calculations"
        maxWidth="md"
      >
        {taxFormError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{taxFormError}</span>
          </div>
        )}

        <form onSubmit={handleTaxRuleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tax Name *</label>
            <input
              type="text"
              placeholder="e.g. Standard GST / VAT (18%)"
              value={taxName}
              onChange={(e) => setTaxName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax Rate (%) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="18"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax Type *</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value as TaxType)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {TAX_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Details on jurisdictions and applicable products..."
              value={taxDescription}
              onChange={(e) => setTaxDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Applicable Specific Products (Leave empty for all products)
            </label>
            <div className="border border-slate-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1.5 bg-slate-50">
              {products.map((p) => {
                const checked = taxSelectedProducts.includes(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTaxSelectedProducts([...taxSelectedProducts, p.id]);
                        } else {
                          setTaxSelectedProducts(taxSelectedProducts.filter((id) => id !== p.id));
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span>{p.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={taxStatus}
              onChange={(e) => setTaxStatus(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTaxModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingTaxRule ? 'Update Tax Rule' : 'Save Tax Rule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CANCEL INVOICE CONFIRMATION MODAL */}
      {cancellingInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setCancellingInvoice(null)}
          title="Cancel Invoice"
          description={`Are you sure you want to cancel invoice #${cancellingInvoice.invoiceNumber}?`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs text-slate-600">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Financial Impact</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Cancelling this invoice immediately sets the outstanding balance to <strong>$0</strong>.
                Cancelled invoices are excluded from outstanding revenue calculations.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cancellation Reason</label>
              <input
                type="text"
                placeholder="e.g. Billed in error, customer requested contract pause"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCancellingInvoice(null)}
              >
                Keep Invoice
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmCancelInvoice}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
