import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  Settings,
  Shield,
  Building,
  Bell,
  CreditCard,
  Lock,
  UserPlus,
  Edit2,
  Trash2,
  Power,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Plus,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Input, Select } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  SettingsService,
  CompanyProfile,
  BillingRules,
  SecurityPolicies,
  NotificationSettings,
} from '../services/settingsService';
import { AuthService } from '../services/authService';
import { TaxService } from '../services/taxService';
import { User } from '../types/auth';
import { TaxRule, TaxType } from '../types';
import { validatePassword } from '../utils/crypto';
import { getInitials } from '../utils/formatters';

const SETTINGS_TABS = [
  { id: 'company', label: 'Company Profile', icon: Building },
  { id: 'staff', label: 'Staff & Role-Based Access', icon: Shield },
  { id: 'taxes', label: 'Taxes & Billing Rules', icon: CreditCard },
  { id: 'security', label: 'Security & Auth Policies', icon: Lock },
  { id: 'notifications', label: 'Automated Notifications', icon: Bell },
] as const;

type TabId = (typeof SETTINGS_TABS)[number]['id'];

const AVAILABLE_PERMISSIONS = [
  { id: 'MANAGE_CUSTOMERS', label: 'View & Manage Customers' },
  { id: 'MANAGE_QUOTATIONS', label: 'Create & Manage Quotations' },
  { id: 'MANAGE_SUBSCRIPTIONS', label: 'Manage Subscriptions' },
  { id: 'MANAGE_INVOICES', label: 'View & Generate Invoices' },
  { id: 'RECORD_PAYMENTS', label: 'Record & Reconcile Payments' },
  { id: 'VIEW_REPORTS', label: 'View Operational Reports' },
];

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tab: routeTab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isAdmin = role === 'ADMIN';

  // Determine active tab from URL (route param or search query or fallback to 'company')
  const rawTab = (routeTab || searchParams.get('tab') || 'company').toLowerCase();
  const activeTab: TabId = SETTINGS_TABS.some((t) => t.id === rawTab)
    ? (rawTab as TabId)
    : 'company';

  const handleTabChange = (tabId: TabId) => {
    setSearchParams({ tab: tabId });
    if (routeTab) {
      navigate(`/settings?tab=${tabId}`, { replace: true });
    }
  };

  // Feedback banner state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // -------------------------------------------------------------
  // TAB 1: Company Profile State & Handlers
  // -------------------------------------------------------------
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() =>
    SettingsService.getCompanyProfile()
  );
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyProfile.companyName.trim()) {
      showFeedback('error', 'Company name is required.');
      return;
    }
    if (!companyProfile.billingEmail.trim() || !companyProfile.billingEmail.includes('@')) {
      showFeedback('error', 'A valid billing email is required.');
      return;
    }

    setIsSavingCompany(true);
    try {
      SettingsService.saveCompanyProfile(companyProfile);
      showFeedback('success', 'Company profile and billing details updated successfully.');
    } catch {
      showFeedback('error', 'Failed to save company profile.');
    } finally {
      setIsSavingCompany(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: Staff & RBAC State & Handlers
  // -------------------------------------------------------------
  const [staffList, setStaffList] = useState<User[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffStatusFilter, setStaffStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');

  // Add Staff Modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
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
  const [addStaffError, setAddStaffError] = useState<string | null>(null);
  const [isSubmittingAddStaff, setIsSubmittingAddStaff] = useState(false);

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editStaffError, setEditStaffError] = useState<string | null>(null);
  const [isSubmittingEditStaff, setIsSubmittingEditStaff] = useState(false);

  const fetchStaff = async () => {
    try {
      setStaffLoading(true);
      const data = await AuthService.getAllStaff();
      setStaffList(data);
    } catch {
      showFeedback('error', 'Failed to load staff list.');
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    }
  }, [activeTab]);

  const handleToggleStaffStatus = async (id: string, name: string) => {
    if (!isAdmin) {
      showFeedback('error', 'Only Administrators can change staff status.');
      return;
    }
    try {
      const updated = await AuthService.toggleStaffStatus(id);
      setStaffList((prev) => prev.map((s) => (s.id === id ? updated : s)));
      showFeedback('success', `${name}'s account status has been changed to ${updated.status}.`);
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to toggle staff status.');
    }
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStaffError(null);

    if (!isAdmin) {
      setAddStaffError('Only Administrators can provision new staff.');
      return;
    }

    if (!addName.trim()) {
      setAddStaffError('Staff member name is required.');
      return;
    }
    if (!addEmail.trim() || !addEmail.includes('@')) {
      setAddStaffError('Valid email address is required.');
      return;
    }

    const pwCheck = validatePassword(addTempPass);
    if (!pwCheck.isValid) {
      setAddStaffError(pwCheck.errorMessage || 'Invalid temporary password format.');
      return;
    }

    setIsSubmittingAddStaff(true);
    try {
      const newMember = await AuthService.createStaff({
        name: addName.trim(),
        email: addEmail.trim(),
        temporaryPassword: addTempPass,
        title: addTitle.trim(),
        department: addDepartment.trim(),
        phone: addPhone.trim(),
        permissions: addPermissions,
      });

      setStaffList((prev) => [newMember, ...prev]);
      setIsAddStaffOpen(false);
      showFeedback(
        'success',
        `Staff member ${newMember.name} provisioned successfully with role STAFF.`
      );

      // Reset
      setAddName('');
      setAddEmail('');
      setAddTempPass('StaffTempPass2026!');
    } catch (err: any) {
      setAddStaffError(err?.message || 'Failed to create staff member.');
    } finally {
      setIsSubmittingAddStaff(false);
    }
  };

  const handleOpenEditStaff = (staff: User) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditTitle(staff.title || '');
    setEditDepartment(staff.department || '');
    setEditPhone(staff.phone || '');
    setEditPermissions(staff.permissions || []);
    setEditStaffError(null);
  };

  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditStaffError(null);

    if (!isAdmin) {
      setEditStaffError('Only Administrators can edit staff permissions.');
      return;
    }
    if (!editName.trim()) {
      setEditStaffError('Name is required.');
      return;
    }

    setIsSubmittingEditStaff(true);
    try {
      const updated = await AuthService.updateStaff(editingStaff.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        title: editTitle.trim(),
        department: editDepartment.trim(),
        phone: editPhone.trim(),
        permissions: editPermissions,
      });

      setStaffList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditingStaff(null);
      showFeedback('success', `${updated.name}'s details and permissions updated successfully.`);
    } catch (err: any) {
      setEditStaffError(err?.message || 'Failed to update staff member.');
    } finally {
      setIsSubmittingEditStaff(false);
    }
  };

  const filteredStaff = staffList.filter((staff) => {
    const q = staffSearchQuery.toLowerCase();
    const matchesSearch =
      staff.name.toLowerCase().includes(q) ||
      staff.email.toLowerCase().includes(q) ||
      (staff.title && staff.title.toLowerCase().includes(q)) ||
      (staff.department && staff.department.toLowerCase().includes(q));

    const matchesStatus = staffStatusFilter === 'ALL' || staff.status === staffStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // -------------------------------------------------------------
  // TAB 3: Taxes & Billing Rules State & Handlers
  // -------------------------------------------------------------
  const [taxRules, setTaxRules] = useState<TaxRule[]>(() => TaxService.getTaxRules());
  const [billingRules, setBillingRules] = useState<BillingRules>(() =>
    SettingsService.getBillingRules()
  );

  // Tax Modals
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [editingTaxRule, setEditingTaxRule] = useState<TaxRule | null>(null);
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState('18');
  const [taxType, setTaxType] = useState<TaxType>('GST');
  const [taxDescription, setTaxDescription] = useState('');
  const [taxError, setTaxError] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleOpenAddTax = () => {
    setEditingTaxRule(null);
    setTaxName('');
    setTaxRate('18');
    setTaxType('GST');
    setTaxDescription('Standard Goods and Services Tax');
    setTaxError(null);
    setIsTaxModalOpen(true);
  };

  const handleOpenEditTax = (rule: TaxRule) => {
    setEditingTaxRule(rule);
    setTaxName(rule.name);
    setTaxRate(rule.rate.toString());
    setTaxType(rule.type);
    setTaxDescription(rule.description || '');
    setTaxError(null);
    setIsTaxModalOpen(true);
  };

  const handleSaveTaxRule = (e: React.FormEvent) => {
    e.preventDefault();
    setTaxError(null);

    if (!taxName.trim()) {
      setTaxError('Tax name is required.');
      return;
    }
    const parsedRate = parseFloat(taxRate);
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      setTaxError('Tax rate must be a valid number between 0% and 100%.');
      return;
    }

    try {
      if (editingTaxRule) {
        const updated = TaxService.updateTaxRule(editingTaxRule.id, {
          name: taxName.trim(),
          rate: parsedRate,
          type: taxType,
          description: taxDescription.trim(),
        });
        setTaxRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        showFeedback('success', `Tax rule "${updated.name}" updated successfully.`);
      } else {
        const created = TaxService.createTaxRule({
          name: taxName.trim(),
          rate: parsedRate,
          type: taxType,
          description: taxDescription.trim(),
          status: 'Active',
        });
        setTaxRules((prev) => [created, ...prev]);
        showFeedback('success', `New tax rule "${created.name}" created.`);
      }
      setIsTaxModalOpen(false);
    } catch (err: any) {
      setTaxError(err?.message || 'Failed to save tax rule.');
    }
  };

  const handleToggleTaxStatus = (id: string) => {
    try {
      const updated = TaxService.toggleTaxRuleStatus(id);
      setTaxRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      showFeedback('success', `Tax rule status changed to ${updated.status}.`);
    } catch {
      showFeedback('error', 'Failed to toggle tax rule.');
    }
  };

  const handleDeleteTaxRule = (id: string) => {
    try {
      TaxService.deleteTaxRule(id);
      setTaxRules((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirmId(null);
      showFeedback('success', 'Tax rule deleted successfully.');
    } catch {
      showFeedback('error', 'Failed to delete tax rule.');
    }
  };

  const handleSaveBillingRules = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      SettingsService.saveBillingRules(billingRules);
      showFeedback('success', 'Billing rules and automation timing saved successfully.');
    } catch {
      showFeedback('error', 'Failed to save billing rules.');
    }
  };

  // -------------------------------------------------------------
  // TAB 4: Security & Auth Policies State & Handlers
  // -------------------------------------------------------------
  const [securityPolicies, setSecurityPolicies] = useState<SecurityPolicies>(() =>
    SettingsService.getSecurityPolicies()
  );

  const handleSaveSecurityPolicies = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityPolicies.minPasswordLength < 8) {
      showFeedback('error', 'Minimum password length cannot be less than 8 characters.');
      return;
    }
    try {
      SettingsService.saveSecurityPolicies(securityPolicies);
      showFeedback('success', 'Security, password policies, and session rules saved.');
    } catch {
      showFeedback('error', 'Failed to save security policies.');
    }
  };

  // -------------------------------------------------------------
  // TAB 5: Automated Notifications State & Handlers
  // -------------------------------------------------------------
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() =>
    SettingsService.getNotificationSettings()
  );

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationSettings.senderEmail.trim() || !notificationSettings.senderEmail.includes('@')) {
      showFeedback('error', 'A valid sender email address is required.');
      return;
    }
    try {
      SettingsService.saveNotificationSettings(notificationSettings);
      showFeedback('success', 'Automated email notification preferences saved successfully.');
    } catch {
      showFeedback('error', 'Failed to save notification settings.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">System & Admin Settings</h2>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Admin Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage organization details, staff RBAC permissions, tax rates, auth policies, and notification triggers.
          </p>
        </div>

        {/* Global Save Button for active tab form */}
        <div className="flex items-center gap-2">
          {activeTab === 'company' && (
            <Button
              type="submit"
              form="company-form"
              variant="primary"
              size="sm"
              disabled={isSavingCompany}
            >
              {isSavingCompany ? 'Saving...' : 'Save Company Profile'}
            </Button>
          )}
          {activeTab === 'taxes' && (
            <Button type="submit" form="billing-rules-form" variant="primary" size="sm">
              Save Billing Rules
            </Button>
          )}
          {activeTab === 'security' && (
            <Button type="submit" form="security-form" variant="primary" size="sm">
              Save Security Policies
            </Button>
          )}
          {activeTab === 'notifications' && (
            <Button type="submit" form="notifications-form" variant="primary" size="sm">
              Save Notifications
            </Button>
          )}
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

      {/* Main Settings Layout (Left Menu + Right Content Panel) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation Sub-menu */}
        <div className="space-y-1">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500 mt-4 space-y-1">
            <span className="font-semibold text-slate-700 block">Signed in as:</span>
            <p className="font-medium text-indigo-600">{user?.name || 'Administrator'}</p>
            <p className="text-[11px] text-slate-400 font-mono">{user?.email}</p>
            <Badge variant="blue" size="sm" className="mt-1">
              {role || 'ADMIN'}
            </Badge>
          </div>
        </div>

        {/* Settings Form Body */}
        <div className="md:col-span-2 space-y-6">
          {/* ========================================================= */}
          {/* PANEL 1: Company Profile */}
          {/* ========================================================= */}
          {activeTab === 'company' && (
            <Card>
              <CardHeader
                title="Company Legal Entity"
                subtitle="Appears on all generated customer invoices and quotation PDFs"
              />
              <CardContent>
                <form id="company-form" onSubmit={handleSaveCompanyProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Company Legal Name"
                      value={companyProfile.companyName}
                      onChange={(e) =>
                        setCompanyProfile({ ...companyProfile, companyName: e.target.value })
                      }
                      required
                    />
                    <Input
                      label="Tax ID / VAT Registration"
                      value={companyProfile.taxId}
                      onChange={(e) =>
                        setCompanyProfile({ ...companyProfile, taxId: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Billing Support Email"
                      type="email"
                      value={companyProfile.billingEmail}
                      onChange={(e) =>
                        setCompanyProfile({ ...companyProfile, billingEmail: e.target.value })
                      }
                      required
                    />
                    <Input
                      label="Support Phone Number"
                      value={companyProfile.supportPhone}
                      onChange={(e) =>
                        setCompanyProfile({ ...companyProfile, supportPhone: e.target.value })
                      }
                    />
                  </div>

                  <Input
                    label="Registered Office Address"
                    value={companyProfile.address}
                    onChange={(e) =>
                      setCompanyProfile({ ...companyProfile, address: e.target.value })
                    }
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="City"
                      value={companyProfile.city}
                      onChange={(e) =>
                        setCompanyProfile({ ...companyProfile, city: e.target.value })
                      }
                    />
                    <Input
                      label="State / Province"
                      value={companyProfile.state}
                      onChange={(e) =>
                        setCompanyProfile({ ...companyProfile, state: e.target.value })
                      }
                    />
                    <Input
                      label="Postal Code"
                      value={companyProfile.postalCode}
                      onChange={(e) =>
                        setCompanyProfile({ ...companyProfile, postalCode: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Default Currency"
                      value={companyProfile.defaultCurrency}
                      onChange={(e) =>
                        setCompanyProfile({ ...companyProfile, defaultCurrency: e.target.value })
                      }
                      options={[
                        { label: 'USD ($) - US Dollar', value: 'USD' },
                        { label: 'EUR (€) - Euro', value: 'EUR' },
                        { label: 'GBP (£) - British Pound', value: 'GBP' },
                        { label: 'INR (₹) - Indian Rupee', value: 'INR' },
                      ]}
                    />

                    <Select
                      label="Default Invoice Payment Term"
                      value={companyProfile.defaultPaymentTerms}
                      onChange={(e) =>
                        setCompanyProfile({
                          ...companyProfile,
                          defaultPaymentTerms: e.target.value,
                        })
                      }
                      options={[
                        { label: 'Due on Receipt', value: 'receipt' },
                        { label: 'Net 15 Days', value: 'net15' },
                        { label: 'Net 30 Days', value: 'net30' },
                        { label: 'Net 60 Days', value: 'net60' },
                      ]}
                    />
                  </div>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                    <p className="font-semibold">Role-Based Access Notice:</p>
                    <p className="mt-0.5 text-[11px] text-amber-700">
                      Only System Admins have permissions to modify company tax profiles, add internal
                      staff members, or alter system billing structures.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" variant="primary" size="sm" disabled={isSavingCompany}>
                      {isSavingCompany ? 'Saving Changes...' : 'Save Profile Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ========================================================= */}
          {/* PANEL 2: Staff & Role-Based Access */}
          {/* ========================================================= */}
          {activeTab === 'staff' && (
            <Card>
              <CardHeader
                title="Internal Staff & RBAC Management"
                subtitle="Manage internal operations users, department assignments, and functional permissions"
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<UserPlus className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setAddStaffError(null);
                      setIsAddStaffOpen(true);
                    }}
                    disabled={!isAdmin}
                  >
                    Add Staff Member
                  </Button>
                }
              />
              <CardContent className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search staff by name, email..."
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 text-xs rounded-md border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-[11px] text-slate-500">Status:</span>
                    <select
                      value={staffStatusFilter}
                      onChange={(e) =>
                        setStaffStatusFilter(e.target.value as 'ALL' | 'Active' | 'Inactive')
                      }
                      className="text-xs rounded-md border border-slate-300 px-2 py-1 focus:border-indigo-500"
                    >
                      <option value="ALL">All Accounts</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Staff List Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Staff Member</th>
                        <th className="py-2.5 px-3">Role & Dept</th>
                        <th className="py-2.5 px-3">Permissions</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffLoading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            Loading staff directory...
                          </td>
                        </tr>
                      ) : filteredStaff.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No staff accounts found.
                          </td>
                        </tr>
                      ) : (
                        filteredStaff.map((staff) => (
                          <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {getInitials(staff.name)}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-900 block">
                                    {staff.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {staff.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-slate-800 block">
                                {staff.title || 'Staff Specialist'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {staff.department || 'Operations'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {staff.permissions && staff.permissions.length > 0 ? (
                                  staff.permissions.slice(0, 2).map((p) => (
                                    <span
                                      key={p}
                                      className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
                                    >
                                      {p.replace('MANAGE_', '').toLowerCase()}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400">Standard</span>
                                )}
                                {staff.permissions && staff.permissions.length > 2 && (
                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">
                                    +{staff.permissions.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant={staff.status === 'Active' ? 'emerald' : 'slate'}
                                size="sm"
                              >
                                {staff.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStaff(staff)}
                                  disabled={!isAdmin}
                                  className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition"
                                  title="Edit Staff Member"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStaffStatus(staff.id, staff.name)}
                                  disabled={!isAdmin}
                                  className={`p-1 rounded transition ${
                                    staff.status === 'Active'
                                      ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                                      : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                  }`}
                                  title={
                                    staff.status === 'Active'
                                      ? 'Deactivate Staff'
                                      : 'Activate Staff'
                                  }
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ========================================================= */}
          {/* PANEL 3: Taxes & Billing Rules */}
          {/* ========================================================= */}
          {activeTab === 'taxes' && (
            <div className="space-y-6">
              {/* 3A: Tax Rules Registry */}
              <Card>
                <CardHeader
                  title="Tax Rules & Rates"
                  subtitle="Configure regional GST, VAT, and Sales Tax applied to quotations and recurring invoices"
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={handleOpenAddTax}
                      disabled={!isAdmin}
                    >
                      Add Tax Rule
                    </Button>
                  }
                />
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Tax Name</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Rate (%)</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {taxRules.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No tax rules configured. Click "Add Tax Rule" to create one.
                            </td>
                          </tr>
                        ) : (
                          taxRules.map((rule) => (
                            <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {rule.name}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                                  {rule.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-indigo-600">
                                {rule.rate}%
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                                {rule.description || 'Standard rate'}
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge
                                  variant={rule.status === 'Active' ? 'emerald' : 'slate'}
                                  size="sm"
                                >
                                  {rule.status}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTax(rule)}
                                    disabled={!isAdmin}
                                    className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 transition"
                                    title="Edit Tax Rule"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTaxStatus(rule.id)}
                                    disabled={!isAdmin}
                                    className={`p-1 rounded transition ${
                                      rule.status === 'Active'
                                        ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                                        : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                    }`}
                                    title={rule.status === 'Active' ? 'Deactivate' : 'Activate'}
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(rule.id)}
                                    disabled={!isAdmin}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                                    title="Delete Tax Rule"
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
                </CardContent>
              </Card>

              {/* 3B: Applicable Billing Automation Rules */}
              <Card>
                <CardHeader
                  title="Applicable Billing & Automation Rules"
                  subtitle="Configure recurring billing timing, grace periods, and payment retry policies"
                />
                <CardContent>
                  <form
                    id="billing-rules-form"
                    onSubmit={handleSaveBillingRules}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label="Invoice Generation Lead Time"
                        value={billingRules.invoiceGenerationDaysBefore.toString()}
                        onChange={(e) =>
                          setBillingRules({
                            ...billingRules,
                            invoiceGenerationDaysBefore: parseInt(e.target.value, 10),
                          })
                        }
                        options={[
                          { label: 'On Renewal Date (0 days)', value: '0' },
                          { label: '3 days before renewal', value: '3' },
                          { label: '7 days before renewal (Recommended)', value: '7' },
                          { label: '14 days before renewal', value: '14' },
                        ]}
                      />

                      <Select
                        label="Payment Grace Period Before Overdue"
                        value={billingRules.paymentGracePeriodDays.toString()}
                        onChange={(e) =>
                          setBillingRules({
                            ...billingRules,
                            paymentGracePeriodDays: parseInt(e.target.value, 10),
                          })
                        }
                        options={[
                          { label: '0 days (Immediate overdue upon due date)', value: '0' },
                          { label: '7 days grace period', value: '7' },
                          { label: '15 days grace period (Standard Net 15)', value: '15' },
                          { label: '30 days grace period', value: '30' },
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label="Max Automatic Payment Retries on Failure"
                        value={billingRules.maxRetryAttempts.toString()}
                        onChange={(e) =>
                          setBillingRules({
                            ...billingRules,
                            maxRetryAttempts: parseInt(e.target.value, 10),
                          })
                        }
                        options={[
                          { label: '1 attempt', value: '1' },
                          { label: '3 attempts (Every 48 hours)', value: '3' },
                          { label: '5 attempts (Weekly schedule)', value: '5' },
                        ]}
                      />

                      <Select
                        label="Auto-Suspend Subscription on Overdue"
                        value={billingRules.cancelSubscriptionOnOverdueDays.toString()}
                        onChange={(e) =>
                          setBillingRules({
                            ...billingRules,
                            cancelSubscriptionOnOverdueDays: parseInt(e.target.value, 10),
                          })
                        }
                        options={[
                          { label: 'Never auto-suspend', value: '0' },
                          { label: 'After 30 days overdue', value: '30' },
                          { label: 'After 45 days overdue', value: '45' },
                          { label: 'After 60 days overdue', value: '60' },
                        ]}
                      />
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={billingRules.autoRetryFailedPayments}
                          onChange={(e) =>
                            setBillingRules({
                              ...billingRules,
                              autoRetryFailedPayments: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-medium text-slate-700">
                          Enable automated dunning retry for failed credit card transactions
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={billingRules.autoApplyDiscounts}
                          onChange={(e) =>
                            setBillingRules({
                              ...billingRules,
                              autoApplyDiscounts: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-medium text-slate-700">
                          Automatically apply highest eligible promotional discount during recurring
                          cycles
                        </span>
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={billingRules.sendAutomaticReceipts}
                          onChange={(e) =>
                            setBillingRules({
                              ...billingRules,
                              sendAutomaticReceipts: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-medium text-slate-700">
                          Instantly dispatch A4 digital payment receipt upon successful payment
                          recording
                        </span>
                      </label>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" variant="primary" size="sm">
                        Save Billing Rules
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* PANEL 4: Security & Auth Policies */}
          {/* ========================================================= */}
          {activeTab === 'security' && (
            <Card>
              <CardHeader
                title="Security, Authentication & Session Policies"
                subtitle="Configure enterprise password strength requirements, session idle timeouts, and lockout rules"
              />
              <CardContent>
                <form id="security-form" onSubmit={handleSaveSecurityPolicies} className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Password Complexity Rules
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label="Minimum Password Length"
                        value={securityPolicies.minPasswordLength.toString()}
                        onChange={(e) =>
                          setSecurityPolicies({
                            ...securityPolicies,
                            minPasswordLength: parseInt(e.target.value, 10),
                          })
                        }
                        options={[
                          { label: '8 characters (Standard)', value: '8' },
                          { label: '10 characters', value: '10' },
                          { label: '12 characters (Recommended)', value: '12' },
                          { label: '16 characters (High Security)', value: '16' },
                        ]}
                      />

                      <Select
                        label="Password Expiration & Rotation"
                        value={securityPolicies.passwordExpirationDays.toString()}
                        onChange={(e) =>
                          setSecurityPolicies({
                            ...securityPolicies,
                            passwordExpirationDays: parseInt(e.target.value, 10),
                          })
                        }
                        options={[
                          { label: 'Never expire', value: '0' },
                          { label: 'Every 30 days', value: '30' },
                          { label: 'Every 60 days', value: '60' },
                          { label: 'Every 90 days (Standard)', value: '90' },
                          { label: 'Every 180 days', value: '180' },
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={securityPolicies.requireUppercase}
                          onChange={(e) =>
                            setSecurityPolicies({
                              ...securityPolicies,
                              requireUppercase: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 rounded text-indigo-600"
                        />
                        <span>Uppercase (A-Z)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={securityPolicies.requireLowercase}
                          onChange={(e) =>
                            setSecurityPolicies({
                              ...securityPolicies,
                              requireLowercase: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 rounded text-indigo-600"
                        />
                        <span>Lowercase (a-z)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={securityPolicies.requireNumbers}
                          onChange={(e) =>
                            setSecurityPolicies({
                              ...securityPolicies,
                              requireNumbers: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 rounded text-indigo-600"
                        />
                        <span>Numbers (0-9)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={securityPolicies.requireSpecialChars}
                          onChange={(e) =>
                            setSecurityPolicies({
                              ...securityPolicies,
                              requireSpecialChars: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 rounded text-indigo-600"
                        />
                        <span>Special Char (!@#$)</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Session & Access Protection
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Select
                        label="Inactive Session Timeout"
                        value={securityPolicies.sessionTimeoutMinutes.toString()}
                        onChange={(e) =>
                          setSecurityPolicies({
                            ...securityPolicies,
                            sessionTimeoutMinutes: parseInt(e.target.value, 10),
                          })
                        }
                        options={[
                          { label: '15 minutes', value: '15' },
                          { label: '30 minutes', value: '30' },
                          { label: '60 minutes (Recommended)', value: '60' },
                          { label: '120 minutes (2 hours)', value: '120' },
                          { label: '480 minutes (8 hours)', value: '480' },
                        ]}
                      />

                      <Select
                        label="Max Failed Logins Before Lockout"
                        value={securityPolicies.maxFailedLogins.toString()}
                        onChange={(e) =>
                          setSecurityPolicies({
                            ...securityPolicies,
                            maxFailedLogins: parseInt(e.target.value, 10),
                          })
                        }
                        options={[
                          { label: '3 failed attempts', value: '3' },
                          { label: '5 failed attempts (Standard)', value: '5' },
                          { label: '10 failed attempts', value: '10' },
                        ]}
                      />

                      <Select
                        label="Account Lockout Duration"
                        value={securityPolicies.lockoutDurationMinutes.toString()}
                        onChange={(e) =>
                          setSecurityPolicies({
                            ...securityPolicies,
                            lockoutDurationMinutes: parseInt(e.target.value, 10),
                          })
                        }
                        options={[
                          { label: '15 minutes', value: '15' },
                          { label: '30 minutes', value: '30' },
                          { label: '60 minutes', value: '60' },
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      <Select
                        label="Multi-Factor Auth (MFA) Enforcement"
                        value={securityPolicies.mfaEnforcement}
                        onChange={(e) =>
                          setSecurityPolicies({
                            ...securityPolicies,
                            mfaEnforcement: e.target.value as 'optional' | 'staff_admin' | 'all',
                          })
                        }
                        options={[
                          { label: 'Optional for all users', value: 'optional' },
                          {
                            label: 'Enforced for Admin & Staff (Recommended)',
                            value: 'staff_admin',
                          },
                          { label: 'Enforced for all users', value: 'all' },
                        ]}
                      />

                      <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={securityPolicies.enforceSingleActiveSession}
                            onChange={(e) =>
                              setSecurityPolicies({
                                ...securityPolicies,
                                enforceSingleActiveSession: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-medium text-slate-700">
                            Enforce single active session (logout older devices)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" variant="primary" size="sm">
                      Save Security Policies
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ========================================================= */}
          {/* PANEL 5: Automated Notifications */}
          {/* ========================================================= */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader
                title="Automated Email Notifications & Event Triggers"
                subtitle="Configure system dispatch identity, customer communication triggers, and internal finance alerts"
              />
              <CardContent>
                <form
                  id="notifications-form"
                  onSubmit={handleSaveNotifications}
                  className="space-y-5"
                >
                  {/* Sender Identity */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      System Sender Identity
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="Sender Display Name"
                        value={notificationSettings.senderName}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            senderName: e.target.value,
                          })
                        }
                        required
                      />
                      <Input
                        label="Sender Email Address"
                        type="email"
                        value={notificationSettings.senderEmail}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            senderEmail: e.target.value,
                          })
                        }
                        required
                      />
                      <Input
                        label="Reply-To Support Email"
                        type="email"
                        value={notificationSettings.replyToEmail}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            replyToEmail: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Customer Triggers */}
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Customer Lifecycle Triggers (Auto-Dispatch)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Invoices */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                        <span className="font-semibold text-xs text-slate-800 block">
                          Invoice Alerts
                        </span>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnNewInvoice}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                notifyOnNewInvoice: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>Send email when new invoice is generated</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnInvoiceReminder}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                notifyOnInvoiceReminder: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>Send payment reminder 3 days before due date</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.attachInvoicePdf}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                attachInvoicePdf: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>Attach branded A4 PDF to invoice emails</span>
                        </label>
                      </div>

                      {/* Payments */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                        <span className="font-semibold text-xs text-slate-800 block">
                          Payment Notices
                        </span>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnPaymentSuccess}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                notifyOnPaymentSuccess: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>Send receipt immediately after payment</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnPaymentFailed}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                notifyOnPaymentFailed: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>Notify customer and staff if payment fails</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnOverdueDunning}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                notifyOnOverdueDunning: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>Send automated dunning escalation on overdue</span>
                        </label>
                      </div>
                    </div>

                    {/* Subscriptions */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 mt-3">
                      <span className="font-semibold text-xs text-slate-800 block">
                        Subscription Lifecycle Alerts
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnSubscriptionRenewed}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                notifyOnSubscriptionRenewed: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>Subscription renewal confirmation notice</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnUpcomingRenewal}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                notifyOnUpcomingRenewal: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>Advance renewal notice (7 days prior)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnSubscriptionPaused}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                notifyOnSubscriptionPaused: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>Subscription paused or resumed alert</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.notifyOnSubscriptionClosed}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                notifyOnSubscriptionClosed: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded text-indigo-600"
                          />
                          <span>Subscription cancellation acknowledgment</span>
                        </label>
                      </div>
                    </div>

                    {/* Internal Team Alert */}
                    <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200 mt-3">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.notifyInternalFinanceDigest}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              notifyInternalFinanceDigest: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-xs font-semibold text-slate-900 block">
                            Daily Internal Finance Executive Digest
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Dispatches daily morning summary of cash collected, overdue invoices,
                            and upcoming renewals to finance staff.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" variant="primary" size="sm">
                      Save Notification Settings
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODAL 1: Add New Staff Member */}
      {/* ============================================================= */}
      <Modal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title="Provision New Staff Member"
        description="Add an authorized internal operations user with role-based permissions"
        maxWidth="lg"
      >
        <form onSubmit={handleAddStaffSubmit} className="space-y-4">
          {addStaffError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addStaffError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Full Name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. Jordan Miller"
              required
            />
            <Input
              label="Work Email"
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="jordan.staff@brightloop.io"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Job Title"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder="e.g. Billing Specialist"
              required
            />
            <Input
              label="Department"
              value={addDepartment}
              onChange={(e) => setAddDepartment(e.target.value)}
              placeholder="e.g. Finance & Operations"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
            <Input
              label="Temporary Password"
              value={addTempPass}
              onChange={(e) => setAddTempPass(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Role-Based Access Permissions
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={addPermissions.includes(perm.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAddPermissions([...addPermissions, perm.id]);
                      } else {
                        setAddPermissions(addPermissions.filter((p) => p !== perm.id));
                      }
                    }}
                    className="h-3.5 w-3.5 rounded text-indigo-600"
                  />
                  <span>{perm.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddStaffOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmittingAddStaff}>
              {isSubmittingAddStaff ? 'Provisioning...' : 'Provision Staff Account'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 2: Edit Staff Member */}
      {/* ============================================================= */}
      <Modal
        isOpen={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title="Edit Staff Member & Permissions"
        description="Update profile details and role-based permissions"
        maxWidth="lg"
      >
        <form onSubmit={handleEditStaffSubmit} className="space-y-4">
          {editStaffError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editStaffError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Full Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <Input
              label="Work Email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Job Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
            <Input
              label="Department"
              value={editDepartment}
              onChange={(e) => setEditDepartment(e.target.value)}
              required
            />
          </div>

          <Input
            label="Phone Number"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Assigned Permissions
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={editPermissions.includes(perm.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditPermissions([...editPermissions, perm.id]);
                      } else {
                        setEditPermissions(editPermissions.filter((p) => p !== perm.id));
                      }
                    }}
                    className="h-3.5 w-3.5 rounded text-indigo-600"
                  />
                  <span>{perm.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingStaff(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmittingEditStaff}>
              {isSubmittingEditStaff ? 'Saving...' : 'Update Staff Details'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 3: Add / Edit Tax Rule */}
      {/* ============================================================= */}
      <Modal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
        title={editingTaxRule ? 'Edit Tax Rule' : 'Create New Tax Rule'}
        description="Configure tax percentage, category, and regional application"
        maxWidth="md"
      >
        <form onSubmit={handleSaveTaxRule} className="space-y-4">
          {taxError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{taxError}</span>
            </div>
          )}

          <Input
            label="Tax Rule Name"
            value={taxName}
            onChange={(e) => setTaxName(e.target.value)}
            placeholder="e.g. Standard GST 18%"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Tax Rate (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="18"
              required
            />

            <Select
              label="Tax Type"
              value={taxType}
              onChange={(e) => setTaxType(e.target.value as TaxType)}
              options={[
                { label: 'GST (Goods & Services Tax)', value: 'GST' },
                { label: 'VAT (Value Added Tax)', value: 'VAT' },
                { label: 'Sales Tax', value: 'Sales Tax' },
                { label: 'Corporate Tax', value: 'Corporate' },
                { label: 'Custom Duty / Fee', value: 'Custom' },
              ]}
            />
          </div>

          <Input
            label="Description / Regulatory Note"
            value={taxDescription}
            onChange={(e) => setTaxDescription(e.target.value)}
            placeholder="e.g. Standard rate for digital SaaS and cloud computing"
          />

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
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

      {/* ============================================================= */}
      {/* MODAL 4: Delete Tax Rule Confirmation */}
      {/* ============================================================= */}
      <Modal
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Tax Rule Deletion"
        description="Are you sure you want to delete this tax rule? Existing generated invoices will retain historical rates."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            This action cannot be undone. Inactive tax rules can also be disabled instead of deleted.
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => deleteConfirmId && handleDeleteTaxRule(deleteConfirmId)}
            >
              Delete Tax Rule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
