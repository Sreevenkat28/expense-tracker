import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { formatMonthName, getPreviousMonth, getNextMonth } from '../../utils/dates';

export const MonthPicker: React.FC = () => {
  const { selectedMonth, setSelectedMonth, allMonths } = useExpense();

  const handlePrev = () => {
    setSelectedMonth(getPreviousMonth(selectedMonth));
  };

  const handleNext = () => {
    setSelectedMonth(getNextMonth(selectedMonth));
  };

  return (
    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl p-1 shadow-xs transition-colors">
      <button
        onClick={handlePrev}
        aria-label="Previous month"
        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="relative flex items-center">
        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 absolute left-2 pointer-events-none" />
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="appearance-none pl-7 pr-6 py-1 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 bg-transparent rounded-lg focus:outline-hidden cursor-pointer"
        >
          {allMonths.map((m) => (
            <option key={m} value={m} className="dark:bg-slate-800 dark:text-slate-100">
              {formatMonthName(m)}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-1.5 text-slate-400 text-[10px]">▼</div>
      </div>

      <button
        onClick={handleNext}
        aria-label="Next month"
        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
