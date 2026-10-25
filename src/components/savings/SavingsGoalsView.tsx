import React, { useState } from 'react';
import {
  PiggyBank,
  Plus,
  Target,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  TrendingUp,
  DollarSign,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { centsToDollars, isValidAmount } from '../../utils/currency';
import { SavingsGoal } from '../../types';

export const SavingsGoalsView: React.FC = () => {
  const {
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    contributeToSavingsGoal,
    formatAmount,
    currencyInfo,
  } = useExpense();
  const formatCurrency = formatAmount;

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Contribution modal state
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [isDeposit, setIsDeposit] = useState(true);

  // Form state for creating/editing goal
  const [goalName, setGoalName] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [currentAmountStr, setCurrentAmountStr] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [goalCategory, setGoalCategory] = useState('General');
  const [goalColor, setGoalColor] = useState('#10b981');
  const [formError, setFormError] = useState<string | null>(null);

  const totalTargetCents = savingsGoals.reduce((sum, g) => sum + g.targetCents, 0);
  const totalSavedCents = savingsGoals.reduce((sum, g) => sum + g.currentCents, 0);
  const overallProgress = totalTargetCents > 0 ? (totalSavedCents / totalTargetCents) * 100 : 0;

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setGoalName('');
    setTargetAmountStr('');
    setCurrentAmountStr('0');
    setTargetDate('');
    setGoalCategory('General');
    setGoalColor('#10b981');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalName(goal.name);
    setTargetAmountStr((goal.targetCents / 100).toFixed(2));
    setCurrentAmountStr((goal.currentCents / 100).toFixed(2));
    setTargetDate(goal.targetDate || '');
    setGoalCategory(goal.category || 'General');
    setGoalColor(goal.color || '#10b981');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) {
      setFormError('Goal name is required');
      return;
    }

    const targetVal = isValidAmount(targetAmountStr);
    if (!targetVal.valid || targetVal.cents! <= 0) {
      setFormError('Please enter a valid target amount greater than zero');
      return;
    }

    const currentVal = isValidAmount(currentAmountStr || '0');
    const currentCents = currentVal.valid ? Math.max(0, currentVal.cents!) : 0;

    if (editingGoal) {
      updateSavingsGoal(editingGoal.id, {
        name: goalName.trim(),
        targetCents: targetVal.cents!,
        currentCents,
        targetDate: targetDate || undefined,
        category: goalCategory,
        color: goalColor,
      });
    } else {
      addSavingsGoal({
        name: goalName.trim(),
        targetCents: targetVal.cents!,
        currentCents,
        targetDate: targetDate || undefined,
        category: goalCategory,
        color: goalColor,
      });
    }

    setShowAddModal(false);
  };

  const handleContributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;
    const val = isValidAmount(contributeAmount);
    if (!val.valid || val.cents! <= 0) return;

    const delta = isDeposit ? val.cents! : -val.cents!;
    contributeToSavingsGoal(contributeGoal.id, delta);
    setContributeGoal(null);
    setContributeAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Top Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight m-0">
            Savings Goals & Targets
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Set ambitious financial targets, track pacing, and fund your milestones
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs shadow-emerald-600/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Savings Goal</span>
        </button>
      </div>

      {/* Aggregate Savings Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Saved */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Saved So Far
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalSavedCents)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Across {savingsGoals.length} active goal{savingsGoals.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Total Target */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Target Goal
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalTargetCents)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cumulative sum of all milestones
          </p>
        </div>

        {/* Aggregate Progress */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Overall Completion
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {overallProgress.toFixed(1)}%
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overallProgress)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Savings Goals Grid */}
      {savingsGoals.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-12 text-center border border-dashed border-slate-200 dark:border-slate-700">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <PiggyBank className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No Savings Goals Set Yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Create goals for an emergency fund, dream vacation, education, or holiday shopping.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savingsGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.currentCents / goal.targetCents) * 100));
            const remainingCents = Math.max(0, goal.targetCents - goal.currentCents);
            const isCompleted = goal.currentCents >= goal.targetCents;
            const accentColor = goal.color || '#10b981';

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-all space-y-4"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: accentColor }}
                      />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {goal.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(goal)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer"
                        title="Edit goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete goal "${goal.name}"?`)) {
                            deleteSavingsGoal(goal.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md cursor-pointer"
                        title="Delete goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {goal.category && (
                    <span className="inline-block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                      {goal.category}
                    </span>
                  )}

                  {/* Amounts */}
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {formatCurrency(goal.currentCents)}
                      </span>
                      <span className="text-xs text-slate-400 ml-1.5">
                        of {formatCurrency(goal.targetCents)}
                      </span>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${accentColor}18`,
                        color: accentColor,
                      }}
                    >
                      {pct}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: accentColor,
                      }}
                    />
                  </div>

                  {/* Meta / Remaining */}
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      {isCompleted ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Goal Achieved!
                        </span>
                      ) : (
                        `${formatCurrency(remainingCents)} left`
                      )}
                    </span>
                    {goal.targetDate && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Target: {goal.targetDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contribution Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setContributeGoal(goal);
                      setIsDeposit(true);
                      setContributeAmount('');
                    }}
                    className="flex-1 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition-colors cursor-pointer"
                  >
                    + Add Funds
                  </button>
                  <button
                    onClick={() => {
                      setContributeGoal(goal);
                      setIsDeposit(false);
                      setContributeAmount('');
                    }}
                    className="py-1.5 px-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal for Create / Edit Goal ─────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white m-0">
                {editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Goal Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund, Vacation in Italy"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Target Amount ({currencyInfo.symbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="5000"
                    value={targetAmountStr}
                    onChange={(e) => setTargetAmountStr(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Already Saved ({currencyInfo.symbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={currentAmountStr}
                    onChange={(e) => setCurrentAmountStr(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Travel, Safety"
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Color Theme
                </label>
                <div className="flex items-center gap-2">
                  {['#10b981', '#3b82f6', '#a855f7', '#ec4899', '#f59e0b', '#06b6d4', '#64748b'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setGoalColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        goalColor === c ? 'border-slate-900 dark:border-white scale-110 shadow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {formError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingGoal ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal for Quick Add Funds / Withdraw ─────────────────────────── */}
      {contributeGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {isDeposit ? 'Deposit Funds to Goal' : 'Withdraw from Goal'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {contributeGoal.name} (Current: {formatCurrency(contributeGoal.currentCents)})
            </p>

            <form onSubmit={handleContributeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Amount ({currencyInfo.symbol})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="e.g. 100"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setContributeGoal(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer ${
                    isDeposit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 dark:bg-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {isDeposit ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
