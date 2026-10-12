/**
 * Date manipulation and month navigation utilities.
 */

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
  // day 0 of month+1 is the last day of month
  return new Date(year, month, 0).getDate();
}

/**
 * Computes elapsed days in a month for daily average calculations.
 * - If yearMonth is in the past: returns total days in that month.
 * - If yearMonth is current month: returns Math.min(today's day, totalDays).
 * - If yearMonth is in the future: returns 0.
 */
export function getElapsedDaysInMonth(yearMonth: string, referenceDate: Date = new Date()): number {
  const [year, month] = yearMonth.split('-').map(Number);
  const totalDays = getDaysInMonth(yearMonth);

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  if (year < refYear || (year === refYear && month < refMonth)) {
    // Past month
    return totalDays;
  } else if (year === refYear && month === refMonth) {
    // Current month
    return Math.max(1, Math.min(refDay, totalDays));
  } else {
    // Future month
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
