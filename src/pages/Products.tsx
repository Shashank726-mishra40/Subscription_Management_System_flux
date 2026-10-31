import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Power,
  Layers,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Product, ProductType } from '../types';
import { ProductService } from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Table, Column } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';

const PRODUCT_TYPES: ProductType[] = [
  'Software License',
  'Add-on',
  'Consulting',
  'Support',
];

export const ProductsPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ProductType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Variant Modal State (within viewing/editing)
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [variantName, setVariantName] = useState('');
  const [variantPriceAdj, setVariantPriceAdj] = useState<number>(0);
  const [variantSku, setVariantSku] = useState('');

  // Create / Edit Form State
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formType, setFormType] = useState<ProductType>('Software License');
  const [formSalesPrice, setFormSalesPrice] = useState<string>('250');
  const [formCostPrice, setFormCostPrice] = useState<string>('50');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive' | 'Archived'>('Active');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast / Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchProducts = () => {
    setLoading(true);
    const data = ProductService.getProducts();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
        const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return sortOrder === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        if (sortBy === 'price') {
          return sortOrder === 'asc'
            ? a.salesPrice - b.salesPrice
            : b.salesPrice - a.salesPrice;
        }
        // by date
        return sortOrder === 'asc'
          ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [products, searchQuery, typeFilter, statusFilter, sortBy, sortOrder]);

  // Paginated Slices
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const handleOpenCreate = () => {
    setFormName('');
    setFormSku('');
    setFormType('Software License');
    setFormSalesPrice('250');
    setFormCostPrice('50');
    setFormDescription('');
    setFormImageUrl('');
    setFormStatus('Active');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormSku(prod.sku);
    setFormType(prod.type);
    setFormSalesPrice(String(prod.salesPrice));
    setFormCostPrice(String(prod.costPrice));
    setFormDescription(prod.description);
    setFormImageUrl(prod.imageUrl || '');
    setFormStatus(prod.status);
    setFormError(null);
  };

  // Profit Margin calculation
  const numericSales = parseFloat(formSalesPrice) || 0;
  const numericCost = parseFloat(formCostPrice) || 0;
  const calculatedProfit = numericSales - numericCost;
  const calculatedMarginPct = numericSales > 0 ? ((calculatedProfit / numericSales) * 100).toFixed(1) : '0';

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (numericSales < 0) {
      setFormError('Sales price cannot be negative.');
      return;
    }
    if (numericCost < 0) {
      setFormError('Cost price cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newProd = ProductService.createProduct({
        name: formName,
        sku: formSku,
        type: formType,
        salesPrice: numericSales,
        costPrice: numericCost,
        description: formDescription,
        imageUrl: formImageUrl,
        status: formStatus,
      });

      setProducts((prev) => [newProd, ...prev]);
      setIsCreateModalOpen(false);
      showFeedback('success', `Product "${newProd.name}" created successfully.`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (numericSales < 0) {
      setFormError('Sales price cannot be negative.');
      return;
    }
    if (numericCost < 0) {
      setFormError('Cost price cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = ProductService.updateProduct(editingProduct.id, {
        name: formName,
        sku: formSku,
        type: formType,
        salesPrice: numericSales,
        costPrice: numericCost,
        description: formDescription,
        imageUrl: formImageUrl,
        status: formStatus,
      });

      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingProduct(null);
      showFeedback('success', `Product "${updated.name}" updated successfully.`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (prod: Product) => {
    if (!isAdmin) return;
    try {
      const updated = ProductService.toggleProductStatus(prod.id);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showFeedback(
        'success',
        `Product "${updated.name}" is now marked as ${updated.status}.`
      );
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to toggle status.');
    }
  };

  const handleDeleteConfirm = () => {
    if (!isAdmin || !deletingProduct) return;
    try {
      ProductService.deleteProduct(deletingProduct.id);
      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      showFeedback('success', `Product "${deletingProduct.name}" deleted.`);
      setDeletingProduct(null);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to delete product.');
    }
  };

  // Add Variant Handler
  const handleAddVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForVariant) return;

    try {
      const updated = ProductService.addVariant(selectedProductForVariant.id, {
        name: variantName,
        sku: variantSku,
        priceAdjustment: Number(variantPriceAdj),
      });

      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedProductForVariant(updated);
      if (viewingProduct?.id === updated.id) setViewingProduct(updated);
      setIsVariantModalOpen(false);
      setVariantName('');
      setVariantPriceAdj(0);
      setVariantSku('');
      showFeedback('success', 'New variant added successfully.');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to add variant.');
    }
  };

  const handleDeleteVariant = (productId: string, variantId: string) => {
    if (!isAdmin) return;
    try {
      const updated = ProductService.deleteVariant(productId, variantId);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      if (viewingProduct?.id === updated.id) setViewingProduct(updated);
      showFeedback('success', 'Variant removed.');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to delete variant.');
    }
  };

  // Data Table Columns
  const columns: Column<Product>[] = [
    {
      header: 'Product Name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
            {row.imageUrl ? (
              <img
                src={row.imageUrl}
                alt={row.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Package className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-slate-900 block truncate max-w-xs">
              {row.name}
            </span>
            <span className="text-xs text-slate-400 font-mono">{row.sku}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Product Type',
      cell: (row) => (
        <span
          className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-md border ${
            row.type === 'Software License'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : row.type === 'Add-on'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : row.type === 'Support'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-purple-50 text-purple-700 border-purple-200'
          }`}
        >
          {row.type}
        </span>
      ),
    },
    {
      header: 'Sales Price',
      cell: (row) => (
        <span className="font-bold text-slate-900">
          {formatCurrency(row.salesPrice)}
        </span>
      ),
    },
    {
      header: 'Cost Price',
      cell: (row) => (
        <div className="text-xs">
          <p className="text-slate-500 font-medium">{formatCurrency(row.costPrice)}</p>
          <p className="text-[10px] text-emerald-600 font-semibold">
            Profit: +{formatCurrency(row.salesPrice - row.costPrice)}
          </p>
        </div>
      ),
    },
    {
      header: 'Available Variants',
      cell: (row) => (
        <div>
          {row.variants && row.variants.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
              {row.variants.slice(0, 2).map((v) => (
                <span
                  key={v.id}
                  className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                >
                  {v.name} {v.priceAdjustment > 0 && `(+${formatCurrency(v.priceAdjustment)})`}
                </span>
              ))}
              {row.variants.length > 2 && (
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                  +{row.variants.length - 2} more
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">Base Only</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.status === 'Active' ? 'emerald' : 'slate'} showDot={true}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Created Date',
      cell: (row) => <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {/* View Details */}
          <button
            type="button"
            onClick={() => setViewingProduct(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            title="View Product & Variants Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Admin Edit */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
              title="Edit Product"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Admin Toggle Active/Inactive */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleToggleStatus(row)}
              className={`p-1.5 rounded-lg transition-colors ${
                row.status === 'Active'
                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
              title={row.status === 'Active' ? 'Deactivate Product' : 'Activate Product'}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Admin Delete */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setDeletingProduct(row)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Product"
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
              <Package className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Product Management</h2>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                isAdmin
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isAdmin ? 'ADMIN: Full Edit & Variant Control' : 'STAFF: View-Only Access'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain catalog of software licenses, recurring add-ons, support tiers, and brand variant adjustments.
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
            Create Product
          </Button>
        ) : (
          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            <span>Staff viewing mode (read-only)</span>
          </div>
        )}
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

      {/* Brand Highlight Notification */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-sky-50/70 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-950">
              Product Variant Rule: Brand Surcharges (e.g. Odoo brand adds +$560)
            </p>
            <p className="text-[11px] text-indigo-800">
              Variants allow line-item customizations. Final product billing equals Base Sales Price + Variant Price Adjustment.
            </p>
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search products by name, SKU or description..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Type Filter */}
          <div className="md:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Product Types</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2 flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="date">Sort: Date</option>
              <option value="name">Sort: Name</option>
              <option value="price">Sort: Price</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
              title={`Sorting ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <Card>
        <CardHeader
          title="Product Catalog & Offerings"
          subtitle={
            loading
              ? 'Loading products...'
              : `Showing ${paginatedProducts.length} of ${filteredProducts.length} total products`
          }
        />
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={paginatedProducts}
            keyExtractor={(p) => p.id}
            emptyMessage="No products match your filter parameters"
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

      {/* CREATE PRODUCT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Product"
        description="Add a new subscription software license, add-on, or service offering"
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
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="E.g. BrightCore Enterprise License"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as ProductType)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sales Price ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formSalesPrice}
                onChange={(e) => setFormSalesPrice(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cost Price ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formCostPrice}
                onChange={(e) => setFormCostPrice(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Dynamic Margin Calculator Banner */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">
                Calculated Gross Profit Margin:
              </span>
              <span
                className={`font-bold ${
                  calculatedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                Profit = {formatCurrency(calculatedProfit)} ({calculatedMarginPct}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Formula: Profit = Sales Price ({formatCurrency(numericSales)}) - Cost Price ({formatCurrency(numericCost)})
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom SKU (optional)
            </label>
            <input
              type="text"
              value={formSku}
              onChange={(e) => setFormSku(e.target.value)}
              placeholder="Leave blank to auto-generate (e.g. BC-SOF-8921)"
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Image URL (optional)
            </label>
            <input
              type="url"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://example.com/images/product.png"
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Description / Operational Notes
            </label>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe product capabilities, included modules, and licensing terms..."
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
              Create Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <Modal
          isOpen={true}
          onClose={() => setEditingProduct(null)}
          title={`Edit Product: ${editingProduct.name}`}
          description="Update pricing, classification, and catalog details"
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
                  Product Name
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
                  Product Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as ProductType)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {PRODUCT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sales Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formSalesPrice}
                  onChange={(e) => setFormSalesPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cost Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formCostPrice}
                  onChange={(e) => setFormCostPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Calculated Profit Margin */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="font-semibold text-slate-700">Profit Margin:</span>
              <span className="font-bold text-emerald-700">
                {formatCurrency(calculatedProfit)} ({calculatedMarginPct}%)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Notes
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingProduct(null)}
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

      {/* VIEW PRODUCT DETAILS & VARIANTS MODAL */}
      {viewingProduct && (
        <Modal
          isOpen={true}
          onClose={() => setViewingProduct(null)}
          title={viewingProduct.name}
          description={`SKU: ${viewingProduct.sku} · ${viewingProduct.type}`}
          maxWidth="xl"
        >
          <div className="space-y-5">
            {/* Top Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Sales Price</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  {formatCurrency(viewingProduct.salesPrice)}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Cost Price</span>
                <p className="text-base font-bold text-slate-700 mt-0.5">
                  {formatCurrency(viewingProduct.costPrice)}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Gross Profit</span>
                <p className="text-base font-bold text-emerald-800 mt-0.5">
                  {formatCurrency(viewingProduct.salesPrice - viewingProduct.costPrice)}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                <span className="text-[10px] uppercase font-bold text-indigo-700">Margin</span>
                <p className="text-base font-bold text-indigo-900 mt-0.5">
                  {viewingProduct.salesPrice > 0
                    ? `${(((viewingProduct.salesPrice - viewingProduct.costPrice) / viewingProduct.salesPrice) * 100).toFixed(1)}%`
                    : '0%'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-1">
                Product Description:
              </span>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                {viewingProduct.description || 'No description provided.'}
              </p>
            </div>

            {/* PRODUCT VARIANTS SECTION */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Configured Product Variants ({viewingProduct.variants?.length || 0})</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Add-on variant options (e.g. brand modifications, deployment options)
                  </p>
                </div>

                {isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSelectedProductForVariant(viewingProduct);
                      setVariantName('');
                      setVariantPriceAdj(0);
                      setVariantSku('');
                      setIsVariantModalOpen(true);
                    }}
                  >
                    Add Variant
                  </Button>
                )}
              </div>

              {viewingProduct.variants && viewingProduct.variants.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {viewingProduct.variants.map((v) => {
                    const finalVariantPrice = viewingProduct.salesPrice + v.priceAdjustment;
                    return (
                      <div
                        key={v.id}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">{v.name}</span>
                            {v.sku && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                {v.sku}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Adjustment: {v.priceAdjustment >= 0 ? `+${formatCurrency(v.priceAdjustment)}` : `-${formatCurrency(Math.abs(v.priceAdjustment))}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900">
                              {formatCurrency(finalVariantPrice)}
                            </span>
                            <p className="text-[10px] text-slate-400">Total Price</p>
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(viewingProduct.id, v.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete variant"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">No custom variants created for this product yet.</p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductForVariant(viewingProduct);
                        setIsVariantModalOpen(true);
                      }}
                      className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      + Add first variant (e.g. Odoo brand +$560)
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewingProduct(null)}
              >
                Close Details
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ADD VARIANT SUB-MODAL */}
      {isVariantModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsVariantModalOpen(false)}
          title="Add Product Variant"
          description={`Add customizable option for ${selectedProductForVariant?.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleAddVariant} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Variant Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                placeholder="E.g. Odoo Connected Brand"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Price Adjustment ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={variantPriceAdj}
                onChange={(e) => setVariantPriceAdj(parseFloat(e.target.value) || 0)}
                placeholder="560"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Example: Setting 560 will add $560 to the base price of{' '}
                {formatCurrency(selectedProductForVariant?.salesPrice || 0)} (Total ={' '}
                {formatCurrency((selectedProductForVariant?.salesPrice || 0) + Number(variantPriceAdj))}).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Variant SKU Code (optional)
              </label>
              <input
                type="text"
                value={variantSku}
                onChange={(e) => setVariantSku(e.target.value)}
                placeholder="E.g. BC-CORE-ODOO"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsVariantModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Variant
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingProduct && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingProduct(null)}
          title="Delete Product"
          description={`Are you sure you want to delete ${deletingProduct.name}?`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              This action cannot be undone. Active subscriptions using this product will retain historical invoice data.
            </p>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingProduct(null)}
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
