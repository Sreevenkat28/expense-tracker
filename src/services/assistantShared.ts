import type { Transaction, Category, MonthSummary, CategorySpending, BudgetConfig, SavingsGoal } from '../types';

export interface AssistantContext {
  monthSummary: MonthSummary;
  categorySpendings: CategorySpending[];
  transactions: Transaction[];
  selectedMonth: string;
  budgetConfig: BudgetConfig;
  savingsGoals: SavingsGoal[];
  /** The question asked just before this one, so "and last month?" can be answered. */
  previousQuestion?: string;
  /** Today's date (YYYY-MM-DD); only set in tests. */
  today?: string;
  /** Who is signed in (guests have isGuest: true), for questions like "what's my name?" */
  profile?: { name: string; username: string; email?: string; role?: 'admin' | 'user'; createdAt?: string; lastLoginAt?: string; currency?: string; isGuest: boolean };
  /** Display currency code, e.g. "INR" */
  currency?: string;
  /** e.g. "1 USD = 95 INR" */
  exchangeRateNote?: string;
  /** Converts an amount between currencies at the app's current rates */
  convertCurrency?: (amount: number, from: string, to: string) => number;}

/** Words that point at a spending or income category. */
export const CATEGORY_WORDS: Array<[RegExp, Category]> = [
  [/\b(food|foods|grocer\w*|lunch|dinner|breakfast|meals?|restaurants?|cafe|coffee|snacks?|pizza|burger|supermarket|eating|eat)\b/, 'Food and groceries'],
  [/\b(transport\w*|uber|ola|taxi|cab|fuel|petrol|gas|bus|metro|train|flights?|toll|parking|commut\w*|travel\w*)\b/, 'Transportation'],
  [/\b(shopping|amazon|clothes|clothing|shoes|mall|gadgets?|electronics)\b/, 'Shopping'],
  [/\b(entertainment|movies?|cinema|games?|gaming|concerts?|outings?)\b/, 'Entertainment'],
  [/\b(bills?|rent|subscriptions?|wifi|internet|netflix|spotify|electric\w*|water|phone|utilit\w*|insurance)\b/, 'Bills and subscriptions'],
  [/\b(education|courses?|udemy|books?|tuition|school|classes|class|fees)\b/, 'Education'],
  [/\b(salary|paycheck|wages?)\b/, 'Salary'],
  [/\b(freelanc\w*|gigs?|clients?)\b/, 'Freelance'],
  [/\b(invest\w*|dividends?|stocks?)\b/, 'Investments'],
  [/\b(refunds?|cashback|reimburse\w*)\b/, 'Refunds'],
  [/\b(gifts?|bonus)\b/, 'Gifts & Other'],
];
