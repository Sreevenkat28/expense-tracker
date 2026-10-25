import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { convertCents, loadRates, getCachedRates, describeRate, FALLBACK_RATES } from '../utils/exchange';
import {
  convertLedger,
  convertBudgetConfig,
  convertGoal,
  withFieldCurrency,
  stampLegacyCurrency,
  LedgerData,
} from '../utils/ledgerCurrency';
import { Transaction, BudgetConfig, SavingsGoal } from '../types';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
}
const g = globalThis as unknown as Record<string, unknown>;
beforeEach(() => {
  g.localStorage = new MemoryStorage();
  g.sessionStorage = new MemoryStorage();
});

const rates = { ...FALLBACK_RATES, INR: 95, EUR: 0.9 };
const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't', type: 'expense', amountCents: 10000, description: 'x', category: 'Other', date: '2026-10-01', createdAt: '', ...over,
});

describe('Exchange rates', () => {
  it('converts between currencies and round-trips USD <-> INR exactly', () => {
    expect(convertCents(10000, 'USD', 'INR', rates)).toBe(950000); // $100 -> ₹9,500
    expect(convertCents(950000, 'INR', 'USD', rates)).toBe(10000);
    expect(convertCents(1234, 'USD', 'INR', rates)).toBe(117230);
    expect(convertCents(117230, 'INR', 'USD', rates)).toBe(1234);
    expect(convertCents(9500, 'INR', 'EUR', rates)).toBe(Math.round((9500 * 0.9) / 95));
    expect(convertCents(500, 'USD', 'USD', rates)).toBe(500);
    expect(convertCents(0, 'USD', 'INR', rates)).toBe(0);
    expect(describeRate('USD', 'INR', rates)).toBe('1 USD = 95 INR');
  });

  it('loads live rates, caches them, and falls back when offline', async () => {
    const live = vi.fn(async () => new Response(JSON.stringify({ result: 'success', rates: { USD: 1, INR: 91.5, EUR: 0.88, XXX: 5 } }))) as unknown as typeof fetch;
    const first = await loadRates(live, 1_000);
    expect(first.source).toBe('live');
    expect(first.rates.INR).toBe(91.5);
    expect(first.rates.XXX).toBeUndefined(); // unsupported currencies ignored
    expect(first.rates.GBP).toBe(FALLBACK_RATES.GBP); // missing ones come from the built-in table

    const again = await loadRates(live, 2_000); // within 12 h: served from cache
    expect(again.source).toBe('cached');
    expect(live).toHaveBeenCalledTimes(1);

    const offline = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    const stale = await loadRates(offline, 1_000 + 13 * 3600_000);
    expect(stale.rates.INR).toBe(91.5); // keeps the last good rates

    g.localStorage = new MemoryStorage();
    const none = await loadRates(offline);
    expect(none.source).toBe('fallback');
    expect(getCachedRates().rates.INR).toBe(FALLBACK_RATES.INR);
  });

  it('rejects bad payloads', async () => {
    const bad = vi.fn(async () => new Response(JSON.stringify({ result: 'error' }))) as unknown as typeof fetch;
    expect((await loadRates(bad)).source).toBe('fallback');
  });
});

describe('Ledger conversion', () => {
  const budget: BudgetConfig = {
    monthlyBudgetCents: 5000000, openingBalanceCents: 0, currency: 'INR',
    monthBudgets: { '2026-10': 4000000 }, categoryBudgets: { Shopping: 10000 },
    fieldCurrencies: { 'cat:Shopping': 'USD' },
  };
  const goal: SavingsGoal = { id: 'g', name: 'Trip', targetCents: 10000, currentCents: 2500, createdAt: '', currency: 'USD' };

  it('shows each record in the selected currency, exactly when it matches', () => {
    const view = convertLedger(
      { transactions: [tx({ currency: 'USD' }), tx({ id: 'u', currency: 'INR', amountCents: 25000 })], budgetConfig: budget, savingsGoals: [goal] },
      'INR', rates
    );
    expect(view.transactions.map((t) => t.amountCents)).toEqual([950000, 25000]); // ₹250 stays ₹250
    expect(view.budgetConfig.monthlyBudgetCents).toBe(5000000);
    expect(view.budgetConfig.categoryBudgets?.Shopping).toBe(950000); // $100 limit -> ₹9,500
    expect(view.savingsGoals[0]).toMatchObject({ targetCents: 950000, currentCents: 237500, currency: 'INR' });
  });

  it('converts back without losing anything', () => {
    const original = [tx({ currency: 'USD', amountCents: 123456 })];
    const inr = convertLedger({ transactions: original, budgetConfig: budget, savingsGoals: [] }, 'INR', rates);
    const usd = convertLedger({ transactions: original, budgetConfig: budget, savingsGoals: [] }, 'USD', rates);
    expect(inr.transactions[0].amountCents).toBe(11728320);
    expect(usd.transactions[0].amountCents).toBe(123456); // the stored original is untouched
  });

  it('editing one budget field leaves the others exactly as entered', () => {
    const edited = withFieldCurrency({ ...budget, categoryBudgets: { ...budget.categoryBudgets, Food: 2000 } }, ['cat:Food'], 'EUR');
    const inr = convertBudgetConfig(edited, 'INR', rates);
    expect(inr.monthlyBudgetCents).toBe(5000000); // still exactly ₹50,000
    expect(inr.categoryBudgets?.Food).toBe(Math.round((2000 * 95) / 0.9));
    expect(convertGoal({ ...goal, currency: undefined }, 'INR', rates).targetCents).toBe(10000); // unknown = already in display currency
  });

  it('stamps pre-existing data with the account currency once', () => {
    const legacy: LedgerData = { transactions: [tx({})], budgetConfig: { monthlyBudgetCents: 0, openingBalanceCents: 0 }, savingsGoals: [] };
    const { data, changed } = stampLegacyCurrency(legacy, 'USD');
    expect(changed).toBe(true);
    expect(data.transactions[0].currency).toBe('USD');
    expect(data.budgetConfig.currency).toBe('USD');
    expect(stampLegacyCurrency(data, 'INR')).toEqual({ data, changed: false });
    // $100 recorded before this update now shows as ₹9,500 when switching to INR
    expect(convertLedger(data, 'INR', rates).transactions[0].amountCents).toBe(950000);
  });
});

describe('Screens show converted amounts', () => {
  it('a $100 expense appears as ₹9,500.00 when the display currency is INR', async () => {
    localStorage.setItem('app_currency_code', 'INR');
    localStorage.setItem('monthly_expense_tracker_transactions_v2', JSON.stringify([
      tx({ id: 'a', currency: 'USD', amountCents: 10000, description: 'Dinner', date: new Date().toISOString().slice(0, 10) }),
    ]));
    localStorage.setItem('monthly_expense_tracker_budget_config_v2', JSON.stringify({ monthlyBudgetCents: 0, openingBalanceCents: 0, currency: 'USD' }));
    vi.resetModules(); // the saved currency is read when the currency module first loads
    const { ExpenseProvider } = await import('../context/ExpenseContext');
    const { TransactionsView } = await import('../components/transactions/TransactionsView');
    const html = renderToString(<ExpenseProvider><TransactionsView /></ExpenseProvider>);
    expect(html).toContain('Dinner');
    expect(html).toContain('₹9,500.00');
    expect(html).not.toContain('$100.00');
  });
});
