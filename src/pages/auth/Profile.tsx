import React, { useState } from 'react';
import { Building, Shield, KeyRound, CheckCircle2, AlertCircle, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { validatePassword } from '../../utils/crypto';
import { formatDate } from '../../utils/formatters';

export const UserProfilePage: React.FC = () => {
  const { user, updateProfile, changePassword, logout } = useAuth();

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [title, setTitle] = useState(user?.title || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  const [isSavingPass, setIsSavingPass] = useState(false);

  if (!user) return null;

  const pwCheck = validatePassword(newPass);
  const passwordsMatch = newPass.length > 0 && newPass === confirmNewPass;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    setIsSavingProfile(true);
    try {
      await updateProfile({
        name,
        phone,
        companyName,
        title,
        department,
      });
      setProfileSuccess('Profile details successfully updated.');
      setTimeout(() => setProfileSuccess(null), 3500);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccess(null);
    setPassError(null);

    if (!pwCheck.isValid) {
      setPassError(pwCheck.errorMessage || 'New password does not meet criteria.');
      return;
    }

    if (newPass !== confirmNewPass) {
      setPassError('New passwords do not match.');
      return;
    }

    setIsSavingPass(true);
    try {
      await changePassword(currentPass, newPass);
      setPassSuccess('Account password successfully changed.');
      setCurrentPass('');
      setNewPass('');
      setConfirmNewPass('');
      setTimeout(() => setPassSuccess(null), 3500);
    } catch (err: any) {
      setPassError(err?.message || 'Failed to change password.');
    } finally {
      setIsSavingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Account & Profile</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage your personal profile, credentials, security credentials, and organization metadata.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={logout}
          icon={<LogOut className="w-4 h-4 text-rose-600" />}
          className="text-rose-600 hover:bg-rose-50 hover:border-rose-300"
        >
          Sign Out of Account
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Profile Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardContent className="text-center p-6 space-y-4">
              <div className="mx-auto h-20 w-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-indigo-600/30">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">{user.name}</h3>
                <p className="text-xs text-slate-500">{user.email}</p>
                <div className="mt-2.5 flex items-center justify-center gap-2">
                  <Badge
                    variant={
                      user.role === 'ADMIN'
                        ? 'purple'
                        : user.role === 'STAFF'
                        ? 'blue'
                        : 'emerald'
                    }
                  >
                    {user.role} ROLE
                  </Badge>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {user.status}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 text-xs text-left space-y-2.5 text-slate-600">
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {user.companyName || user.department || 'Brightloop Internal'}
                  </span>
                </div>
                {user.title && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{user.title}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Member since {formatDate(user.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role Permissions Box */}
          <Card>
            <CardHeader
              title="Role Permissions Scope"
              subtitle={
                user.role === 'ADMIN'
                  ? 'Complete System Administration'
                  : user.role === 'STAFF'
                  ? 'Operational Staff Privileges'
                  : 'Customer Self-Service Access'
              }
            />
            <CardContent className="text-xs space-y-2">
              {user.role === 'ADMIN' && (
                <div className="space-y-1 text-slate-600">
                  <p className="flex items-center gap-1.5 font-medium text-indigo-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Full Admin Control
                  </p>
                  <p className="text-[11px] text-slate-500 pl-5">
                    Authorized to provision staff accounts, manage discount structures, configure system tax rules, and view full executive reports.
                  </p>
                </div>
              )}

              {user.role === 'STAFF' && (
                <div className="space-y-1 text-slate-600">
                  <p className="flex items-center gap-1.5 font-medium text-blue-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Operational Rights
                  </p>
                  <p className="text-[11px] text-slate-500 pl-5">
                    Authorized to manage customers, quotations, subscriptions, invoices, and record incoming payments. Restricted from staff creation and admin settings.
                  </p>
                </div>
              )}

              {user.role === 'CUSTOMER' && (
                <div className="space-y-1 text-slate-600">
                  <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Organization Portal
                  </p>
                  <p className="text-[11px] text-slate-500 pl-5">
                    Isolated access strictly limited to subscriptions, invoices, and payments belonging to {user.companyName || 'your organization'}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Profile Edit & Password Change */}
        <div className="lg:col-span-8 space-y-6">
          {/* Edit Profile Details */}
          <Card>
            <CardHeader
              title="Edit Profile Information"
              subtitle="Keep your contact and organization credentials current"
            />
            <CardContent>
              {profileSuccess && (
                <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Work Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {user.role === 'CUSTOMER' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Job Title & Department
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Title"
                          className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Department"
                          className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSavingProfile}
                  >
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Update Password</span>
                </div>
              }
              subtitle="Ensures cryptographically salted hashing in local storage"
            />
            <CardContent>
              {passSuccess && (
                <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{passSuccess}</span>
                </div>
              )}
              {passError && (
                <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>{passError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="> 8 chars, uppercase, symbol"
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmNewPass}
                      onChange={(e) => setConfirmNewPass(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSavingPass}
                    disabled={!pwCheck.isValid || !passwordsMatch}
                  >
                    Change Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
