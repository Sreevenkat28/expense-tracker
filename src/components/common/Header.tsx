import React from 'react';
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
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { MonthPicker } from './MonthPicker';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';

export const Header: React.FC = () => {
  const {
    setIsQuickAddOpen,
    setIsSmartEntryOpen,
    setIsResetModalOpen,
    dark,
    setDark,
    currency,
    setCurrency,
    currentUser,
    logout,
  } = useExpense();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* App Title, Branding & User Profile */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none m-0">
                  Expense Tracker
                </h1>
                {currentUser ? (
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{currentUser.name.split(' ')[0]}</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold tracking-wider uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                    Guest Ledger
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Personal finances, budgets & calendar ledger
              </p>
            </div>
          </div>

          {/* Mobile Fast Action Buttons */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50"
              title="Reset Ledger"
              aria-label="Reset Ledger"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSmartEntryOpen(true)}
              className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs"
              title="Smart AI Entry"
              aria-label="Smart Entry"
            >
              <Wand2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="p-1.5 rounded-xl bg-emerald-600 text-white shadow-xs"
              title="Add Transaction"
              aria-label="Add transaction"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Desktop Controls Dock: Calendar Picker, Currency, Reset, Smart Entry, Add & Auth */}
        <div className="flex items-center justify-between md:justify-end gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {/* Day / Month / Year Calendar Navigator */}
          <MonthPicker />

          {/* Currency Dropdown Selector */}
          <div className="relative flex items-center bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl px-2 py-1 shadow-xs">
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

          {/* Reset Ledger Button */}
          <button
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/80 rounded-2xl transition-all cursor-pointer shadow-2xs"
            title="Reset transactions and clean your ledger if you made a mistake"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Smart Entry */}
          <button
            onClick={() => setIsSmartEntryOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-2xl transition-all cursor-pointer shadow-2xs"
            title="Type expenses in plain English"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>AI Entry</span>
          </button>

          {/* Add Transaction Button */}
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-2xl transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
            title="Record an expense or income deposit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setDark((d) => !d)}
            className="p-2 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Log Out / Lock Button */}
          {currentUser && (
            <button
              onClick={logout}
              className="p-2 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Lock / Log Out of your personal profile"
              aria-label="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
