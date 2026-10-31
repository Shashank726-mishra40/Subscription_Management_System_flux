import React, { useState, useEffect, useMemo } from 'react';
import {
  Percent,
  Plus,
  Search,
  Tag,
  Eye,
  Edit2,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  History,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  Discount,
  DiscountType,
  DiscountUsage,
  Product,
  Plan,
} from '../types';
import { DiscountService } from '../services/discountService';
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

const STATUS_FILTERS = ['ALL', 'Active', 'Inactive', 'Scheduled', 'Expired'] as const;
type StatusFilterType = typeof STATUS_FILTERS[number];

const TYPE_FILTERS = ['ALL', 'percentage', 'fixed_amount'] as const;
type TypeFilterType = typeof TYPE_FILTERS[number];

export const DiscountsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Active View Tab: 'discounts' | 'usages' | 'tester'
  const [activeTab, setActiveTab] = useState<'discounts' | 'usages' | 'tester'>('discounts');

  // Core Data
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [usages, setUsages] = useState<DiscountUsage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'usedCount' | 'startDate' | 'endDate'>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [viewingDiscount, setViewingDiscount] = useState<Discount | null>(null);
  const [deletingDiscount, setDeletingDiscount] = useState<Discount | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<DiscountType>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(10);
  const [formMinPurchase, setFormMinPurchase] = useState<number>(0);
  const [formMinQuantity, setFormMinQuantity] = useState<number>(1);
  const [formApplicableProductIds, setFormApplicableProductIds] = useState<string[]>([]);
  const [formApplicablePlanIds, setFormApplicablePlanIds] = useState<string[]>([]);
  const [formApplyToEntireSubscription, setFormApplyToEntireSubscription] = useState<boolean>(true);
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState('');
  const [formMaxUses, setFormMaxUses] = useState<number | ''>('');
  const [formMaxUsesPerCustomer, setFormMaxUsesPerCustomer] = useState<number | ''>(1);
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast / Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Eligibility Tester Tool State
  const [testCouponCode, setTestCouponCode] = useState('BULKSEATS20');
  const [testCustomerId, setTestCustomerId] = useState('cust_01');
  const [testSubtotal, setTestSubtotal] = useState(5000);
  const [testQuantity, setTestQuantity] = useState(25);
  const [testProductId, setTestProductId] = useState('prod_01');
  const [testPlanId, setTestPlanId] = useState('plan_ent');
  const [testResult, setTestResult] = useState<any>(null);

  // Load Initial Data
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setDiscounts(DiscountService.getDiscounts());
    setUsages(DiscountService.getUsageHistory());
    setProducts(ProductService.getProducts());
    setPlans(PlanService.getPlans());
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Helper: compute dynamic status for a discount rule
  const getDynamicStatus = (d: Discount): 'Active' | 'Inactive' | 'Scheduled' | 'Expired' => {
    if (d.status === 'Inactive' || d.isActive === false) return 'Inactive';
    const today = new Date().toISOString().split('T')[0];
    if (d.startDate > today) return 'Scheduled';
    if (d.endDate < today) return 'Expired';
    return 'Active';
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = discounts.length;
    const active = discounts.filter((d) => d.status === 'Active' && d.startDate <= today && d.endDate >= today).length;
    const scheduled = discounts.filter((d) => d.status === 'Active' && d.startDate > today).length;
    const expired = discounts.filter((d) => d.endDate < today).length;

    const totalDiscountAmountApplied = usages.reduce((sum, u) => sum + (u.discountAmount || 0), 0);

    const remainingUsage = discounts
      .filter((d) => d.status === 'Active' && d.maximumUses)
      .reduce((sum, d) => sum + Math.max(0, (d.maximumUses || 0) - (d.usedCount || 0)), 0);

    return {
      total,
      active,
      scheduled,
      expired,
      totalDiscountAmountApplied,
      remainingUsage,
    };
  }, [discounts, usages]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const end = new Date();
    end.setMonth(end.getMonth() + 3);

    setEditingDiscount(null);
    setFormName('');
    setFormDescription('');
    setFormCode('');
    setFormDiscountType('percentage');
    setFormDiscountValue(15);
    setFormMinPurchase(0);
    setFormMinQuantity(1);
    setFormApplicableProductIds([]);
    setFormApplicablePlanIds([]);
    setFormApplyToEntireSubscription(true);
    setFormStartDate(today);
    setFormEndDate(end.toISOString().split('T')[0]);
    setFormMaxUses(100);
    setFormMaxUsesPerCustomer(1);
    setFormStatus('Active');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (d: Discount) => {
    setEditingDiscount(d);
    setFormName(d.name);
    setFormDescription(d.description || '');
    setFormCode(d.code || '');
    setFormDiscountType(d.discountType || d.type || 'percentage');
    setFormDiscountValue(d.discountValue !== undefined ? d.discountValue : (d.value || 0));
    setFormMinPurchase(d.minimumPurchase || d.minPurchaseAmount || 0);
    setFormMinQuantity(d.minimumQuantity || d.minPurchaseQuantity || 1);
    setFormApplicableProductIds(d.applicableProductIds || []);
    setFormApplicablePlanIds(d.applicablePlanIds || []);
    setFormApplyToEntireSubscription(d.applyToEntireSubscription ?? true);
    setFormStartDate(d.startDate);
    setFormEndDate(d.endDate);
    setFormMaxUses(d.maximumUses !== undefined ? d.maximumUses : (d.usageLimit || ''));
    setFormMaxUsesPerCustomer(d.maximumUsesPerCustomer !== undefined ? d.maximumUsesPerCustomer : 1);
    setFormStatus(d.status || (d.isActive ? 'Active' : 'Inactive'));
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Submit Create or Edit Discount
  const handleDiscountFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Form Validations
    if (!formName.trim()) {
      setFormError('Discount rule name is required.');
      return;
    }
    if (formDiscountValue <= 0) {
      setFormError('Discount value must be greater than zero.');
      return;
    }
    if (formDiscountType === 'percentage' && formDiscountValue > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }
    if (formMinPurchase < 0) {
      setFormError('Minimum purchase amount cannot be negative.');
      return;
    }
    if (formMinQuantity < 1) {
      setFormError('Minimum quantity requirement must be at least 1.');
      return;
    }
    if (!formStartDate || !formEndDate) {
      setFormError('Both start date and end date are required.');
      return;
    }
    if (formEndDate <= formStartDate) {
      setFormError('End date must be strictly after the start date.');
      return;
    }
    if (formMaxUses !== '' && formMaxUses <= 0) {
      setFormError('Maximum usage limit must be a positive number.');
      return;
    }
    if (formMaxUsesPerCustomer !== '' && formMaxUsesPerCustomer <= 0) {
      setFormError('Maximum uses per customer must be at least 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingDiscount) {
        const updated = DiscountService.updateDiscount(editingDiscount.id, {
          name: formName,
          description: formDescription,
          code: formCode.trim() ? formCode.trim().toUpperCase() : undefined,
          discountType: formDiscountType,
          discountValue: Number(formDiscountValue),
          minimumPurchase: Number(formMinPurchase),
          minimumQuantity: Number(formMinQuantity),
          applicableProductIds: formApplicableProductIds,
          applicablePlanIds: formApplicablePlanIds,
          applyToEntireSubscription: formApplyToEntireSubscription,
          startDate: formStartDate,
          endDate: formEndDate,
          maximumUses: formMaxUses === '' ? undefined : Number(formMaxUses),
          maximumUsesPerCustomer: formMaxUsesPerCustomer === '' ? undefined : Number(formMaxUsesPerCustomer),
          status: formStatus,
        });

        setDiscounts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        showFeedback('success', `Discount "${updated.name}" updated successfully.`);
      } else {
        const created = DiscountService.createDiscount({
          name: formName,
          description: formDescription,
          code: formCode.trim() ? formCode.trim().toUpperCase() : undefined,
          discountType: formDiscountType,
          discountValue: Number(formDiscountValue),
          minimumPurchase: Number(formMinPurchase),
          minimumQuantity: Number(formMinQuantity),
          applicableProductIds: formApplicableProductIds,
          applicablePlanIds: formApplicablePlanIds,
          applyToEntireSubscription: formApplyToEntireSubscription,
          startDate: formStartDate,
          endDate: formEndDate,
          maximumUses: formMaxUses === '' ? undefined : Number(formMaxUses),
          maximumUsesPerCustomer: formMaxUsesPerCustomer === '' ? undefined : Number(formMaxUsesPerCustomer),
          status: formStatus,
        });

        setDiscounts((prev) => [created, ...prev]);
        showFeedback('success', `Discount rule "${created.name}" created successfully.`);
      }

      setIsCreateModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save discount rule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Active/Inactive
  const handleToggleStatus = (d: Discount) => {
    try {
      const updated = DiscountService.toggleDiscountStatus(d.id);
      setDiscounts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showFeedback('success', `Discount "${updated.name}" is now ${updated.status}.`);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to toggle status.');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingDiscount) return;
    try {
      DiscountService.deleteDiscount(deletingDiscount.id);
      setDiscounts((prev) => prev.filter((d) => d.id !== deletingDiscount.id));
      showFeedback('success', `Discount rule "${deletingDiscount.name}" deleted.`);
      setDeletingDiscount(null);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to delete discount.');
    }
  };

  // Run Eligibility Tester
  const handleRunTester = (e: React.FormEvent) => {
    e.preventDefault();
    const discount = DiscountService.getDiscountByCode(testCouponCode);
    if (!discount) {
      setTestResult({
        eligible: false,
        reason: `Coupon code "${testCouponCode}" does not exist in the active rule registry.`,
      });
      return;
    }

    const evaluation = DiscountService.evaluateEligibility(discount, {
      customerId: testCustomerId,
      subtotal: Number(testSubtotal),
      totalQuantity: Number(testQuantity),
      productIds: testProductId ? [testProductId] : [],
      planId: testPlanId,
    });

    setTestResult({
      discount,
      ...evaluation,
    });
  };

  // Filtered & Sorted Discounts
  const filteredDiscounts = useMemo(() => {
    return discounts
      .filter((d) => {
        const matchesSearch =
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.code && d.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const dynStatus = getDynamicStatus(d);
        const matchesStatus = statusFilter === 'ALL' || dynStatus === statusFilter;
        const matchesType = typeFilter === 'ALL' || (d.discountType || d.type) === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy];
        let valB: any = b[sortBy];

        if (sortBy === 'value') {
          valA = a.discountValue !== undefined ? a.discountValue : (a.value || 0);
          valB = b.discountValue !== undefined ? b.discountValue : (b.value || 0);
        } else if (sortBy === 'startDate' || sortBy === 'endDate') {
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
  }, [discounts, searchQuery, statusFilter, typeFilter, sortBy, sortOrder]);

  // Paginated Discounts
  const totalPages = Math.ceil(filteredDiscounts.length / itemsPerPage) || 1;
  const paginatedDiscounts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDiscounts.slice(start, start + itemsPerPage);
  }, [filteredDiscounts, currentPage]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Status Badge Helper
  const getRuleBadge = (status: 'Active' | 'Inactive' | 'Scheduled' | 'Expired') => {
    switch (status) {
      case 'Active':
        return <Badge variant="emerald">Active</Badge>;
      case 'Scheduled':
        return <Badge variant="blue">Scheduled</Badge>;
      case 'Expired':
        return <Badge variant="rose">Expired</Badge>;
      case 'Inactive':
      default:
        return <Badge variant="slate">Inactive</Badge>;
    }
  };

  // Table Columns (Discount Rules)
  const columns: Column<Discount>[] = [
    {
      header: (
        <button
          onClick={() => toggleSort('name')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>Discount Name</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{row.name}</span>
            {row.code && (
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[10px]">
                {row.code}
              </span>
            )}
          </div>
          {row.description && (
            <p className="text-xs text-slate-500 max-w-sm truncate">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      header: (
        <button
          onClick={() => toggleSort('value')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>Type & Value</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => {
        const type = row.discountType || row.type;
        const val = row.discountValue !== undefined ? row.discountValue : (row.value || 0);
        return (
          <div>
            <span className="font-bold text-slate-900">
              {type === 'percentage' ? `${val}% OFF` : `$${val} OFF`}
            </span>
            <p className="text-[11px] text-slate-400 capitalize">
              {type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
            </p>
          </div>
        );
      },
    },
    {
      header: 'Minimum Thresholds',
      cell: (row) => {
        const minP = row.minimumPurchase || row.minPurchaseAmount || 0;
        const minQ = row.minimumQuantity || row.minPurchaseQuantity || 1;
        return (
          <div className="text-xs text-slate-600 space-y-0.5">
            <p>{minP > 0 ? `Min $${minP.toLocaleString()} Cart` : 'No cart min'}</p>
            <p className="text-[11px] text-slate-400">{minQ > 1 ? `Min ${minQ} seats` : '1+ items'}</p>
          </div>
        );
      },
    },
    {
      header: 'Scope',
      cell: (row) => (
        <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
          {row.applyToEntireSubscription ? 'Entire Contract' : 'Specific Products'}
        </span>
      ),
    },
    {
      header: (
        <button
          onClick={() => toggleSort('usedCount')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>Usage</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => {
        const max = row.maximumUses || row.usageLimit;
        return (
          <div className="text-xs text-slate-700">
            <span className="font-bold">{row.usedCount}</span>
            {max ? <span className="text-slate-400"> / {max} max</span> : <span className="text-slate-400"> (Unlimited)</span>}
            {row.maximumUsesPerCustomer && (
              <p className="text-[10px] text-slate-400">{row.maximumUsesPerCustomer}/cust max</p>
            )}
          </div>
        );
      },
    },
    {
      header: (
        <button
          onClick={() => toggleSort('startDate')}
          className="flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>Validity Range</span>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ),
      cell: (row) => (
        <div className="text-xs text-slate-600 space-y-0.5">
          <p>{formatDate(row.startDate)} → {formatDate(row.endDate)}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => getRuleBadge(getDynamicStatus(row)),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1 justify-end">
          {/* View Details */}
          <button
            type="button"
            onClick={() => setViewingDiscount(row)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Rule Details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Admin Controls */}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => handleOpenEditModal(row)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit Discount Rule"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleToggleStatus(row)}
                className={`p-1.5 rounded-lg transition-colors ${
                  row.status === 'Active'
                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    : 'text-emerald-600 hover:bg-emerald-50'
                }`}
                title={row.status === 'Active' ? 'Deactivate Rule' : 'Activate Rule'}
              >
                <Power className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setDeletingDiscount(row)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete Discount"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Percent className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Discount & Coupon Management</h2>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              {metrics.active} Active Promotions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure percentage and fixed price incentives, validity periods, minimum thresholds, and usage limits.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              icon={<Plus className="w-4 h-4" />}
            >
              Create Discount Rule
            </Button>
          </div>
        )}
      </div>

      {/* KPI Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Rules
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{metrics.total}</span>
            <span className="text-[10px] text-slate-400">rules</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Active Rules
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-600">{metrics.active}</span>
            <span className="text-[10px] text-emerald-600 font-semibold">live</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Scheduled
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-blue-600">{metrics.scheduled}</span>
            <span className="text-[10px] text-blue-600 font-semibold">future</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Expired
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-500">{metrics.expired}</span>
            <span className="text-[10px] text-slate-400">concluded</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Savings Granted
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-indigo-600">
              {formatCurrency(metrics.totalDiscountAmountApplied)}
            </span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Remaining Usage
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{metrics.remainingUsage}</span>
            <span className="text-[10px] text-slate-400">redemptions</span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('discounts')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'discounts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Discount Rules Registry</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'discounts' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {discounts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('usages')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'usages'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Discount Usage History</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'usages' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {usages.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tester')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'tester'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Coupon Tester & Eligibility Engine</span>
        </button>
      </div>

      {/* TAB 1: DISCOUNT RULES REGISTRY */}
      {activeTab === 'discounts' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search discount by name, promo code, or description..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Type:</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="ALL">All Types</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount ($)</option>
                  </select>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                {STATUS_FILTERS.map((st) => {
                  const count =
                    st === 'ALL'
                      ? discounts.length
                      : discounts.filter((d) => getDynamicStatus(d) === st).length;

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

          {/* Discounts Table */}
          <Card>
            <CardHeader
              title="Configured Discount Rules"
              subtitle={`Showing ${filteredDiscounts.length} discount rules matching criteria`}
            />
            <Table
              columns={columns}
              data={paginatedDiscounts}
              keyExtractor={(row) => row.id}
            />

            {/* Empty State */}
            {paginatedDiscounts.length === 0 && (
              <div className="py-12 text-center space-y-3">
                <div className="p-3 bg-slate-100 text-slate-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                  <Percent className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">No discount rules found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No promotional rules match your current filter parameters. Try clearing your filters or create a new discount rule.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setTypeFilter('ALL');
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredDiscounts.length > 0 && (
              <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
                <div>
                  Showing{' '}
                  <strong className="text-slate-800 font-semibold">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-slate-800 font-semibold">
                    {Math.min(currentPage * itemsPerPage, filteredDiscounts.length)}
                  </strong>{' '}
                  of <strong className="text-slate-800 font-semibold">{filteredDiscounts.length}</strong> entries
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

      {/* TAB 2: DISCOUNT USAGE HISTORY */}
      {activeTab === 'usages' && (
        <Card>
          <CardHeader
            title="Discount Application History & Audit Trail"
            subtitle={`Recorded ${usages.length} individual discount redemptions across invoices and subscriptions`}
            action={
              isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    DiscountService.clearUsageHistory();
                    setUsages([]);
                    showFeedback('success', 'Discount usage history cleared.');
                  }}
                >
                  Clear Usage Log
                </Button>
              )
            }
          />
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {usages.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Applied Date</th>
                    <th className="py-2.5 px-4">Discount Rule</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Invoice / Subscription</th>
                    <th className="py-2.5 px-4 text-right">Original Amount</th>
                    <th className="py-2.5 px-4 text-right">Discount Given</th>
                    <th className="py-2.5 px-4 text-right">Final Amount</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {usages.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {formatDate(u.appliedAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{u.discountName}</span>
                        {u.discountCode && (
                          <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                            {u.discountCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{u.companyName || u.customerName}</span>
                        <span className="text-[11px] text-slate-500">{u.customerName}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {u.invoiceNumber ? (
                          <span className="font-semibold text-slate-800 block">Inv: {u.invoiceNumber}</span>
                        ) : null}
                        {u.subscriptionNumber && (
                          <span className="text-indigo-600">Sub: {u.subscriptionNumber}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">{formatCurrency(u.originalAmount)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        -{formatCurrency(u.discountAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(u.finalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={u.status === 'Applied' ? 'emerald' : 'slate'}>{u.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No discount redemptions recorded yet.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* TAB 3: COUPON TESTER & ELIGIBILITY SIMULATOR */}
      {activeTab === 'tester' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Card className="md:col-span-6 p-5 bg-white border border-slate-200">
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Discount Eligibility Simulator</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Test coupon codes against specific customers, order totals, and product lines to verify live eligibility logic.
                </p>
              </div>

              <form onSubmit={handleRunTester} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    value={testCouponCode}
                    onChange={(e) => setTestCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BULKSEATS20, STARTUP500, ADDON10"
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono font-bold text-indigo-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Customer Account</label>
                    <select
                      value={testCustomerId}
                      onChange={(e) => setTestCustomerId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs"
                    >
                      {mockRecentCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Order Subtotal ($)</label>
                    <input
                      type="number"
                      value={testSubtotal}
                      onChange={(e) => setTestSubtotal(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Total Quantity / Seats</label>
                    <input
                      type="number"
                      min="1"
                      value={testQuantity}
                      onChange={(e) => setTestQuantity(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Subscription Plan</label>
                    <select
                      value={testPlanId}
                      onChange={(e) => setTestPlanId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs"
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Primary Product Line</label>
                  <select
                    value={testProductId}
                    onChange={(e) => setTestProductId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-1.5 px-2 text-xs"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="sm" className="w-full">
                    Evaluate Eligibility
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          {/* Test Evaluation Result Card */}
          <Card className="md:col-span-6 p-5 bg-slate-50 border border-slate-200">
            <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Engine Evaluation Results</span>
            </h4>

            {testResult ? (
              <div className="space-y-4 text-xs">
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    testResult.eligible
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {testResult.eligible ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-bold text-sm">
                      {testResult.eligible ? 'Coupon Successfully Applied!' : 'Coupon Ineligible'}
                    </h5>
                    <p className="text-xs mt-0.5">
                      {testResult.eligible
                        ? `Promotion "${testResult.discount.name}" matches all eligibility parameters.`
                        : testResult.reason}
                    </p>
                  </div>
                </div>

                {testResult.eligible && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross Subtotal:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(testSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount Concession:</span>
                      <span>-{formatCurrency(testResult.discountAmount)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                      <span>Net Taxable Total:</span>
                      <span className="text-indigo-600">{formatCurrency(testResult.finalAmount)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Select parameters and click "Evaluate Eligibility" to view real-time engine calculation.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* CREATE / EDIT DISCOUNT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingDiscount ? `Edit Discount: ${editingDiscount.name}` : 'Create Discount Rule'}
        description="Configure percentage or fixed amount discounts with eligibility conditions and limits"
        maxWidth="2xl"
      >
        {formError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleDiscountFormSubmit} className="space-y-4 text-xs">
          {/* Section 1: Basic Information */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
              1. Basic Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discount Name *</label>
                <input
                  type="text"
                  placeholder="e.g. High Volume Seats Promotion"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Coupon Promo Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BULK20, SUMMER500"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs font-mono font-bold text-indigo-700 uppercase focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                placeholder="Details on client qualification and promotional scope..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discount Type *</label>
                <select
                  value={formDiscountType}
                  onChange={(e) => setFormDiscountType(e.target.value as DiscountType)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="percentage">Percentage Discount (%)</option>
                  <option value="fixed_amount">Fixed Amount Discount ($)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Discount Value ({formDiscountType === 'percentage' ? '%' : '$'}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={formDiscountType === 'percentage' ? 100 : undefined}
                  value={formDiscountValue}
                  onChange={(e) => setFormDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Eligibility Requirements */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
              2. Eligibility & Thresholds
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Minimum Purchase Amount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 for no minimum"
                  value={formMinPurchase}
                  onChange={(e) => setFormMinPurchase(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Minimum Quantity / Seats
                </label>
                <input
                  type="number"
                  min="1"
                  value={formMinQuantity}
                  onChange={(e) => setFormMinQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Eligible Plans (Optional - select to restrict)
                </label>
                <div className="border border-slate-200 rounded-lg p-2 max-h-28 overflow-y-auto space-y-1 bg-white">
                  {plans.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={formApplicablePlanIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormApplicablePlanIds([...formApplicablePlanIds, p.id]);
                          } else {
                            setFormApplicablePlanIds(formApplicablePlanIds.filter((id) => id !== p.id));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Eligible Products (Optional - select to restrict)
                </label>
                <div className="border border-slate-200 rounded-lg p-2 max-h-28 overflow-y-auto space-y-1 bg-white">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={formApplicableProductIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormApplicableProductIds([...formApplicableProductIds, p.id]);
                          } else {
                            setFormApplicableProductIds(formApplicableProductIds.filter((id) => id !== p.id));
                          }
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="entireSubCheck"
                checked={formApplyToEntireSubscription}
                onChange={(e) => setFormApplyToEntireSubscription(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <label htmlFor="entireSubCheck" className="font-semibold text-slate-700 cursor-pointer">
                Apply discount to entire contract subtotal
              </label>
            </div>
          </div>

          {/* Section 3: Validity & Usage Limits */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">
              3. Validity & Redemption Caps
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Total Max Uses (Empty for unlimited)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Max Uses Per Customer
                </label>
                <input
                  type="number"
                  min="1"
                  value={formMaxUsesPerCustomer}
                  onChange={(e) => setFormMaxUsesPerCustomer(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
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
              {editingDiscount ? 'Update Discount Rule' : 'Save Discount Rule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      {viewingDiscount && (
        <Modal
          isOpen={true}
          onClose={() => setViewingDiscount(null)}
          title={`Discount Rule: ${viewingDiscount.name}`}
          description={`Promotion Code: ${viewingDiscount.code || 'Auto-applied Rule'}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm">
                  {viewingDiscount.discountType === 'percentage'
                    ? `${viewingDiscount.discountValue}% OFF`
                    : `$${viewingDiscount.discountValue} Fixed Discount`}
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">{viewingDiscount.description}</p>
              </div>
              {getRuleBadge(getDynamicStatus(viewingDiscount))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Eligibility
                </span>
                <p>
                  Min Purchase:{' '}
                  <strong>${viewingDiscount.minimumPurchase || viewingDiscount.minPurchaseAmount || 0}</strong>
                </p>
                <p>
                  Min Seats/Qty:{' '}
                  <strong>{viewingDiscount.minimumQuantity || viewingDiscount.minPurchaseQuantity || 1}</strong>
                </p>
                <p>
                  Scope:{' '}
                  <strong>{viewingDiscount.applyToEntireSubscription ? 'Entire Contract' : 'Designated Products'}</strong>
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Usage Progress
                </span>
                <p>
                  Used:{' '}
                  <strong className="text-indigo-600 font-bold">{viewingDiscount.usedCount} times</strong>
                </p>
                <p>
                  Max Cap:{' '}
                  <strong>{viewingDiscount.maximumUses || viewingDiscount.usageLimit || 'Unlimited'}</strong>
                </p>
                <p>
                  Per Customer:{' '}
                  <strong>{viewingDiscount.maximumUsesPerCustomer || 'Unlimited'}</strong>
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                Validity Window
              </span>
              <p className="text-slate-700">
                {formatDate(viewingDiscount.startDate)} through {formatDate(viewingDiscount.endDate)}
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setViewingDiscount(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingDiscount && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingDiscount(null)}
          title="Delete Discount Rule"
          description={`Are you sure you want to delete "${deletingDiscount.name}"?`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs text-slate-600">
            {deletingDiscount.usedCount > 0 ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1">
                <p className="font-bold">Cannot Delete Used Discount</p>
                <p className="text-[11px] leading-relaxed">
                  This rule has already been applied {deletingDiscount.usedCount} time(s) to historical invoices.
                  To prevent audit integrity issues, please deactivate the rule instead of deleting it.
                </p>
              </div>
            ) : (
              <p>
                This rule has not been used on any customer invoices and can be safely deleted.
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingDiscount(null)}
              >
                Cancel
              </Button>
              {deletingDiscount.usedCount === 0 && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleConfirmDelete}
                >
                  Delete Rule
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
