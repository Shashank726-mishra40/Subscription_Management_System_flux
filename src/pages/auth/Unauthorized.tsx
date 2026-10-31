import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';

export const UnauthorizedPage: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleReturnHome = () => {
    if (role === 'CUSTOMER') {
      navigate('/portal');
    } else {
      navigate('/');
    }
  };

  const handleSwitchAccount = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-xl p-8 sm:p-10 text-center space-y-6">
        {/* Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 uppercase tracking-wider mb-2">
            403 · Access Restricted
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Unauthorized Access
          </h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            You do not have the role permissions required to view this administrative resource.
          </p>
        </div>

        {user && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-left space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Current Signed-in User:</span>
              <span className="font-semibold text-slate-900">{user.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Current Role:</span>
              <span className="px-2 py-0.5 font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                {user.role}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Email:</span>
              <span className="text-slate-700 font-mono text-[11px]">{user.email}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleReturnHome}
            icon={<Home className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Return to Allowed Workspace
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSwitchAccount}
            icon={<LogOut className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Sign In with Different Account
          </Button>
        </div>
      </div>
    </div>
  );
};
