import React from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2, ArrowRight } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency } from '../../utils/currency';

export const BudgetProgressBar: React.FC = () => {
  const { monthSummary, setActiveTab } = useExpense();

  const {
    budgetCents,
    totalExpensesCents,
    remainingBudgetCents,
    budgetUsagePercent,
  } = monthSummary;

  const isExceeded = budgetUsagePercent >= 100;
  const isNearLimit = budgetUsagePercent >= 80 && !isExceeded;
  const isHealthy = budgetUsagePercent < 80;

  // Clamped percentage for the progress bar width (max 100% visually)
  const barWidth = Math.min(100, Math.max(0, budgetUsagePercent));

  let statusBadge = {
    label: 'On Track',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  };
  let barColor = 'bg-emerald-500';

  if (isExceeded) {
    statusBadge = {
      label: 'Budget Exceeded',
      classes: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: AlertOctagon,
    };
    barColor = 'bg-rose-500';
  } else if (isNearLimit) {
    statusBadge = {
      label: 'Approaching Limit',
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertTriangle,
    };
    barColor = 'bg-amber-500';
  }

  const StatusIcon = statusBadge.icon;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 m-0">Monthly Budget Progress</h3>
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.classes}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {statusBadge.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracking your monthly spending cap of {formatCurrency(budgetCents)}
          </p>
        </div>

        <button
          onClick={() => setActiveTab('budget')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors self-start sm:self-auto"
        >
          <span>Adjust Budget</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Exceeded Warning Banner */}
      {isExceeded && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Attention:</span> You have exceeded your monthly budget by{' '}
            <span className="font-bold underline">{formatCurrency(Math.abs(remainingBudgetCents))}</span>.
            Review discretionary expenses to balance your accounts.
          </div>
        </div>
      )}

      {/* 80% Warning Banner */}
      {isNearLimit && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Notice:</span> You have used {budgetUsagePercent.toFixed(1)}% of your monthly budget.
            Only <span className="font-bold">{formatCurrency(remainingBudgetCents)}</span> remains for this month.
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span>Spent: {formatCurrency(totalExpensesCents)}</span>
          <span>{budgetUsagePercent.toFixed(1)}% of budget</span>
        </div>

        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
          <span>Target Budget: {formatCurrency(budgetCents)}</span>
          <span className={`font-semibold ${isExceeded ? 'text-rose-600' : 'text-slate-700'}`}>
            {isExceeded ? 'Over by ' : 'Remaining: '}
            {formatCurrency(Math.abs(remainingBudgetCents))}
          </span>
        </div>
      </div>
    </div>
  );
};
