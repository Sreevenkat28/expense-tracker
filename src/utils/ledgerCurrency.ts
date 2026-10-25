/**
 * Multi-currency ledger helpers.
 *
 * Every stored amount remembers the currency it was entered in. Screens show everything converted to
 * the selected display currency, so switching USD -> INR -> USD never loses precision, and an amount
 * typed as 250 in INR stays exactly 250 when shown in INR.
 */
import { Transaction, SavingsGoal, BudgetConfig } from '../types';
import { convertCents, Rates } from './exchange';

export interface LedgerData {
  transactions: Transaction[];
  budgetConfig: BudgetConfig;
  savingsGoals: SavingsGoal[];
}

/** Budget config re-expressed in `to`. Each field converts from its own currency. */
export function convertBudgetConfig(config: BudgetConfig, to: string, rates: Rates): BudgetConfig {
  const conv = (key: string, n: number) =>
    convertCents(n, config.fieldCurrencies?.[key] ?? config.currency ?? to, to, rates);
  const convMap = (prefix: string, obj?: Record<string, number>) =>
    obj ? Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, conv(prefix + k, v)])) : obj;
  return {
    ...config,
    currency: to,
    fieldCurrencies: undefined,
    monthlyBudgetCents: conv('monthly', config.monthlyBudgetCents),
    openingBalanceCents: conv('opening', config.openingBalanceCents),
    monthBudgets: convMap('month:', config.monthBudgets),
    categoryBudgets: convMap('cat:', config.categoryBudgets),
  };
}

/** Records which currency a single budget field was entered in. */
export function withFieldCurrency(config: BudgetConfig, keys: string[], currency: string): BudgetConfig {
  const fieldCurrencies = { ...(config.fieldCurrencies ?? {}) };
  for (const k of keys) fieldCurrencies[k] = currency;
  return { ...config, fieldCurrencies };
}

/** Forgets a field's currency when the field is removed. */
export function withoutFieldCurrency(config: BudgetConfig, key: string): BudgetConfig {
  if (!config.fieldCurrencies || !(key in config.fieldCurrencies)) return config;
  const fieldCurrencies = { ...config.fieldCurrencies };
  delete fieldCurrencies[key];
  return { ...config, fieldCurrencies };
}

/** Savings goal re-expressed in `to`. The saved amount can be in a different currency than the target. */
export function convertGoal(goal: SavingsGoal, to: string, rates: Rates): SavingsGoal {
  const targetFrom = goal.currency ?? to;
  const currentFrom = goal.currentCurrency ?? targetFrom;
  return {
    ...goal,
    currency: to,
    currentCurrency: undefined,
    targetCents: convertCents(goal.targetCents, targetFrom, to, rates),
    currentCents: convertCents(goal.currentCents, currentFrom, to, rates),
  };
}

export function convertTransaction(tx: Transaction, to: string, rates: Rates): Transaction {
  const from = tx.currency ?? to;
  if (from === to) return { ...tx, currency: to };
  return { ...tx, currency: to, amountCents: convertCents(tx.amountCents, from, to, rates) };
}

/** The whole ledger as it should be displayed in `to`. */
export function convertLedger(data: LedgerData, to: string, rates: Rates): LedgerData {
  return {
    transactions: data.transactions.map((t) => convertTransaction(t, to, rates)),
    budgetConfig: convertBudgetConfig(data.budgetConfig, to, rates),
    savingsGoals: data.savingsGoals.map((g) => convertGoal(g, to, rates)),
  };
}

/**
 * Data saved before currencies were tracked has no currency on it. Treat it as being in
 * `legacyCurrency` (the account's original currency) so it converts correctly from now on.
 * Returns the same object when nothing needed stamping.
 */
export function stampLegacyCurrency<T extends LedgerData>(data: T, legacyCurrency: string): { data: T; changed: boolean } {
  const needs =
    data.transactions.some((t) => !t.currency) ||
    data.savingsGoals.some((g) => !g.currency) ||
    !data.budgetConfig.currency;
  if (!needs) return { data, changed: false };
  return {
    changed: true,
    data: {
      ...data,
      transactions: data.transactions.map((t) => (t.currency ? t : { ...t, currency: legacyCurrency })),
      savingsGoals: data.savingsGoals.map((g) => (g.currency ? g : { ...g, currency: legacyCurrency })),
      budgetConfig: data.budgetConfig.currency ? data.budgetConfig : { ...data.budgetConfig, currency: legacyCurrency },
    },
  };
}
