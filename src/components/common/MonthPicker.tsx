import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import {
  formatMonthName,
  formatDate,
  getPreviousMonth,
  getNextMonth,
  MONTH_NAMES,
  MONTH_SHORT_NAMES,
  getCalendarGridDays,
  getTodayDateString,
  getCurrentYearMonth,
} from '../../utils/dates';

export const MonthPicker: React.FC = () => {
  const {
    selectedMonth,
    setSelectedMonth,
    selectedDate,
    setSelectedDate,
    transactions,
    activeTab,
    setActiveTab,
  } = useExpense();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // The popover is drawn on <body> so the scrollable header strip can never clip it.
  // Position it under the calendar button, kept fully on screen (also on phones).
  const updatePopoverPos = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setPopoverPos({ top: rect.bottom + 8, left, width });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePopoverPos();
    window.addEventListener('resize', updatePopoverPos);
    window.addEventListener('scroll', updatePopoverPos, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPos);
      window.removeEventListener('scroll', updatePopoverPos, true);
    };
  }, [isOpen]);

  // Close calendar popover on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const insideButton = containerRef.current?.contains(target);
      const insidePopover = popoverRef.current?.contains(target);
      if (!insideButton && !insidePopover) setIsOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const [yearStr, monthStr] = selectedMonth.split('-');
  const currentYearNum = parseInt(yearStr, 10) || new Date().getFullYear();
  const currentMonthNum = parseInt(monthStr, 10) || new Date().getMonth() + 1;

  // Year options: 2020 up to five years ahead of today
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = 2020; y <= new Date().getFullYear() + 5; y++) {
      list.push(y);
    }
    if (!list.includes(currentYearNum)) {
      list.push(currentYearNum);
      list.sort((a, b) => a - b);
    }
    return list;
  }, [currentYearNum]);

  // Set of dates that have transactions in this month
  const datesWithTransactions = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.date.startsWith(selectedMonth)) {
        set.add(t.date);
      }
    }
    return set;
  }, [transactions, selectedMonth]);

  const handlePrevMonth = () => {
    setSelectedMonth(getPreviousMonth(selectedMonth));
  };

  const handleNextMonth = () => {
    setSelectedMonth(getNextMonth(selectedMonth));
  };

  const handleYearChange = (year: number) => {
    const paddedMonth = String(currentMonthNum).padStart(2, '0');
    setSelectedMonth(`${year}-${paddedMonth}`);
  };

  const handleMonthChange = (monthIdx1Based: number) => {
    const paddedMonth = String(monthIdx1Based).padStart(2, '0');
    setSelectedMonth(`${currentYearNum}-${paddedMonth}`);
  };

  const handleSelectDay = (dayNum: number) => {
    const paddedMonth = String(currentMonthNum).padStart(2, '0');
    const paddedDay = String(dayNum).padStart(2, '0');
    const dateStr = `${currentYearNum}-${paddedMonth}-${paddedDay}`;
    setSelectedDate(dateStr);
    setActiveTab('daily'); // open that day so expenses can be noted down for it
    setIsOpen(false);
  };

  // Leaving day mode: the Daily Log has no meaning without a day, so return to the monthly view
  const leaveDayMode = () => {
    setSelectedDate(null);
    if (activeTab === 'daily') setActiveTab('dashboard');
  };

  const handleClearDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    leaveDayMode();
  };

  const handleJumpToToday = () => {
    const today = getTodayDateString();
    setSelectedDate(today);
    setSelectedMonth(getCurrentYearMonth());
    setActiveTab('daily');
    setIsOpen(false);
  };

  const handleViewWholeMonth = () => {
    leaveDayMode();
    setIsOpen(false);
  };

  // Calendar grid
  const calendarDays = useMemo(() => {
    return getCalendarGridDays(selectedMonth);
  }, [selectedMonth]);

  const todayStr = getTodayDateString();

  return (
    <div className="relative" ref={containerRef}>
      {/* ── Main Dock Bar Date Controls ─────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-1 shadow-xs transition-colors">
        {/* Previous Month Arrow */}
        <button
          onClick={handlePrevMonth}
          aria-label="Previous month"
          title="Previous Month"
          className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Month Selector Dropdown */}
        <select
          value={currentMonthNum}
          onChange={(e) => handleMonthChange(Number(e.target.value))}
          aria-label="Select month"
          className="bg-transparent font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 py-1 px-1.5 focus:outline-hidden cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/40 rounded-lg transition-colors"
        >
          {MONTH_NAMES.map((name, idx) => (
            <option key={name} value={idx + 1} className="dark:bg-slate-800 dark:text-white">
              {name}
            </option>
          ))}
        </select>

        {/* Year Selector Dropdown */}
        <select
          value={currentYearNum}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          aria-label="Select year"
          className="bg-transparent font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 py-1 px-1.5 focus:outline-hidden cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-700/40 rounded-lg transition-colors"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y} className="dark:bg-slate-800 dark:text-white">
              {y}
            </option>
          ))}
        </select>

        {/* Next Month Arrow */}
        <button
          onClick={handleNextMonth}
          aria-label="Next month"
          title="Next Month"
          className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Calendar Day Picker Toggle Button */}
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedDate
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title="Open interactive calendar to choose day, month, or year"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {selectedDate ? formatDate(selectedDate) : 'Calendar'}
          </span>
          {selectedDate && (
            <span
              onClick={handleClearDay}
              className="ml-0.5 p-0.5 hover:bg-emerald-600 rounded-full cursor-pointer"
              title="Back to whole month view"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </div>

      {/* ── Interactive Calendar Popover Dropdown ───────────────────────── */}
      {isOpen && popoverPos && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Choose a day"
          style={{
            position: 'fixed',
            top: popoverPos.top,
            left: popoverPos.left,
            width: popoverPos.width,
            maxHeight: `calc(100vh - ${popoverPos.top + 8}px)`,
            overflowY: 'auto',
          }}
          className="z-[100] bg-white dark:bg-slate-800 rounded-3xl p-4 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Controls inside Calendar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                {formatMonthName(selectedMonth)}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Pick a day to open it and record that day's expenses
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Month & Year jump buttons */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>

            <button
              onClick={handleJumpToToday}
              className="px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 rounded-xl transition-colors cursor-pointer"
            >
              Today
            </button>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (
              <span
                key={w}
                className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase"
              >
                {w}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((dayNum, i) => {
              if (dayNum === null) {
                return <div key={`empty-${i}`} className="h-8" />;
              }

              const paddedDay = String(dayNum).padStart(2, '0');
              const paddedMonth = String(currentMonthNum).padStart(2, '0');
              const dayIso = `${currentYearNum}-${paddedMonth}-${paddedDay}`;
              const isSelected = selectedDate === dayIso;
              const isToday = todayStr === dayIso;
              const hasTx = datesWithTransactions.has(dayIso);

              return (
                <button
                  key={dayIso}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 rounded-xl text-xs font-bold transition-all relative flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isToday
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{dayNum}</span>
                  {hasTx && (
                    <span
                      className={`w-1 h-1 rounded-full absolute bottom-1 ${
                        isSelected ? 'bg-white' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Options */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
            <button
              onClick={handleViewWholeMonth}
              className={`font-semibold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                !selectedDate
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Whole Month View
            </button>

            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Has transactions
            </span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
