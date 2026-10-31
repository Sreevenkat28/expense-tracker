import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ArrowLeft, RefreshCw, BadgeCheck } from 'lucide-react';
import { clearChallenge, maskEmail, resendWaitSeconds, CODE_TTL_MS } from '../../services/emailCodes';
import { resendSignupCode, verifySignupCode } from '../../services/signupVerify';

interface VerifyEmailFormProps {
  email: string;
  name: string;
  /** Runs once the code is right; return an error message to keep the user on this screen. */
  onVerified: () => Promise<string | void> | string | void;
  onBack: () => void;
  /** What the code is for: shown in the text and on the button. */
  intro?: string;
  submitLabel?: string;
  backLabel?: string;
  onSkip?: () => void;
}

const primaryBtn =
  'w-full py-2.5 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer';

/** Sign-up step 2: the user types the 6-digit code emailed to the address they gave. */
export const VerifyEmailForm: React.FC<VerifyEmailFormProps> = ({ email, name, onVerified, onBack, intro, submitLabel, backLabel, onSkip }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(resendWaitSeconds());

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(resendWaitSeconds()), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await verifySignupCode(email, code);
    if (!res.ok) {
      setBusy(false);
      setError(res.error ?? 'That code did not work.');
      return;
    }
    const problem = await onVerified();
    setBusy(false);
    if (problem) setError(problem);
  };

  const resend = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    const res = await resendSignupCode(email, name);
    setBusy(false);
    setWait(resendWaitSeconds());
    if (!res.ok) { setError(res.error ?? 'Could not send the email.'); return; }
    setCode('');
    setInfo('A new code has been sent. Older codes no longer work.');
  };

  const back = () => {
    clearChallenge();
    onBack();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          We emailed a 6-digit code to <strong>{maskEmail(email)}</strong>. {intro ?? 'Enter it to confirm this is your email and finish creating your account.'} It expires in {CODE_TTL_MS / 60000} minutes. Check your spam folder if you do not see it.
        </span>
      </div>

      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="______"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="w-full text-center font-mono text-2xl font-black tracking-[0.5em] py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        aria-label="6-digit verification code"
        autoFocus
      />

      {error && (
        <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {info && !error && <p className="text-xs text-emerald-700 dark:text-emerald-400 text-center m-0">{info}</p>}

      <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
        <BadgeCheck className="w-4 h-4" />
        <span>{busy ? 'Checking…' : submitLabel ?? 'Verify & Create Account'}</span>
      </button>

      {onSkip && (
        <button type="button" onClick={onSkip} className="w-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 cursor-pointer">
          Skip for now (use this device only)
        </button>
      )}

      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={back} className="font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 inline-flex items-center gap-1 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> {backLabel ?? 'Change email'}
        </button>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy || wait > 0}
          className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
};
