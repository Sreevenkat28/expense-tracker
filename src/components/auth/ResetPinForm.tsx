import React, { useEffect, useState } from 'react';
import { Mail, KeyRound, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw, Send } from 'lucide-react';
import { isEmailServiceConfigured } from '../../config/emailConfig';
import { clearChallenge, maskEmail, resendWaitSeconds, CODE_TTL_MS } from '../../services/emailCodes';
import { requestPinReset, completePinReset } from '../../services/pinReset';

interface ResetPinFormProps {
  onBack: () => void;
  onDone: (identifier: string) => void;
}

const inputCls =
  'w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500';
const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5';
const primaryBtn =
  'w-full py-2.5 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer';

/** Reset a forgotten PIN: enter your email, get a 6-digit code by email, choose a new PIN. */
export const ResetPinForm: React.FC<ResetPinFormProps> = ({ onBack, onDone }) => {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [identifier, setIdentifier] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const configured = isEmailServiceConfigured();

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(resendWaitSeconds()), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const send = async (isResend: boolean) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    const res = await requestPinReset(identifier);
    setBusy(false);
    if (!res.ok) {
      setError(res.notConfigured ? 'Email sending is not set up yet, so a reset email cannot be sent. Ask the admin to reset your PIN.' : res.error ?? 'Could not send the email.');
      return;
    }
    setSentTo(res.email ?? '');
    setWait(resendWaitSeconds());
    setStep('code');
    if (isResend) {
      setCode('');
      setInfo('A new code has been sent. Older codes no longer work.');
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Enter the email address you signed up with.');
      return;
    }
    void send(false);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin !== pinConfirm) {
      setError('The two new PINs do not match.');
      return;
    }
    setBusy(true);
    const res = await completePinReset(identifier, code, pin);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not reset the PIN.');
      return;
    }
    onDone(identifier);
  };

  const handleBack = () => {
    clearChallenge();
    onBack();
  };

  const errorBox = error && (
    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{error}</span>
    </div>
  );

  if (step === 'email') {
    return (
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 m-0 leading-relaxed">
          Enter the email you used to sign up. We will email you a 6-digit code to set a new PIN.
        </p>
        {!configured && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Reset emails are not set up yet (the owner must connect the email sender). Until then, ask the admin to reset your PIN.</span>
          </div>
        )}
        <div>
          <label className={labelCls}>Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              placeholder="name@gmail.com"
              autoComplete="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </div>
        </div>
        {errorBox}
        <button type="submit" disabled={busy} className={primaryBtn}>
          <Send className="w-4 h-4" />
          <span>{busy ? 'Sending…' : 'Email Me a Reset Code'}</span>
        </button>
        <div className="text-center">
          <button type="button" onClick={handleBack} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 inline-flex items-center gap-1 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Log In
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleResetSubmit} className="space-y-4">
      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          We emailed a 6-digit code to <strong>{maskEmail(sentTo)}</strong>. It expires in {CODE_TTL_MS / 60000} minutes. Check your spam folder if you do not see it.
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
        aria-label="6-digit reset code"
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>New PIN</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input type="password" autoComplete="new-password" value={pin} onChange={(e) => setPin(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Confirm PIN</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input type="password" autoComplete="new-password" value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {errorBox}
      {info && !error && <p className="text-xs text-emerald-700 dark:text-emerald-400 text-center m-0">{info}</p>}

      <button type="submit" disabled={busy || code.length !== 6 || !pin} className={primaryBtn}>
        <KeyRound className="w-4 h-4" />
        <span>{busy ? 'Checking…' : 'Set New PIN'}</span>
      </button>

      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={handleBack} className="font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 inline-flex items-center gap-1 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          type="button"
          onClick={() => void send(true)}
          disabled={busy || wait > 0}
          className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
};
