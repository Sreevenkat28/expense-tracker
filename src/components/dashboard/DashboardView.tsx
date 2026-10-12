import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  ArrowRight,
  Lightbulb,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { formatCurrency } from '../../utils/currency';
import { formatMonthName } from '../../utils/dates';
import { StatCard } from './StatCard';
import { BudgetProgressBar } from './BudgetProgressBar';
import { RecentTransactionsList } from './RecentTransactionsList';
import { StorageNotice } from '../common/StorageNotice';

export const DashboardView: React.FC = () => {
  const {
    monthSummary,
    selectedMonth,
    savingsSuggestions,
    setIsQuickAddOpen,
    setActiveTab,
  } = useExpense();

  const {
    endingBalanceCents,
    totalIncomeCents,
    totalExpensesCents,
    netSavingsCents,
    savingsRatePercent,
    averageDailySpendingCents,
  } = monthSummary;

  const topSuggestion = savingsSuggestions[0];

  return (
    <div className="space-y-6">
      <StorageNotice />

      {/* Month Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight m-0">
            {formatMonthName(selectedMonth)} Financial Summary
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time balance, net cash flow, and spending trajectory
          </p>
        </div>

        <button
          onClick={() => setIsQuickAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs shadow-emerald-600/20 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Quick Add Transaction</span>
        </button>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Remaining / Ending Account Balance */}
        <StatCard
          title="Account Balance"
          value={formatCurrency(endingBalanceCents)}
          subtitle="Cumulative ending balance"
          icon={Wallet}
          iconBgColor="bg-slate-100"
          iconTextColor="text-slate-800"
          badge={{
            text: endingBalanceCents >= 0 ? 'Healthy' : 'Overdrawn',
            variant: endingBalanceCents >= 0 ? 'neutral' : 'negative',
          }}
        />

        {/* Total Income */}
        <StatCard
          title="Total Income"
          value={formatCurrency(totalIncomeCents)}
          subtitle={`Earned in ${formatMonthName(selectedMonth)}`}
          icon={TrendingUp}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
          badge={{
            text: totalIncomeCents > 0 ? 'Deposited' : 'No Income',
            variant: totalIncomeCents > 0 ? 'positive' : 'neutral',
          }}
        />

        {/* Total Expenses */}
        <StatCard
          title="Total Expenses"
          value={formatCurrency(totalExpensesCents)}
          subtitle={`Spent in ${formatMonthName(selectedMonth)}`}
          icon={TrendingDown}
          iconBgColor="bg-rose-50"
          iconTextColor="text-rose-600"
          badge={{
            text: `${monthSummary.transactionCount} transactions`,
            variant: 'neutral',
          }}
        />

        {/* Net Savings & Savings Rate */}
        <StatCard
          title="Net Savings"
          value={formatCurrency(netSavingsCents, true)}
          subtitle={
            totalIncomeCents > 0
              ? `${savingsRatePercent.toFixed(1)}% savings rate`
              : 'Income required for rate'
          }
          icon={PiggyBank}
          iconBgColor={netSavingsCents >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}
          iconTextColor={netSavingsCents >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          badge={{
            text: netSavingsCents >= 0 ? 'Positive Flow' : 'Deficit',
            variant: netSavingsCents >= 0 ? 'positive' : 'negative',
          }}
        />
      </div>

      {/* Secondary Metrics & Quick Insights Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Average Daily Spending Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Daily Spending
            </span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {formatCurrency(averageDailySpendingCents)} / day
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Calculated across elapsed month days
            </p>
          </div>
        </div>

        {/* Actionable Savings Suggestion Snapshot Card */}
        <div className="md:col-span-2 bg-gradient-to-r from-emerald-50/60 to-slate-50 rounded-2xl p-5 border border-emerald-200/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 sm:mt-0 shadow-xs">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Top Savings Suggestion
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full font-medium">
                  Estimate
                </span>
              </div>
              <p className="text-xs font-medium text-slate-700 mt-1 max-w-xl">
                {topSuggestion ? topSuggestion.title : 'Consistent spending habit detected.'}
                {topSuggestion?.potentialSavingsCents && (
                  <span className="font-bold text-emerald-700 ml-1">
                    (Est. +{formatCurrency(topSuggestion.potentialSavingsCents)}/mo savings)
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('insights')}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 shrink-0 underline"
          >
            <span>Explore All Insights</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Dashboard Grid: Budget Progress & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-6">
          <BudgetProgressBar />
        </div>
        <div className="lg:col-span-6 space-y-6">
          <RecentTransactionsList />
        </div>
      </div>
    </div>
  );
};
