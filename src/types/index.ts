export type TransactionType = 'income' | 'expense';

export type ExpenseCategory =
  | 'Food and groceries'
  | 'Transportation'
  | 'Shopping'
  | 'Entertainment'
  | 'Bills and subscriptions'
  | 'Education'
  | 'Other';

export type IncomeCategory =
  | 'Salary'
  | 'Freelance'
  | 'Investments'
  | 'Refunds'
  | 'Gifts & Other';

export type Category = ExpenseCategory | IncomeCategory;

export interface Transaction {
  id: string;
  type: TransactionType;
  amountCents: number; // Stored in integer cents (e.g. 1599 = $15.99), in `currency`
  currency?: string; // currency the amount was entered in; converted for display when you switch
  description: string;
  category: Category;
  date: string; // ISO format 'YYYY-MM-DD'
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  currency?: string; // currency targetCents (and currentCents, unless currentCurrency is set) are stored in
  currentCurrency?: string; // set when deposits were made in another currency than the target
  targetDate?: string;
  category?: string;
  color?: string;
  createdAt: string;
}

export interface BudgetConfig {
  monthlyBudgetCents: number; // Default spending budget in cents
  monthBudgets?: Record<string, number>; // Month-specific budget overrides, keyed by 'YYYY-MM'
  categoryBudgets?: Record<string, number>; // Category-specific spending limits in cents
  openingBalanceCents: number; // Starting account balance in cents
  currency?: string; // default currency for the amounts in this config
  // Per-field override (keys: 'monthly', 'opening', 'month:YYYY-MM', 'cat:<category>') so editing one
  // field in another currency never re-rounds the others
  fieldCurrencies?: Record<string, string>;
}

export interface MonthSummary {
  yearMonth: string; // 'YYYY-MM'
  openingBalanceCents: number;
  totalIncomeCents: number;
  totalExpensesCents: number;
  netSavingsCents: number;
  endingBalanceCents: number;
  budgetCents: number;
  remainingBudgetCents: number;
  budgetUsagePercent: number;
  savingsRatePercent: number;
  averageDailySpendingCents: number;
  transactionCount: number;
}

export interface CategorySpending {
  category: ExpenseCategory;
  amountCents: number;
  percentage: number;
  count: number;
}

export interface MonthComparison {
  currentExpensesCents: number;
  previousExpensesCents: number;
  expenseDiffCents: number;
  expensePercentChange: number | null;
  currentIncomeCents: number;
  previousIncomeCents: number;
  incomeDiffCents: number;
  categoryChanges: {
    category: ExpenseCategory;
    currentCents: number;
    previousCents: number;
    diffCents: number;
    percentChange: number | null;
  }[];
}

export interface SavingsSuggestion {
  id: string;
  title: string;
  description: string;
  potentialSavingsCents?: number;
  type: 'budget_exceeded' | 'spending_spike' | 'recurring_review' | 'high_category' | 'positive_habit';
  severity: 'info' | 'warning' | 'alert' | 'success';
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food and groceries',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills and subscriptions',
  'Education',
  'Other',
];

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salary',
  'Freelance',
  'Investments',
  'Refunds',
  'Gifts & Other',
];

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; fill: string; border: string }> = {
  'Food and groceries': { bg: 'bg-emerald-50', text: 'text-emerald-700', fill: '#10b981', border: 'border-emerald-200' },
  'Transportation': { bg: 'bg-blue-50', text: 'text-blue-700', fill: '#3b82f6', border: 'border-blue-200' },
  'Shopping': { bg: 'bg-purple-50', text: 'text-purple-700', fill: '#a855f7', border: 'border-purple-200' },
  'Entertainment': { bg: 'bg-pink-50', text: 'text-pink-700', fill: '#ec4899', border: 'border-pink-200' },
  'Bills and subscriptions': { bg: 'bg-amber-50', text: 'text-amber-700', fill: '#f59e0b', border: 'border-amber-200' },
  'Education': { bg: 'bg-cyan-50', text: 'text-cyan-700', fill: '#06b6d4', border: 'border-cyan-200' },
  'Other': { bg: 'bg-slate-100', text: 'text-slate-700', fill: '#64748b', border: 'border-slate-300' },
  'Salary': { bg: 'bg-emerald-50', text: 'text-emerald-700', fill: '#10b981', border: 'border-emerald-200' },
  'Freelance': { bg: 'bg-teal-50', text: 'text-teal-700', fill: '#14b8a6', border: 'border-teal-200' },
  'Investments': { bg: 'bg-indigo-50', text: 'text-indigo-700', fill: '#6366f1', border: 'border-indigo-200' },
  'Refunds': { bg: 'bg-sky-50', text: 'text-sky-700', fill: '#0284c7', border: 'border-sky-200' },
  'Gifts & Other': { bg: 'bg-slate-100', text: 'text-slate-700', fill: '#64748b', border: 'border-slate-300' },
};
