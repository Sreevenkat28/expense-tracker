import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  Plus,
  ArrowRight,
  PieChart as PieIcon,
  Calendar,
  Sparkles,
  Wand2,
  Share2,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { formatMonthName } from '../../utils/dates';
import { StatCard } from './StatCard';
import { RecentTransactionsList } from './RecentTransactionsList';
import { StorageNotice } from '../common/StorageNotice';

export const DashboardView: React.FC = () => {
  const {
    monthSummary,
    categorySpendings,
    transactions,
    selectedMonth,
    budgetConfig,
    isSampleData,
    setIsQuickAddOpen,
    setIsSmartEntryOpen,
    setIsShareReportOpen,
    setActiveTab,
    dark,
    formatAmount,
  } = useExpense();
  const formatCurrency = formatAmount;

  const {
    totalIncomeCents,
    totalExpensesCents,
    netSavingsCents,
    remainingBudgetCents,
    budgetCents,
    budgetUsagePercent,
  } = monthSummary;

  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Month's expenses for trend chart
  const monthExpenses = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense');
  }, [transactions, selectedMonth]);

  // Aggregate daily expenses for the monthly spending trend chart
  const dailySpending = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthExpenses) {
      map.set(e.date, (map.get(e.date) || 0) + e.amountCents);
    }
    return Array.from(map.entries())
      .map(([date, amountCents]) => ({ date, amountCents }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [monthExpenses]);

  const maxDailyCents = Math.max(...dailySpending.map(d => d.amountCents), 1);
  const avgDailyCents = monthSummary.averageDailySpendingCents;

  // Donut chart calculations
  const nonZeroCategories = useMemo(() => {
    return categorySpendings.filter(c => c.amountCents > 0);
  }, [categorySpendings]);

  const donutSize = 190;
  const strokeWidth = 26;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offsetAcc = 0;
  const donutSegments = nonZeroCategories.map(cat => {
    const pct = totalExpensesCents > 0 ? cat.amountCents / totalExpensesCents : 0;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const offset = offsetAcc;
    offsetAcc += dash;

    // Palette fallback
    const colors: Record<string, string> = {
      'Food and groceries': '#10b981',
      'Transportation': '#3b82f6',
      'Shopping': '#a855f7',
      'Entertainment': '#ec4899',
      'Bills and subscriptions': '#f59e0b',
      'Education': '#06b6d4',
      'Other': '#64748b',
    };
    const color = colors[cat.category] || '#64748b';

    return {
      category: cat.category,
      amountCents: cat.amountCents,
      percentage: pct * 100,
      count: cat.count,
      dash,
      gap,
      offset,
      color,
    };
  });

  const activeDonutSeg = donutSegments.find(s => s.category === hoveredCategory);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight m-0">
              {formatMonthName(selectedMonth)} Dashboard
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time summary of money in, money out, and budget health
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShareReportOpen(true)}
            title="Share a detailed report of this month on WhatsApp, Gmail or as a PDF"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share report</span>
          </button>
          <button
            onClick={() => setIsSmartEntryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-xl transition-all border border-indigo-200 dark:border-indigo-800 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Smart Entry</span>
          </button>
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* ── Section 4: Exactly 4 Summary Cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Income */}
        <StatCard
          title="Total Income"
          value={formatCurrency(totalIncomeCents)}
          subtitle={`All deposits in ${formatMonthName(selectedMonth)}`}
          icon={TrendingUp}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
          iconTextColor="text-emerald-600 dark:text-emerald-400"
          badge={{
            text: totalIncomeCents > 0 ? 'Deposited' : 'No Income',
            variant: totalIncomeCents > 0 ? 'positive' : 'neutral',
          }}
        />

        {/* Card 2: Total Expenses */}
        <StatCard
          title="Total Expenses"
          value={formatCurrency(totalExpensesCents)}
          subtitle={`All spending in ${formatMonthName(selectedMonth)}`}
          icon={TrendingDown}
          iconBgColor="bg-rose-50 dark:bg-rose-950/60"
          iconTextColor="text-rose-600 dark:text-rose-400"
          badge={{
            text: `${monthExpenses.length} expense entr${monthExpenses.length === 1 ? 'y' : 'ies'}`,
            variant: monthExpenses.length > 0 ? 'warning' : 'neutral',
          }}
        />

        {/* Card 3: Net Amount (Income minus Expenses) */}
        <StatCard
          title="Net Amount"
          value={`${netSavingsCents >= 0 ? '+' : ''}${formatCurrency(netSavingsCents)}`}
          subtitle="Income minus expenses"
          icon={Scale}
          iconBgColor={netSavingsCents >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/60' : 'bg-rose-50 dark:bg-rose-950/60'}
          iconTextColor={netSavingsCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
          badge={{
            text: netSavingsCents >= 0 ? 'Surplus' : 'Deficit',
            variant: netSavingsCents >= 0 ? 'positive' : 'negative',
          }}
        />

        {/* Card 4: Budget Remaining */}
        <StatCard
          title="Budget Remaining"
          value={budgetCents > 0 ? formatCurrency(remainingBudgetCents) : 'No Budget Set'}
          subtitle={
            budgetCents > 0
              ? `${budgetUsagePercent.toFixed(0)}% of ${formatCurrency(budgetCents)} spent`
              : 'Configure in Budgets tab'
          }
          icon={Wallet}
          iconBgColor={
            budgetCents === 0
              ? 'bg-slate-100 dark:bg-slate-800'
              : remainingBudgetCents < 0
              ? 'bg-rose-50 dark:bg-rose-950/60'
              : budgetUsagePercent >= 80
              ? 'bg-amber-50 dark:bg-amber-950/60'
              : 'bg-emerald-50 dark:bg-emerald-950/60'
          }
          iconTextColor={
            budgetCents === 0
              ? 'text-slate-600 dark:text-slate-400'
              : remainingBudgetCents < 0
              ? 'text-rose-600 dark:text-rose-400'
              : budgetUsagePercent >= 80
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }
          badge={{
            text:
              budgetCents === 0
                ? 'Unset'
                : remainingBudgetCents < 0
                ? 'Over Budget'
                : budgetUsagePercent >= 80
                ? 'Warning'
                : 'Healthy',
            variant:
              budgetCents === 0
                ? 'neutral'
                : remainingBudgetCents < 0
                ? 'negative'
                : budgetUsagePercent >= 80
                ? 'warning'
                : 'positive',
          }}
        />
      </div>

      {/* ── Below Cards: Monthly Spending Chart & Category Breakdown ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly / Daily Spending Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">
                  Monthly Spending Trajectory
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Daily expense timeline and spending distribution
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Avg / Day</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatCurrency(avgDailyCents)}
              </span>
            </div>
          </div>

          {dailySpending.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
              No expenses recorded for this month to display trend graph.
            </div>
          ) : (
            <div className="pt-2">
              <div className="flex items-end gap-1.5 h-44 border-b border-slate-200 dark:border-slate-700 pb-2">
                {dailySpending.map((item, idx) => {
                  const heightPct = Math.max(10, Math.round((item.amountCents / maxDailyCents) * 100));
                  const dayNum = item.date.split('-')[2];
                  return (
                    <div
                      key={item.date}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    >
                      {/* Tooltip on hover */}
                      <div className={`absolute -top-8 ${idx > dailySpending.length / 2 ? 'right-0' : 'left-0'} bg-slate-900 text-white text-[10px] font-bold py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-md`}>
                        {item.date}: {formatCurrency(item.amountCents)}
                      </div>
                      <div
                        className="w-full bg-emerald-500/80 group-hover:bg-emerald-500 dark:bg-emerald-600/80 dark:group-hover:bg-emerald-500 rounded-t-md transition-all"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-[9px] text-slate-400 mt-1 select-none">
                        {dayNum}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 font-medium">
                <span>Day 1</span>
                <span>Peak: {formatCurrency(maxDailyCents)}</span>
                <span>Day 31</span>
              </div>
            </div>
          )}
        </div>

        {/* Category Breakdown Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800/90 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">
                  Spending by Category
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Proportional category breakdown
              </p>
            </div>
            <button
              onClick={() => setActiveTab('insights')}
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Insights</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {nonZeroCategories.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
              No categorized expenses logged yet.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Donut graphic */}
              <div className="relative" style={{ width: donutSize, height: donutSize }}>
                <svg width={donutSize} height={donutSize} className="transform -rotate-90">
                  <circle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={radius}
                    fill="none"
                    stroke={dark ? '#334155' : '#f1f5f9'}
                    strokeWidth={strokeWidth}
                  />
                  {donutSegments.map(seg => {
                    const isHovered = hoveredCategory === seg.category;
                    return (
                      <circle
                        key={seg.category}
                        cx={donutSize / 2}
                        cy={donutSize / 2}
                        r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                        strokeDasharray={`${seg.dash} ${seg.gap}`}
                        strokeDashoffset={-seg.offset}
                        strokeLinecap="round"
                        className="transition-all duration-300 cursor-pointer"
                        style={{ opacity: hoveredCategory && !isHovered ? 0.35 : 1 }}
                        onMouseEnter={() => setHoveredCategory(seg.category)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      />
                    );
                  })}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                  {activeDonutSeg ? (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-tight max-w-[120px] break-words">
                        {activeDonutSeg.category}
                      </span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {formatCurrency(activeDonutSeg.amountCents)}
                      </span>
                      <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                        {activeDonutSeg.percentage.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Total Spent
                      </span>
                      <span className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        {formatCurrency(totalExpensesCents)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {nonZeroCategories.length} {nonZeroCategories.length === 1 ? 'category' : 'categories'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Category pills list */}
              <div className="w-full mt-4 space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {donutSegments.map(seg => (
                  <div
                    key={seg.category}
                    onMouseEnter={() => setHoveredCategory(seg.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="font-medium text-slate-700 dark:text-slate-300 break-words">
                        {seg.category}
                      </span>
                    </div>
                    <div className="text-right shrink-0 font-bold text-slate-900 dark:text-white pl-2">
                      {formatCurrency(seg.amountCents)}{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        ({seg.percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Below Charts: Recent Transactions List ─────────────────────────── */}
      <RecentTransactionsList />
    </div>
  );
};
