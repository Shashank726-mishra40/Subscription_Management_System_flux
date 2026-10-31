import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { UserRole } from '../../types/auth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fromLocation = (location.state as any)?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both your registered email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(email, password, rememberMe);

      // Redirect based on role or original destination
      if (fromLocation && fromLocation !== '/unauthorized') {
        navigate(fromLocation, { replace: true });
      } else if (user.role === 'CUSTOMER') {
        navigate('/portal', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill helper for testing/evaluating
  const fillCredentials = (role: UserRole) => {
    setError(null);
    if (role === 'ADMIN') {
      setEmail('admin@brightloop.io');
      setPassword('AdminPassword123!');
    } else if (role === 'STAFF') {
      setEmail('staff@brightloop.io');
      setPassword('StaffPassword123!');
    } else {
      setEmail('customer@vertexlogic.com');
      setPassword('CustomerPassword123!');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign in to Brightloop
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Access your subscription management workspace or customer billing portal.
        </p>
      </div>

      {/* One-click Demo Credentials Picker for easy verification */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Quick Test Credentials:</span>
          </div>
          <span className="text-[10px] text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded font-medium">
            1-Click Fill
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => fillCredentials('ADMIN')}
            className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-[11px] font-semibold text-slate-700 rounded-lg border border-indigo-200 transition-all text-center shadow-2xs hover:border-indigo-400"
          >
            Admin Account
          </button>
          <button
            type="button"
            onClick={() => fillCredentials('STAFF')}
            className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-[11px] font-semibold text-slate-700 rounded-lg border border-indigo-200 transition-all text-center shadow-2xs hover:border-indigo-400"
          >
            Staff Account
          </button>
          <button
            type="button"
            onClick={() => fillCredentials('CUSTOMER')}
            className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-[11px] font-semibold text-slate-700 rounded-lg border border-indigo-200 transition-all text-center shadow-2xs hover:border-indigo-400"
          >
            Customer Portal
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Work Email Address
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">Password</label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-600 font-medium">Remember this device</span>
          </label>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            TLS Protected
          </span>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          className="w-full py-2.5 font-semibold text-xs shadow-sm hover:shadow"
          icon={<ArrowRight className="w-4 h-4" />}
          iconPosition="right"
        >
          Sign In to Workspace
        </Button>
      </form>

      {/* Signup Link */}
      <div className="text-center pt-3 border-t border-slate-100 text-xs text-slate-500">
        New customer organization?{' '}
        <Link
          to="/signup"
          className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Create customer account
        </Link>
      </div>
    </div>
  );
};
