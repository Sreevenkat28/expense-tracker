import React, { useState } from 'react';
import { Plus, Wallet, Sparkles, RotateCcw, Download, Info } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { MonthPicker } from './MonthPicker';

export const Header: React.FC = () => {
  const {
    isSampleData,
    loadSampleData,
    resetToCleanAccount,
    setIsQuickAddOpen,
    transactions,
  } = useExpense();

  const [showConfirmReset, setShowConfirmReset] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      {/* Sample data banner if sample data is active */}
      {isSampleData && (
        <div className="bg-amber-50 border-b border-amber-200/70 px-4 py-1.5 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              Evaluation Mode: Displaying sample multi-month data. Not real financial information.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirmReset(true)}
              className="text-amber-900 font-semibold underline hover:text-amber-950 transition-colors"
            >
              Clear & Start Clean
            </button>
          </div>
        </div>
      )}

      {/* Confirmation modal for reset to clean account */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Start with a Clean Account?</h3>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              This will remove all sample transactions and reset your ledger so you can input your real expenses and income. You can always reload the sample data anytime.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetToCleanAccount(0, 300000);
                  setShowConfirmReset(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
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
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none m-0">
                  Monthly Expense Tracker
                </h1>
                <span className="text-[11px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Personal finance, budget pacing & savings insights
              </p>
            </div>
          </div>

          {/* Mobile Quick Add Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 transition-colors"
              aria-label="Add transaction"
            >
              <Plus className="w-5 h-5" />
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
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Load Sample Data</span>
              </button>
            )}

            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-xs shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
