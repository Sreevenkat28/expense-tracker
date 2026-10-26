import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Target,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  CATEGORY_COLORS,
  Category,
  TransactionType,
} from '../../types';
import { formatDateFull, getTodayDateString, getDaysInMonth } from '../../utils/dates';
import { isValidAmount } from '../../utils/currency';
import { BalanceWarning } from '../common/BalanceWarning';
import type { BalanceCheck } from '../../utils/balance';

function shiftDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Daily Log: pick a single day, jot down that day's expenses as they happen,
 * and see the day's running total. Shares data with every other view.
 */
export const DailyLogView: React.FC = () => {
  const {
    transactions,
    selectedDate,
    setSelectedDate,
    addTransaction,
    deleteTransaction,
    setEditingTransaction,
    formatAmount,
    currencyInfo,
    monthSummary,
    setActiveTab,
    activeDay,
    checkBalance,
  } = useExpense();

  const today = getTodayDateString();
  // Follows the header calendar. With no day picked yet: today if the calendar is on this month,
  // otherwise the 1st of the month shown in the calendar
  const day = activeDay;
  const goToDay = (iso: string) => setSelectedDate(iso);

  // Make the header calendar show the same day this page is showing
  useEffect(() => {
    if (!selectedDate) setSelectedDate(day);
  }, [selectedDate, day, setSelectedDate]);

  // Quick entry form; category and type stay selected between entries for fast logging
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Food and groceries');
  const [error, setError] = useState<string | null>(null);
  const [balanceWarn, setBalanceWarn] = useState<BalanceCheck | null>(null);

  const dayTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.date === day)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [transactions, day]
  );

  const totals = useMemo(() => {
    let spent = 0;
    let earned = 0;
    const byCategory: Record<string, number> = {};
    for (const t of dayTransactions) {
      if (t.type === 'expense') {
        spent += t.amountCents;
        byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amountCents;
      } else {
        earned += t.amountCents;
      }
    }
    const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    return { spent, earned, categories };
  }, [dayTransactions]);

  // Spending for the 7 days ending on the chosen day
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => shiftDay(day, i - 6));
    const spentByDay = new Map<string, number>(days.map((d) => [d, 0]));
    for (const t of transactions) {
      if (t.type === 'expense' && spentByDay.has(t.date)) {
        spentByDay.set(t.date, spentByDay.get(t.date)! + t.amountCents);
      }
    }
    const max = Math.max(1, ...spentByDay.values());
    return days.map((d) => ({ date: d, cents: spentByDay.get(d)!, pct: (spentByDay.get(d)! / max) * 100 }));
  }, [transactions, day]);

  // Suggested daily limit = budget left for the month (before this day) spread over the days left
  const dailyAllowance = useMemo(() => {
    if (monthSummary.budgetCents <= 0) return null;
    const monthPrefix = day.substring(0, 7);
    const spentBeforeDay = transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(monthPrefix) && t.date < day)
      .reduce((s, t) => s + t.amountCents, 0);
    const daysLeft = getDaysInMonth(monthPrefix) - Number(day.substring(8, 10)) + 1;
    return Math.max(0, Math.floor((monthSummary.budgetCents - spentBeforeDay) / daysLeft));
  }, [monthSummary.budgetCents, transactions, day]);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleTypeChange = (next: TransactionType) => {
    setBalanceWarn(null);
    setType(next);
    setCategory(next === 'expense' ? 'Food and groceries' : 'Salary');
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const check = isValidAmount(amount);
    if (!check.valid || !check.cents) {
      setError(check.error ?? 'Enter a valid amount');
      return;
    }
    // Spending more than you have: warn first, and add it only if the user presses the button again
    if (type === 'expense' && !balanceWarn) {
      const balance = checkBalance(check.cents);
      if (balance.insufficient) {
        setBalanceWarn(balance);
        return;
      }
    }
    addTransaction({
      type,
      amountCents: check.cents,
      description: description.trim() || category,
      category,
      date: day,
    });
    setAmount('');
    setDescription('');
    setError(null);
    setBalanceWarn(null);
  };

  const inputCls =
    'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500';
  const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5';
  const overAllowance = dailyAllowance !== null && totals.spent > dailyAllowance;

  return (
    <div className="space-y-6">
      {/* Header + day navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight m-0 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-600" />
            Daily Log
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Note down expenses as they happen and track your total for the day
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => goToDay(shiftDay(day, -1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={day}
            onChange={(e) => e.target.value && goToDay(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
            aria-label="Choose day"
          />
          <button
            onClick={() => goToDay(shiftDay(day, 1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedDate(null);
              setActiveTab('dashboard');
            }}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Go back to the monthly dashboard"
          >
            Whole month
          </button>
          {day !== today && (
            <button
              onClick={() => goToDay(today)}
              className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 cursor-pointer"
            >
              Today
            </button>
          )}
        </div>
      </div>

      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 m-0 -mt-2">
        {formatDateFull(day)}
        {day === today && <span className="ml-2 text-[10px] uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">Today</span>}
      </p>

      {/* Day summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={card}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Spent this day</div>
          <div className="text-[clamp(0.85rem,3.8vw,1.5rem)] whitespace-nowrap font-black text-rose-600 dark:text-rose-400 mt-1">{formatAmount(totals.spent)}</div>
        </div>
        <div className={card}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Earned this day</div>
          <div className="text-[clamp(0.85rem,3.8vw,1.5rem)] whitespace-nowrap font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatAmount(totals.earned)}</div>
        </div>
        <div className={card}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Entries this day</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{dayTransactions.length}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{monthSummary.transactionCount} in the month</div>
        </div>
        <div className={card}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Target className="w-3 h-3" /> Daily allowance
          </div>
          {dailyAllowance === null ? (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">Set a monthly budget in Budgets to see a daily limit</div>
          ) : (
            <>
              <div className={`text-[clamp(0.85rem,3.8vw,1.5rem)] whitespace-nowrap font-black mt-1 ${overAllowance ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {formatAmount(dailyAllowance)}
              </div>
              <div className={`text-[11px] font-semibold ${overAllowance ? 'text-rose-600' : 'text-emerald-600'}`}>
                {overAllowance
                  ? `${formatAmount(totals.spent - dailyAllowance)} over`
                  : `${formatAmount(dailyAllowance - totals.spent)} left`}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Quick entry + entries list */}
        <div className="lg:col-span-3 space-y-4 min-w-0">
          <form onSubmit={handleAdd} className={`${card} space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">Add to this day</h3>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg capitalize cursor-pointer ${
                      type === t
                        ? `bg-white dark:bg-slate-700 shadow-xs ${t === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-3 relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-sm font-bold text-slate-400 pointer-events-none">
                  {currencyInfo.symbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setBalanceWarn(null);
                    if (error) setError(null);
                  }}
                  className={`${inputCls} pl-8`}
                  aria-label="Amount"
                  autoFocus
                />
              </div>
              <input
                type="text"
                placeholder="What was it? (e.g. Tea, Auto fare)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputCls} sm:col-span-5`}
                aria-label="Description"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className={`${inputCls} sm:col-span-4 cursor-pointer`}
                aria-label="Category"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {balanceWarn && type === 'expense' && <BalanceWarning check={balanceWarn} />}

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 m-0">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{balanceWarn ? 'Add anyway' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}</span>
            </button>
          </form>

          <div className={card}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 mb-3">Entries for this day</h3>
            {dayTransactions.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0 py-6 text-center">
                Nothing recorded for this day yet. Add your first entry above.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dayTransactions.map((tx) => {
                  const style = CATEGORY_COLORS[tx.category] ?? CATEGORY_COLORS['Other'];
                  return (
                    <div key={tx.id} className="flex items-center gap-2 sm:gap-3 py-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60'}`}>
                        {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white break-words">{tx.description}</div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>{tx.category}</span>
                      </div>
                      <div className={`text-sm font-black shrink-0 text-right ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amountCents)}
                      </div>
                      <button onClick={() => setEditingTransaction(tx)} className="p-2 sm:p-1.5 shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer" aria-label="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteTransaction(tx.id)} className="p-2 sm:p-1.5 shrink-0 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer" aria-label="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Side: category split + last 7 days */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className={card}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 mb-3">Where the money went</h3>
            {totals.categories.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0">No expenses this day.</p>
            ) : (
              <div className="space-y-2.5">
                {totals.categories.map(([cat, cents]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      <span>{cat}</span>
                      <span>{formatAmount(cents)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(cents / totals.spent) * 100}%`, backgroundColor: CATEGORY_COLORS[cat]?.fill ?? '#64748b' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={card}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 mb-3">Last 7 days</h3>
            <div className="flex items-end justify-between gap-1.5 h-28">
              {week.map((w) => {
                const isDay = w.date === day;
                return (
                  <button
                    key={w.date}
                    onClick={() => goToDay(w.date)}
                    className="flex-1 flex flex-col items-center justify-end gap-1 h-full cursor-pointer group"
                    title={`${formatDateFull(w.date)}: ${formatAmount(w.cents)}`}
                  >
                    <div
                      className={`w-full rounded-md transition-colors ${isDay ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-emerald-300 dark:group-hover:bg-emerald-800'}`}
                      style={{ height: `${Math.max(w.pct, 4)}%` }}
                    />
                    <span className={`text-[10px] font-bold ${isDay ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
                      {new Date(`${w.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 mb-0">
              7-day total: <strong>{formatAmount(week.reduce((s, w) => s + w.cents, 0))}</strong>. Tap a bar to open that day.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
