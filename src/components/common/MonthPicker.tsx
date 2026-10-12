import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { formatMonthName, getPreviousMonth, getNextMonth } from '../../utils/dates';

export const MonthPicker: React.FC = () => {
  const { selectedMonth, setSelectedMonth, transactions } = useExpense();

  // Extract unique available months from transactions or default list
  const availableMonths = React.useMemo(() => {
    const set = new Set<string>();
    set.add('2026-08');
    set.add('2026-09');
    set.add('2026-10');
    set.add('2026-11');
    set.add('2026-12');
    for (const t of transactions) {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    }
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const handlePrev = () => {
    setSelectedMonth(getPreviousMonth(selectedMonth));
  };

  const handleNext = () => {
    setSelectedMonth(getNextMonth(selectedMonth));
  };

  return (
    <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-xl p-1 shadow-xs">
      <button
        onClick={handlePrev}
        aria-label="Previous month"
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="relative flex items-center">
        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="appearance-none pl-8 pr-7 py-1.5 text-sm font-semibold text-slate-800 bg-transparent rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
        >
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {formatMonthName(m)}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2 text-slate-400 text-xs">▼</div>
      </div>

      <button
        onClick={handleNext}
        aria-label="Next month"
        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
