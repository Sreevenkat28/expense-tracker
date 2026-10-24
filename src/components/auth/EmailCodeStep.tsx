import React, { useEffect, useState } from 'react';
import { MailCheck, AlertCircle, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { isEmailServiceConfigured } from '../../config/emailConfig';
import {
  ChallengePurpose,
  maskEmail,
  resendWaitSeconds,
  startChallenge,
  verifyChallenge,
  clearChallenge,
  CODE_TTL_MS,
} from '../../services/emailVerification';

interface EmailCodeStepProps {
  email: string;
  name: string;
  purpose: ChallengePurpose;
  subject: string; // email for sign-up, user id for log in
  onVerified: () => void;
  onCancel: () => void;
}

/** "Please enter the code to continue": 6-digit code entry, with resend. */
export const EmailCodeStep: React.FC<EmailCodeStepProps> = ({ email, name, purpose, subject, onVerified, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(() => resendWaitSeconds());
  const configured = isEmailServiceConfigured();

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(resendWaitSeconds()), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await verifyChallenge({ purpose, subject }, code);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Incorrect code.');
      return;
    }
    onVerified();
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    const res = await startChallenge({ email, name, purpose, subject });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not send a new code.');
      return;
    }
    setCode('');
    setInfo('A new code has been sent. Older codes no longer work.');
    setWait(resendWaitSeconds());
  };

  const handleCancel = () => {
    clearChallenge();
    onCancel();
  };

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 mb-2">
          <MailCheck className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Please enter the code to continue</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-0 leading-relaxed">
          {configured ? (
            <>We emailed a 6-digit code to <strong>{maskEmail(email)}</strong>. It expires in {CODE_TTL_MS / 60000} minutes.</>
          ) : (
            <>A 6-digit code is required to continue, but the email service has not been set up yet, so no code can be sent.</>
          )}
        </p>
      </div>

      {!configured && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>The app owner needs to add the EmailJS keys (see EMAIL_SETUP.md). Until then this step cannot be completed.</span>
        </div>
      )}

      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        placeholder="______"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="w-full text-center font-mono text-2xl font-black tracking-[0.5em] py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        aria-label="6-digit confirmation code"
        autoFocus
        disabled={!configured}
      />

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {info && !error && <p className="text-xs text-emerald-700 dark:text-emerald-400 text-center m-0">{info}</p>}

      <button
        type="submit"
        disabled={busy || code.length !== 6 || !configured}
        className="w-full py-2.5 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
      >
        <ShieldCheck className="w-4 h-4" />
        <span>{busy ? 'Checking…' : 'Verify & Continue'}</span>
      </button>

      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={handleCancel} className="font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={busy || wait > 0}
          className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
};
