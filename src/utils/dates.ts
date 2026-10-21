/**
 * Date manipulation and calendar navigation utilities.
 */

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Returns current year and month as 'YYYY-MM'.
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns today's ISO date string 'YYYY-MM-DD'.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string 'YYYY-MM-DD' to readable string like 'Oct 12, 2026'.
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date string 'YYYY-MM-DD' to 'Tuesday, Oct 20, 2026'.
 */
export function formatDateFull(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats 'YYYY-MM' to 'October 2026'.
 */
export function formatMonthName(yearMonth: string): string {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formats 'YYYY-MM' to 'Oct 2026'.
 */
export function formatMonthShort(yearMonth: string): string {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Gets the total number of days in a given 'YYYY-MM'.
 */
export function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

/**
 * Gets the day of the week (0 = Sunday, 6 = Saturday) for the 1st of that month.
 */
export function getFirstDayOfWeek(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number);
  return new Date(year, month - 1, 1).getDay();
}

/**
 * Generates an array representing the calendar days grid for a month.
 * Returns null for leading blank days, and numbers 1..N for actual days.
 */
export function getCalendarGridDays(yearMonth: string): (number | null)[] {
  const daysInMonth = getDaysInMonth(yearMonth);
  const firstDay = getFirstDayOfWeek(yearMonth);

  const grid: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    grid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(d);
  }
  return grid;
}

/**
 * Computes elapsed days in a month for daily average calculations.
 */
export function getElapsedDaysInMonth(yearMonth: string, referenceDate: Date = new Date()): number {
  const [year, month] = yearMonth.split('-').map(Number);
  const totalDays = getDaysInMonth(yearMonth);

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  if (year < refYear || (year === refYear && month < refMonth)) {
    return totalDays;
  } else if (year === refYear && month === refMonth) {
    return Math.max(1, Math.min(refDay, totalDays));
  } else {
    return 0;
  }
}

/**
 * Gets previous month string 'YYYY-MM'.
 */
export function getPreviousMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Gets next month string 'YYYY-MM'.
 */
export function getNextMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Extracts 'YYYY-MM' from an ISO date string 'YYYY-MM-DD'.
 */
export function getYearMonthFromDate(dateString: string): string {
  return dateString.substring(0, 7);
}
