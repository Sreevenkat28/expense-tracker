import React, { useState } from 'react';
import { Plus, Wallet, Sparkles, RotateCcw, Sparkle, Sun, Moon, Wand2 } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { MonthPicker } from './MonthPicker';

export const Header: React.FC = () => {
  const {
    isSampleData,
    loadSampleData,
    resetToCleanAccount,
    setIsQuickAddOpen,
    setIsSmartEntryOpen,
    dark,
    setDark,
  } = useExpense();

  const [showConfirmReset, setShowConfirmReset] = useState(false);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors">
      {/* Sample data banner if sample data is active */}
      {isSampleData && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/70 dark:border-amber-800/50 px-4 py-1.5 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Evaluation Mode: Displaying sample multi-month data. Not real financial information.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirmReset(true)}
              className="text-amber-900 dark:text-amber-200 font-semibold underline hover:text-amber-950 dark:hover:text-amber-100 transition-colors cursor-pointer"
            >
              Clear & Start Clean
            </button>
          </div>
        </div>
      )}

      {/* Confirmation modal for reset to clean account */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Start with a Clean Account?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              This will remove all sample transactions and reset your ledger so you can input your real expenses and income. You can always reload the sample data anytime.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetToCleanAccount(0, 300000);
                  setShowConfirmReset(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Confirm & Clean Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* App Title & Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none m-0">
                  Expense Tracker
                </h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Personal finance, budgets & AI insights
              </p>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <button
              onClick={() => setIsSmartEntryOpen(true)}
              className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs"
              title="Smart Entry"
            >
              <Wand2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs"
              aria-label="Add transaction"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Controls: Month Selector & Action Buttons */}
        <div className="flex items-center justify-between md:justify-end gap-2.5">
          <MonthPicker />

          <div className="hidden md:flex items-center gap-2">
            {!isSampleData && (
              <button
                onClick={loadSampleData}
                title="Load sample transactions to test features"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sample Data</span>
              </button>
            )}

            {/* Smart Natural Language Entry Button */}
            <button
              onClick={() => setIsSmartEntryOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all cursor-pointer"
              title="Type 'Spent ₹250 on lunch' or 'Earned $1200 freelance'"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Smart Entry</span>
            </button>

            {/* Add Transaction Button */}
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setDark(d => !d)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
