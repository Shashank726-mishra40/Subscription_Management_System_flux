import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, ArrowLeft, Send, CheckCircle2, ExternalLink } from 'lucide-react';
import { AuthService, SimulatedEmail } from '../../services/authService';
import { Button } from '../../components/common/Button';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sentEmailData, setSentEmailData] = useState<SimulatedEmail | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please provide your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const { simulatedEmail } = await AuthService.requestPasswordReset(email);
      setSentEmailData(simulatedEmail);
    } catch (err: any) {
      setError(err?.message || 'Password reset request failed. Please check the email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Reset your password
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter your registered email and we will generate a secure reset link valid for 15 minutes.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {sentEmailData ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Password Reset Link Generated</span>
            </div>
            <p className="text-xs text-emerald-700">
              A secure password reset token has been dispatched to{' '}
              <strong className="font-semibold text-emerald-950">{sentEmailData.to}</strong>.
            </p>
            <p className="text-[11px] text-emerald-600">
              The link expires in {sentEmailData.expiresInMinutes} minutes.
            </p>
          </div>

          {/* Simulated Email Notification Box for easy development testing */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                Simulated Email Dispatch
              </span>
              <span className="text-[10px] bg-indigo-200/60 text-indigo-800 px-2 py-0.5 rounded font-mono">
                {sentEmailData.sentAt}
              </span>
            </div>

            <div className="text-xs text-indigo-950 bg-white/90 p-3 rounded-lg border border-indigo-100 space-y-1">
              <p>
                <span className="text-slate-400">Subject:</span> {sentEmailData.subject}
              </p>
              <p>
                <span className="text-slate-400">Recipient:</span> {sentEmailData.to}
              </p>
            </div>

            <Link
              to={sentEmailData.previewUrl}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-all text-center"
            >
              <span>Click to Open Reset Password Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setSentEmailData(null)}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              Didn't receive it? Click to retry
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Registered Work Email
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
            <p className="text-[11px] text-slate-400 mt-1.5">
              Tip: You can test with <code>admin@brightloop.io</code>, <code>staff@brightloop.io</code>, or <code>customer@vertexlogic.com</code>.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className="w-full py-2.5 font-semibold text-xs shadow-sm hover:shadow"
            icon={<Send className="w-4 h-4" />}
            iconPosition="right"
          >
            Send Password Reset Link
          </Button>
        </form>
      )}
    </div>
  );
};
