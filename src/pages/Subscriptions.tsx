import React, { useState, useEffect, useMemo } from 'react';
import {
  Repeat,
  Plus,
  Search,
  Eye,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  ToggleLeft,
  ToggleRight,
  FileText,
  Calendar,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Layers,
  Check,
  Tag,
} from 'lucide-react';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionLineItem,
  BillingCycle,
  Product,
  Plan,
  Discount,
} from '../types';
import { SubscriptionService } from '../services/subscriptionService';
import { ProductService } from '../services/productService';
import { PlanService } from '../services/planService';
import { DiscountService } from '../services/discountService';
import { mockRecentCustomers } from '../services/mockData';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';

const STATUS_FILTERS: ('ALL' | SubscriptionStatus)[] = [
  'ALL',
  'Draft',
  'Quotation',
  'Confirmed',
  'Active',
  'Paused',
  'Closed',
];

const BILLING_CYCLES: ('ALL' | BillingCycle)[] = [
  'ALL',
  'monthly',
  'yearly',
  'weekly',
  'daily',
];

export const SubscriptionsPage: React.FC = () => {
  // Main Data
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Search, Filter, Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SubscriptionStatus>('ALL');
  const [cycleFilter, setCycleFilter] = useState<'ALL' | BillingCycle>('ALL');
  const [autoRenewFilter, setAutoRenewFilter] = useState<'ALL' | 'auto' | 'manual'>('ALL');
  const [sortBy, setSortBy] = useState<'subscriptionNumber' | 'customerName' | 'mrrAmount' | 'totalAmount' | 'startDate' | 'expiryDate'>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingSub, setViewingSub] = useState<Subscription | null>(null);
  const [closingSub, setClosingSub] = useState<Subscription | null>(null);
  const [renewingSub, setRenewingSub] = useState<Subscription | null>(null);
  const [deletingSub, setDeletingSub] = useState<Subscription | null>(null);

  // Toast / Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State for New Subscription
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formCustomerEmail, setFormCustomerEmail] = useState('');
  const [formPlanId, setFormPlanId] = useState('');
  const [formPlanName, setFormPlanName] = useState('');
  const [formBillingCycle, setFormBillingCycle] = useState<BillingCycle>('monthly');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30 Days');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAutoRenew, setFormAutoRenew] = useState(true);
  const [formStatus, setFormStatus] = useState<SubscriptionStatus>('Confirmed');
  const [formLines, setFormLines] = useState<SubscriptionLineItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Discount & Coupon State for New Subscription
  const [formCouponCode, setFormCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<{
    valid: boolean;
    message: string;
    discountAmount?: number;
  } | null>(null);

  // Load Initial Data
  useEffect(() => {
    setSubscriptions(SubscriptionService.getSubscriptions());
    setProducts(ProductService.getProducts());
    setPlans(PlanService.getPlans());
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Coupon Handlers
  const handleApplyCoupon = () => {
    const code = formCouponCode.trim().toUpperCase();
    if (!code) {
      setCouponFeedback({ valid: false, message: 'Please enter a coupon code.' });
      return;
    }
    const discount = DiscountService.getDiscountByCode(code);
    if (!discount) {
      setCouponFeedback({ valid: false, message: `Coupon code "${code}" not found or inactive.` });
      setAppliedDiscount(null);
      return;
    }

    const subtotal = formLines.reduce((sum, l) => sum + l.subtotal, 0);
    const totalQty = formLines.reduce((sum, l) => sum + l.quantity, 0);

    const evalRes = DiscountService.evaluateEligibility(discount, {
      customerId: formCustomerId,
      subtotal,
      totalQuantity: totalQty,
      productIds: formLines.map((l) => l.productId),
      planId: formPlanId,
      isEntireSubscription: true,
    });

    if (evalRes.eligible) {
      setAppliedDiscount(discount);
      setCouponFeedback({
        valid: true,
        message: `Coupon "${discount.name}" applied! Saving ${formatCurrency(evalRes.discountAmount)}.`,
        discountAmount: evalRes.discountAmount,
      });
    } else {
      setAppliedDiscount(null);
      setCouponFeedback({
        valid: false,
        message: evalRes.reason || 'This coupon is not eligible for this order.',
      });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedDiscount(null);
    setFormCouponCode('');
    setCouponFeedback(null);
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter((s) => s.status === 'Active').length;
    const confirmed = subscriptions.filter((s) => s.status === 'Confirmed').length;
    const paused = subscriptions.filter((s) => s.status === 'Paused').length;
    const totalMrr = subscriptions
      .filter((s) => s.status === 'Active' || s.status === 'Confirmed')
      .reduce((sum, s) => sum + (s.mrrAmount || 0), 0);
    const totalContractValue = subscriptions
      .filter((s) => s.status !== 'Closed')
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    return {
      total,
      active,
      confirmed,
      paused,
      totalMrr,
      totalContractValue,
    };
  }, [subscriptions]);

  // Form Totals Calculation with Discount and Pre-Tax Net Math
  const formTotals = useMemo(() => {
    let subtotal = 0;
    formLines.forEach((line) => {
      subtotal += line.subtotal;
    });

    let discountTotal = 0;
    if (appliedDiscount) {
      const totalQty = formLines.reduce((sum, l) => sum + l.quantity, 0);
      const evalRes = DiscountService.evaluateEligibility(appliedDiscount, {
        customerId: formCustomerId,
        subtotal,
        totalQuantity: totalQty,
        productIds: formLines.map((l) => l.productId),
        planId: formPlanId,
        isEntireSubscription: true,
      });
      if (evalRes.eligible) {
        discountTotal = evalRes.discountAmount;
      }
    }

    const netTaxable = Math.max(0, subtotal - discountTotal);
    const taxTotal = Math.round(netTaxable * 0.18 * 100) / 100;
    const totalAmount = Math.round((netTaxable + taxTotal) * 100) / 100;

    const mrrAmount =
      formBillingCycle === 'yearly'
        ? Math.round(totalAmount / 12)
        : formBillingCycle === 'daily'
        ? Math.round(totalAmount * 30)
        : totalAmount;

    return { subtotal, discountTotal, taxTotal, totalAmount, mrrAmount };
  }, [formLines, formBillingCycle, appliedDiscount, formCustomerId, formPlanId]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const defaultCust = mockRecentCustomers[0];
    const defaultPlan = plans[0];
    const defaultProduct = products[0];

    setFormCustomerId(defaultCust ? defaultCust.id : '');
    setFormCustomerName(defaultCust ? defaultCust.name : '');
    setFormCompanyName(defaultCust ? defaultCust.companyName : '');
    setFormCustomerEmail(defaultCust ? defaultCust.email : '');

    setFormPlanId(defaultPlan ? defaultPlan.id : '');
    setFormPlanName(defaultPlan ? defaultPlan.name : 'Standard Plan');
    setFormBillingCycle(defaultPlan ? defaultPlan.billingCycle : 'monthly');
    setFormPaymentTerms('Net 30 Days');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormAutoRenew(true);
    setFormStatus('Confirmed');

    // Seed 1 default line
    if (defaultProduct) {
      const unitPrice = defaultProduct.salesPrice || 250;
      const taxRate = 0.18;
      const taxAmount = unitPrice * taxRate;
      setFormLines([
        {
          id: `sli_${Date.now()}_1`,
          productId: defaultProduct.id,
          productName: defaultProduct.name,
          variant: defaultProduct.variants?.[0]?.name,
          variantName: defaultProduct.variants?.[0]?.name,
          quantity: 1,
          unitPrice,
          taxRate,
          taxAmount,
          subtotal: unitPrice,
          total: unitPrice + taxAmount,
        },
      ]);
    } else {
      setFormLines([]);
    }

    setFormError(null);
    setFormCouponCode('');
    setAppliedDiscount(null);
    setCouponFeedback(null);
    setIsCreateModalOpen(true);
  };

  // Add line item in Form
  const handleAddFormLine = () => {
    const p = products[0];
    if (!p) return;
    const unitPrice = p.salesPrice || 100;
    const taxRate = 0.18;
    const taxAmount = unitPrice * taxRate;

    setFormLines((prev) => [
      ...prev,
      {
        id: `sli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: p.id,
        productName: p.name,
        variant: p.variants?.[0]?.name,
        variantName: p.variants?.[0]?.name,
        quantity: 1,
        unitPrice,
        taxRate,
        taxAmount,
        subtotal: unitPrice,
        total: unitPrice + taxAmount,
      },
    ]);
  };

  // Remove line item in Form
  const handleRemoveFormLine = (index: number) => {
    if (formLines.length === 1) {
      setFormError('A subscription must have at least one product line item.');
      return;
    }
    setFormLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update line item in Form
  const handleUpdateFormLine = (
    index: number,
    field: 'productId' | 'variantName' | 'quantity' | 'unitPrice' | 'taxRate',
    val: any
  ) => {
    setFormLines((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };

      if (field === 'productId') {
        const product = products.find((p) => p.id === val);
        if (product) {
          target.productId = product.id;
          target.productName = product.name;
          target.variant = product.variants?.[0]?.name;
          target.variantName = product.variants?.[0]?.name;
          target.unitPrice = product.salesPrice;
        }
      } else if (field === 'variantName') {
        target.variant = val;
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
        target.taxRate = parseFloat(val) || 0;
      }

      target.subtotal = target.quantity * target.unitPrice;
      target.taxAmount = Math.round(target.subtotal * target.taxRate * 100) / 100;
      target.total = target.subtotal + target.taxAmount;

      updated[index] = target;
      return updated;
    });
  };

  // Handle Customer Selection in Form
  const handleCustomerChange = (customerId: string) => {
    const cust = mockRecentCustomers.find((c) => c.id === customerId);
    if (cust) {
      setFormCustomerId(cust.id);
      setFormCustomerName(cust.name);
      setFormCompanyName(cust.companyName);
      setFormCustomerEmail(cust.email);
    }
  };

  // Handle Plan Selection in Form
  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setFormPlanId(plan.id);
      setFormPlanName(plan.name);
      setFormBillingCycle(plan.billingCycle);
    }
  };

  // Create Subscription Submit
  const handleCreateSubscriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCustomerId) {
      setFormError('Please select a customer for this subscription.');
      return;
    }
    if (formLines.length === 0) {
      setFormError('Subscription must contain at least one line item.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate expiry date based on cycle
      const start = new Date(formStartDate);
      const expiry = new Date(start);
      if (formBillingCycle === 'yearly') {
        expiry.setFullYear(expiry.getFullYear() + 1);
      } else if (formBillingCycle === 'weekly') {
        expiry.setDate(expiry.getDate() + 7);
      } else if (formBillingCycle === 'daily') {
        expiry.setDate(expiry.getDate() + 1);
      } else {
        expiry.setMonth(expiry.getMonth() + 1);
      }
      const expiryDate = expiry.toISOString().split('T')[0];

      const newSub = SubscriptionService.createSubscription({
        customerId: formCustomerId,
        customerName: formCustomerName,
        companyName: formCompanyName,
        customerEmail: formCustomerEmail,
        planId: formPlanId || 'plan_custom',
        planName: formPlanName || 'Custom Suite',
        status: formStatus,
        startDate: formStartDate,
        expiryDate,
        renewalDate: expiryDate,
        billingCycle: formBillingCycle,
        paymentTerms: formPaymentTerms,
        items: formLines,
        mrrAmount: formTotals.mrrAmount,
        subtotal: formTotals.subtotal,
        taxTotal: formTotals.taxTotal,
        discountTotal: formTotals.discountTotal,
        discountCode: appliedDiscount?.code,
        totalAmount: formTotals.totalAmount,
        autoRenew: formAutoRenew,
      });

      setSubscriptions((prev) => [newSub, ...prev]);
      setIsCreateModalOpen(false);
      showFeedback('success', `Subscription ${newSub.subscriptionNumber} provisioned successfully!`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lifecycle Transitions
  const handleTransitionStatus = (sub: Subscription, newStatus: SubscriptionStatus) => {
    try {
      const updated = SubscriptionService.transitionStatus(sub.id, newStatus);
      setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (viewingSub?.id === sub.id) setViewingSub(updated);
      showFeedback(
        'success',
        `Subscription ${sub.subscriptionNumber} transitioned from ${sub.status} to ${newStatus}.`
      );
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to transition subscription status.');
    }
  };

  // Renew Subscription
  const handleConfirmRenew = () => {
    if (!renewingSub) return;
    try {
      const updated = SubscriptionService.renewSubscription(renewingSub.id);
      setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (viewingSub?.id === renewingSub.id) setViewingSub(updated);
      showFeedback(
        'success',
        `Subscription ${renewingSub.subscriptionNumber} renewed! Contract valid through ${formatDate(updated.expiryDate)}.`
      );
      setRenewingSub(null);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Renewal failed.');
    }
  };

  // Close Subscription
  const handleConfirmClose = () => {
    if (!closingSub) return;
    try {
      const updated = SubscriptionService.transitionStatus(closingSub.id, 'Closed');
      setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (viewingSub?.id === closingSub.id) setViewingSub(updated);
      showFeedback('success', `Subscription ${closingSub.subscriptionNumber} has been closed.`);
      setClosingSub(null);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to close subscription.');
    }
  };

  // Toggle Auto-Renew
  const handleToggleAutoRenew = (sub: Subscription) => {
    try {
      const updated = SubscriptionService.toggleAutoRenew(sub.id);
      setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      if (viewingSub?.id === sub.id) setViewingSub(updated);
      showFeedback(
        'success',
        `Auto-renew for ${sub.subscriptionNumber} is now ${updated.autoRenew ? 'Enabled' : 'Disabled'}.`
      );
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to toggle auto-renew.');
    }
  };

  // Delete Draft or Terminated Subscription
  const handleConfirmDelete = () => {
    if (!deletingSub) return;
    try {
      SubscriptionService.deleteSubscription(deletingSub.id);
      setSubscriptions((prev) => prev.filter((s) => s.id !== deletingSub.id));
      showFeedback('success', `Subscription ${deletingSub.subscriptionNumber} removed.`);
      setDeletingSub(null);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to delete subscription.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (subscriptions.length === 0) return;
    const headers = [
      'Subscription Number',
      'Customer',
      'Company',
      'Plan',
      'Status',
      'Billing Cycle',
      'Start Date',
      'Expiry Date',
      'MRR',
      'Total Amount',
      'Auto Renew',
    ];
    const rows = filteredSubscriptions.map((s) => [
      s.subscriptionNumber,
      `"${s.customerName}"`,
      `"${s.companyName}"`,
      `"${s.planName}"`,
      s.status,
      s.billingCycle,
      s.startDate,
      s.expiryDate,
      s.mrrAmount,
      s.totalAmount,
      s.autoRenew ? 'Yes' : 'No',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brightloop_subscriptions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered & Sorted Subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((s) => {
        const matchesSearch =
          s.subscriptionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.planName.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
        const matchesCycle = cycleFilter === 'ALL' || s.billingCycle === cycleFilter;
        const matchesAutoRenew =
          autoRenewFilter === 'ALL' ||
          (autoRenewFilter === 'auto' && s.autoRenew) ||
          (autoRenewFilter === 'manual' && !s.autoRenew);

        return matchesSearch && matchesStatus && matchesCycle && matchesAutoRenew;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy];
        let valB: any = b[sortBy];

        if (sortBy === 'startDate' || sortBy === 'expiryDate') {
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
  }, [subscriptions, searchQuery, statusFilter, cycleFilter, autoRenewFilter, sortBy, sortOrder]);

  // Paginated Data
  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage) || 1;
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubscriptions.slice(start, start + itemsPerPage);
  }, [filteredSubscriptions, currentPage]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Helper Badge Color
  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'Active':
        return <Badge variant="emerald">Active</Badge>;
      case 'Confirmed':
        return <Badge variant="blue">Confirmed</Badge>;
      case 'Quotation':
        return <Badge variant="purple">Quotation</Badge>;
      case 'Draft':
        return <Badge variant="amber">Draft</Badge>;
      case 'Paused':
        return <Badge variant="amber">Paused</Badge>;
      case 'Closed':
        return <Badge variant="slate">Closed</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  // Columns Configuration
  const columns: Column<Subscription>[] = [
    {
      header: (
        <button
          onClick={() => toggleSort('subscriptionNumber')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>Subscription #</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{row.subscriptionNumber}</span>
            {row.quotationNumber && (
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-medium border border-indigo-200">
                via {row.quotationNumber}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 capitalize">
            {row.billingCycle} billing · {row.paymentTerms}
          </p>
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
      header: 'Plan',
      cell: (row) => (
        <div className="space-y-1">
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
            {row.planName}
          </span>
          <p className="text-[11px] text-slate-500">
            {row.items?.length || 0} product line{row.items?.length === 1 ? '' : 's'}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => getStatusBadge(row.status),
    },
    {
      header: (
        <button
          onClick={() => toggleSort('mrrAmount')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 ml-auto"
        >
          <span>MRR / Total</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => (
        <div className="text-right">
          <span className="font-bold text-slate-900 text-sm">
            {formatCurrency(row.mrrAmount)}
            <span className="text-xs font-normal text-slate-500">/mo</span>
          </span>
          <p className="text-xs text-slate-500 font-medium">
            TCV: {formatCurrency(row.totalAmount)}
          </p>
        </div>
      ),
      className: 'text-right',
      headerClassName: 'text-right',
    },
    {
      header: (
        <button
          onClick={() => toggleSort('startDate')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>Contract Range</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => (
        <div className="text-xs text-slate-600 space-y-0.5">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{formatDate(row.startDate)} → {formatDate(row.expiryDate)}</span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            Next renewal: {formatDate(row.renewalDate)}
          </p>
        </div>
      ),
    },
    {
      header: 'Auto-Renew',
      cell: (row) => (
        <button
          type="button"
          onClick={() => handleToggleAutoRenew(row)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            row.autoRenew
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
          }`}
          title="Click to toggle auto-renewal policy"
        >
          {row.autoRenew ? (
            <>
              <ToggleRight className="w-4 h-4 text-emerald-600" />
              <span>Auto</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4 text-slate-400" />
              <span>Manual</span>
            </>
          )}
        </button>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          {/* Quick Lifecycle Transition Triggers */}
          {row.status === 'Draft' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleTransitionStatus(row, 'Confirmed')}
              className="text-xs h-7 px-2"
              title="Promote Draft to Confirmed"
            >
              Confirm
            </Button>
          )}

          {row.status === 'Quotation' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleTransitionStatus(row, 'Confirmed')}
              className="text-xs h-7 px-2 text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50"
              title="Confirm Customer Order"
            >
              Confirm
            </Button>
          )}

          {row.status === 'Confirmed' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleTransitionStatus(row, 'Active')}
              className="text-xs h-7 px-2 bg-emerald-600 hover:bg-emerald-700"
              icon={<Play className="w-3 h-3" />}
              title="Activate Subscription Service"
            >
              Activate
            </Button>
          )}

          {row.status === 'Active' && (
            <>
              <button
                type="button"
                onClick={() => setRenewingSub(row)}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Renew Contract Cycle"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleTransitionStatus(row, 'Paused')}
                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Pause Subscription"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setClosingSub(row)}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Close / Terminate"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {row.status === 'Paused' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTransitionStatus(row, 'Active')}
                className="text-xs h-7 px-2 text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                icon={<Play className="w-3 h-3" />}
                title="Resume Active Service"
              >
                Resume
              </Button>
              <button
                type="button"
                onClick={() => setClosingSub(row)}
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Close Subscription"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* View Details */}
          <button
            type="button"
            onClick={() => setViewingSub(row)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Contract Details & Lines"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Delete Draft/Closed */}
          {(row.status === 'Draft' || row.status === 'Closed') && (
            <button
              type="button"
              onClick={() => setDeletingSub(row)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Subscription Record"
            >
              <Trash2 className="w-3.5 h-3.5" />
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
              <Repeat className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Subscriptions</h2>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {metrics.active} Active Contracts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete lifecycle management: Draft → Quotation → Confirmed → Active → Closed / Paused.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            icon={<Plus className="w-4 h-4" />}
          >
            New Subscription
          </Button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Subscriptions
            </span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.total}</span>
            <span className="text-xs text-slate-500">records in system</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-semibold text-emerald-600">{metrics.active} Active</span>
            <span>·</span>
            <span className="font-semibold text-blue-600">{metrics.confirmed} Confirmed</span>
            <span>·</span>
            <span className="font-semibold text-amber-600">{metrics.paused} Paused</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Monthly Recurring (MRR)
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(metrics.totalMrr)}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">/mo</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Live recurring revenue from Active & Confirmed plans
          </p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Active Contract Value
            </span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(metrics.totalContractValue)}
            </span>
            <span className="text-xs text-slate-400">TCV</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Total committed value of active client accounts
          </p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Auto-Renewal Rate
            </span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics.total > 0
                ? Math.round((subscriptions.filter((s) => s.autoRenew).length / metrics.total) * 100)
                : 0}
              %
            </span>
            <span className="text-xs text-purple-600 font-semibold">automated</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {subscriptions.filter((s) => s.autoRenew).length} of {metrics.total} accounts configured for auto-renewal
          </p>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by subscription #, customer, company, or plan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Billing Cycle Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Cycle:</span>
              <select
                value={cycleFilter}
                onChange={(e) => {
                  setCycleFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {BILLING_CYCLES.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {cycle === 'ALL' ? 'All Billing Cycles' : `${cycle.charAt(0).toUpperCase() + cycle.slice(1)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-renew filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Renewal:</span>
              <select
                value={autoRenewFilter}
                onChange={(e) => {
                  setAutoRenewFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Policies</option>
                <option value="auto">Auto-Renew Enabled</option>
                <option value="manual">Manual Close Only</option>
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            {STATUS_FILTERS.map((st) => {
              const count =
                st === 'ALL'
                  ? subscriptions.length
                  : subscriptions.filter((s) => s.status === st).length;

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

      {/* Subscriptions Table */}
      <Card>
        <CardHeader
          title="Contracts & Subscriptions"
          subtitle={`Displaying ${filteredSubscriptions.length} contracts matching criteria`}
        />
        <Table
          columns={columns}
          data={paginatedSubscriptions}
          keyExtractor={(row) => row.id}
        />

        {/* Empty State */}
        {paginatedSubscriptions.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <div className="p-3 bg-slate-100 text-slate-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
              <Repeat className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No subscriptions found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No subscription contracts match your filter parameters. Try clearing your filters or create a new subscription.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setCycleFilter('ALL');
                setAutoRenewFilter('ALL');
              }}
            >
              Reset Filters
            </Button>
          </div>
        )}

        {/* Pagination Toolbar */}
        {filteredSubscriptions.length > 0 && (
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing{' '}
              <strong className="text-slate-800 font-semibold">
                {(currentPage - 1) * itemsPerPage + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-800 font-semibold">
                {Math.min(currentPage * itemsPerPage, filteredSubscriptions.length)}
              </strong>{' '}
              of <strong className="text-slate-800 font-semibold">{filteredSubscriptions.length}</strong> entries
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

      {/* VIEW SUBSCRIPTION DETAILS MODAL */}
      {viewingSub && (
        <Modal
          isOpen={true}
          onClose={() => setViewingSub(null)}
          title={`Subscription ${viewingSub.subscriptionNumber}`}
          description={`Contract Account for ${viewingSub.companyName}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Header Status & Top Actions */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Status:</span>
                  {getStatusBadge(viewingSub.status)}
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs font-bold text-slate-900">
                    {formatCurrency(viewingSub.mrrAmount)}/mo
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Contract: {formatDate(viewingSub.startDate)} → {formatDate(viewingSub.expiryDate)} · Next Renewal:{' '}
                  {formatDate(viewingSub.renewalDate)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {viewingSub.status === 'Active' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRenewingSub(viewingSub);
                      setViewingSub(null);
                    }}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Renew Now
                  </Button>
                )}
                {viewingSub.status === 'Confirmed' && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleTransitionStatus(viewingSub, 'Active')}
                    icon={<Play className="w-3.5 h-3.5" />}
                  >
                    Activate
                  </Button>
                )}
              </div>
            </div>

            {/* Lifecycle Visual Stepper */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Subscription Lifecycle Progression
              </span>
              <div className="grid grid-cols-5 gap-1.5 text-center pt-1">
                {(['Draft', 'Quotation', 'Confirmed', 'Active', 'Closed'] as const).map((stage, idx) => {
                  const isCurrent = viewingSub.status === stage;
                  const isPast =
                    (stage === 'Draft') ||
                    (stage === 'Quotation' && ['Quotation', 'Confirmed', 'Active', 'Closed'].includes(viewingSub.status)) ||
                    (stage === 'Confirmed' && ['Confirmed', 'Active', 'Closed'].includes(viewingSub.status)) ||
                    (stage === 'Active' && ['Active', 'Closed'].includes(viewingSub.status));

                  return (
                    <div key={stage} className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 scale-110 shadow-sm'
                            : isPast
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {isPast && !isCurrent ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] mt-1.5 font-medium ${
                          isCurrent ? 'text-indigo-600 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {stage}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Customer Information
                </span>
                <p className="font-semibold text-slate-900">{viewingSub.customerName}</p>
                <p className="text-slate-600">{viewingSub.companyName}</p>
                <p className="text-slate-500 font-mono text-[11px]">{viewingSub.customerEmail || 'No email specified'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Contract Terms
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan Tier:</span>
                  <span className="font-semibold text-slate-900">{viewingSub.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Billing Cycle:</span>
                  <span className="font-semibold text-slate-900 capitalize">{viewingSub.billingCycle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Terms:</span>
                  <span className="font-semibold text-slate-900">{viewingSub.paymentTerms}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Auto Renewal:</span>
                  <span className={`font-semibold ${viewingSub.autoRenew ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {viewingSub.autoRenew ? 'Enabled (Automatic)' : 'Manual Close'}
                  </span>
                </div>
              </div>
            </div>

            {/* Product Line Items */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Provisioned Product Lines ({viewingSub.items?.length || 0})
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Product & Variant</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Tax</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {viewingSub.items && viewingSub.items.length > 0 ? (
                      viewingSub.items.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900">{line.productName}</span>
                            {line.variantName && (
                              <p className="text-[11px] text-slate-500">Edition: {line.variantName}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">{line.quantity}</td>
                          <td className="py-2.5 px-3 text-right">{formatCurrency(line.unitPrice)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            {formatCurrency(line.taxAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(line.total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          Standard bundled plan service with no itemized hardware lines.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 text-xs">
                    {viewingSub.subtotal !== undefined && viewingSub.subtotal > 0 && (
                      <tr>
                        <td colSpan={4} className="py-1.5 px-3 text-right text-slate-600">
                          Gross Subtotal:
                        </td>
                        <td className="py-1.5 px-3 text-right font-medium text-slate-800">
                          {formatCurrency(viewingSub.subtotal)}
                        </td>
                      </tr>
                    )}
                    {viewingSub.discountTotal !== undefined && viewingSub.discountTotal > 0 && (
                      <tr className="bg-emerald-50/50">
                        <td colSpan={4} className="py-1.5 px-3 text-right font-medium text-emerald-800">
                          Applied Discount {viewingSub.discountCode ? `(${viewingSub.discountCode})` : ''}:
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-emerald-700">
                          -{formatCurrency(viewingSub.discountTotal)}
                        </td>
                      </tr>
                    )}
                    {viewingSub.taxTotal !== undefined && viewingSub.taxTotal > 0 && (
                      <tr>
                        <td colSpan={4} className="py-1.5 px-3 text-right text-slate-600">
                          Tax (18% on net taxable):
                        </td>
                        <td className="py-1.5 px-3 text-right font-medium text-slate-800">
                          +{formatCurrency(viewingSub.taxTotal)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={4} className="py-2 px-3 text-right font-bold text-slate-700 border-t border-slate-200">
                        Monthly Recurring Revenue (MRR):
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-indigo-600 border-t border-slate-200">
                        {formatCurrency(viewingSub.mrrAmount)}/mo
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="py-2 px-3 text-right font-bold text-slate-900">
                        Total Contract Value:
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 text-sm">
                        {formatCurrency(viewingSub.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Linked Quotation if present */}
            {viewingSub.quotationNumber && (
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-950 font-medium">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Originating Quotation: <strong>{viewingSub.quotationNumber}</strong></span>
                </div>
                <span className="text-[11px] text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded border border-indigo-200">
                  Converted Proposal
                </span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setViewingSub(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE NEW SUBSCRIPTION MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision New Subscription"
        description="Select customer, billing cycle, plan tier, and itemized product licenses"
        maxWidth="2xl"
      >
        {formError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubscriptionSubmit} className="space-y-5">
          {/* Section 1: Customer Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Customer Account</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Registered Customer *
                </label>
                <select
                  value={formCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
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
                  Customer Email
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

          {/* Section 2: Contract Parameters */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Contract Configuration</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subscription Plan Tier *
                </label>
                <select
                  value={formPlanId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.billingCycle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Billing Cycle *
                </label>
                <select
                  value={formBillingCycle}
                  onChange={(e) => setFormBillingCycle(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contract Start Date *
                </label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Initial Status *
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Confirmed">Confirmed (Pre-activation)</option>
                  <option value="Active">Active (Provisioned)</option>
                  <option value="Draft">Draft (Internal review)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="autoRenewCheck"
                  checked={formAutoRenew}
                  onChange={(e) => setFormAutoRenew(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="autoRenewCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Enable Auto-Renewal at cycle end
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Product Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Product Line Items ({formLines.length})
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFormLine}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Line Item
              </Button>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 bg-slate-50 space-y-2">
              {formLines.map((line, idx) => {
                const selectedProd = products.find((p) => p.id === line.productId);
                const hasVariants = selectedProd && selectedProd.variants && selectedProd.variants.length > 0;

                return (
                  <div key={line.id} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Product select */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Product</label>
                        <select
                          value={line.productId}
                          onChange={(e) => handleUpdateFormLine(idx, 'productId', e.target.value)}
                          className="w-full border border-slate-300 rounded py-1 px-2 text-xs"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (${p.salesPrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Variant select */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Variant</label>
                        {hasVariants ? (
                          <select
                            value={line.variantName || ''}
                            onChange={(e) => handleUpdateFormLine(idx, 'variantName', e.target.value)}
                            className="w-full border border-slate-300 rounded py-1 px-2 text-xs"
                          >
                            {selectedProd?.variants?.map((v) => (
                              <option key={v.id} value={v.name}>
                                {v.name} (+${v.priceAdjustment})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic block py-1">No variants</span>
                        )}
                      </div>

                      {/* Qty */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => handleUpdateFormLine(idx, 'quantity', e.target.value)}
                          className="w-full border border-slate-300 rounded py-1 px-2 text-xs"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Unit Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => handleUpdateFormLine(idx, 'unitPrice', e.target.value)}
                          className="w-full border border-slate-300 rounded py-1 px-2 text-xs"
                        />
                      </div>

                      {/* Delete */}
                      <div className="sm:col-span-1 text-right pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveFormLine(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove Line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Tax (18%): {formatCurrency(line.taxAmount)}</span>
                      <span className="font-bold text-slate-900">
                        Line Total: {formatCurrency(line.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Promotional Coupon */}
          <div className="bg-white p-3.5 rounded-xl border border-dashed border-indigo-200">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Apply Promotional Coupon
              </span>
              {appliedDiscount && (
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-medium"
                >
                  Remove Coupon
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. WELCOME20, ANNUALPROMO, FLASH50"
                value={formCouponCode}
                onChange={(e) => setFormCouponCode(e.target.value.toUpperCase())}
                disabled={!!appliedDiscount}
                className="flex-1 rounded-lg border border-slate-300 py-1.5 px-3 text-xs uppercase font-mono tracking-wider focus:border-indigo-500 focus:outline-none"
              />
              <Button
                type="button"
                variant={appliedDiscount ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleApplyCoupon}
                disabled={!formCouponCode.trim() || !!appliedDiscount}
              >
                Apply
              </Button>
            </div>
            {couponFeedback && (
              <p
                className={`text-[11px] mt-1.5 flex items-center gap-1 ${
                  couponFeedback.valid ? 'text-emerald-600 font-medium' : 'text-rose-600'
                }`}
              >
                {couponFeedback.valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                {couponFeedback.message}
              </p>
            )}
          </div>

          {/* Section 5: Totals Summary */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="text-slate-500">Gross Subtotal: {formatCurrency(formTotals.subtotal)}</p>
              {formTotals.discountTotal > 0 && (
                <p className="text-emerald-600 font-semibold">
                  Promotional Discount ({appliedDiscount?.name}): -{formatCurrency(formTotals.discountTotal)}
                </p>
              )}
              <p className="text-slate-500">Applicable Tax (18% on net taxable): {formatCurrency(formTotals.taxTotal)}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">Monthly Recurring (MRR):</span>
              <span className="text-base font-bold text-indigo-600 block">
                {formatCurrency(formTotals.mrrAmount)}/mo
              </span>
              <span className="font-bold text-slate-900 text-sm">
                Total Contract: {formatCurrency(formTotals.totalAmount)}
              </span>
            </div>
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
              Provision Subscription
            </Button>
          </div>
        </form>
      </Modal>

      {/* RENEW SUBSCRIPTION CONFIRMATION MODAL */}
      {renewingSub && (
        <Modal
          isOpen={true}
          onClose={() => setRenewingSub(null)}
          title="Renew Subscription Contract"
          description={`Extend contract cycle for ${renewingSub.subscriptionNumber}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs text-slate-600">
            <p>
              Renewing will extend the subscription contract by <strong>1 billing cycle ({renewingSub.billingCycle})</strong> and update the renewal date automatically.
            </p>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900 font-medium">
              Current Expiry: {formatDate(renewingSub.expiryDate)}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRenewingSub(null)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleConfirmRenew}>
                Confirm Renewal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CLOSE / TERMINATE SUBSCRIPTION MODAL */}
      {closingSub && (
        <Modal
          isOpen={true}
          onClose={() => setClosingSub(null)}
          title="Close Subscription Contract"
          description={`Terminate service for ${closingSub.subscriptionNumber}?`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs text-slate-600">
            <p className="text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
              Closing this subscription will transition it to <strong>Closed</strong> status. Recurring billing will immediately halt.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setClosingSub(null)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={handleConfirmClose}>
                Confirm Close Contract
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE DRAFT/CLOSED SUBSCRIPTION MODAL */}
      {deletingSub && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingSub(null)}
          title="Delete Subscription Record"
          description={`Permanently delete ${deletingSub.subscriptionNumber}?`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs text-slate-600">
            <p>
              This record will be permanently deleted from the persistent database.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeletingSub(null)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={handleConfirmDelete}>
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
