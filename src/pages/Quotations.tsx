import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  ArrowRight,
  Copy,
  Layers,
  Power,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  User,
} from 'lucide-react';
import {
  Quotation,
  QuotationTemplate,
  QuotationLineItem,
  QuotationStatus,
  Product,
  Plan,
} from '../types';
import { QuotationService } from '../services/quotationService';
import { ProductService } from '../services/productService';
import { PlanService } from '../services/planService';
import { mockRecentCustomers } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';

const STATUS_FILTERS: ('ALL' | QuotationStatus)[] = [
  'ALL',
  'Draft',
  'Sent',
  'Accepted',
  'Converted',
  'Expired',
];

export const QuotationsPage: React.FC = () => {
  const { user } = useAuth();

  // Active view: Pipeline vs Templates
  const [activeTab, setActiveTab] = useState<'quotes' | 'templates'>('quotes');

  // Quotations State
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | QuotationStatus>('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals
  const [isCreateQuoteModalOpen, setIsCreateQuoteModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quotation | null>(null);
  const [deletingQuote, setDeletingQuote] = useState<Quotation | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<Quotation | null>(null);

  // Templates Modals
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuotationTemplate | null>(null);

  // Toast / Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State for Quotation
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formCustomerEmail, setFormCustomerEmail] = useState('');
  const [formBillingAddress, setFormBillingAddress] = useState('');
  const [formQuotationDate, setFormQuotationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formValidityDays, setFormValidityDays] = useState(15);
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<QuotationStatus>('Draft');
  const [formLines, setFormLines] = useState<QuotationLineItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Template
  const [tmplName, setTmplName] = useState('');
  const [tmplDescription, setTmplDescription] = useState('');
  const [tmplValidityDays, setTmplValidityDays] = useState(30);
  const [tmplNotes, setTmplNotes] = useState('');
  const [tmplLines, setTmplLines] = useState<QuotationLineItem[]>([]);
  const [tmplError, setTmplError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setQuotations(QuotationService.getQuotations());
    setTemplates(QuotationService.getTemplates());
    setProducts(ProductService.getProducts());
    setPlans(PlanService.getPlans());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Helper: auto calculate expiry date
  const calculatedExpiryDate = useMemo(() => {
    if (!formQuotationDate) return '';
    const date = new Date(formQuotationDate);
    date.setDate(date.getDate() + Number(formValidityDays || 15));
    return date.toISOString().split('T')[0];
  }, [formQuotationDate, formValidityDays]);

  // Handle Customer Selection
  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const existing = mockRecentCustomers.find((c) => c.id === custId);
    if (existing) {
      setFormCustomerName(existing.name);
      setFormCompanyName(existing.companyName);
      setFormCustomerEmail(existing.email);
      setFormBillingAddress(`${existing.companyName} HQ, Enterprise Commercial Park`);
    }
  };

  // Dynamic Line Item Calculation Helpers
  const calculateLineTotal = (
    quantity: number,
    unitPrice: number,
    taxRate: number,
    discount: number
  ) => {
    const rawSubtotal = Math.max(0, quantity * unitPrice - discount);
    const taxAmount = rawSubtotal * taxRate;
    return rawSubtotal + taxAmount;
  };

  const handleAddLine = (
    setter: React.Dispatch<React.SetStateAction<QuotationLineItem[]>>
  ) => {
    const defaultProduct = products[0];
    const defaultPlan = plans[0];
    const basePrice = defaultProduct ? defaultProduct.salesPrice : 250;
    const taxRate = 0.18;
    const qty = 1;
    const discount = 0;
    const taxAmount = (qty * basePrice - discount) * taxRate;
    const lineTotal = calculateLineTotal(qty, basePrice, taxRate, discount);

    const newLine: QuotationLineItem = {
      id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: defaultProduct ? defaultProduct.id : '',
      productName: defaultProduct ? defaultProduct.name : 'Select Product',
      variantId: '',
      variantName: '',
      planId: defaultPlan ? defaultPlan.id : '',
      planName: defaultPlan ? defaultPlan.name : 'Select Plan',
      quantity: qty,
      unitPrice: basePrice,
      taxRate,
      taxAmount,
      discount,
      lineTotal,
    };

    setter((prev) => [...prev, newLine]);
  };

  const handleUpdateLine = (
    index: number,
    field: keyof QuotationLineItem,
    value: any,
    lines: QuotationLineItem[],
    setter: React.Dispatch<React.SetStateAction<QuotationLineItem[]>>
  ) => {
    const updated = [...lines];
    const item = { ...updated[index] };

    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      if (prod) {
        item.productId = prod.id;
        item.productName = prod.name;
        item.variantId = '';
        item.variantName = '';
        item.unitPrice = prod.salesPrice;
      }
    } else if (field === 'variantId') {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        const variant = prod.variants?.find((v) => v.id === value);
        if (variant) {
          item.variantId = variant.id;
          item.variantName = variant.name;
          item.unitPrice = prod.salesPrice + (variant.priceAdjustment || 0);
        } else {
          item.variantId = '';
          item.variantName = '';
          item.unitPrice = prod.salesPrice;
        }
      }
    } else if (field === 'planId') {
      const plan = plans.find((p) => p.id === value);
      if (plan) {
        item.planId = plan.id;
        item.planName = plan.name;
      }
    } else {
      (item as any)[field] = value;
    }

    // Recompute line math
    const qty = Number(item.quantity) || 1;
    const uPrice = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const tRate = Number(item.taxRate) || 0.18;

    item.taxAmount = Math.max(0, qty * uPrice - disc) * tRate;
    item.lineTotal = calculateLineTotal(qty, uPrice, tRate, disc);

    updated[index] = item;
    setter(updated);
  };

  const handleRemoveLine = (
    index: number,
    lines: QuotationLineItem[],
    setter: React.Dispatch<React.SetStateAction<QuotationLineItem[]>>
  ) => {
    setter(lines.filter((_, i) => i !== index));
  };

  // Quotation Totals Calculation
  const formTotals = useMemo(() => {
    const subtotal = formLines.reduce(
      (sum, l) => sum + l.quantity * l.unitPrice,
      0
    );
    const discountTotal = formLines.reduce((sum, l) => sum + (Number(l.discount) || 0), 0);
    const taxTotal = formLines.reduce((sum, l) => sum + (Number(l.taxAmount) || 0), 0);
    const grandTotal = subtotal + taxTotal - discountTotal;

    return { subtotal, discountTotal, taxTotal, grandTotal };
  }, [formLines]);

  // Load from Template Action
  const handleLoadTemplateIntoForm = (templateId: string) => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;

    setFormValidityDays(tmpl.defaultValidityDays);
    setFormNotes(tmpl.defaultNotes);
    setFormLines(JSON.parse(JSON.stringify(tmpl.lines)));
    showFeedback('success', `Loaded lines and terms from "${tmpl.name}".`);
  };

  // Open Create Quotation
  const handleOpenCreateQuote = (templateToLoad?: QuotationTemplate) => {
    const firstCust = mockRecentCustomers[0];
    setSelectedCustomerId(firstCust.id);
    setFormCustomerName(firstCust.name);
    setFormCompanyName(firstCust.companyName);
    setFormCustomerEmail(firstCust.email);
    setFormBillingAddress(`${firstCust.companyName} Commercial Tower, Suite 400`);
    setFormQuotationDate(new Date().toISOString().split('T')[0]);
    setFormValidityDays(templateToLoad ? templateToLoad.defaultValidityDays : 15);
    setFormNotes(
      templateToLoad
        ? templateToLoad.defaultNotes
        : 'Standard payment terms: Net 30 Days. Contract subject to Brightloop Master Service Agreement.'
    );
    setFormStatus('Draft');
    setFormError(null);

    if (templateToLoad) {
      setFormLines(JSON.parse(JSON.stringify(templateToLoad.lines)));
    } else {
      setFormLines([]);
      // Start with 1 line item
      handleAddLine(setFormLines);
    }

    setIsCreateQuoteModalOpen(true);
  };

  // Submit Create Quote
  const handleCreateQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCustomerName.trim() || !formCustomerEmail.trim()) {
      setFormError('Customer contact name and email are required.');
      return;
    }
    if (formLines.length === 0) {
      setFormError('Please add at least one product line item to the quotation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = QuotationService.createQuotation({
        customerId: selectedCustomerId || 'cust_custom',
        customerName: formCustomerName,
        companyName: formCompanyName || `${formCustomerName}'s Business`,
        customerEmail: formCustomerEmail,
        billingAddress: formBillingAddress,
        quotationDate: formQuotationDate,
        validityDays: Number(formValidityDays),
        validUntil: calculatedExpiryDate,
        items: formLines,
        subtotal: formTotals.subtotal,
        taxTotal: formTotals.taxTotal,
        discountTotal: formTotals.discountTotal,
        totalAmount: formTotals.grandTotal,
        status: formStatus,
        notes: formNotes,
        createdBy: user?.name || 'Sales Representative',
        planName: formLines[0]?.planName || 'Custom Offer Suite',
      });

      setQuotations((prev) => [created, ...prev]);
      setIsCreateQuoteModalOpen(false);
      showFeedback('success', `Quotation ${created.quotationNumber} generated.`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Quote
  const handleOpenEditQuote = (q: Quotation) => {
    setEditingQuote(q);
    setSelectedCustomerId(q.customerId);
    setFormCustomerName(q.customerName);
    setFormCompanyName(q.companyName);
    setFormCustomerEmail(q.customerEmail);
    setFormBillingAddress(q.billingAddress || '');
    setFormQuotationDate(q.quotationDate);
    setFormValidityDays(q.validityDays);
    setFormNotes(q.notes || '');
    setFormStatus(q.status);
    setFormLines(JSON.parse(JSON.stringify(q.items)));
    setFormError(null);
    setIsCreateQuoteModalOpen(true);
  };

  const handleEditQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuote) return;
    setFormError(null);

    if (formLines.length === 0) {
      setFormError('Quotation must contain at least one line item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = QuotationService.updateQuotation(editingQuote.id, {
        customerName: formCustomerName,
        companyName: formCompanyName,
        customerEmail: formCustomerEmail,
        billingAddress: formBillingAddress,
        validityDays: Number(formValidityDays),
        validUntil: calculatedExpiryDate,
        items: formLines,
        subtotal: formTotals.subtotal,
        taxTotal: formTotals.taxTotal,
        discountTotal: formTotals.discountTotal,
        totalAmount: formTotals.grandTotal,
        status: formStatus,
        notes: formNotes,
      });

      setQuotations((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setEditingQuote(null);
      setIsCreateQuoteModalOpen(false);
      showFeedback('success', `Quotation ${updated.quotationNumber} updated.`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Quote
  const handleDeleteQuoteConfirm = () => {
    if (!deletingQuote) return;
    try {
      QuotationService.deleteQuotation(deletingQuote.id);
      setQuotations((prev) => prev.filter((q) => q.id !== deletingQuote.id));
      showFeedback('success', `Quotation ${deletingQuote.quotationNumber} deleted.`);
      setDeletingQuote(null);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to delete quotation.');
    }
  };

  // Convert Quote into Subscription
  const handleConvertQuotation = (q: Quotation) => {
    try {
      const { quotation, subscription } = QuotationService.convertToSubscription(q.id);
      setQuotations((prev) => prev.map((item) => (item.id === quotation.id ? quotation : item)));
      setConvertingQuote(null);
      if (viewingQuote?.id === q.id) setViewingQuote(quotation);
      showFeedback(
        'success',
        `Quotation ${q.quotationNumber} converted! Provisioned Subscription ${subscription.subscriptionNumber} in Confirmed status.`
      );
    } catch (err: any) {
      showFeedback('error', err?.message || 'Conversion failed.');
    }
  };

  // Templates Actions
  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTmplName('');
    setTmplDescription('');
    setTmplValidityDays(30);
    setTmplNotes('Standard proposal terms: Net 30 Days.');
    setTmplLines([]);
    handleAddLine(setTmplLines);
    setTmplError(null);
    setIsCreateTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: QuotationTemplate) => {
    setEditingTemplate(tmpl);
    setTmplName(tmpl.name);
    setTmplDescription(tmpl.description);
    setTmplValidityDays(tmpl.defaultValidityDays);
    setTmplNotes(tmpl.defaultNotes);
    setTmplLines(JSON.parse(JSON.stringify(tmpl.lines)));
    setTmplError(null);
    setIsCreateTemplateModalOpen(true);
  };

  const handleCreateTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTmplError(null);

    if (!tmplName.trim()) {
      setTmplError('Template name is required.');
      return;
    }
    if (tmplLines.length === 0) {
      setTmplError('Template must include at least one preconfigured line item.');
      return;
    }

    if (editingTemplate) {
      try {
        const updated = QuotationService.updateTemplate(editingTemplate.id, {
          name: tmplName,
          description: tmplDescription,
          defaultValidityDays: Number(tmplValidityDays),
          defaultNotes: tmplNotes,
          lines: tmplLines,
        });

        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setIsCreateTemplateModalOpen(false);
        setEditingTemplate(null);
        showFeedback('success', `Template "${updated.name}" updated.`);
      } catch (err: any) {
        setTmplError(err?.message || 'Failed to update template.');
      }
      return;
    }

    try {
      const created = QuotationService.createTemplate({
        name: tmplName,
        description: tmplDescription,
        defaultValidityDays: Number(tmplValidityDays),
        defaultNotes: tmplNotes,
        lines: tmplLines,
        status: 'Active',
      });

      setTemplates((prev) => [created, ...prev]);
      setIsCreateTemplateModalOpen(false);
      showFeedback('success', `Template "${created.name}" created.`);
    } catch (err: any) {
      setTmplError(err?.message || 'Failed to create template.');
    }
  };

  const handleDuplicateTemplate = (tmpl: QuotationTemplate) => {
    try {
      const duplicated = QuotationService.duplicateTemplate(tmpl.id);
      setTemplates((prev) => [duplicated, ...prev]);
      showFeedback('success', `Duplicated "${tmpl.name}".`);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to duplicate template.');
    }
  };

  const handleToggleTemplateStatus = (tmpl: QuotationTemplate) => {
    try {
      const updated = QuotationService.toggleTemplateStatus(tmpl.id);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      showFeedback('success', `Template "${updated.name}" is now ${updated.status}.`);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to toggle status.');
    }
  };

  const handleDeleteTemplate = (tmpl: QuotationTemplate) => {
    try {
      QuotationService.deleteTemplate(tmpl.id);
      setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
      showFeedback('success', `Template "${tmpl.name}" deleted.`);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to delete template.');
    }
  };

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations
      .filter((q) => {
        const matchesSearch =
          q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.companyName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'amount') {
          return sortOrder === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount;
        }
        if (sortBy === 'customer') {
          return sortOrder === 'asc'
            ? a.companyName.localeCompare(b.companyName)
            : b.companyName.localeCompare(a.companyName);
        }
        return sortOrder === 'asc'
          ? new Date(a.quotationDate).getTime() - new Date(b.quotationDate).getTime()
          : new Date(b.quotationDate).getTime() - new Date(a.quotationDate).getTime();
      });
  }, [quotations, searchQuery, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage) || 1;
  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQuotations.slice(start, start + itemsPerPage);
  }, [filteredQuotations, currentPage]);

  // Quotations Table Columns
  const quoteColumns: Column<Quotation>[] = [
    {
      header: 'Quotation #',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.quotationNumber}</span>
          <span className="text-xs text-slate-400">
            {row.items?.length || 0} line item{row.items?.length !== 1 ? 's' : ''}
          </span>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.companyName}</span>
          <span className="text-xs text-slate-500">{row.customerName}</span>
        </div>
      ),
    },
    {
      header: 'Quotation Date',
      cell: (row) => <span className="text-xs text-slate-600">{formatDate(row.quotationDate)}</span>,
    },
    {
      header: 'Expiry Date',
      cell: (row) => {
        const isExpired = new Date(row.validUntil).getTime() < Date.now() && row.status !== 'Converted';
        return (
          <div className="text-xs">
            <span className={isExpired ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
              {formatDate(row.validUntil)}
            </span>
            <span className="text-[10px] text-slate-400 block">{row.validityDays}d validity</span>
          </div>
        );
      },
    },
    {
      header: 'Total Amount',
      cell: (row) => (
        <span className="font-bold text-slate-900">
          {formatCurrency(row.totalAmount)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge
          variant={
            row.status === 'Converted'
              ? 'emerald'
              : row.status === 'Accepted'
              ? 'blue'
              : row.status === 'Sent'
              ? 'purple'
              : row.status === 'Draft'
              ? 'amber'
              : 'rose'
          }
          showDot={true}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Created By',
      cell: (row) => (
        <span className="text-xs text-slate-600">{row.createdBy || 'Staff Rep'}</span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {/* View Details */}
          <button
            type="button"
            onClick={() => setViewingQuote(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            title="View Quotation Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Edit (Drafts only) */}
          {row.status === 'Draft' && (
            <button
              type="button"
              onClick={() => handleOpenEditQuote(row)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Edit Draft Quotation"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Convert to Subscription */}
          {row.status !== 'Converted' && (
            <button
              type="button"
              onClick={() => setConvertingQuote(row)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
              title="Convert Quote to Active Subscription"
            >
              <span>Convert</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {/* Delete (Drafts only) */}
          {row.status === 'Draft' && (
            <button
              type="button"
              onClick={() => setDeletingQuote(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Draft"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Quotation Management</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
              Contract Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Build bespoke sales proposals, apply preconfigured templates, and convert accepted offers into live subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenCreateTemplate}
            icon={<Layers className="w-4 h-4 text-slate-500" />}
          >
            New Template
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleOpenCreateQuote()}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Quotation
          </Button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`rounded-xl p-3.5 text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-view Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('quotes')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'quotes'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Quotations Pipeline</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'quotes' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {quotations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'templates'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Quotation Templates</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === 'templates' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {templates.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: QUOTATIONS PIPELINE */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search */}
              <div className="md:col-span-5 relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search by quote # or customer name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Status Filter */}
              <div className="md:col-span-4 flex items-center gap-1.5 overflow-x-auto">
                {STATUS_FILTERS.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium whitespace-nowrap transition-colors ${
                      statusFilter === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Sort By */}
              <div className="md:col-span-3 flex items-center gap-1.5">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="date">Sort: Quotation Date</option>
                  <option value="amount">Sort: Total Value</option>
                  <option value="customer">Sort: Customer</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 shrink-0"
                  title={`Sorting ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quotations Table */}
          <Card>
            <CardHeader
              title="Quotations Register"
              subtitle={
                loading
                  ? 'Loading quotations...'
                  : `Showing ${paginatedQuotes.length} of ${filteredQuotations.length} total proposals`
              }
            />
            <CardContent className="p-0">
              <Table
                columns={quoteColumns}
                data={paginatedQuotes}
                keyExtractor={(q) => q.id}
                emptyMessage="No quotations found matching criteria"
              />
            </CardContent>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Page <strong className="text-slate-800">{currentPage}</strong> of{' '}
                  <strong className="text-slate-800">{totalPages}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* VIEW 2: QUOTATION TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Preconfigured Quotation Templates"
              subtitle="Standardized packages sales reps can deploy with 1-click"
              action={
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateTemplate}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Create Template
                </Button>
              }
            />
            <CardContent className="divide-y divide-slate-100 p-0">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-bold text-sm text-slate-900">{tmpl.name}</h4>
                      <Badge variant={tmpl.status === 'Active' ? 'emerald' : 'slate'}>
                        {tmpl.status}
                      </Badge>
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {tmpl.defaultValidityDays} days validity
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {tmpl.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tmpl.lines.map((line, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200"
                        >
                          {line.quantity}x {line.productName}
                          {line.variantName && ` (${line.variantName})`}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenCreateQuote(tmpl)}
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Use Template
                    </Button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditTemplate(tmpl)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Template"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateTemplate(tmpl)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Duplicate Template"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleTemplateStatus(tmpl)}
                      className={`p-2 rounded-lg transition-colors ${
                        tmpl.status === 'Active'
                          ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={tmpl.status === 'Active' ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tmpl)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CREATE / EDIT QUOTATION MODAL */}
      <Modal
        isOpen={isCreateQuoteModalOpen}
        onClose={() => {
          setIsCreateQuoteModalOpen(false);
          setEditingQuote(null);
        }}
        title={editingQuote ? `Edit Quotation #${editingQuote.quotationNumber}` : "Create New Quotation"}
        description={
          editingQuote
            ? "Update customer terms, product lines, variants, and notes for this quotation"
            : "Configure customer terms, product lines, variants, and automated discounts"
        }
        maxWidth="2xl"
      >
        {formError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Load From Template shortcut banner */}
        {!editingQuote && (
          <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-950">
                Quick Load Template:
              </span>
            </div>
            <select
              onChange={(e) => handleLoadTemplateIntoForm(e.target.value)}
              defaultValue=""
              className="text-xs bg-white border border-indigo-200 rounded-lg py-1 px-2.5 text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="" disabled>
                Select Template to Pre-populate Lines...
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.lines.length} lines)
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={editingQuote ? handleEditQuoteSubmit : handleCreateQuoteSubmit} className="space-y-5">
          {/* Section 1: Customer Information */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Customer Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Existing Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {mockRecentCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.name})
                    </option>
                  ))}
                  <option value="cust_custom">+ New / Custom Customer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formCustomerEmail}
                  onChange={(e) => setFormCustomerEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  required
                  value={formCustomerName}
                  onChange={(e) => setFormCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Entity Name
                </label>
                <input
                  type="text"
                  value={formCompanyName}
                  onChange={(e) => setFormCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Billing Address
              </label>
              <input
                type="text"
                value={formBillingAddress}
                onChange={(e) => setFormBillingAddress(e.target.value)}
                placeholder="Street address, City, State/Province, Country"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Section 2: Quotation Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quotation Date
              </label>
              <input
                type="date"
                required
                value={formQuotationDate}
                onChange={(e) => setFormQuotationDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Validity Period (Days)
              </label>
              <input
                type="number"
                min="1"
                required
                value={formValidityDays}
                onChange={(e) => setFormValidityDays(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calculated Expiry Date
              </label>
              <input
                type="date"
                disabled
                value={calculatedExpiryDate}
                className="w-full rounded-lg border border-slate-200 bg-slate-100 py-2 px-3 text-xs text-slate-600 font-semibold cursor-not-allowed"
              />
            </div>
          </div>

          {/* Section 3: Product Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>Quotation Product Lines ({formLines.length})</span>
              </h4>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddLine(setFormLines)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Line Item
              </Button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
              {formLines.map((line, idx) => {
                const currentProduct = products.find((p) => p.id === line.productId);
                return (
                  <div key={line.id} className="p-3.5 space-y-3 hover:bg-slate-50/60">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      {/* Product Selector */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                          Product
                        </label>
                        <select
                          value={line.productId}
                          onChange={(e) =>
                            handleUpdateLine(idx, 'productId', e.target.value, formLines, setFormLines)
                          }
                          className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs text-slate-900"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${p.salesPrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Variant Selector */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                          Variant Option
                        </label>
                        <select
                          value={line.variantId || ''}
                          onChange={(e) =>
                            handleUpdateLine(idx, 'variantId', e.target.value, formLines, setFormLines)
                          }
                          className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs text-slate-900"
                        >
                          <option value="">Base / Standard</option>
                          {currentProduct?.variants?.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} (+${v.priceAdjustment})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Plan Selector */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                          Plan Cadence
                        </label>
                        <select
                          value={line.planId || ''}
                          onChange={(e) =>
                            handleUpdateLine(idx, 'planId', e.target.value, formLines, setFormLines)
                          }
                          className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs text-slate-900"
                        >
                          {plans.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.name} ({pl.billingCycle})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Delete Line Button */}
                      <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx, formLines, setFormLines)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove Line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quantity, Unit Price, Tax, Discount, Line Total */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-center bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/80 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 font-medium block">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            handleUpdateLine(
                              idx,
                              'quantity',
                              parseInt(e.target.value, 10) || 1,
                              formLines,
                              setFormLines
                            )
                          }
                          className="w-full border border-slate-300 rounded py-1 px-2 text-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-medium block">Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) =>
                            handleUpdateLine(
                              idx,
                              'unitPrice',
                              parseFloat(e.target.value) || 0,
                              formLines,
                              setFormLines
                            )
                          }
                          className="w-full border border-slate-300 rounded py-1 px-2 text-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-medium block">Tax (18%)</label>
                        <span className="font-medium text-slate-700 block py-1">
                          {formatCurrency(line.taxAmount)}
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-medium block">Discount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.discount}
                          onChange={(e) =>
                            handleUpdateLine(
                              idx,
                              'discount',
                              parseFloat(e.target.value) || 0,
                              formLines,
                              setFormLines
                            )
                          }
                          className="w-full border border-slate-300 rounded py-1 px-2 text-xs bg-white"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 text-right">
                        <label className="text-[10px] text-slate-500 font-medium block">Line Total</label>
                        <span className="font-bold text-slate-900 block py-1">
                          {formatCurrency(line.lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Totals Summary & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Proposal Terms & Notes
              </label>
              <textarea
                rows={4}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Payment terms, SLAs, and signature terms..."
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Before Tax & Discount):</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(formTotals.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax Total (18% Applicable):</span>
                <span className="font-semibold text-slate-900">
                  +{formatCurrency(formTotals.taxTotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount Total:</span>
                <span className="font-semibold text-rose-600">
                  -{formatCurrency(formTotals.discountTotal)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-indigo-600 text-base">
                  {formatCurrency(formTotals.grandTotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateQuoteModalOpen(false);
                setEditingQuote(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              {editingQuote ? 'Update Quotation' : 'Generate Quotation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW QUOTATION DETAILS MODAL */}
      {viewingQuote && (
        <Modal
          isOpen={true}
          onClose={() => setViewingQuote(null)}
          title={`Quotation: ${viewingQuote.quotationNumber}`}
          description={`Customer: ${viewingQuote.companyName} (${viewingQuote.customerName})`}
          maxWidth="xl"
        >
          <div className="space-y-5">
            {/* Top Status & Convert CTA */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Status:</span>
                  <Badge variant={viewingQuote.status === 'Converted' ? 'emerald' : 'blue'}>
                    {viewingQuote.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Issued: {formatDate(viewingQuote.quotationDate)} · Valid until:{' '}
                  {formatDate(viewingQuote.validUntil)}
                </p>
              </div>

              {viewingQuote.status !== 'Converted' ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleConvertQuotation(viewingQuote)}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  iconPosition="right"
                >
                  Convert to Active Subscription
                </Button>
              ) : (
                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  ✓ Converted to Subscription #{viewingQuote.convertedSubscriptionId}
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Quotation Line Items
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                {viewingQuote.items && viewingQuote.items.length > 0 ? (
                  viewingQuote.items.map((line, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">{line.productName}</span>
                        {line.variantName && (
                          <span className="ml-2 text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                            {line.variantName}
                          </span>
                        )}
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {line.quantity} units @ {formatCurrency(line.unitPrice)} each · Plan: {line.planName || 'Standard'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-slate-900">
                          {formatCurrency(line.lineTotal)}
                        </span>
                        {line.discount > 0 && (
                          <p className="text-[10px] text-rose-600">-{formatCurrency(line.discount)} off</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400">No individual line items detailed.</div>
                )}
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(viewingQuote.subtotal || viewingQuote.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxes:</span>
                <span>+{formatCurrency(viewingQuote.taxTotal || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discounts:</span>
                <span className="text-rose-600">-{formatCurrency(viewingQuote.discountTotal || 0)}</span>
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-sm text-slate-900">
                <span>Total Amount:</span>
                <span className="text-indigo-600 text-base">{formatCurrency(viewingQuote.totalAmount)}</span>
              </div>
            </div>

            {viewingQuote.notes && (
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">Notes:</span>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {viewingQuote.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingQuote(null)}
              >
                Close Details
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONVERT CONFIRMATION MODAL */}
      {convertingQuote && (
        <Modal
          isOpen={true}
          onClose={() => setConvertingQuote(null)}
          title="Convert Quotation into Active Subscription"
          description={`Offer #${convertingQuote.quotationNumber} for ${convertingQuote.companyName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-slate-600">
            <p>
              Converting this quotation will automatically provision a new Subscription record in{' '}
              <strong className="text-slate-900 font-semibold">Confirmed</strong> status with line items, tax rules, and contract renewal terms.
            </p>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950 font-medium">
              Contract Total: {formatCurrency(convertingQuote.totalAmount)}
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConvertingQuote(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleConvertQuotation(convertingQuote)}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Confirm & Convert
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE / EDIT TEMPLATE MODAL */}
      <Modal
        isOpen={isCreateTemplateModalOpen}
        onClose={() => {
          setIsCreateTemplateModalOpen(false);
          setEditingTemplate(null);
        }}
        title={editingTemplate ? `Edit Template: ${editingTemplate.name}` : "Create Quotation Template"}
        description={
          editingTemplate
            ? "Update template line items, defaults, and terms"
            : "Standardize proposal line items and terms for sales reps"
        }
        maxWidth="xl"
      >
        {tmplError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{tmplError}</span>
          </div>
        )}

        <form onSubmit={handleCreateTemplateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={tmplName}
                onChange={(e) => setTmplName(e.target.value)}
                placeholder="E.g. Enterprise Cloud Operations Suite"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Validity Period (Days)
              </label>
              <input
                type="number"
                min="1"
                required
                value={tmplValidityDays}
                onChange={(e) => setTmplValidityDays(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Template Description
            </label>
            <textarea
              rows={2}
              value={tmplDescription}
              onChange={(e) => setTmplDescription(e.target.value)}
              placeholder="Summary of what this proposal bundle represents..."
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Template Lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Preconfigured Product Lines ({tmplLines.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddLine(setTmplLines)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Line
              </Button>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 bg-slate-50 space-y-2">
              {tmplLines.map((line, idx) => (
                <div key={line.id} className="p-2 bg-white rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5">
                    <select
                      value={line.productId}
                      onChange={(e) =>
                        handleUpdateLine(idx, 'productId', e.target.value, tmplLines, setTmplLines)
                      }
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
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) =>
                        handleUpdateLine(
                          idx,
                          'quantity',
                          parseInt(e.target.value, 10) || 1,
                          tmplLines,
                          setTmplLines
                        )
                      }
                      placeholder="Qty"
                      className="w-full border border-slate-300 rounded py-1 px-2 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-3 text-right text-xs font-bold text-slate-800">
                    {formatCurrency(line.lineTotal)}
                  </div>

                  <div className="sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx, tmplLines, setTmplLines)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Notes & Terms
            </label>
            <textarea
              rows={2}
              value={tmplNotes}
              onChange={(e) => setTmplNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateTemplateModalOpen(false);
                setEditingTemplate(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingTemplate ? 'Update Template' : 'Save Template'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      {deletingQuote && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingQuote(null)}
          title="Delete Draft Quotation"
          description={`Are you sure you want to delete quotation #${deletingQuote.quotationNumber}?`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs text-slate-600">
            <p>
              This draft will be permanently deleted from the active pipeline.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingQuote(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDeleteQuoteConfirm}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
