import React from 'react';
import {
  TrendingUp,
  Calendar,
  Sparkles,
  Award,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { formatMonthName } from '../../utils/dates';
import { CategoryPieChart } from './CategoryPieChart';
import { MonthComparisonCard } from './MonthComparisonCard';
import { SavingsSuggestions } from './SavingsSuggestions';

export const InsightsView: React.FC = () => {
  const {
    monthSummary,
    categorySpendings,
    monthComparison,
    savingsSuggestions,
    patternSummaries,
    selectedMonth,
    formatAmount,
  } = useExpense();
  const formatCurrency = formatAmount;

  const topCategory = categorySpendings.find((c) => c.amountCents > 0);

  return (
    <div className="space-y-6">
      {/* Top Heading */}
      <div className="pb-1 border-b border-slate-200/60 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight m-0">
          Spending Insights & Analytics
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Deep-dive into expense patterns, category allocations, and month-over-month comparisons
        </p>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Highest Spending Category */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Highest Spending Category</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-2 truncate">
            {topCategory ? topCategory.category : 'None'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {topCategory
              ? `${formatCurrency(topCategory.amountCents)} (${topCategory.percentage.toFixed(1)}% of total)`
              : 'No expenses logged'}
          </p>
        </div>

        {/* Daily Spending Velocity */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Average Daily Spending</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-2">
            {formatCurrency(monthSummary.averageDailySpendingCents)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Across elapsed days in {formatMonthName(selectedMonth)}
          </p>
        </div>

        {/* Month-over-Month Delta */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Month-over-Month Shift</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-2">
            {monthComparison.expensePercentChange !== null
              ? `${monthComparison.expenseDiffCents > 0 ? '+' : ''}${monthComparison.expensePercentChange.toFixed(1)}%`
              : 'Baseline Month'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {monthComparison.previousExpensesCents > 0
              ? `${formatCurrency(Math.abs(monthComparison.expenseDiffCents))} ${monthComparison.expenseDiffCents >= 0 ? 'more' : 'less'} than last month`
              : 'No prior month to compare'}
          </p>
        </div>
      </div>

      {/* Spending Pattern Summaries (Transparent Natural Language) */}
      {patternSummaries.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Key Spending Observations</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {patternSummaries.map((summary, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold shrink-0">•</span>
                <span>{summary}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Charts Grid: Category Distribution & MoM Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Category Breakdown</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Proportion of expenses for {formatMonthName(selectedMonth)}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-xl">
              {formatCurrency(monthSummary.totalExpensesCents)} Total
            </span>
          </div>

          <CategoryPieChart
            categorySpendings={categorySpendings}
            totalExpensesCents={monthSummary.totalExpensesCents}
          />
        </div>

        <div className="lg:col-span-5">
          <MonthComparisonCard
            comparison={monthComparison}
            selectedMonth={selectedMonth}
          />
        </div>
      </div>

      {/* Savings Suggestions & Interactive Reduction Simulator */}
      <SavingsSuggestions
        suggestions={savingsSuggestions}
        categorySpendings={categorySpendings}
      />
    </div>
  );
};
