import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Power,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldAlert,
  ArrowUpDown,
} from 'lucide-react';
import { Plan, BillingCycle, PlanClosureType } from '../types';
import { PlanService } from '../services/planService';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';

const BILLING_CYCLES: { label: string; value: BillingCycle }[] = [
  { label: 'Daily Billing', value: 'daily' },
  { label: 'Weekly Billing', value: 'weekly' },
  { label: 'Monthly Billing', value: 'monthly' },
  { label: 'Yearly Billing', value: 'yearly' },
];

const CLOSURE_TYPES: { label: string; value: PlanClosureType; desc: string }[] = [
  {
    label: 'Renewable',
    value: 'renewable',
    desc: 'Auto-renews at end of billing cycle unless cancelled',
  },
  {
    label: 'Auto-Close at End Date',
    value: 'auto_close',
    desc: 'Closes on its own when the end date is reached',
  },
  {
    label: 'Pauseable & Flexible',
    value: 'pauseable',
    desc: 'Can be closed early, paused mid-term, or renewed',
  },
];

export const PlansPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [cycleFilter, setCycleFilter] = useState<'ALL' | BillingCycle>('ALL');
  const [closureFilter, setClosureFilter] = useState<'ALL' | PlanClosureType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'cycle'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBillingCycle, setFormBillingCycle] = useState<BillingCycle>('monthly');
  const [formPrice, setFormPrice] = useState<string>('290');
  const [formMinQuantity, setFormMinQuantity] = useState<string>('1');
  const [formClosureType, setFormClosureType] = useState<PlanClosureType>('renewable');
  const [formAvailableFrom, setFormAvailableFrom] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formAvailableUntil, setFormAvailableUntil] = useState('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formFeaturesText, setFormFeaturesText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPlans = () => {
    setLoading(true);
    const data = PlanService.getPlans();
    setPlans(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Filter & Sort Logic
  const filteredPlans = useMemo(() => {
    return plans
      .filter((plan) => {
        const matchesSearch =
          plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plan.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (plan.description && plan.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCycle = cycleFilter === 'ALL' || plan.billingCycle === cycleFilter;
        const matchesClosure = closureFilter === 'ALL' || plan.closureType === closureFilter;
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'Active' && plan.isActive) ||
          (statusFilter === 'Inactive' && !plan.isActive);

        return matchesSearch && matchesCycle && matchesClosure && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return sortOrder === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        if (sortBy === 'price') {
          return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
        }
        return sortOrder === 'asc'
          ? a.billingCycle.localeCompare(b.billingCycle)
          : b.billingCycle.localeCompare(a.billingCycle);
      });
  }, [plans, searchQuery, cycleFilter, closureFilter, statusFilter, sortBy, sortOrder]);

  const handleOpenCreate = () => {
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormBillingCycle('monthly');
    setFormPrice('290');
    setFormMinQuantity('1');
    setFormClosureType('renewable');
    setFormAvailableFrom(new Date().toISOString().split('T')[0]);
    setFormAvailableUntil('');
    setFormIsActive(true);
    setFormFeaturesText('Core License Access\nAutomated Billing Engine\nEmail Invoicing');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormCode(plan.code);
    setFormDescription(plan.description || '');
    setFormBillingCycle(plan.billingCycle);
    setFormPrice(String(plan.price));
    setFormMinQuantity(String(plan.minQuantity));
    setFormClosureType(plan.closureType);
    setFormAvailableFrom(plan.availableFrom || '');
    setFormAvailableUntil(plan.availableUntil || '');
    setFormIsActive(plan.isActive);
    setFormFeaturesText((plan.features || []).join('\n'));
    setFormError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numPrice = parseFloat(formPrice);
    const numMin = parseInt(formMinQuantity, 10);

    if (!formName.trim()) {
      setFormError('Plan name is required.');
      return;
    }
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Price must be 0 or greater.');
      return;
    }
    if (isNaN(numMin) || numMin < 1) {
      setFormError('Minimum quantity must be at least 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      const features = formFeaturesText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const created = PlanService.createPlan({
        name: formName,
        code: formCode,
        description: formDescription,
        billingCycle: formBillingCycle,
        price: numPrice,
        minQuantity: numMin,
        closureType: formClosureType,
        availableFrom: formAvailableFrom,
        availableUntil: formAvailableUntil || undefined,
        isActive: formIsActive,
        features,
      });

      setPlans((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      showFeedback('success', `Plan "${created.name}" created successfully.`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setFormError(null);

    const numPrice = parseFloat(formPrice);
    const numMin = parseInt(formMinQuantity, 10);

    if (!formName.trim()) {
      setFormError('Plan name is required.');
      return;
    }
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Price must be 0 or greater.');
      return;
    }
    if (isNaN(numMin) || numMin < 1) {
      setFormError('Minimum quantity must be at least 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      const features = formFeaturesText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const updated = PlanService.updatePlan(editingPlan.id, {
        name: formName,
        code: formCode,
        description: formDescription,
        billingCycle: formBillingCycle,
        price: numPrice,
        minQuantity: numMin,
        closureType: formClosureType,
        availableFrom: formAvailableFrom,
        availableUntil: formAvailableUntil || undefined,
        isActive: formIsActive,
        features,
      });

      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingPlan(null);
      showFeedback('success', `Plan "${updated.name}" updated successfully.`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (plan: Plan) => {
    if (!isAdmin) return;
    try {
      const updated = PlanService.togglePlanStatus(plan.id);
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showFeedback(
        'success',
        `Plan "${updated.name}" status changed to ${updated.isActive ? 'Active' : 'Inactive'}.`
      );
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to toggle plan status.');
    }
  };

  const handleDeleteConfirm = () => {
    if (!isAdmin || !deletingPlan) return;
    try {
      PlanService.deletePlan(deletingPlan.id);
      setPlans((prev) => prev.filter((p) => p.id !== deletingPlan.id));
      showFeedback('success', `Plan "${deletingPlan.name}" deleted.`);
      setDeletingPlan(null);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to delete plan.');
    }
  };

  // Table Columns
  const columns: Column<Plan>[] = [
    {
      header: 'Plan Name',
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.name}</span>
          <span className="text-xs text-slate-400 font-mono">{row.code}</span>
        </div>
      ),
    },
    {
      header: 'Billing Frequency',
      cell: (row) => (
        <span
          className={`inline-block px-2.5 py-0.5 text-xs font-semibold capitalize rounded-md border ${
            row.billingCycle === 'monthly'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : row.billingCycle === 'yearly'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : row.billingCycle === 'daily'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-purple-50 text-purple-700 border-purple-200'
          }`}
        >
          {row.billingCycle}
        </span>
      ),
    },
    {
      header: 'Price / Rate',
      cell: (row) => (
        <span className="font-bold text-slate-900">
          {formatCurrency(row.price)}
          <span className="text-xs font-normal text-slate-500">
            /{row.billingCycle === 'yearly' ? 'yr' : row.billingCycle === 'daily' ? 'day' : row.billingCycle === 'weekly' ? 'wk' : 'mo'}
          </span>
        </span>
      ),
    },
    {
      header: 'Min Qty / Seats',
      cell: (row) => (
        <span className="text-xs font-medium text-slate-700">
          {row.minQuantity} seat{row.minQuantity > 1 ? 's' : ''}
        </span>
      ),
    },
    {
      header: 'Closure Policy',
      cell: (row) => (
        <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
          {row.closureType === 'auto_close'
            ? 'Auto-close at end'
            : row.closureType === 'pauseable'
            ? 'Pauseable / Early close'
            : 'Renewable'}
        </span>
      ),
    },
    {
      header: 'Availability',
      cell: (row) => (
        <div className="text-xs text-slate-600">
          <p>From: {formatDate(row.availableFrom)}</p>
          {row.availableUntil ? (
            <p className="text-[10px] text-amber-600 font-medium">Until: {formatDate(row.availableUntil)}</p>
          ) : (
            <p className="text-[10px] text-slate-400">Ongoing</p>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.isActive ? 'emerald' : 'slate'} showDot={true}>
          {row.isActive ? 'Active' : 'Archived'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {/* View Details */}
          <button
            type="button"
            onClick={() => setViewingPlan(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            title="View Plan Details & Terms"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Admin Edit */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Edit Plan"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Admin Toggle Active */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleToggleStatus(row)}
              className={`p-1.5 rounded-lg transition-colors ${
                row.isActive
                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              title={row.isActive ? 'Archive Plan' : 'Activate Plan'}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Admin Delete */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setDeletingPlan(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Plan"
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
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Subscription Plans</h2>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                isAdmin
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isAdmin ? 'ADMIN: Full Plan Authority' : 'STAFF: View Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure daily, weekly, monthly, and yearly recurring tiers, seat minimums, and contract closure policies.
          </p>
        </div>

        {isAdmin ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Plan
          </Button>
        ) : (
          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            <span>Staff viewing mode (read-only)</span>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
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

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="md:col-span-4 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search plans by name, code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Billing Cycle Filter */}
          <div className="md:col-span-2">
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Cycles</option>
              {BILLING_CYCLES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Closure Policy Filter */}
          <div className="md:col-span-2">
            <select
              value={closureFilter}
              onChange={(e) => setClosureFilter(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Policies</option>
              {CLOSURE_TYPES.map((cl) => (
                <option key={cl.value} value={cl.value}>
                  {cl.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Plans</option>
              <option value="Inactive">Archived</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2 flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="price">Sort: Price</option>
              <option value="name">Sort: Name</option>
              <option value="cycle">Sort: Cycle</option>
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

      {/* Plans Data Table */}
      <Card>
        <CardHeader
          title="Configured Subscription Tiers"
          subtitle={
            loading
              ? 'Loading plans...'
              : `Showing ${filteredPlans.length} active subscription plan definitions`
          }
        />
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={filteredPlans}
            keyExtractor={(p) => p.id}
            emptyMessage="No subscription plans match your filter criteria"
          />
        </CardContent>
      </Card>

      {/* CREATE PLAN MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Subscription Plan"
        description="Configure billing rates, seat minimums, and cancellation policies"
        maxWidth="lg"
      >
        {formError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Plan Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="E.g. Growth Team Tier"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Billing Cycle <span className="text-rose-500">*</span>
              </label>
              <select
                value={formBillingCycle}
                onChange={(e) => setFormBillingCycle(e.target.value as BillingCycle)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {BILLING_CYCLES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rate / Price ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="750"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum Seats / Qty <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={formMinQuantity}
                onChange={(e) => setFormMinQuantity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Closure & Renewal Policy
              </label>
              <select
                value={formClosureType}
                onChange={(e) => setFormClosureType(e.target.value as PlanClosureType)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {CLOSURE_TYPES.map((cl) => (
                  <option key={cl.value} value={cl.value}>
                    {cl.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Available From (Start Date) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formAvailableFrom}
                onChange={(e) => setFormAvailableFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Available Until (Optional End Date)
              </label>
              <input
                type="date"
                value={formAvailableUntil}
                onChange={(e) => setFormAvailableUntil(e.target.value)}
                placeholder="Leave blank for ongoing"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Plan Code (optional)
            </label>
            <input
              type="text"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder="E.g. PLAN-GRW-02"
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Included Features (one per line)
            </label>
            <textarea
              rows={3}
              value={formFeaturesText}
              onChange={(e) => setFormFeaturesText(e.target.value)}
              placeholder="Multi-user Management&#10;Automated Invoicing Engine&#10;Dedicated SLA Support"
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
              Create Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT PLAN MODAL */}
      {editingPlan && (
        <Modal
          isOpen={true}
          onClose={() => setEditingPlan(null)}
          title={`Edit Plan: ${editingPlan.name}`}
          description="Update pricing, billing cadence, and minimum seat terms"
          maxWidth="lg"
        >
          {formError && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Billing Cycle
                </label>
                <select
                  value={formBillingCycle}
                  onChange={(e) => setFormBillingCycle(e.target.value as BillingCycle)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {BILLING_CYCLES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formMinQuantity}
                  onChange={(e) => setFormMinQuantity(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Closure Policy
                </label>
                <select
                  value={formClosureType}
                  onChange={(e) => setFormClosureType(e.target.value as PlanClosureType)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {CLOSURE_TYPES.map((cl) => (
                    <option key={cl.value} value={cl.value}>
                      {cl.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Available From
                </label>
                <input
                  type="date"
                  required
                  value={formAvailableFrom}
                  onChange={(e) => setFormAvailableFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Available Until
                </label>
                <input
                  type="date"
                  value={formAvailableUntil}
                  onChange={(e) => setFormAvailableUntil(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Plan Code
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Included Features (one per line)
              </label>
              <textarea
                rows={3}
                value={formFeaturesText}
                onChange={(e) => setFormFeaturesText(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingPlan(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW PLAN DETAILS MODAL */}
      {viewingPlan && (
        <Modal
          isOpen={true}
          onClose={() => setViewingPlan(null)}
          title={viewingPlan.name}
          description={`Code: ${viewingPlan.code} · ${viewingPlan.billingCycle.toUpperCase()} Billing`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Recurring Price</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {formatCurrency(viewingPlan.price)}
                  <span className="text-xs text-slate-500 font-normal">/{viewingPlan.billingCycle}</span>
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Min Order Qty</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {viewingPlan.minQuantity} Seats
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Closure Policy:</span>
                <span className="font-semibold text-slate-800">
                  {viewingPlan.closureType === 'auto_close'
                    ? 'Closes automatically on end date'
                    : viewingPlan.closureType === 'pauseable'
                    ? 'Flexible pause & early close permitted'
                    : 'Auto-renews at cycle end'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Validity Horizon:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(viewingPlan.availableFrom)} →{' '}
                  {viewingPlan.availableUntil ? formatDate(viewingPlan.availableUntil) : 'Ongoing indefinitely'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className={`font-semibold ${viewingPlan.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {viewingPlan.isActive ? 'Active and purchasable' : 'Archived'}
                </span>
              </div>
            </div>

            {viewingPlan.features && viewingPlan.features.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Included Features & Entitlements:
                </span>
                <ul className="space-y-1.5">
                  {viewingPlan.features.map((f, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingPlan(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPlan && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingPlan(null)}
          title="Delete Subscription Plan"
          description={`Are you sure you want to delete ${deletingPlan.name}?`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Existing active subscriptions bound to this plan will remain valid, but no new subscriptions can be created under this plan code.
            </p>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingPlan(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
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
