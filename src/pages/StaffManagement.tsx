import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Power,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
} from 'lucide-react';
import { User } from '../types/auth';
import { AuthService } from '../services/authService';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { validatePassword } from '../utils/crypto';
import { formatDate, getInitials } from '../utils/formatters';

const AVAILABLE_PERMISSIONS = [
  { id: 'MANAGE_CUSTOMERS', label: 'View & Manage Customers' },
  { id: 'MANAGE_QUOTATIONS', label: 'Create & Manage Quotations' },
  { id: 'MANAGE_SUBSCRIPTIONS', label: 'Manage Subscriptions' },
  { id: 'MANAGE_INVOICES', label: 'View & Generate Invoices' },
  { id: 'RECORD_PAYMENTS', label: 'Record & Reconcile Payments' },
  { id: 'VIEW_REPORTS', label: 'View Operational Reports' },
];

export const StaffManagementPage: React.FC = () => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');

  // Add Staff Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addTempPass, setAddTempPass] = useState('StaffTempPass2026!');
  const [addTitle, setAddTitle] = useState('Billing & Operations Specialist');
  const [addDepartment, setAddDepartment] = useState('Customer Operations');
  const [addPhone, setAddPhone] = useState('+1 (555) 234-5678');
  const [addPermissions, setAddPermissions] = useState<string[]>([
    'MANAGE_CUSTOMERS',
    'MANAGE_SUBSCRIPTIONS',
    'MANAGE_INVOICES',
    'RECORD_PAYMENTS',
  ]);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Notification feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const staff = await AuthService.getAllStaff();
      setStaffList(staff);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleToggleStatus = async (id: string, name: string) => {
    try {
      const updated = await AuthService.toggleStaffStatus(id);
      setStaffList((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setFeedback({
        type: 'success',
        message: `${name}'s account status has been changed to ${updated.status}.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to toggle staff status.',
      });
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const pwCheck = validatePassword(addTempPass);
    if (!pwCheck.isValid) {
      setAddError(pwCheck.errorMessage || 'Invalid temporary password format.');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const newMember = await AuthService.createStaff({
        name: addName,
        email: addEmail,
        temporaryPassword: addTempPass,
        title: addTitle,
        department: addDepartment,
        phone: addPhone,
        permissions: addPermissions,
      });

      setStaffList((prev) => [newMember, ...prev]);
      setIsAddModalOpen(false);
      setFeedback({
        type: 'success',
        message: `Staff member ${newMember.name} provisioned successfully with role STAFF.`,
      });
      setTimeout(() => setFeedback(null), 3500);

      // Reset form
      setAddName('');
      setAddEmail('');
    } catch (err: any) {
      setAddError(err?.message || 'Failed to create staff member.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleOpenEdit = (staff: User) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditTitle(staff.title || '');
    setEditDepartment(staff.department || '');
    setEditPhone(staff.phone || '');
    setEditPermissions(staff.permissions || []);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditError(null);
    setIsSubmittingEdit(true);

    try {
      const updated = await AuthService.updateStaff(editingStaff.id, {
        name: editName,
        email: editEmail,
        title: editTitle,
        department: editDepartment,
        phone: editPhone,
        permissions: editPermissions,
      });

      setStaffList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditingStaff(null);
      setFeedback({
        type: 'success',
        message: `${updated.name}'s details and permissions updated.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update staff member.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const togglePermission = (
    permId: string,
    currentList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentList.includes(permId)) {
      setter(currentList.filter((p) => p !== permId));
    } else {
      setter([...currentList, permId]);
    }
  };

  // Filtered List
  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch =
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.title && staff.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (staff.department && staff.department.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || staff.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<User>[] = [
    {
      header: 'Staff Member',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            {getInitials(row.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{row.name}</span>
              <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                STAFF
              </span>
            </div>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role & Department',
      cell: (row) => (
        <div className="text-xs">
          <p className="font-medium text-slate-900">{row.title || 'Billing Specialist'}</p>
          <p className="text-slate-400">{row.department || 'Customer Ops'}</p>
        </div>
      ),
    },
    {
      header: 'Assigned Permissions',
      cell: (row) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {row.permissions && row.permissions.length > 0 ? (
            row.permissions.slice(0, 2).map((p) => (
              <span
                key={p}
                className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
              >
                {p.replace('MANAGE_', '').replace('RECORD_', '').toLowerCase()}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-slate-400">Basic View</span>
          )}
          {row.permissions && row.permissions.length > 2 && (
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
              +{row.permissions.length - 2} more
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge
          variant={row.status === 'Active' ? 'emerald' : 'slate'}
          showDot={true}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Created Date',
      cell: (row) => (
        <span className="text-xs text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {/* Edit */}
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            title="Edit Staff Details"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Activate/Deactivate Toggle */}
          <button
            type="button"
            onClick={() => handleToggleStatus(row.id, row.name)}
            className={`p-1.5 rounded-lg transition-colors ${
              row.status === 'Active'
                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                : 'text-emerald-600 hover:bg-emerald-50'
            }`}
            title={row.status === 'Active' ? 'Deactivate Staff Account' : 'Activate Staff Account'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
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
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Staff Management</h2>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Admin Restricted
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Provision internal staff accounts, configure operational privileges, and manage active status.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          icon={<UserPlus className="w-4 h-4" />}
        >
          Add Staff Member
        </Button>
      </div>

      {/* Feedback Banner */}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search staff by name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          {(['ALL', 'Active', 'Inactive'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Members Table */}
      <Card>
        <CardHeader
          title="Staff Directory"
          subtitle={
            loading
              ? 'Loading internal staff directory...'
              : `Showing ${filteredStaff.length} internal operational staff members`
          }
        />
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={filteredStaff}
            keyExtractor={(s) => s.id}
            emptyMessage="No staff members found matching criteria"
          />
        </CardContent>
      </Card>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Provision New Staff Member"
        description="Only system administrators are authorized to add internal staff"
        maxWidth="lg"
      >
        {addError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{addError}</span>
          </div>
        )}

        <form onSubmit={handleAddStaffSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Marcus Cole"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Work Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="m.cole@brightloop.io"
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addDepartment}
                onChange={(e) => setAddDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Phone Number
            </label>
            <input
              type="text"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              placeholder="+1 (555) 234-5678"
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Temporary Initial Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={addTempPass}
                onChange={(e) => setAddTempPass(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Must contain &gt; 8 characters, uppercase, lowercase, and special character.
            </p>
          </div>

          {/* Permissions Checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Staff Operational Permissions:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const isChecked = addPermissions.includes(perm.id);
                return (
                  <label
                    key={perm.id}
                    className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermission(perm.id, addPermissions, setAddPermissions)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>{perm.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingAdd}
            >
              Confirm & Provision Staff
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <Modal
          isOpen={true}
          onClose={() => setEditingStaff(null)}
          title={`Edit Staff Details: ${editingStaff.name}`}
          description="Update role title, department, and operational rights"
          maxWidth="lg"
        >
          {editError && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Assigned Permissions:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const isChecked = editPermissions.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(perm.id, editPermissions, setEditPermissions)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span>{perm.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingStaff(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingEdit}
              >
                Save Staff Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
