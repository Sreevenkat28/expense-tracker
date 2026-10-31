import React, { useRef, useState } from 'react';
import {
  Wallet,
  Lock,
  User,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Coins,
  Mail,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { authService } from '../../services/authService';
import { checkEmailIsReal, emailFormatError } from '../../services/emailCheck';
import { ResetPinForm } from './ResetPinForm';
import { VerifyEmailForm } from './VerifyEmailForm';
import { sendSignupCode } from '../../services/signupVerify';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';

interface LoginViewProps {
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login, register, continueAsGuest } = useExpense();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Login form state
  // A remembered account is pre-filled so only the PIN is needed
  const [rememberedUser, setRememberedUser] = useState(() => authService.getRememberedUser());
  const [loginUsername, setLoginUsername] = useState(() => authService.getRememberedUser()?.username ?? '');
  const [loginPin, setLoginPin] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  // Live feedback under the email box: checked when you leave the field and again on submit
  const [emailStatus, setEmailStatus] = useState<{ kind: 'idle' | 'checking' | 'ok' | 'warn' | 'error'; text?: string }>({ kind: 'idle' });
  const emailCheckId = useRef(0);

  const checkRegEmail = async (value: string) => {
    const id = ++emailCheckId.current;
    if (!value.trim()) {
      setEmailStatus({ kind: 'idle' });
      return;
    }
    const formatError = emailFormatError(value);
    if (formatError) {
      setEmailStatus({ kind: 'error', text: formatError });
      return;
    }
    setEmailStatus({ kind: 'checking', text: 'Checking this email address…' });
    const res = await checkEmailIsReal(value);
    if (id !== emailCheckId.current) return; // the field changed while checking
    if (!res.ok) setEmailStatus({ kind: 'error', text: res.error });
    else if (res.unverified) setEmailStatus({ kind: 'warn', text: 'Format looks fine, but the email domain could not be checked right now.' });
    else setEmailStatus({ kind: 'ok', text: 'This email address looks valid.' });
  };
  const [regPin, setRegPin] = useState('');
  const [regCurrency, setRegCurrency] = useState('USD');
  // Details waiting for the emailed code before the account is really created
  const [pendingSignup, setPendingSignup] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // "Remember this account on this device" pre-fills the username on the next log in
  const [remember, setRemember] = useState(() => authService.getRememberedUser() !== null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: 'login' | 'register' | 'forgot') => {
    setMode(next);
    setPendingSignup(false);
    setNotice(null);
    setErrorMsg(null);
  };

  const applyRemember = (userId: string | undefined) => {
    if (!userId) return;
    if (remember) authService.rememberAccount(userId);
    else if (authService.getRememberedUser()?.id === userId) authService.forgetAccount();
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginUsername.trim()) {
      setErrorMsg('Please enter your username or email.');
      return;
    }
    if (!loginPin.trim()) {
      setErrorMsg('Please enter your PIN or password.');
      return;
    }

    const res = login(loginUsername, loginPin);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials.');
      return;
    }
    applyRemember(authService.findUser(loginUsername)?.id);
    if (onSuccess) onSuccess();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Cheap local checks first, then confirm the email address is real
    const valid = authService.validateRegistration(regName, regUsername, regEmail, regPin);
    if (!valid.success) {
      setErrorMsg(valid.error || 'Could not create account.');
      return;
    }
    setBusy(true);
    const real = await checkEmailIsReal(regEmail);
    setBusy(false);
    if (!real.ok) {
      setEmailStatus({ kind: 'error', text: real.error });
      setErrorMsg(real.error || 'Please use a real email address.');
      return;
    }

    // Prove the mailbox is theirs: email a random code, create the account only after it is entered
    setBusy(true);
    const sent = await sendSignupCode(regEmail, regName);
    setBusy(false);
    if (!sent.ok) {
      setErrorMsg(sent.notConfigured ? 'Email verification is not set up yet, so new accounts cannot be created right now.' : sent.error ?? 'Could not send the verification email.');
      return;
    }
    setPendingSignup(true);
  };

  const finishRegistration = () => {
    const res = register(regName, regUsername, regEmail, regPin, regCurrency);
    if (!res.success) {
      setPendingSignup(false);
      setErrorMsg(res.error || 'Could not create account.');
      return;
    }
    applyRemember(authService.findUser(regUsername)?.id);
    if (onSuccess) onSuccess();
  };

  // "Not you?" on a remembered account: forget it and show an empty form
  const handleUseAnotherAccount = () => {
    authService.forgetAccount();
    setRememberedUser(null);
    setLoginUsername('');
    setLoginPin('');
    setRemember(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 transition-all">
        {/* Branding & Welcome */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20 mb-3">
            <Wallet className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight m-0">
            Personal Expense Tracker
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Your private personal ledger. Keep your finances, budgets, and savings secure and isolated.
          </p>
        </div>

        {/* Tab switch between Login and Register */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode !== 'register'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {notice && mode === 'login' && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
            {notice}
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── Log In Form ──────────────────────────────────────────────── */}
        {pendingSignup ? (
          <VerifyEmailForm
            email={regEmail}
            name={regName}
            onVerified={finishRegistration}
            onBack={() => setPendingSignup(false)}
          />
        ) : mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {rememberedUser && loginUsername === rememberedUser.username && (
              <div className="flex items-center justify-between gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                <span>
                  Welcome back, <strong>{rememberedUser.name.split(' ')[0]}</strong>. Enter your PIN to continue.
                </span>
                <button type="button" onClick={handleUseAnotherAccount} className="font-semibold underline shrink-0 cursor-pointer">
                  Not you?
                </button>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. aditya or aditya@gmail.com"
                  autoComplete="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  autoFocus={!rememberedUser}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Security PIN / Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="Enter your 4-digit PIN"
                  autoComplete="current-password"
                  autoFocus={!!rememberedUser}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="mt-0.5 accent-emerald-600"
              />
              <span>
                Remember this account on this device
                <span className="block text-[11px] text-slate-400">
                  Pre-fills your username next time so you only enter your PIN. Leave unticked on shared computers.
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{busy ? 'Please wait…' : 'Log In to My Ledger'}</span>
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Forgot PIN? Reset it by email
              </button>
            </div>
          </form>
        ) : mode === 'forgot' ? (
          <ResetPinForm
            onBack={() => switchMode('login')}
            onDone={(identifier) => {
              setLoginUsername(identifier);
              setLoginPin('');
              setRememberedUser(null);
              setMode('login');
              setErrorMsg(null);
              setNotice('Your PIN has been updated. Log in with your new PIN.');
            }}
          />
        ) : (
          /* ── Create Account Form ─────────────────────────────────────── */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Sree Venkat"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Choose Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. adis"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="e.g. name@gmail.com"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    emailCheckId.current++;
                    setEmailStatus({ kind: 'idle' });
                  }}
                  onBlur={(e) => void checkRegEmail(e.target.value)}
                  aria-invalid={emailStatus.kind === 'error'}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 ${
                    emailStatus.kind === 'error'
                      ? 'border-rose-400 dark:border-rose-700 focus:ring-rose-500/20 focus:border-rose-500'
                      : emailStatus.kind === 'ok'
                      ? 'border-emerald-400 dark:border-emerald-700 focus:ring-emerald-500/20 focus:border-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 focus:border-emerald-500'
                  }`}
                />
              </div>
              {emailStatus.kind !== 'idle' && (
                <p
                  className={`mt-1.5 mb-0 text-xs flex items-center gap-1.5 ${
                    emailStatus.kind === 'error'
                      ? 'text-rose-600 dark:text-rose-400'
                      : emailStatus.kind === 'ok'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : emailStatus.kind === 'warn'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  role={emailStatus.kind === 'error' ? 'alert' : 'status'}
                >
                  {emailStatus.kind === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                  {emailStatus.kind === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  {(emailStatus.kind === 'error' || emailStatus.kind === 'warn') && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                  <span>{emailStatus.text}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Create 4-Digit PIN or Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="e.g. 1234"
                  autoComplete="new-password"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Preferred Currency
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Coins className="w-4 h-4" />
                </div>
                <select
                  value={regCurrency}
                  onChange={(e) => setRegCurrency(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-3 text-slate-400 text-xs">▼</div>
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="mt-0.5 accent-emerald-600"
              />
              <span>
                Remember this account on this device
                <span className="block text-[11px] text-slate-400">
                  Pre-fills your username on the login screen next time.
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{busy ? 'Please wait…' : 'Email Me a Verification Code'}</span>
            </button>
          </form>
        )}

        {/* Guest / Quick Access Option */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={continueAsGuest}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Or continue with Offline Guest Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
