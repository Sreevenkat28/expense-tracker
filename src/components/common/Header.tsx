import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Plus,
  Wallet,
  Sun,
  Moon,
  Wand2,
  RotateCcw,
  LogOut,
  User,
  Coins,
  UserX,
  Mail,
  ShieldCheck,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { MonthPicker } from './MonthPicker';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';
import { DeleteAccountModal } from './AccountModals';
import { useEscapeKey } from '../../utils/useEscapeKey';
import { formatDate } from '../../utils/dates';

export const Header: React.FC = () => {
  const {
    setIsQuickAddOpen,
    setIsSmartEntryOpen,
    setIsResetModalOpen,
    dark,
    setDark,
    currency,
    setCurrency,
    exchangeRateNote,
    ratesSource,
    ratesUpdatedAt,
    currentUser,
    logout,
  } = useExpense();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  useEscapeKey(isProfileOpen, () => setIsProfileOpen(false));

  // Tell the tab bar how tall this header is, so it sticks directly underneath at any width
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Close the profile card on outside click
  useEffect(() => {
    if (!isProfileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isProfileOpen]);

  return (
    <header ref={headerRef} className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 md:sticky md:top-0 z-30 shadow-xs transition-colors">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {/* App Title, Branding & User Profile */}
        <div className="flex items-center justify-between gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none m-0 whitespace-nowrap">
                  Expense Tracker
                </h1>
                <div ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen((o) => !o)}
                    className={`text-[11px] font-bold whitespace-nowrap shrink-0 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors ${
                      currentUser
                        ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900'
                        : 'text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="Your profile and settings"
                    aria-label="View your profile"
                    aria-expanded={isProfileOpen}
                  >
                    <User className="w-3 h-3" />
                    <span>{currentUser ? currentUser.name.split(' ')[0] : 'Guest'}</span>
                    {currentUser?.role === 'admin' && <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                  {isProfileOpen && (
                    <div className="absolute left-4 right-4 sm:left-6 sm:right-auto lg:left-8 top-full mt-1 z-50 sm:w-80 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      {currentUser ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-lg font-black shrink-0">
                              {currentUser.name.trim().charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 dark:text-white break-words">{currentUser.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 break-all">@{currentUser.username}</div>
                            </div>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-start gap-2 min-w-0">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="break-all">{currentUser.email ?? 'No email on file'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{currentUser.role === 'admin' ? 'Admin' : 'Standard user'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>Member since {formatDate(currentUser.createdAt.slice(0, 10))}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">Guest ledger</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Saved only in this browser. Sign out and create an account to keep it under your own login.</div>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-slate-100 dark:border-slate-700 pt-2 space-y-0.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={dark}
                          onClick={() => setDark((d) => !d)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                        >
                          {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
                          <span>Dark mode</span>
                          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${dark ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200'}`}>{dark ? 'On' : 'Off'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsProfileOpen(false); setIsResetModalOpen(true); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Clear your transactions, budgets and goals and start fresh"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Reset ledger</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsProfileOpen(false); logout(); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                          title={currentUser ? 'Sign out. Your data stays saved for your next log in.' : 'Leave guest mode and return to the login screen'}
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign out</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsProfileOpen(false); setIsDeleteOpen(true); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title={currentUser ? 'Permanently delete your account and all its data' : 'Permanently delete all guest data'}
                        >
                          <UserX className="w-4 h-4" />
                          <span>{currentUser ? 'Delete account' : 'Delete guest data'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="hidden lg:block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Personal finances, budgets & calendar ledger
              </p>
            </div>
          </div>

          {/* Mobile Fast Action Buttons */}
          <div className="flex items-center gap-1 md:hidden shrink-0">
            <button
              onClick={() => setIsSmartEntryOpen(true)}
              className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs"
              title="Smart AI Entry"
              aria-label="Smart Entry"
            >
              <Wand2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs"
              title="Add Transaction"
              aria-label="Add transaction"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop Controls Dock: Calendar Picker, Currency, Reset, Smart Entry, Add & Auth */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-auto md:justify-end">
          {/* Day / Month / Year Calendar Navigator */}
          <MonthPicker />

          {/* Currency Dropdown Selector */}
          <div className="relative flex items-center shrink-0 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl px-2 py-1 shadow-xs">
            <Coins className="w-3.5 h-3.5 text-slate-400 pointer-events-none mr-1.5 shrink-0" />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Select Currency"
              className="appearance-none font-bold text-xs text-slate-800 dark:text-slate-100 bg-transparent pr-4 focus:outline-hidden cursor-pointer"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="dark:bg-slate-800 dark:text-white">
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 text-[9px] text-slate-400">▼</span>
          </div>
          {currency !== 'USD' && (
            <span
              className="hidden lg:inline text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap"
              title={
                ratesSource === 'fallback'
                  ? 'Approximate rate: live rates could not be loaded yet'
                  : `Live rate${ratesUpdatedAt ? `, updated ${new Date(ratesUpdatedAt).toLocaleString()}` : ''}`
              }
            >
              {exchangeRateNote}
              {ratesSource === 'fallback' ? ' (approx.)' : ''}
            </span>
          )}

          {/* Smart Entry */}
          <button
            onClick={() => setIsSmartEntryOpen(true)}
            className="hidden md:flex items-center gap-1.5 shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-2xl transition-all cursor-pointer shadow-2xs"
            title="Type expenses in plain English"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>AI Entry</span>
          </button>

          {/* Add Transaction Button */}
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="hidden md:flex items-center gap-1.5 shrink-0 whitespace-nowrap px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-2xl transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
            title="Record an expense or income deposit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>
      <DeleteAccountModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} />
    </header>
  );
};
