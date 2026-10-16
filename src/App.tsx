import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wallet, Plus, Trash2, PiggyBank, TrendingDown, TrendingUp,
  AlertTriangle, CheckCircle2, RotateCcw, Sun, Moon,
  BarChart3, PieChart, DollarSign, Calendar,
  Search, Download, Sparkles, Percent,
} from 'lucide-react';

// ─── Types & Constants ───────────────────────────────────────────────────────
interface Expense {
  id: string;
  description: string;
  amount: number; // stored in cents
  category: string;
  date: string; // YYYY-MM-DD
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
] as const;

type CategoryType = typeof CATEGORIES[number];

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Groceries':      '#10b981', // Emerald
  'Transportation':        '#3b82f6', // Blue
  'Shopping':              '#a855f7', // Purple
  'Entertainment':         '#ec4899', // Pink
  'Bills & Subscriptions': '#f59e0b', // Amber
  'Education':             '#06b6d4', // Cyan
  'Health':                '#ef4444', // Red
  'Other':                 '#64748b', // Slate
};

const CATEGORY_EMOJIS: Record<string, string> = {
  'Food & Groceries':      '🥗',
  'Transportation':        '🚗',
  'Shopping':              '🛍️',
  'Entertainment':         '🎬',
  'Bills & Subscriptions': '📱',
  'Education':             '📚',
  'Health':                '❤️',
  'Other':                 '📦',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (cents: number): string => {
  const abs = Math.abs(cents) / 100;
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return cents < 0 ? `-$${str}` : `$${str}`;
};

const toCents = (v: string): number =>
  Math.round(parseFloat(v.replace(/[^0-9.]/g, '') || '0') * 100);

const getTodayString = (): string => new Date().toISOString().split('T')[0];

const formatDateDisplay = (dateStr: string): string => {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

const getRelativeDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const SAMPLE_EXPENSES: Expense[] = [
  { id: 'sample-1', description: 'Whole Foods Market Groceries', amount: 8450, category: 'Food & Groceries', date: getTodayString() },
  { id: 'sample-2', description: 'Monthly Metro Transit Pass', amount: 4500, category: 'Transportation', date: getRelativeDaysAgo(1) },
  { id: 'sample-3', description: 'Electric & High-Speed Internet', amount: 11025, category: 'Bills & Subscriptions', date: getRelativeDaysAgo(2) },
  { id: 'sample-4', description: 'Weekend Cinema & Popcorn', amount: 3250, category: 'Entertainment', date: getRelativeDaysAgo(3) },
  { id: 'sample-5', description: 'Pharmacy Essentials & Vitamins', amount: 2480, category: 'Health', date: getRelativeDaysAgo(4) },
  { id: 'sample-6', description: 'Online Software Architecture Course', amount: 4999, category: 'Education', date: getRelativeDaysAgo(5) },
];

const STORAGE_KEY = 'expense_calc_v4';

function loadStoredData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function persistData(data: unknown) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── Donut Chart Component ────────────────────────────────────────────────────
interface DonutChartProps {
  data: { label: string; value: number; color: string; count: number }[];
  total: number;
  dark: boolean;
  hoveredCategory: string | null;
  onHoverCategory: (cat: string | null) => void;
}

function DonutChart({ data, total, dark, hoveredCategory, onHoverCategory }: DonutChartProps) {
  const size = 210;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const segments = useMemo(() => {
    return data.reduce<{
      items: Array<typeof data[number] & { dash: number; gap: number; offset: number; pct: number }>;
      offsetAcc: number;
    }>(
      (acc, d) => {
        const pct = total > 0 ? d.value / total : 0;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const offset = acc.offsetAcc;
        return {
          items: [...acc.items, { ...d, dash, gap, offset, pct }],
          offsetAcc: acc.offsetAcc + dash,
        };
      },
      { items: [], offsetAcc: 0 }
    ).items;
  }, [data, total, circumference]);

  const activeSegment = segments.find(s => s.label === hoveredCategory);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
          {/* Base track ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={dark ? '#1e293b' : '#f1f5f9'}
            strokeWidth={strokeWidth}
          />
          {segments.map((seg) => {
            const isHovered = hoveredCategory === seg.label;
            return (
              <circle
                key={seg.label}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={`${seg.dash} ${seg.gap}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                style={{
                  opacity: hoveredCategory && !isHovered ? 0.35 : 1,
                  filter: isHovered ? `drop-shadow(0 0 6px ${seg.color}88)` : undefined,
                }}
                onMouseEnter={() => onHoverCategory(seg.label)}
                onMouseLeave={() => onHoverCategory(null)}
              />
            );
          })}
        </svg>

        {/* Center Readout with dynamic labels */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-3 text-center">
          {activeSegment ? (
            <>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: `${activeSegment.color}22`, color: activeSegment.color }}>
                {CATEGORY_EMOJIS[activeSegment.label]} {activeSegment.label}
              </span>
              <span className="text-xl font-black mt-1" style={{ color: activeSegment.color }}>
                {fmt(activeSegment.value)}
              </span>
              <span className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                {(activeSegment.pct * 100).toFixed(1)}% of expenses
              </span>
            </>
          ) : (
            <>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Spent
              </span>
              <span className={`text-2xl font-black tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
                {fmt(total)}
              </span>
              <span className={`text-[11px] font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                {data.length} {data.length === 1 ? 'category' : 'categories'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Interactive Legend with Explicit Labels */}
      <div className="w-full mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {segments.map((seg) => {
          const isSelected = hoveredCategory === seg.label;
          return (
            <button
              key={seg.label}
              type="button"
              onMouseEnter={() => onHoverCategory(seg.label)}
              onMouseLeave={() => onHoverCategory(null)}
              className={`flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                isSelected
                  ? dark ? 'bg-slate-800/90 shadow-sm ring-1 ring-slate-600' : 'bg-slate-100 shadow-sm ring-1 ring-slate-300'
                  : dark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className={`text-xs font-semibold truncate ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
                  {CATEGORY_EMOJIS[seg.label]} {seg.label}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-xs font-bold tabular-nums block ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {fmt(seg.value)}
                </span>
                <span className={`text-[10px] font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {(seg.pct * 100).toFixed(1)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Category Comparison Bar Chart Component ──────────────────────────────────
interface BarChartProps {
  data: { label: string; value: number; color: string; count: number }[];
  total: number;
  dark: boolean;
  hoveredCategory: string | null;
  onHoverCategory: (cat: string | null) => void;
}

function CategoryBarChart({ data, total, dark, hoveredCategory, onHoverCategory }: BarChartProps) {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-4">
      {data.map(({ label, value, color, count }) => {
        const pctOfTotal = total > 0 ? (value / total) * 100 : 0;
        const relativeWidth = (value / maxVal) * 100;
        const isHovered = hoveredCategory === label;

        return (
          <div
            key={label}
            onMouseEnter={() => onHoverCategory(label)}
            onMouseLeave={() => onHoverCategory(null)}
            className={`p-2 rounded-xl transition-all ${
              isHovered
                ? dark ? 'bg-slate-800/80 shadow-xs' : 'bg-slate-50/90 shadow-xs'
                : ''
            }`}
          >
            {/* Category Label Row */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{CATEGORY_EMOJIS[label]}</span>
                <span className={`text-xs font-bold ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {label}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${dark ? 'bg-slate-700/60 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  {count} {count === 1 ? 'tx' : 'txs'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black tabular-nums ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {fmt(value)}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {pctOfTotal.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Visual Bar Track */}
            <div className={`h-3 rounded-full overflow-hidden ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${relativeWidth}%`,
                  backgroundColor: color,
                  boxShadow: isHovered ? `0 0 10px 1px ${color}88` : undefined,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Daily Spending Timeline Chart Component ──────────────────────────────────
interface TimelineChartProps {
  expenses: Expense[];
  dark: boolean;
}

function DailyTrendChart({ expenses, dark }: TimelineChartProps) {
  // Aggregate daily expenses
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.date, (map.get(e.date) || 0) + e.amount);
    }
    // Sort chronologically
    return Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses]);

  const [activeDate, setActiveDate] = useState<string | null>(null);

  if (dailyData.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          No transaction history to display trend graph.
        </p>
      </div>
    );
  }

  const maxDaily = Math.max(...dailyData.map(d => d.amount), 1);
  const totalSpend = dailyData.reduce((s, d) => s + d.amount, 0);
  const avgDaily = totalSpend / dailyData.length;

  const yTicks = [
    { label: fmt(maxDaily), value: maxDaily },
    { label: fmt(Math.round(maxDaily * 0.66)), value: maxDaily * 0.66 },
    { label: fmt(Math.round(maxDaily * 0.33)), value: maxDaily * 0.33 },
    { label: '$0.00', value: 0 },
  ];

  const activeEntry = dailyData.find(d => d.date === activeDate);

  return (
    <div className="space-y-4">
      {/* Top stat banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-dashed border-slate-700/40">
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className={`text-xs font-bold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
            Daily Spending Trajectory
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className={`font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Avg/Day: <strong className={dark ? 'text-slate-200' : 'text-slate-800'}>{fmt(Math.round(avgDaily))}</strong>
          </span>
          <span className={`font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            Peak Day: <strong className="text-emerald-500">{fmt(maxDaily)}</strong>
          </span>
        </div>
      </div>

      {/* Chart Canvas with Y Axis & Bars */}
      <div className="relative pt-4">
        {/* Active hover info badge */}
        {activeEntry && (
          <div className={`absolute top-0 right-2 z-10 px-3 py-1 rounded-lg text-xs font-bold border shadow-lg transition-all ${
            dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <span>{formatDateDisplay(activeEntry.date)}: </span>
            <span className="text-emerald-500 font-extrabold">{fmt(activeEntry.amount)}</span>
          </div>
        )}

        <div className="flex h-56 items-stretch gap-3">
          {/* Y Axis Labels */}
          <div className="flex flex-col justify-between items-end pr-2 text-[10px] font-bold tabular-nums text-slate-400 select-none pb-7">
            {yTicks.map((tick, i) => (
              <span key={i}>{tick.label}</span>
            ))}
          </div>

          {/* Graph area with grid lines and columns */}
          <div className="flex-1 relative flex items-end justify-around gap-2 pb-7">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7">
              <div className={`w-full border-b border-dashed ${dark ? 'border-slate-800' : 'border-slate-200'}`} />
              <div className={`w-full border-b border-dashed ${dark ? 'border-slate-800' : 'border-slate-200'}`} />
              <div className={`w-full border-b border-dashed ${dark ? 'border-slate-800' : 'border-slate-200'}`} />
              <div className={`w-full border-b ${dark ? 'border-slate-700' : 'border-slate-300'}`} />
            </div>

            {/* Average dotted reference line */}
            <div
              className="absolute left-0 right-0 border-t-2 border-dotted border-amber-400/70 pointer-events-none z-10"
              style={{ bottom: `calc(${(avgDaily / maxDaily) * 100}% * 0.8 + 28px)` }}
              title={`Average Daily: ${fmt(Math.round(avgDaily))}`}
            />

            {/* Columns */}
            {dailyData.map((d) => {
              const heightPct = Math.max(8, (d.amount / maxDaily) * 100);
              const isActive = activeDate === d.date;

              return (
                <div
                  key={d.date}
                  className="relative flex-1 flex flex-col items-center justify-end h-full group cursor-pointer z-10"
                  onMouseEnter={() => setActiveDate(d.date)}
                  onMouseLeave={() => setActiveDate(null)}
                >
                  {/* Top value tag on hover */}
                  <span className={`text-[10px] font-bold mb-1 transition-opacity tabular-nums ${
                    isActive ? 'opacity-100 text-emerald-500 font-black' : 'opacity-0 group-hover:opacity-100 text-slate-400'
                  }`}>
                    {fmt(d.amount)}
                  </span>

                  {/* Bar */}
                  <div
                    className="w-full max-w-[42px] rounded-t-xl transition-all duration-300 ease-out"
                    style={{
                      height: `${heightPct}%`,
                      background: isActive
                        ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
                        : dark
                        ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                        : 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
                      boxShadow: isActive ? '0 0 14px 2px rgba(16, 185, 129, 0.45)' : undefined,
                    }}
                  />

                  {/* X Axis Date Label */}
                  <span className={`absolute -bottom-6 text-[11px] font-bold truncate max-w-[55px] text-center transition-colors ${
                    isActive
                      ? 'text-emerald-500'
                      : dark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {formatDateDisplay(d.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Application Component ──────────────────────────────────────────────
export default function App() {
  const initial = loadStoredData();

  const [dark, setDark] = useState<boolean>(initial?.dark ?? false);
  const [budgetCents, setBudgetCents] = useState<number>(initial?.budgetCents ?? 0);
  const [budgetInput, setBudgetInput] = useState<string>(initial && initial.budgetCents ? (initial.budgetCents / 100).toFixed(2) : '');
  const [expenses, setExpenses] = useState<Expense[]>(initial?.expenses ?? []);

  // Form State
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryType>(CATEGORIES[0]);
  const [date, setDate] = useState<string>(getTodayString());
  const [descError, setDescError] = useState('');
  const [amtError, setAmtError] = useState('');

  // UI state
  const [chartView, setChartView] = useState<'breakdown' | 'trend'>('breakdown');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amt-desc' | 'amt-asc'>('date-desc');
  const [showBudgetModal, setShowBudgetModal] = useState(false);

  const descRef = useRef<HTMLInputElement>(null);

  // Apply dark mode to document element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Persist data
  useEffect(() => {
    persistData({ budgetCents, expenses, dark });
  }, [budgetCents, expenses, dark]);

  // Calculations
  const totalSpentCents = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const remainingCents = budgetCents - totalSpentCents;
  const pctSpent = budgetCents > 0 ? (totalSpentCents / budgetCents) * 100 : 0;
  const isOverBudget = remainingCents < 0;
  const isNearLimit = !isOverBudget && pctSpent >= 80;

  // Category breakdown calculation
  const categoryStats = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const catExpenses = expenses.filter(e => e.category === cat);
      const value = catExpenses.reduce((s, e) => s + e.amount, 0);
      return {
        label: cat,
        value,
        count: catExpenses.length,
        color: CATEGORY_COLORS[cat] ?? '#64748b',
      };
    })
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const topCategory = categoryStats[0] ?? null;

  // Filtered & sorted transactions
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        const matchesQuery = e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             e.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
        return matchesQuery && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
        if (sortBy === 'date-asc') return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
        if (sortBy === 'amt-desc') return b.amount - a.amount;
        if (sortBy === 'amt-asc') return a.amount - b.amount;
        return 0;
      });
  }, [expenses, searchQuery, filterCategory, sortBy]);

  // Handlers
  const handleSetBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = toCents(budgetInput);
    setBudgetCents(cents);
    setShowBudgetModal(false);
  };

  const handleAddBudgetQuick = (additionalDollars: number) => {
    const newTotal = budgetCents + additionalDollars * 100;
    setBudgetCents(newTotal);
    setBudgetInput((newTotal / 100).toFixed(2));
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!desc.trim()) {
      setDescError('Please provide a description.');
      valid = false;
    }
    const cents = toCents(amount);
    if (!cents || cents <= 0) {
      setAmtError('Amount must be greater than $0.00');
      valid = false;
    }
    if (!valid) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      description: desc.trim(),
      amount: cents,
      category,
      date: date || getTodayString(),
    };

    setExpenses(prev => [newExpense, ...prev]);
    setDesc('');
    setAmount('');
    setDescError('');
    setAmtError('');
    descRef.current?.focus();
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleLoadSampleData = () => {
    setBudgetCents(85000);
    setBudgetInput('850.00');
    setExpenses(SAMPLE_EXPENSES);
  };

  const handleResetAll = () => {
    if (window.confirm('Are you sure you want to clear all budget and expense data?')) {
      setBudgetCents(0);
      setBudgetInput('');
      setExpenses([]);
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) return;
    const headers = ['Date', 'Description', 'Category', 'Amount (USD)'];
    const rows = expenses.map(e => [
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      (e.amount / 100).toFixed(2),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `expenses_ledger_${getTodayString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preset quick adds
  const applyPreset = (presetDesc: string, presetAmt: string, presetCat: CategoryType) => {
    setDesc(presetDesc);
    setAmount(presetAmt);
    setCategory(presetCat);
  };

  // Aesthetic Tokens
  const pageBg = dark ? 'bg-[#090d16]' : 'bg-[#f8fafc]';
  const cardBg = dark ? 'bg-[#111827]' : 'bg-white';
  const cardBorder = dark ? 'border-slate-800' : 'border-slate-200';
  const headingColor = dark ? 'text-white' : 'text-slate-900';
  const subtextColor = dark ? 'text-slate-400' : 'text-slate-500';
  const inputStyles = dark
    ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20';

  return (
    <div className={`min-h-screen ${pageBg} font-sans transition-colors duration-300 pb-16`}>

      {/* ── Top Navigation Bar ── */}
      <header className={`sticky top-0 z-30 ${cardBg} border-b ${cardBorder} backdrop-blur-md transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-lg font-black tracking-tight ${headingColor}`}>Expense Tracker</h1>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  dark ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  Pro Dashboard
                </span>
              </div>
              <p className={`text-xs font-medium ${subtextColor}`}>Financial intelligence & spending analytics</p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2.5">
            {/* Sample data button if needed */}
            {expenses.length === 0 && (
              <button
                id="load-sample-btn"
                type="button"
                onClick={handleLoadSampleData}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  dark
                    ? 'border-emerald-800 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Demo Data
              </button>
            )}

            {/* Dark / Light Toggle */}
            <button
              id="theme-toggle"
              type="button"
              onClick={() => setDark(d => !d)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                dark
                  ? 'bg-slate-800 border-slate-700 text-yellow-300 hover:bg-slate-700 shadow-inner'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
              }`}
              title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
              <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {/* Reset Button */}
            <button
              id="reset-btn"
              type="button"
              onClick={handleResetAll}
              className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                dark
                  ? 'border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 hover:border-rose-800'
                  : 'border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
              }`}
              title="Reset all data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* ── Top Executive KPI Metrics Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* KPI 1: Total Budget */}
          <div className={`${cardBg} rounded-2xl border ${cardBorder} p-5 shadow-xs relative overflow-hidden transition-all duration-200`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${subtextColor}`}>Total Budget</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-black tracking-tight ${headingColor}`}>
              {budgetCents > 0 ? fmt(budgetCents) : '$0.00'}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowBudgetModal(true)}
                className={`font-bold hover:underline ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}
              >
                {budgetCents > 0 ? 'Modify Budget' : '+ Set Initial Budget'}
              </button>
              <span className={`text-[11px] ${subtextColor}`}>Allocated</span>
            </div>
          </div>

          {/* KPI 2: Total Spent */}
          <div className={`${cardBg} rounded-2xl border ${cardBorder} p-5 shadow-xs relative overflow-hidden transition-all duration-200`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${subtextColor}`}>Total Expenses</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? 'bg-rose-950/60 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-black tracking-tight ${dark ? 'text-rose-400' : 'text-rose-600'}`}>
              {fmt(totalSpentCents)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className={`font-semibold ${subtextColor}`}>
                {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
              </span>
              <span className={`font-bold ${isOverBudget ? 'text-rose-500' : dark ? 'text-slate-300' : 'text-slate-600'}`}>
                {budgetCents > 0 ? `${pctSpent.toFixed(0)}% used` : 'Uncapped'}
              </span>
            </div>
          </div>

          {/* KPI 3: Remaining Balance */}
          <div className={`rounded-2xl border p-5 shadow-xs relative overflow-hidden transition-all duration-200 ${
            isOverBudget
              ? dark ? 'bg-rose-950/30 border-rose-800/60' : 'bg-rose-50/70 border-rose-200'
              : dark ? 'bg-emerald-950/30 border-emerald-800/60' : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${subtextColor}`}>Remaining Balance</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isOverBudget
                  ? dark ? 'bg-rose-900/60 text-rose-400' : 'bg-rose-100 text-rose-600'
                  : dark ? 'bg-emerald-900/60 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-black tracking-tight ${
              isOverBudget
                ? dark ? 'text-rose-400' : 'text-rose-600'
                : dark ? 'text-emerald-400' : 'text-emerald-700'
            }`}>
              {fmt(remainingCents)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                isOverBudget
                  ? 'bg-rose-500 text-white'
                  : isNearLimit
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-500 text-white'
              }`}>
                {isOverBudget ? 'Deficit' : isNearLimit ? 'Caution' : 'Healthy'}
              </span>
              <span className={`font-semibold ${subtextColor}`}>
                {budgetCents > 0 ? `${Math.max(0, 100 - pctSpent).toFixed(0)}% available` : '—'}
              </span>
            </div>
          </div>

          {/* KPI 4: Top Category */}
          <div className={`${cardBg} rounded-2xl border ${cardBorder} p-5 shadow-xs relative overflow-hidden transition-all duration-200`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${subtextColor}`}>Top Category</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? 'bg-indigo-950/60 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-xl font-black tracking-tight truncate ${headingColor}`}>
              {topCategory ? `${CATEGORY_EMOJIS[topCategory.label]} ${topCategory.label}` : 'None'}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className={`font-bold tabular-nums ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                {topCategory ? fmt(topCategory.value) : '$0.00'}
              </span>
              <span className={`text-[11px] ${subtextColor}`}>
                {topCategory && totalSpentCents > 0
                  ? `${((topCategory.value / totalSpentCents) * 100).toFixed(0)}% of total`
                  : 'No spending'}
              </span>
            </div>
          </div>

        </div>

        {/* ── Budget Health & Utilization Meter with Explicit Milestone Labels ── */}
        {budgetCents > 0 && (
          <div className={`${cardBg} rounded-2xl border ${cardBorder} p-5 shadow-xs transition-all duration-300`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Percent className={`w-4 h-4 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <h3 className={`text-sm font-bold ${headingColor}`}>Budget Utilization Gauge</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-medium ${subtextColor}`}>
                  Used: <strong className={headingColor}>{fmt(totalSpentCents)}</strong> of {fmt(budgetCents)}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-bold tabular-nums ${
                  isOverBudget
                    ? 'bg-rose-500 text-white'
                    : isNearLimit
                    ? 'bg-amber-500 text-white'
                    : dark ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {pctSpent.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Gauge progress bar */}
            <div className={`h-3.5 rounded-full overflow-hidden relative ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, pctSpent)}%`,
                  background: isOverBudget
                    ? 'linear-gradient(90deg, #f43f5e, #dc2626)'
                    : isNearLimit
                    ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                    : 'linear-gradient(90deg, #10b981, #059669)',
                  boxShadow: isOverBudget
                    ? '0 0 12px rgba(244, 63, 94, 0.5)'
                    : isNearLimit
                    ? '0 0 12px rgba(245, 158, 11, 0.5)'
                    : '0 0 12px rgba(16, 185, 129, 0.4)',
                }}
              />
            </div>

            {/* Milestone Tick Labels */}
            <div className="flex justify-between items-center text-[11px] font-bold mt-2 select-none">
              <span className={subtextColor}>0% ($0)</span>
              <span className={`hidden sm:inline ${subtextColor}`}>25% ({fmt(budgetCents * 0.25)})</span>
              <span className={`hidden sm:inline ${subtextColor}`}>50% ({fmt(budgetCents * 0.50)})</span>
              <span className={`hidden sm:inline ${subtextColor}`}>75% ({fmt(budgetCents * 0.75)})</span>
              <span className={isOverBudget ? 'text-rose-500 font-extrabold' : subtextColor}>
                100% ({fmt(budgetCents)})
              </span>
            </div>

            {/* Over-budget alert */}
            {isOverBudget && (
              <div className={`mt-3 flex items-center gap-2 p-3 rounded-xl text-xs font-semibold ${
                dark ? 'bg-rose-950/60 border border-rose-800 text-rose-300' : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>You have exceeded your assigned budget by <strong>{fmt(Math.abs(remainingCents))}</strong>.</span>
              </div>
            )}
          </div>
        )}

        {/* ── Dual Workspace: Record Expense + Visual Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left Column (5 cols): Budget Allocation & Expense Entry */}
          <div className="lg:col-span-5 space-y-6">

            {/* Budget Management Card */}
            <div className={`${cardBg} rounded-2xl border ${cardBorder} p-5 shadow-xs transition-colors duration-300`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className={`w-4 h-4 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <h2 className={`text-sm font-bold ${headingColor}`}>Monthly Budget Setup</h2>
                </div>
                {budgetCents > 0 && (
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${dark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </span>
                )}
              </div>

              <form onSubmit={handleSetBudget} className="flex gap-2">
                <div className="relative flex-1">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold ${subtextColor}`}>$</span>
                  <input
                    id="budget-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter total budget (e.g. 1000.00)"
                    value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)}
                    className={`w-full pl-8 pr-4 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 transition-all ${inputStyles}`}
                  />
                </div>
                <button
                  id="set-budget-btn"
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 whitespace-nowrap cursor-pointer"
                >
                  Save Budget
                </button>
              </form>

              {/* Quick adjustment pills */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-700/20 text-xs">
                <span className={`text-[11px] font-medium mr-1 ${subtextColor}`}>Quick Add:</span>
                {[50, 100, 250, 500].map(addAmt => (
                  <button
                    key={addAmt}
                    type="button"
                    onClick={() => handleAddBudgetQuick(addAmt)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                      dark
                        ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-emerald-400'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
                    }`}
                  >
                    +${addAmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Record New Expense Form */}
            <div className={`${cardBg} rounded-2xl border ${cardBorder} p-5 shadow-xs transition-colors duration-300`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Plus className={`w-4 h-4 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <h2 className={`text-sm font-bold ${headingColor}`}>Record Expense</h2>
                </div>
                <span className={`text-[11px] font-medium ${subtextColor}`}>Instant update</span>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-3.5">
                {/* Description input */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Description
                  </label>
                  <input
                    id="expense-desc"
                    ref={descRef}
                    type="text"
                    placeholder="e.g. Trader Joe's Groceries, Electric Bill..."
                    value={desc}
                    onChange={e => { setDesc(e.target.value); setDescError(''); }}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all ${inputStyles} ${
                      descError ? 'border-rose-500' : ''
                    }`}
                  />
                  {descError && <p className="text-xs text-rose-500 font-semibold mt-1">{descError}</p>}
                </div>

                {/* Amount and Date row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Amount ($)
                    </label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm ${subtextColor}`}>$</span>
                      <input
                        id="expense-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={e => { setAmount(e.target.value); setAmtError(''); }}
                        className={`w-full pl-7 pr-3 py-2.5 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 transition-all ${inputStyles} ${
                          amtError ? 'border-rose-500' : ''
                        }`}
                      />
                    </div>
                    {amtError && <p className="text-xs text-rose-500 font-semibold mt-1">{amtError}</p>}
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Date
                    </label>
                    <input
                      id="expense-date"
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 transition-all ${inputStyles}`}
                    />
                  </div>
                </div>

                {/* Category selector */}
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Category
                  </label>
                  <select
                    id="expense-category"
                    value={category}
                    onChange={e => setCategory(e.target.value as CategoryType)}
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 cursor-pointer transition-all ${inputStyles}`}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {CATEGORY_EMOJIS[c]} {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Expense Presets */}
                <div>
                  <span className={`text-[11px] font-bold block mb-1.5 ${subtextColor}`}>Quick Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset('Morning Coffee & Pastry', '6.50', 'Food & Groceries')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        dark ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ☕ $6.50 Coffee
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('Lunch Special', '16.00', 'Food & Groceries')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        dark ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      🥗 $16 Lunch
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('Weekly Groceries', '45.00', 'Food & Groceries')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        dark ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      🛒 $45 Groceries
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('Gas Station Fuel', '40.00', 'Transportation')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        dark ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ⛽ $40 Fuel
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  id="add-expense-btn"
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add to Expense Ledger
                </button>
              </form>
            </div>

          </div>

          {/* Right Column (7 cols): Data Charts, Graphs & Visualizations */}
          <div className="lg:col-span-7 space-y-6">

            {/* Visual Charts Container */}
            <div className={`${cardBg} rounded-2xl border ${cardBorder} p-5 shadow-xs transition-colors duration-300`}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-700/20">
                <div>
                  <h2 className={`text-base font-bold ${headingColor}`}>Financial Charts & Visualizations</h2>
                  <p className={`text-xs ${subtextColor}`}>Comprehensive distribution & trends with exact labels</p>
                </div>

                {/* View Switcher Tabs */}
                <div className={`flex gap-1 p-1 rounded-xl ${dark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-100'}`}>
                  <button
                    id="tab-breakdown"
                    type="button"
                    onClick={() => setChartView('breakdown')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      chartView === 'breakdown'
                        ? dark ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                        : dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <PieChart className="w-3.5 h-3.5" />
                    Category Share
                  </button>
                  <button
                    id="tab-trend"
                    type="button"
                    onClick={() => setChartView('trend')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      chartView === 'trend'
                        ? dark ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                        : dark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Timeline Trends
                  </button>
                </div>
              </div>

              {/* Chart Content Area */}
              {categoryStats.length > 0 ? (
                <div>
                  {chartView === 'breakdown' ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      {/* Donut Chart */}
                      <div className="md:col-span-6 flex justify-center py-2">
                        <DonutChart
                          data={categoryStats}
                          total={totalSpentCents}
                          dark={dark}
                          hoveredCategory={hoveredCategory}
                          onHoverCategory={setHoveredCategory}
                        />
                      </div>

                      {/* Bar Breakdown */}
                      <div className="md:col-span-6 pt-2">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-bold uppercase tracking-wider ${subtextColor}`}>
                            Category Ranking
                          </span>
                          <span className={`text-[10px] font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Sorted by amount
                          </span>
                        </div>
                        <CategoryBarChart
                          data={categoryStats}
                          total={totalSpentCents}
                          dark={dark}
                          hoveredCategory={hoveredCategory}
                          onHoverCategory={setHoveredCategory}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <DailyTrendChart expenses={expenses} dark={dark} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-xl">
                    📊
                  </div>
                  <h3 className={`text-sm font-bold ${headingColor}`}>No Expenses Recorded Yet</h3>
                  <p className={`text-xs max-w-sm mx-auto ${subtextColor}`}>
                    Add your first expense or click "Load Demo Data" above to see interactive donut charts, category comparisons, and daily trends.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Populate Demo Dashboard
                  </button>
                </div>
              )}
            </div>

            {/* ── Transaction History Ledger ── */}
            <div className={`${cardBg} rounded-2xl border ${cardBorder} shadow-xs overflow-hidden transition-colors duration-300`}>
              {/* Header with Title and CSV Export */}
              <div className={`p-4 border-b ${cardBorder} flex flex-wrap items-center justify-between gap-3`}>
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-bold ${headingColor}`}>Transaction Ledger</h3>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    dark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {filteredExpenses.length} of {expenses.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {expenses.length > 0 && (
                    <button
                      id="export-csv-btn"
                      type="button"
                      onClick={handleExportCSV}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                        dark
                          ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Download as CSV spreadsheet"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                  )}
                </div>
              </div>

              {/* Filter and Search Bar */}
              {expenses.length > 0 && (
                <div className={`p-3 border-b ${cardBorder} grid grid-cols-1 sm:grid-cols-3 gap-2.5 ${dark ? 'bg-slate-900/40' : 'bg-slate-50/60'}`}>
                  {/* Search input */}
                  <div className="relative">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${subtextColor}`} />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className={`w-full pl-8 pr-3 py-1.5 border rounded-xl text-xs font-medium focus:outline-none transition-all ${inputStyles}`}
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="relative">
                    <select
                      value={filterCategory}
                      onChange={e => setFilterCategory(e.target.value)}
                      className={`w-full px-3 py-1.5 border rounded-xl text-xs font-semibold focus:outline-none transition-all cursor-pointer ${inputStyles}`}
                    >
                      <option value="All">All Categories</option>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>
                          {CATEGORY_EMOJIS[c]} {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort selector */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className={`w-full px-3 py-1.5 border rounded-xl text-xs font-semibold focus:outline-none transition-all cursor-pointer ${inputStyles}`}
                    >
                      <option value="date-desc">Newest First</option>
                      <option value="date-asc">Oldest First</option>
                      <option value="amt-desc">Highest Amount</option>
                      <option value="amt-asc">Lowest Amount</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Transactions List */}
              {filteredExpenses.length > 0 ? (
                <div className={`divide-y ${dark ? 'divide-slate-800' : 'divide-slate-100'} max-h-96 overflow-y-auto`}>
                  {filteredExpenses.map((e) => {
                    const color = CATEGORY_COLORS[e.category] ?? '#64748b';
                    return (
                      <div
                        key={e.id}
                        className={`p-3.5 flex items-center justify-between group transition-colors ${
                          dark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            {CATEGORY_EMOJIS[e.category] ?? '📦'}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-bold truncate ${headingColor}`}>
                              {e.description}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="text-[11px] font-semibold"
                                style={{ color }}
                              >
                                {e.category}
                              </span>
                              <span className={`text-[11px] font-medium ${subtextColor}`}>
                                · {formatDateDisplay(e.date)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span className={`text-sm font-black tabular-nums ${dark ? 'text-rose-400' : 'text-rose-600'}`}>
                            -{fmt(e.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(e.id)}
                            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                              dark ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-950/60' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="Delete transaction"
                            aria-label={`Delete ${e.description}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className={`text-xs font-semibold ${subtextColor}`}>
                    {expenses.length === 0 ? 'No expenses recorded yet.' : 'No transactions match your search filter.'}
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ── Footer ── */}
        <footer className={`pt-6 text-center text-xs font-medium border-t ${dark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
          Personal Expense Tracker · 100% Client-Side Privacy · Data Stored Locally
        </footer>
      </main>

      {/* ── Modify Budget Modal ── */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`${cardBg} rounded-2xl border ${cardBorder} p-6 max-w-md w-full shadow-2xl space-y-4`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-bold ${headingColor}`}>Adjust Monthly Budget</h3>
              <button
                type="button"
                onClick={() => setShowBudgetModal(false)}
                className={`text-xs font-bold px-2 py-1 rounded-lg ${dark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                ✕
              </button>
            </div>
            <p className={`text-xs ${subtextColor}`}>
              Set your target spending budget. This is used to compute remaining funds, chart ratios, and safety gauges.
            </p>
            <form onSubmit={handleSetBudget} className="space-y-4">
              <div className="relative">
                <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 font-bold ${subtextColor}`}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus
                  placeholder="0.00"
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  className={`w-full pl-8 pr-4 py-2.5 border rounded-xl text-base font-bold focus:outline-none focus:ring-2 transition-all ${inputStyles}`}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${dark ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
