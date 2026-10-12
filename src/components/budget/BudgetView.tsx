import React, { useState } from 'react';
import {
  PieChart,
  Settings,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  DollarSign,
  Save,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency, dollarsToCents, centsToDollars, isValidAmount } from '../../utils/currency';
import { formatMonthName } from '../../utils/dates';
import { CATEGORY_COLORS } from '../../types';

export const BudgetView: React.FC = () => {
  const {
    monthSummary,
    budgetConfig,
    categorySpendings,
    selectedMonth,
    updateBudget,
    updateOpeningBalance,
    resetToCleanAccount,
  } = useExpense();

  const {
    budgetCents,
    totalExpensesCents,
    remainingBudgetCents,
    budgetUsagePercent,
  } = monthSummary;

  // Local state for editing budget
  const [budgetInput, setBudgetInput] = useState<string>(() =>
    (centsToDollars(budgetCents)).toFixed(2)
  );
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>(() =>
    (centsToDollars(budgetConfig.openingBalanceCents)).toFixed(2)
  );
  const [budgetSavedToast, setBudgetSavedToast] = useState(false);
  const [openingSavedToast, setOpeningSavedToast] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [openingError, setOpeningError] = useState<string | null>(null);

  const isExceeded = budgetUsagePercent >= 100;
  const isNearLimit = budgetUsagePercent >= 80 && !isExceeded;

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = isValidAmount(budgetInput);
    if (!val.valid) {
      setBudgetError(val.error || 'Invalid amount');
      return;
    }
    setBudgetError(null);
    updateBudget(val.cents!, true); // Save for current selected month
    setBudgetSavedToast(true);
    setTimeout(() => setBudgetSavedToast(false), 2500);
  };

  const handleSaveOpening = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = openingBalanceInput.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    if (isNaN(num)) {
      setOpeningError('Please enter a valid numeric starting balance');
      return;
    }
    setOpeningError(null);
    const cents = Math.round(num * 100);
    updateOpeningBalance(cents);
    setOpeningSavedToast(true);
    setTimeout(() => setOpeningSavedToast(false), 2500);
  };

  const setPreset = (presetDollars: number) => {
    setBudgetInput(presetDollars.toFixed(2));
    setBudgetError(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Heading */}
      <div className="pb-1 border-b border-slate-200/60">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight m-0">
          Monthly Budget Management
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure spending ceilings, monitor utilization warnings, and set baseline balances
        </p>
      </div>

      {/* Main Budget Health Status Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {formatMonthName(selectedMonth)} Budget Utilization
            </span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {budgetUsagePercent.toFixed(1)}%
              <span className="text-sm font-semibold text-slate-500 ml-2">
                ({formatCurrency(totalExpensesCents)} of {formatCurrency(budgetCents)})
              </span>
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border self-start sm:self-auto ${
              isExceeded
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : isNearLimit
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isExceeded ? (
              <>
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>Over Budget by {formatCurrency(Math.abs(remainingBudgetCents))}</span>
              </>
            ) : isNearLimit ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>80% Warning: {formatCurrency(remainingBudgetCents)} Left</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pacing Well: {formatCurrency(remainingBudgetCents)} Remaining</span>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isExceeded
                  ? 'bg-rose-500'
                  : isNearLimit
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, budgetUsagePercent))}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-500">
            <span>$0.00</span>
            <span className="font-semibold text-amber-700">80% Threshold: {formatCurrency(budgetCents * 0.8)}</span>
            <span className="font-bold text-slate-800">100% Cap: {formatCurrency(budgetCents)}</span>
          </div>
        </div>

        {/* Detailed Status Guidance */}
        {isExceeded && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-900 mb-0.5">Budget Exceeded Alert</h4>
              <p className="leading-relaxed">
                Your expenses have surpassed your planned limit for {formatMonthName(selectedMonth)} by{' '}
                <span className="font-bold">{formatCurrency(Math.abs(remainingBudgetCents))}</span>.
                Any additional spending will reduce your cumulative account balance and savings rate.
              </p>
            </div>
          </div>
        )}

        {isNearLimit && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 mb-0.5">80% Budget Warning</h4>
              <p className="leading-relaxed">
                You have reached {budgetUsagePercent.toFixed(1)}% of your budget. You have{' '}
                <span className="font-bold">{formatCurrency(remainingBudgetCents)}</span> remaining.
                Review non-essential categories to avoid exceeding your monthly allocation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Set Monthly Budget Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Set Monthly Budget</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target spending cap for {formatMonthName(selectedMonth)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveBudget} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Monthly Spending Cap ($)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  $
                </div>
                <input
                  type="number"
                  step="10"
                  min="1"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              {budgetError && (
                <p className="text-xs text-rose-600 mt-1">{budgetError}</p>
              )}
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-2">
                {[1500, 2500, 3200, 4000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPreset(preset)}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                  >
                    ${preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-emerald-600 font-medium">
                {budgetSavedToast && '✓ Budget updated successfully!'}
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Budget</span>
              </button>
            </div>
          </form>
        </div>

        {/* Set Starting / Opening Account Balance Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Opening Account Balance</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Baseline starting bank balance for ending balance calculation
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveOpening} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Starting Bank Balance ($)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  $
                </div>
                <input
                  type="number"
                  step="50"
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              {openingError && (
                <p className="text-xs text-rose-600 mt-1">{openingError}</p>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Formula: Ending Account Balance = Opening Balance + All Deposits - All Withdrawals.
              Keeping this aligned with your actual bank statement ensures realistic net worth tracking.
            </p>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-emerald-600 font-medium">
                {openingSavedToast && '✓ Opening balance saved!'}
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Balance</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Spendings relative to Budget */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 m-0">Category Breakdown vs Total Budget</h3>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          How each category's spending consumes your overall {formatCurrency(budgetCents)} budget
        </p>

        <div className="space-y-3">
          {categorySpendings.map((cat) => {
            const pctOfBudget = budgetCents > 0 ? (cat.amountCents / budgetCents) * 100 : 0;
            const catColor = CATEGORY_COLORS[cat.category]?.fill || '#64748b';

            return (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{cat.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{formatCurrency(cat.amountCents)}</span>
                    <span className="text-slate-400 text-[11px] font-medium w-12 text-right">
                      {pctOfBudget.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, pctOfBudget)}%`,
                      backgroundColor: catColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
