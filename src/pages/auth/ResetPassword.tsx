import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, Check, X, ShieldAlert } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { Button } from '../../components/common/Button';
import { validatePassword } from '../../utils/crypto';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [associatedEmail, setAssociatedEmail] = useState<string>('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setTokenError('No password reset token was provided in the URL.');
      return;
    }

    const verification = AuthService.verifyResetToken(token);
    if (!verification.isValid) {
      setTokenValid(false);
      setTokenError(verification.error || 'The password reset link is invalid or expired.');
    } else {
      setTokenValid(true);
      setAssociatedEmail(verification.email || '');
    }
  }, [token]);

  const pwValidation = validatePassword(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!pwValidation.isValid) {
      setFormError(pwValidation.errorMessage || 'New password does not meet criteria.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await AuthService.resetPassword(token, newPassword);
      setResetSuccess(true);
    } catch (err: any) {
      setFormError(err?.message || 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tokenValid === false) {
    return (
      <div className="w-full max-w-md mx-auto space-y-5 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Invalid or Expired Link</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {tokenError || 'This password reset link is either expired, already used, or invalid.'}
          </p>
        </div>
        <div className="pt-2">
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Request a New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="w-full max-w-md mx-auto space-y-5 text-center animate-in fade-in duration-200">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Password Updated Successfully</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Your Brightloop account password for <strong>{associatedEmail}</strong> has been securely updated and hashed.
          </p>
        </div>
        <div className="pt-4">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => navigate('/login')}
            className="w-full"
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Sign In with New Password
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Set New Password
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Creating new credentials for <strong className="text-slate-800">{associatedEmail}</strong>
        </p>
      </div>

      {formError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{formError}</div>
        </div>
      )}

      <form onSubmit={handleResetSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            New Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
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

        {/* Requirements Checklist */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-[11px] space-y-1">
          <p className="font-semibold text-slate-700 text-xs mb-1">Security Standards:</p>
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

        {/* Confirm New Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Confirm New Password
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
              placeholder="Re-enter your new password"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-10 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={!pwValidation.isValid || !passwordsMatch}
          className="w-full py-2.5 font-semibold text-xs shadow-sm hover:shadow"
        >
          Confirm & Save New Password
        </Button>
      </form>
    </div>
  );
};
