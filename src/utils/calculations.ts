import {
  Transaction,
  MonthSummary,
  CategorySpending,
  MonthComparison,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
} from '../types';
import { getElapsedDaysInMonth, getPreviousMonth } from './dates';

/**
 * Filter transactions that fall into a specific 'YYYY-MM' month.
 */
export function getTransactionsForMonth(
  transactions: Transaction[],
  yearMonth: string
): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(yearMonth));
}

/**
 * Calculate all financial summary figures for a chosen month according to strict financial rules:
 * - Ending balance = opening balance + all-time income - all-time expenses up to end of this month
 * - Net monthly savings = monthly income - monthly expenses
 * - Remaining budget = budget - monthly expenses
 * - Savings rate = net monthly savings / monthly income * 100 (when income > 0, else 0)
 * - Average daily spending = month-to-date expenses / elapsed days in the month
 */
export function calculateMonthSummary(
  transactions: Transaction[],
  yearMonth: string,
  openingBalanceCents: number,
  budgetCents: number,
  referenceDate: Date = new Date()
): MonthSummary {
  // Monthly transactions
  const monthTransactions = getTransactionsForMonth(transactions, yearMonth);

  let totalIncomeCents = 0;
  let totalExpensesCents = 0;

  for (const t of monthTransactions) {
    if (t.type === 'income') {
      totalIncomeCents += t.amountCents;
    } else if (t.type === 'expense') {
      totalExpensesCents += t.amountCents;
    }
  }

  // Net monthly savings
  const netSavingsCents = totalIncomeCents - totalExpensesCents;

  // Ending balance: opening balance + all transactions up to the end of this month
  // (Or cumulative up to the selected month)
  const cumulativeTransactions = transactions.filter((t) => t.date.substring(0, 7) <= yearMonth);
  let cumulativeIncomeCents = 0;
  let cumulativeExpenseCents = 0;
  for (const t of cumulativeTransactions) {
    if (t.type === 'income') cumulativeIncomeCents += t.amountCents;
    if (t.type === 'expense') cumulativeExpenseCents += t.amountCents;
  }
  const endingBalanceCents = openingBalanceCents + cumulativeIncomeCents - cumulativeExpenseCents;

  // Remaining budget
  const remainingBudgetCents = budgetCents - totalExpensesCents;

  // Budget usage percent
  const budgetUsagePercent = budgetCents > 0
    ? (totalExpensesCents / budgetCents) * 100
    : 0;

  // Savings rate
  let savingsRatePercent = 0;
  if (totalIncomeCents > 0) {
    savingsRatePercent = (netSavingsCents / totalIncomeCents) * 100;
  }

  // Elapsed days
  const elapsedDays = getElapsedDaysInMonth(yearMonth, referenceDate);
  const averageDailySpendingCents = elapsedDays > 0
    ? Math.round(totalExpensesCents / elapsedDays)
    : 0;

  return {
    yearMonth,
    openingBalanceCents,
    totalIncomeCents,
    totalExpensesCents,
    netSavingsCents,
    endingBalanceCents,
    budgetCents,
    remainingBudgetCents,
    budgetUsagePercent,
    savingsRatePercent,
    averageDailySpendingCents,
    transactionCount: monthTransactions.length,
  };
}

/**
 * Breakdown of expenses by category for a selected month.
 */
export function calculateCategorySpending(
  transactions: Transaction[],
  yearMonth: string
): CategorySpending[] {
  const monthExpenses = getTransactionsForMonth(transactions, yearMonth)
    .filter((t) => t.type === 'expense');

  const totals: Record<string, { amountCents: number; count: number }> = {};
  let totalExpensesCents = 0;

  // Initialize all expense categories with 0
  for (const cat of EXPENSE_CATEGORIES) {
    totals[cat] = { amountCents: 0, count: 0 };
  }

  for (const t of monthExpenses) {
    const cat = t.category as ExpenseCategory;
    if (!totals[cat]) {
      totals[cat] = { amountCents: 0, count: 0 };
    }
    totals[cat].amountCents += t.amountCents;
    totals[cat].count += 1;
    totalExpensesCents += t.amountCents;
  }

  const result: CategorySpending[] = Object.entries(totals).map(([category, data]) => {
    const percentage = totalExpensesCents > 0
      ? (data.amountCents / totalExpensesCents) * 100
      : 0;
    return {
      category: category as ExpenseCategory,
      amountCents: data.amountCents,
      percentage,
      count: data.count,
    };
  });

  // Sort descending by amount
  return result.sort((a, b) => b.amountCents - a.amountCents);
}

/**
 * Compare current month's expenses and income against the previous month.
 */
export function calculateMonthComparison(
  transactions: Transaction[],
  currentYearMonth: string
): MonthComparison {
  const prevYearMonth = getPreviousMonth(currentYearMonth);

  const currentMonthTx = getTransactionsForMonth(transactions, currentYearMonth);
  const prevMonthTx = getTransactionsForMonth(transactions, prevYearMonth);

  let currentExpensesCents = 0;
  let currentIncomeCents = 0;
  for (const t of currentMonthTx) {
    if (t.type === 'expense') currentExpensesCents += t.amountCents;
    if (t.type === 'income') currentIncomeCents += t.amountCents;
  }

  let previousExpensesCents = 0;
  let previousIncomeCents = 0;
  for (const t of prevMonthTx) {
    if (t.type === 'expense') previousExpensesCents += t.amountCents;
    if (t.type === 'income') previousIncomeCents += t.amountCents;
  }

  const expenseDiffCents = currentExpensesCents - previousExpensesCents;
  let expensePercentChange: number | null = null;
  if (previousExpensesCents > 0) {
    expensePercentChange = ((currentExpensesCents - previousExpensesCents) / previousExpensesCents) * 100;
  }

  const incomeDiffCents = currentIncomeCents - previousIncomeCents;

  // Category changes
  const currentCategoryMap = new Map<string, number>();
  for (const t of currentMonthTx.filter((t) => t.type === 'expense')) {
    currentCategoryMap.set(t.category, (currentCategoryMap.get(t.category) || 0) + t.amountCents);
  }

  const prevCategoryMap = new Map<string, number>();
  for (const t of prevMonthTx.filter((t) => t.type === 'expense')) {
    prevCategoryMap.set(t.category, (prevCategoryMap.get(t.category) || 0) + t.amountCents);
  }

  const categoryChanges = EXPENSE_CATEGORIES.map((category) => {
    const currentCents = currentCategoryMap.get(category) || 0;
    const previousCents = prevCategoryMap.get(category) || 0;
    const diffCents = currentCents - previousCents;
    let percentChange: number | null = null;
    if (previousCents > 0) {
      percentChange = ((currentCents - previousCents) / previousCents) * 100;
    }
    return {
      category,
      currentCents,
      previousCents,
      diffCents,
      percentChange,
    };
  }).filter((c) => c.currentCents > 0 || c.previousCents > 0)
    .sort((a, b) => b.diffCents - a.diffCents);

  return {
    currentExpensesCents,
    previousExpensesCents,
    expenseDiffCents,
    expensePercentChange,
    currentIncomeCents,
    previousIncomeCents,
    incomeDiffCents,
    categoryChanges,
  };
}
