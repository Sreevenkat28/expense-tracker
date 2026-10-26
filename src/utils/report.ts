import type { Transaction, BudgetConfig, SavingsGoal } from '../types';
import { calculateMonthSummary, calculateCategorySpending } from './calculations';
import { formatCurrency } from './currency';
import { formatMonthName, formatDate } from './dates';

/**
 * The detailed monthly report that can be shared (WhatsApp, Gmail, any app) as text or a PDF.
 * Everything comes from the same calculations as the Dashboard, so the numbers always match.
 */

export interface ReportInput {
  transactions: Transaction[]; // already in the display currency
  selectedMonth: string; // YYYY-MM
  budgetConfig: BudgetConfig;
  savingsGoals: SavingsGoal[];
  currency: string;
  ownerName: string;
  today: string; // YYYY-MM-DD
}

export interface MonthlyReport {
  month: string;
  monthLabel: string;
  currency: string;
  ownerName: string;
  generatedOn: string; // "Oct 26, 2026"
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  savingsRatePercent: number;
  transactionCount: number;
  expenseCount: number;
  incomeCount: number;
  endingBalanceCents: number;
  budgetCents: number;
  remainingBudgetCents: number;
  budgetUsagePercent: number;
  averageDailySpendingCents: number;
  categories: Array<{ category: string; cents: number; percent: number; count: number }>;
  topExpenses: Transaction[];
  busiestDays: Array<{ date: string; cents: number }>;
  incomeSources: Array<{ category: string; cents: number }>;
  transactions: Transaction[]; // this month, oldest first
  goals: Array<{ name: string; currentCents: number; targetCents: number; percent: number }>;
}

export function buildReport(input: ReportInput): MonthlyReport {
  const { transactions, selectedMonth, budgetConfig, savingsGoals } = input;
  const budgetCents = budgetConfig.monthBudgets?.[selectedMonth] ?? budgetConfig.monthlyBudgetCents;
  const summary = calculateMonthSummary(transactions, selectedMonth, budgetConfig.openingBalanceCents, budgetCents);
  const month = transactions
    .filter((t) => t.date.startsWith(selectedMonth))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const expenses = month.filter((t) => t.type === 'expense');
  const incomes = month.filter((t) => t.type === 'income');

  const byDay = new Map<string, number>();
  expenses.forEach((t) => byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.amountCents));
  const bySource = new Map<string, number>();
  incomes.forEach((t) => bySource.set(t.category, (bySource.get(t.category) ?? 0) + t.amountCents));

  return {
    month: selectedMonth,
    monthLabel: formatMonthName(selectedMonth),
    currency: input.currency,
    ownerName: input.ownerName,
    generatedOn: formatDate(input.today),
    incomeCents: summary.totalIncomeCents,
    expenseCents: summary.totalExpensesCents,
    netCents: summary.netSavingsCents,
    savingsRatePercent: summary.savingsRatePercent,
    transactionCount: month.length,
    expenseCount: expenses.length,
    incomeCount: incomes.length,
    endingBalanceCents: summary.endingBalanceCents,
    budgetCents: summary.budgetCents,
    remainingBudgetCents: summary.remainingBudgetCents,
    budgetUsagePercent: summary.budgetUsagePercent,
    averageDailySpendingCents: summary.averageDailySpendingCents,
    categories: calculateCategorySpending(transactions, selectedMonth)
      .filter((c) => c.amountCents > 0)
      .map((c) => ({ category: c.category, cents: c.amountCents, percent: c.percentage, count: c.count })),
    topExpenses: [...expenses].sort((a, b) => b.amountCents - a.amountCents).slice(0, 5),
    busiestDays: [...byDay.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([date, cents]) => ({ date, cents })),
    incomeSources: [...bySource.entries()].sort((a, b) => b[1] - a[1]).map(([category, cents]) => ({ category, cents })),
    transactions: month,
    goals: savingsGoals.map((g) => ({
      name: g.name,
      currentCents: g.currentCents,
      targetCents: g.targetCents,
      percent: g.targetCents > 0 ? Math.min(100, Math.round((g.currentCents / g.targetCents) * 100)) : 0,
    })),
  };
}

export type ReportTextStyle = 'whatsapp' | 'plain';

