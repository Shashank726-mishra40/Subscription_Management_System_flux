import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Download,
  Mail,
  Phone,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input, Select } from '../components/common/Input';
import { Customer } from '../types';
import { CustomerService } from '../services/customerService';
import { formatCurrency, formatDate, getInitials } from '../utils/formatters';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(() => CustomerService.getCustomers());
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | Customer['customerType']>('ALL');
  const [sortField, setSortField] = useState<'companyName' | 'totalSpent' | 'activeSubscriptionsCount' | 'createdAt'>('companyName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Feedback banner state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Add Customer Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCompanyName, setAddCompanyName] = useState('');
  const [addContactName, setAddContactName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addSegment, setAddSegment] = useState<Customer['customerType']>('Enterprise');
  const [addInitialSpent, setAddInitialSpent] = useState('0');
  const [addInitialSubs, setAddInitialSubs] = useState('0');
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editContactName, setEditContactName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSegment, setEditSegment] = useState<Customer['customerType']>('Enterprise');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // View Customer Modal State
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Delete Customer Confirmation State
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);

  // Handle Add Customer Submit
  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addCompanyName.trim()) {
      setAddError('Company name is required.');
      return;
    }
    if (!addContactName.trim()) {
      setAddError('Primary contact name is required.');
      return;
    }
    if (!addEmail.trim() || !addEmail.includes('@')) {
      setAddError('A valid email address is required.');
      return;
    }
    if (!addPhone.trim()) {
      setAddError('Phone number is required.');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const created = CustomerService.createCustomer({
        companyName: addCompanyName,
        name: addContactName,
        email: addEmail,
        phone: addPhone,
        customerType: addSegment,
        totalSpent: parseFloat(addInitialSpent) || 0,
        activeSubscriptionsCount: parseInt(addInitialSubs, 10) || 0,
      });

      setCustomers(CustomerService.getCustomers());
      setIsAddModalOpen(false);
      showFeedback('success', `Customer account "${created.companyName}" successfully added.`);

      // Reset form
      setAddCompanyName('');
      setAddContactName('');
      setAddEmail('');
      setAddPhone('');
      setAddSegment('Enterprise');
      setAddInitialSpent('0');
      setAddInitialSubs('0');
    } catch (err: any) {
      setAddError(err?.message || 'Failed to add customer.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditCompanyName(cust.companyName);
    setEditContactName(cust.name);
    setEditEmail(cust.email);
    setEditPhone(cust.phone);
    setEditSegment(cust.customerType);
    setEditError(null);
  };

  // Handle Edit Submit
  const handleEditCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditError(null);

    if (!editCompanyName.trim()) {
      setEditError('Company name is required.');
      return;
    }
    if (!editContactName.trim()) {
      setEditError('Contact name is required.');
      return;
    }
    if (!editEmail.trim() || !editEmail.includes('@')) {
      setEditError('Valid email address is required.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const updated = CustomerService.updateCustomer(editingCustomer.id, {
        companyName: editCompanyName,
        name: editContactName,
        email: editEmail,
        phone: editPhone,
        customerType: editSegment,
      });

      setCustomers(CustomerService.getCustomers());
      setEditingCustomer(null);
      showFeedback('success', `Customer "${updated.companyName}" details updated.`);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update customer.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Delete
  const handleDeleteCustomer = (id: string) => {
    try {
      CustomerService.deleteCustomer(id);
      setCustomers(CustomerService.getCustomers());
      setDeletingCustomerId(null);
      showFeedback('success', 'Customer deleted successfully.');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to delete customer.');
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = ['Company Name,Primary Contact,Email,Phone,Segment,Active Subscriptions,Lifetime Value,Joined Date'];
    const rows = filteredCustomers.map((c) =>
      `"${c.companyName}","${c.name}","${c.email}","${c.phone}","${c.customerType}",${c.activeSubscriptionsCount},${c.totalSpent},"${c.createdAt}"`
    );
    const csvContent = [headers.join('\n'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Brightloop_Customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Sort
  const filteredCustomers = useMemo(() => {
    let list = customers.filter((cust) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        cust.companyName.toLowerCase().includes(q) ||
        cust.name.toLowerCase().includes(q) ||
        cust.email.toLowerCase().includes(q) ||
        cust.phone.toLowerCase().includes(q);

      const matchesSegment = segmentFilter === 'ALL' || cust.customerType === segmentFilter;
      return matchesQuery && matchesSegment;
    });

    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [customers, searchQuery, segmentFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Customer Directory</h2>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {customers.length} Accounts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Accounts, subscription holdings, contact info, and lifetime billing history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportCSV}
          >
            Export (CSV)
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setAddError(null);
              setIsAddModalOpen(true);
            }}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Customers
            </span>
            <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
            <p className="text-[11px] text-slate-500">Across all market tiers</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">
              Enterprise Accounts
            </span>
            <p className="text-2xl font-bold text-indigo-600">
              {customers.filter((c) => c.customerType === 'Enterprise').length}
            </p>
            <p className="text-[11px] text-indigo-700">Dedicated SLA clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">
              Active Subscriptions
            </span>
            <p className="text-2xl font-bold text-emerald-600">
              {customers.reduce((sum, c) => sum + (c.activeSubscriptionsCount || 0), 0)}
            </p>
            <p className="text-[11px] text-emerald-700">Currently generating MRR</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Cumulative LTV
            </span>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0))}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium">Realized revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Directory Table Card */}
      <Card>
        <CardHeader
          title="Customer Accounts"
          subtitle="Directory of customer entities, contact representatives, and subscription portfolios"
        />
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 border-b border-slate-200">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company, name, email, phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500">Segment:</span>
            <select
              value={segmentFilter}
              onChange={(e) => {
                setSegmentFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="text-xs rounded-md border border-slate-300 px-2.5 py-1 focus:border-indigo-500"
            >
              <option value="ALL">All Segments</option>
              <option value="Enterprise">Enterprise</option>
              <option value="Mid-Market">Mid-Market</option>
              <option value="Small Business">Small Business</option>
              <option value="Startup">Startup</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase border-b border-slate-200">
              <tr>
                <th
                  className="py-3 px-4 cursor-pointer"
                  onClick={() => toggleSort('companyName')}
                >
                  <div className="flex items-center gap-1">
                    <span>Customer & Company</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Segment</th>
                <th className="py-3 px-4">Contact Information</th>
                <th
                  className="py-3 px-4 cursor-pointer"
                  onClick={() => toggleSort('activeSubscriptionsCount')}
                >
                  <div className="flex items-center gap-1">
                    <span>Subscriptions</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer"
                  onClick={() => toggleSort('totalSpent')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Lifetime Value</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 cursor-pointer"
                  onClick={() => toggleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    <span>Joined Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {getInitials(cust.companyName)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{cust.companyName}</p>
                          <p className="text-xs text-slate-500">{cust.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          cust.customerType === 'Enterprise'
                            ? 'purple'
                            : cust.customerType === 'Mid-Market'
                            ? 'blue'
                            : cust.customerType === 'Startup'
                            ? 'emerald'
                            : 'slate'
                        }
                      >
                        {cust.customerType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{cust.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone className="w-3 h-3" />
                          <span>{cust.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        {cust.activeSubscriptionsCount} Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-slate-900">
                        {formatCurrency(cust.totalSpent)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(cust.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingCustomer(cust)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition"
                          title="View Customer Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cust)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCustomerId(cust.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} records
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* ============================================================= */}
      {/* MODAL 1: Add New Customer */}
      {/* ============================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer Account"
        description="Register a new client entity for subscription billing and contract provisioning"
        maxWidth="lg"
      >
        <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
          {addError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Company Name"
              value={addCompanyName}
              onChange={(e) => setAddCompanyName(e.target.value)}
              placeholder="e.g. Acme Cloud Corp"
              required
            />
            <Input
              label="Primary Contact Person"
              value={addContactName}
              onChange={(e) => setAddContactName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Billing Email Address"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="billing@acme.com"
              required
            />
            <Input
              label="Phone Number"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Customer Segment"
              value={addSegment}
              onChange={(e) => setAddSegment(e.target.value as Customer['customerType'])}
              options={[
                { label: 'Enterprise', value: 'Enterprise' },
                { label: 'Mid-Market', value: 'Mid-Market' },
                { label: 'Small Business', value: 'Small Business' },
                { label: 'Startup', value: 'Startup' },
              ]}
            />
            <Input
              label="Active Subscriptions"
              type="number"
              min="0"
              value={addInitialSubs}
              onChange={(e) => setAddInitialSubs(e.target.value)}
            />
            <Input
              label="Initial Lifetime Value ($)"
              type="number"
              min="0"
              step="0.01"
              value={addInitialSpent}
              onChange={(e) => setAddInitialSpent(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmittingAdd}>
              {isSubmittingAdd ? 'Saving...' : 'Create Customer Account'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 2: Edit Customer */}
      {/* ============================================================= */}
      <Modal
        isOpen={Boolean(editingCustomer)}
        onClose={() => setEditingCustomer(null)}
        title="Edit Customer Details"
        description="Update corporate entity details and primary billing contact"
        maxWidth="md"
      >
        <form onSubmit={handleEditCustomerSubmit} className="space-y-4">
          {editError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <Input
            label="Company Name"
            value={editCompanyName}
            onChange={(e) => setEditCompanyName(e.target.value)}
            required
          />

          <Input
            label="Primary Contact Person"
            value={editContactName}
            onChange={(e) => setEditContactName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Billing Email Address"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              required
            />
          </div>

          <Select
            label="Customer Segment"
            value={editSegment}
            onChange={(e) => setEditSegment(e.target.value as Customer['customerType'])}
            options={[
              { label: 'Enterprise', value: 'Enterprise' },
              { label: 'Mid-Market', value: 'Mid-Market' },
              { label: 'Small Business', value: 'Small Business' },
              { label: 'Startup', value: 'Startup' },
            ]}
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingCustomer(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmittingEdit}>
              {isSubmittingEdit ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 3: View Customer Details */}
      {/* ============================================================= */}
      <Modal
        isOpen={Boolean(viewingCustomer)}
        onClose={() => setViewingCustomer(null)}
        title="Customer Profile & Portfolio"
        description="Comprehensive summary of account holdings and billing status"
        maxWidth="md"
      >
        {viewingCustomer && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base shrink-0">
                {getInitials(viewingCustomer.companyName)}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{viewingCustomer.companyName}</h3>
                <p className="text-slate-500">Contact: {viewingCustomer.name}</p>
                <Badge variant="blue" size="sm" className="mt-1">
                  {viewingCustomer.customerType}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Email Address
                </span>
                <span className="font-medium text-slate-900 block mt-0.5 truncate">
                  {viewingCustomer.email}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Phone
                </span>
                <span className="font-medium text-slate-900 block mt-0.5">
                  {viewingCustomer.phone}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
                <span className="text-[10px] uppercase font-semibold text-emerald-800 block">
                  Active Subscriptions
                </span>
                <span className="font-bold text-emerald-950 text-base mt-0.5 block">
                  {viewingCustomer.activeSubscriptionsCount} Contracts
                </span>
              </div>
              <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200">
                <span className="text-[10px] uppercase font-semibold text-indigo-800 block">
                  Lifetime Value
                </span>
                <span className="font-bold text-indigo-950 text-base mt-0.5 block">
                  {formatCurrency(viewingCustomer.totalSpent)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-slate-500">
              <span>Customer Since:</span>
              <span className="font-medium text-slate-800">{formatDate(viewingCustomer.createdAt)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingCustomer(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 4: Delete Customer Confirmation */}
      {/* ============================================================= */}
      <Modal
        isOpen={Boolean(deletingCustomerId)}
        onClose={() => setDeletingCustomerId(null)}
        title="Confirm Customer Deletion"
        description="Are you sure you want to remove this customer account? This will permanently remove the customer record."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Deleting a customer entity will not delete historical paid invoices, but will remove their active profile from directory lookups.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingCustomerId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => deletingCustomerId && handleDeleteCustomer(deletingCustomerId)}
            >
              Delete Customer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
