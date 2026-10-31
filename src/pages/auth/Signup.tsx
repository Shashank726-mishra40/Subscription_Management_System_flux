import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, Building, AlertCircle, ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { validatePassword, validateEmail } from '../../utils/crypto';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time password criteria
  const pwValidation = validatePassword(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!pwValidation.isValid) {
      setError(pwValidation.errorMessage || 'Password does not satisfy security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both entries.');
      return;
    }

    setIsLoading(true);
    try {
      // signup automatically assigns CUSTOMER role as required
      await signup(name, email, password, companyName);
      // Redirect to customer portal
      navigate('/portal', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] font-semibold text-indigo-700 mb-2">
          Customer Self-Service Registration
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Create Customer Account
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Sign up to manage your Brightloop subscriptions, invoices, and service seats.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah Jenkins"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Company Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Company / Organization Name
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Building className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Technologies Ltd."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Work Email Address <span className="text-rose-500">*</span>
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
              placeholder="sarah@acme.com"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="More than 8 chars, uppercase, symbol..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-10 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Real-time Password Requirements Checklist */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-[11px] space-y-1">
          <p className="font-semibold text-slate-700 text-xs mb-1">Password Requirements:</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div className={`flex items-center gap-1.5 ${pwValidation.hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
              {pwValidation.hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
              <span>More than 8 characters</span>
            </div>
            <div className={`flex items-center gap-1.5 ${pwValidation.hasUppercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
              {pwValidation.hasUppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
              <span>One uppercase letter</span>
            </div>
            <div className={`flex items-center gap-1.5 ${pwValidation.hasLowercase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
              {pwValidation.hasLowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
              <span>One lowercase letter</span>
            </div>
            <div className={`flex items-center gap-1.5 ${pwValidation.hasSpecialChar ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
              {pwValidation.hasSpecialChar ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
              <span>One special character</span>
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Confirm Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={`w-full rounded-lg border bg-white py-2 pl-9 pr-10 text-xs text-slate-900 transition-colors focus:outline-none focus:ring-2 ${
                confirmPassword.length > 0 && !passwordsMatch
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-[11px] text-rose-600 mt-1 font-medium">Passwords do not match.</p>
          )}
          {passwordsMatch && (
            <p className="text-[11px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Passwords match
            </p>
          )}
        </div>

        <div className="rounded-lg bg-slate-100 p-2 text-[10px] text-slate-500">
          Note: Staff and administrator accounts are provisioned exclusively through internal admin invitation.
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          disabled={!pwValidation.isValid || !passwordsMatch}
          className="w-full py-2.5 font-semibold text-xs shadow-sm hover:shadow"
          icon={<ArrowRight className="w-4 h-4" />}
          iconPosition="right"
        >
          Create Customer Account
        </Button>
      </form>

      {/* Login link */}
      <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
};