/** The report as text for WhatsApp / email / any chat. WhatsApp style uses *bold* and a few emoji. */
export function reportToText(r: MonthlyReport, style: ReportTextStyle = 'plain', maxRows = 15): string {
  const wa = style === 'whatsapp';
  const b = (t: string) => (wa ? `*${t}*` : t);
  const m = (c: number) => formatCurrency(c, false, r.currency);
  const signed = (c: number) => `${c >= 0 ? '+' : '-'}${m(Math.abs(c))}`;
  const day = (iso: string) => formatDate(iso).replace(/, \d{4}$/, '');
  const L: string[] = [];

  L.push(`${wa ? '📊 ' : ''}${b(`Expense report: ${r.monthLabel}`)}`);
  L.push(`Prepared for ${r.ownerName} on ${r.generatedOn}`);
  L.push('');
  L.push(b('Summary'));
  L.push(`• Income: ${m(r.incomeCents)} (${r.incomeCount} ${r.incomeCount === 1 ? 'entry' : 'entries'})`);
  L.push(`• Expenses: ${m(r.expenseCents)} (${r.expenseCount} ${r.expenseCount === 1 ? 'entry' : 'entries'})`);
  L.push(`• Net: ${signed(r.netCents)}${r.incomeCents > 0 ? `, savings rate ${r.savingsRatePercent.toFixed(1)}%` : ''}`);
  L.push(`• Balance at month end: ${m(r.endingBalanceCents)}`);
  L.push(`• Average spending per day: ${m(r.averageDailySpendingCents)}`);
  if (r.budgetCents > 0) {
    L.push(`• Budget: ${m(r.budgetCents)}, ${r.remainingBudgetCents >= 0 ? `${m(r.remainingBudgetCents)} left` : `${m(-r.remainingBudgetCents)} over`} (${r.budgetUsagePercent.toFixed(1)}% used)`);
  }

  if (r.categories.length) {
    L.push('');
    L.push(b('Spending by category'));
    r.categories.forEach((c, i) => L.push(`${i + 1}. ${c.category}: ${m(c.cents)} (${c.percent.toFixed(1)}%)`));
  }
  if (r.topExpenses.length) {
    L.push('');
    L.push(b('Biggest expenses'));
    r.topExpenses.forEach((t) => L.push(`• ${t.description}: ${m(t.amountCents)} (${day(t.date)})`));
  }
  if (r.busiestDays.length) {
    L.push('');
    L.push(b('Highest-spending days'));
    r.busiestDays.forEach((d) => L.push(`• ${day(d.date)}: ${m(d.cents)}`));
  }
  if (r.incomeSources.length) {
    L.push('');
    L.push(b('Income'));
    r.incomeSources.forEach((s) => L.push(`• ${s.category}: ${m(s.cents)}`));
  }
  if (r.goals.length) {
    L.push('');
    L.push(b('Savings goals'));
    r.goals.forEach((g) => L.push(`• ${g.name}: ${m(g.currentCents)} of ${m(g.targetCents)} (${g.percent}%)`));
  }
  if (r.transactions.length) {
    const shown = r.transactions.slice(-maxRows).reverse();
    L.push('');
    L.push(b(r.transactions.length > shown.length ? `Latest ${shown.length} of ${r.transactions.length} transactions` : 'Transactions'));
    shown.forEach((t) => L.push(`${day(t.date)} · ${t.description} · ${t.type === 'income' ? '+' : '-'}${m(t.amountCents)}`));
    if (r.transactions.length > shown.length) L.push('(The full list is in the PDF report.)');
  }
  L.push('');
  L.push(wa ? '_Created with Expense Tracker_' : 'Created with Expense Tracker');
  return L.join('\n');
}

export function reportSubject(r: MonthlyReport): string {
  return `Expense report: ${r.monthLabel}`;
}

export function reportFileName(r: MonthlyReport): string {
  return `expense-report-${r.month}.pdf`;
}

// ─── Links for sharing ───────────────────────────────────────────────────────

/** Cuts text to fit a link length limit at a line break, and says so. */
export function fitForLink(text: string, max: number): string {
  if (text.length <= max) return text;
  const note = '\n\n(Report shortened. Use the PDF for the full report.)';
  const cut = text.slice(0, max - note.length);
  return cut.slice(0, Math.max(cut.lastIndexOf('\n'), 0) || cut.length) + note;
}

export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(fitForLink(text, 4000))}`;
export const gmailLink = (subject: string, body: string) =>
  `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(fitForLink(body, 6000))}`;
export const mailtoLink = (subject: string, body: string) =>
  `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fitForLink(body, 1800))}`;
