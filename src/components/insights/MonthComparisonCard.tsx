import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { MonthComparison } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatMonthShort, getPreviousMonth } from '../../utils/dates';

interface MonthComparisonCardProps {
  comparison: MonthComparison;
  selectedMonth: string;
}

export const MonthComparisonCard: React.FC<MonthComparisonCardProps> = ({
  comparison,
  selectedMonth,
}) => {
  const prevMonth = getPreviousMonth(selectedMonth);

  const {
    currentExpensesCents,
    previousExpensesCents,
    expenseDiffCents,
    expensePercentChange,
    categoryChanges,
  } = comparison;

  const hasPreviousData = previousExpensesCents > 0 || comparison.previousIncomeCents > 0;

  if (!hasPreviousData) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 m-0">Month-over-Month Comparison</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Comparing {formatMonthShort(selectedMonth)} against {formatMonthShort(prevMonth)}
        </p>
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200">
          <p className="text-xs font-semibold text-slate-700">No data found for {formatMonthShort(prevMonth)}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Historical comparisons will appear once transactions are logged across multiple months.
          </p>
        </div>
      </div>
    );
  }

  const isMoreExpensive = expenseDiffCents > 0;
  const isIdentical = expenseDiffCents === 0;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 m-0">Month-over-Month Comparison</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatMonthShort(selectedMonth)} vs {formatMonthShort(prevMonth)}
          </p>
        </div>

        {/* Change Pill */}
        <div
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
            isMoreExpensive
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : isIdentical
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {isMoreExpensive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : isIdentical ? (
            <Minus className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>
            {expensePercentChange !== null
              ? `${Math.abs(expensePercentChange).toFixed(1)}% ${
                  isMoreExpensive ? 'increase' : 'decrease'
                }`
              : 'New Baseline'}
          </span>
        </div>
      </div>

      {/* Aggregate Comparison Cards */}
      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            {formatMonthShort(prevMonth)} Spend
          </span>
          <div className="text-base font-bold text-slate-800 mt-0.5">
            {formatCurrency(previousExpensesCents)}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            {formatMonthShort(selectedMonth)} Spend
          </span>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(currentExpensesCents)}
          </div>
        </div>
      </div>

      {/* Category-by-Category Shift Breakdown */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Category Shifts
        </h4>

        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
          {categoryChanges.map((change) => {
            const increased = change.diffCents > 0;
            const flat = change.diffCents === 0;

            return (
              <div
                key={change.category}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-800">{change.category}</span>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {formatCurrency(change.previousCents)} → {formatCurrency(change.currentCents)}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-bold inline-flex items-center gap-0.5 ${
                      increased
                        ? 'text-rose-600'
                        : flat
                        ? 'text-slate-500'
                        : 'text-emerald-600'
                    }`}
                  >
                    {increased ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : flat ? (
                      <Minus className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    <span>{formatCurrency(Math.abs(change.diffCents))}</span>
                  </div>
                  {change.percentChange !== null && (
                    <div className="text-[10px] text-slate-400">
                      {change.percentChange > 0 ? '+' : ''}
                      {change.percentChange.toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
