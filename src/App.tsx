import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, PiggyBank, TrendingDown, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Expense {
  id: string;
  description: string;
  amount: number; // stored in cents
  category: string;
}

const CATEGORIES = [
  'Food & Groceries',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Subscriptions',
  'Education',
  'Health',
  'Other',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Groceries': '#10b981',
  'Transportation':   '#3b82f6',
  'Shopping':         '#a855f7',
  'Entertainment':    '#ec4899',
  'Bills & Subscriptions': '#f59e0b',
  'Education':        '#06b6d4',
  'Health':           '#ef4444',
  'Other':            '#64748b',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (cents: number) => {
  const abs = Math.abs(cents) / 100;
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cents < 0 ? `-$${str}` : `$${str}`;
};

const toCents = (v: string) => Math.round(parseFloat(v.replace(/[^0-9.]/g, '') || '0') * 100);

// ─── Storage ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'expense_calc_v2';
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
function save(data: unknown) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const stored = load();

  const [startingMoneyCents, setStartingMoneyCents] = useState<number>(stored?.startingMoneyCents ?? 0);
  const [moneyInput, setMoneyInput] = useState<string>(stored ? (stored.startingMoneyCents / 100).toFixed(2) : '');
  const [expenses, setExpenses] = useState<Expense[]>(stored?.expenses ?? []);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [descError, setDescError] = useState('');
  const [amtError, setAmtError] = useState('');

  // Persist on change
  useEffect(() => {
    save({ startingMoneyCents, expenses });
  }, [startingMoneyCents, expenses]);

  // ── Calculations ─────────────────────────────────────────────────────────
  const totalSpentCents = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingCents = startingMoneyCents - totalSpentCents;
  const pctSpent = startingMoneyCents > 0 ? Math.min(100, (totalSpentCents / startingMoneyCents) * 100) : 0;
  const isOverBudget = remainingCents < 0;
  const isNearLimit = !isOverBudget && pctSpent >= 80;

  // Category breakdown
  const byCategory = CATEGORIES.map(cat => ({
    cat,
    cents: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.cents > 0).sort((a, b) => b.cents - a.cents);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSetMoney = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = toCents(moneyInput);
    if (!cents) { setMoneyInput(''); return; }
    setStartingMoneyCents(cents);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!desc.trim()) { setDescError('Please enter a description.'); valid = false; }
    const cents = toCents(amount);
    if (!cents || cents <= 0) { setAmtError('Please enter a valid amount greater than $0.'); valid = false; }
    if (!valid) return;

    setExpenses(prev => [
      { id: Date.now().toString(), description: desc.trim(), amount: cents, category },
      ...prev,
    ]);
    setDesc(''); setAmount(''); setDescError(''); setAmtError('');
  };

  const handleDelete = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));

  const handleReset = () => {
    if (window.confirm('Clear everything and start fresh?')) {
      setStartingMoneyCents(0);
      setMoneyInput('');
      setExpenses([]);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/30">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Expense Calculator</h1>
              <p className="text-xs text-slate-500">Enter your money → add expenses → see what's left</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            title="Reset everything"
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Step 1: Enter Your Money ── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
            Step 1 — How much money do you have?
          </h2>
          <form onSubmit={handleSetMoney} className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={moneyInput}
                onChange={e => setMoneyInput(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-emerald-600/20 whitespace-nowrap"
            >
              Set Amount
            </button>
          </form>
          {startingMoneyCents > 0 && (
            <p className="text-xs text-emerald-700 font-semibold mt-2 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
              ✓ Starting money set to {fmt(startingMoneyCents)}
            </p>
          )}
        </section>

        {/* ── Summary Cards (shown once money is set) ── */}
        {startingMoneyCents > 0 && (
          <section className="grid grid-cols-3 gap-3">
            {/* Starting Money */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 text-center">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
                <Wallet className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">You Have</div>
              <div className="text-lg font-black text-slate-900 mt-1">{fmt(startingMoneyCents)}</div>
            </div>

            {/* Total Spent */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 text-center">
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center mx-auto mb-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Spent</div>
              <div className="text-lg font-black text-rose-600 mt-1">{fmt(totalSpentCents)}</div>
            </div>

            {/* Remaining */}
            <div className={`rounded-2xl border shadow-xs p-4 text-center ${isOverBudget ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2 ${isOverBudget ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                <PiggyBank className={`w-4 h-4 ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`} />
              </div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Remaining</div>
              <div className={`text-lg font-black mt-1 ${isOverBudget ? 'text-rose-700' : 'text-emerald-700'}`}>
                {fmt(remainingCents)}
              </div>
            </div>
          </section>
        )}

        {/* ── Spending Bar & Status ── */}
        {startingMoneyCents > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            {isOverBudget ? (
              <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span><strong>Over budget!</strong> You've spent {fmt(Math.abs(remainingCents))} more than you have.</span>
              </div>
            ) : isNearLimit ? (
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span><strong>Heads up!</strong> You've spent {pctSpent.toFixed(0)}% of your money. Only {fmt(remainingCents)} left.</span>
              </div>
            ) : totalSpentCents > 0 ? (
              <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>You have <strong>{fmt(remainingCents)}</strong> remaining ({(100 - pctSpent).toFixed(0)}% of your money).</span>
              </div>
            ) : null}

            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
              <span>Spent: {fmt(totalSpentCents)} ({pctSpent.toFixed(0)}%)</span>
              <span>Remaining: {fmt(Math.max(0, remainingCents))}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, pctSpent)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>$0</span>
              <span>{fmt(startingMoneyCents)}</span>
            </div>
          </section>
        )}

        {/* ── Step 2: Add an Expense ── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
            Step 2 — Add an Expense
          </h2>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Description */}
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="What did you spend on? (e.g. Groceries, Rent)"
                  value={desc}
                  onChange={e => { setDesc(e.target.value); setDescError(''); }}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:bg-white transition-all ${descError ? 'border-rose-300 focus:ring-rose-500/20' : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'}`}
                />
                {descError && <p className="text-xs text-rose-600 mt-1">{descError}</p>}
              </div>

              {/* Amount */}
              <div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setAmtError(''); }}
                    className={`w-full pl-8 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:bg-white transition-all ${amtError ? 'border-rose-300 focus:ring-rose-500/20' : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'}`}
                  />
                </div>
                {amtError && <p className="text-xs text-rose-600 mt-1">{amtError}</p>}
              </div>

              {/* Category */}
              <div>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer appearance-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </form>
        </section>

        {/* ── Category Breakdown ── */}
        {byCategory.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              Spending by Category
            </h2>
            <div className="space-y-2.5">
              {byCategory.map(({ cat, cents }) => {
                const pct = totalSpentCents > 0 ? (cents / totalSpentCents) * 100 : 0;
                const color = CATEGORY_COLORS[cat] ?? '#64748b';
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>{cat}</span>
                      <span>{fmt(cents)} <span className="text-slate-400">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Expense List ── */}
        {expenses.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Expenses ({expenses.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {expenses.map(e => (
                <div key={e.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors group">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{e.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{e.category}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-sm font-bold text-rose-600">-{fmt(e.amount)}</span>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {expenses.length === 0 && startingMoneyCents > 0 && (
          <div className="text-center py-10 text-slate-400">
            <p className="text-sm font-medium">No expenses yet — add one above!</p>
          </div>
        )}

        <footer className="text-center text-xs text-slate-400 pb-4">
          Data saved in your browser · Private &amp; local
        </footer>
      </div>
    </div>
  );
}
