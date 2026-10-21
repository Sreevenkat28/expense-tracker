import React, { useState } from 'react';
import {
  PieChart,
  Settings,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { centsToDollars, isValidAmount } from '../../utils/currency';
import { formatMonthName } from '../../utils/dates';
import { CATEGORY_COLORS, EXPENSE_CATEGORIES } from '../../types';

export const BudgetView: React.FC = () => {
  const {
    monthSummary,
    budgetConfig,
    categorySpendings,
    selectedMonth,
    updateBudget,
    updateOpeningBalance,
    setCategoryBudget,
    deleteCategoryBudget,
    formatAmount,
  } = useExpense();
  const formatCurrency = formatAmount;

  const {
    budgetCents,
    totalExpensesCents,
    remainingBudgetCents,
    budgetUsagePercent,
  } = monthSummary;

  // Local state for editing overall monthly budget
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

  // Local state for adding/editing a category spending limit
  const [selectedCat, setSelectedCat] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [catLimitInput, setCatLimitInput] = useState<string>('300');
  const [catError, setCatError] = useState<string | null>(null);

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
    updateBudget(val.cents!, true);
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

  const handleSetCategoryLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = isValidAmount(catLimitInput);
    if (!val.valid) {
      setCatError(val.error || 'Invalid amount');
      return;
    }
    setCatError(null);
    setCategoryBudget(selectedCat, val.cents!);
    setCatLimitInput('');
  };

  const setPreset = (presetDollars: number) => {
    setBudgetInput(presetDollars.toFixed(2));
    setBudgetError(null);
  };

  const activeCategoryBudgets = budgetConfig.categoryBudgets || {};

  return (
    <div className="space-y-6">
      {/* Top Heading */}
      <div className="pb-1 border-b border-slate-200/60 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight m-0">
          Budget Planning & Spending Ceilings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure monthly overall spending limits and category-specific budget caps
        </p>
      </div>

      {/* Main Budget Health Status Card */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {formatMonthName(selectedMonth)} Overall Budget Utilization
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {budgetUsagePercent.toFixed(1)}%
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-2">
                ({formatCurrency(totalExpensesCents)} of {formatCurrency(budgetCents)})
              </span>
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border self-start sm:self-auto ${
              isExceeded
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : isNearLimit
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {isExceeded ? (
              <>
                <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Over Budget by {formatCurrency(Math.abs(remainingBudgetCents))}</span>
              </>
            ) : isNearLimit ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>80% Warning: {formatCurrency(remainingBudgetCents)} Left</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Pacing Well: {formatCurrency(remainingBudgetCents)} Remaining</span>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700">
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

          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>$0.00</span>
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              80% Warning: {formatCurrency(budgetCents * 0.8)}
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              100% Cap: {formatCurrency(budgetCents)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Category Spending Limits Section (Plan Feature) ───────────────── */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">
                Category Spending Limits
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Set dedicated limits for categories such as Food & Groceries, Travel, Shopping, etc.
            </p>
          </div>
        </div>

        {/* Set Category Limit Form */}
        <form onSubmit={handleSetCategoryLimit} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-1/3">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
            >
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-1/3">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Monthly Limit ($)
            </label>
            <input
              type="number"
              step="10"
              min="1"
              placeholder="e.g. 500"
              value={catLimitInput}
              onChange={(e) => setCatLimitInput(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div className="w-full sm:w-1/3 sm:self-end">
            <button
              type="submit"
              className="w-full py-2 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set Category Limit</span>
            </button>
          </div>
        </form>
        {catError && <p className="text-xs text-rose-600 dark:text-rose-400">{catError}</p>}

        {/* Category Budget Bars */}
        <div className="space-y-4 pt-2">
          {Object.keys(activeCategoryBudgets).length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">
              No category limits set yet. Use the form above to add a spending limit for any category!
            </p>
          ) : (
            Object.entries(activeCategoryBudgets).map(([catName, limitCents]) => {
              const spentItem = categorySpendings.find(c => c.category === catName);
              const spentCents = spentItem ? spentItem.amountCents : 0;
              const remaining = limitCents - spentCents;
              const pctUsed = limitCents > 0 ? (spentCents / limitCents) * 100 : 0;
              const isCatExceeded = remaining < 0;
              const catColor = CATEGORY_COLORS[catName]?.fill || '#3b82f6';

              return (
                <div key={catName} className="p-3.5 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: catColor }} />
                      <span className="font-bold text-slate-800 dark:text-white">{catName}</span>
                      {isCatExceeded && (
                        <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.2 rounded-full font-bold">
                          Exceeded
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">
                        {formatCurrency(spentCents)} of {formatCurrency(limitCents)}
                        <span className="text-slate-400 ml-1">({pctUsed.toFixed(0)}%)</span>
                      </span>
                      <button
                        onClick={() => deleteCategoryBudget(catName)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        title="Remove category limit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="h-2.5 w-full bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isCatExceeded ? 'bg-rose-500' : pctUsed >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, pctUsed)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      {isCatExceeded
                        ? `Over by ${formatCurrency(Math.abs(remaining))}`
                        : `${formatCurrency(remaining)} remaining`}
                    </span>
                    <span>{spentItem ? `${spentItem.count} transaction(s)` : '0 tx'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Configuration Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Set Overall Monthly Budget Card */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Monthly Spending Budget</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target overall cap for {formatMonthName(selectedMonth)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveBudget} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Overall Spending Cap ($)
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
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              {budgetError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{budgetError}</p>
              )}
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-2">
                {[1500, 2500, 3200, 4000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPreset(preset)}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    ${preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {budgetSavedToast && '✓ Budget updated successfully!'}
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Budget</span>
              </button>
            </div>
          </form>
        </div>

        {/* Set Starting / Opening Account Balance Card */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Opening Account Balance</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Baseline starting bank balance for ending balance calculation
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveOpening} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              {openingError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{openingError}</p>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Formula: Ending Account Balance = Opening Balance + All Deposits - All Withdrawals.
              Keeping this aligned with your bank statement ensures realistic net worth tracking.
            </p>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {openingSavedToast && '✓ Opening balance saved!'}
              </span>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Balance</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
