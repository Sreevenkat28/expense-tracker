import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseSmartTransaction } from '../services/aiService';
import { convertLedger } from '../utils/ledgerCurrency';
import { FALLBACK_RATES } from '../utils/exchange';
import { getTodayDateString } from '../utils/dates';
import type { Transaction } from '../types';

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
  vi.resetModules();
});

describe('AI entry: currency in the sentence wins', () => {
  const parse = (t: string, cur = 'USD') => parseSmartTransaction(t, '2026-10-20', cur);

  it('detects the currency and keeps the amount, whatever the selected currency is', () => {
    expect(parse('Spent ₹250 on lunch')).toMatchObject({ currency: 'INR', currencyDetected: true, amountCents: 25000, category: 'Food and groceries' });
    expect(parse('Spent Rs. 1,250 on groceries')).toMatchObject({ currency: 'INR', amountCents: 125000 });
    expect(parse('paid 250 rupees for a taxi')).toMatchObject({ currency: 'INR', amountCents: 25000, category: 'Transportation' });
    expect(parse('Spent 99rs on a snack')).toMatchObject({ currency: 'INR', amountCents: 9900 });
    expect(parse('Paid 45 dollars for dinner', 'INR')).toMatchObject({ currency: 'USD', currencyDetected: true, amountCents: 4500 });
    expect(parse('Spent $45 on groceries', 'INR')).toMatchObject({ currency: 'USD', amountCents: 4500 });
    expect(parse('Paid 12,50 euros for lunch')).toMatchObject({ currency: 'EUR', amountCents: 1250 });
    expect(parse('Earned 1,200.50 USD freelance', 'INR')).toMatchObject({ currency: 'USD', amountCents: 120050, type: 'income' });
    expect(parse('Spent £8 on coffee')).toMatchObject({ currency: 'GBP', amountCents: 800 });
    expect(parse('Spent CA$30 on gas')).toMatchObject({ currency: 'CAD', amountCents: 3000 });
  });

  it('uses the selected currency when the sentence names none, and ignores words like "shirts"', () => {
    expect(parse('coffee 3.5', 'INR')).toMatchObject({ currency: 'INR', currencyDetected: false, amountCents: 350 });
    const shirts = parse('Bought shirts for 30', 'USD');
    expect(shirts).toMatchObject({ currency: 'USD', currencyDetected: false, amountCents: 3000 });
    expect(parse('Paid 20 for dinners', 'EUR').currency).toBe('EUR');
  });

  it('prefers the number that carries the currency, and cleans the description', () => {
    const r = parse('Spent 5 times on ₹250 lunch');
    expect(r).toMatchObject({ currency: 'INR', amountCents: 25000 });
    expect(r.description).not.toMatch(/₹|250/);
    expect(parse('Spent ₹250 on lunch').description).toBe('Lunch');
  });

  it('an INR entry typed while viewing USD shows converted, and the other way round', () => {
    const entry = parse('Spent ₹9500 on rent', 'USD'); // saved as 9,500 INR
    const tx = (currency: string): Transaction => ({ id: 'a', type: 'expense', amountCents: entry.amountCents, currency, description: 'x', category: 'Other', date: '2026-10-01', createdAt: '' });
    const cfg = { monthlyBudgetCents: 0, openingBalanceCents: 0 };
    const inUsd = convertLedger({ transactions: [tx(entry.currency)], budgetConfig: cfg, savingsGoals: [] }, 'USD', { ...FALLBACK_RATES, INR: 95 });
    expect(inUsd.transactions[0].amountCents).toBe(10000); // ₹9,500 = $100
  });
});

describe('Budget & savings amount boxes', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

  it('no money box has a step rule that rejects normal amounts', () => {
    const offenders: string[] = [];
    for (const file of walk('src/components').filter((f) => f.endsWith('.tsx'))) {
      const src = readFileSync(file, 'utf8');
      for (const input of src.match(/<input[^>]*type="number"[^>]*>/gs) ?? []) {
        const step = /step="([^"]*)"/.exec(input)?.[1];
        if (step && step !== 'any' && step !== '0.01') offenders.push(`${file}: step="${step}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('caps, balances and goals save through the context without errors, in any currency', async () => {
    localStorage.setItem('app_currency_code', 'INR');
    const { ExpenseProvider, useExpense } = await import('../context/ExpenseContext');
    // Like real clicks: the screen re-reads the saved data between actions
    const act = (fn: (c: ReturnType<typeof useExpense>) => void) => {
      let ctx!: ReturnType<typeof useExpense>;
      const Probe = () => { ctx = useExpense(); return null; };
      renderToString(<ExpenseProvider><Probe /></ExpenseProvider>);
      fn(ctx);
    };

    expect(() => {
      act((c) => c.updateBudget(5000000, true)); // ₹50,000 monthly cap
      act((c) => c.setCategoryBudget('Shopping', 1234567)); // an amount a step="10" box would have refused
      act((c) => c.updateOpeningBalance(2500000));
      act((c) => c.addSavingsGoal({ name: 'Trip', targetCents: 10000000, currentCents: 0 }));
    }).not.toThrow();

    const cfg = JSON.parse(localStorage.getItem('monthly_expense_tracker_budget_config_v2')!);
    expect(cfg.categoryBudgets.Shopping).toBe(1234567);
    expect(cfg.fieldCurrencies['cat:Shopping']).toBe('INR');
    expect(cfg.openingBalanceCents).toBe(2500000);
    expect(JSON.parse(localStorage.getItem('monthly_expense_tracker_savings_goals_v2')!)[0]).toMatchObject({ targetCents: 10000000, currency: 'INR' });
  });
});

describe('Savings goal deposits', () => {
  it('a deposit typed in another currency lands exactly as typed (no rounding drift)', async () => {
    localStorage.setItem('app_currency_code', 'INR');
    localStorage.setItem('monthly_expense_tracker_transactions_v2', '[]');
    localStorage.setItem('monthly_expense_tracker_budget_config_v2', JSON.stringify({ monthlyBudgetCents: 0, openingBalanceCents: 0, currency: 'USD' }));
    // A goal created while viewing USD: $4,999.99 target, $202.95 saved
    localStorage.setItem('monthly_expense_tracker_savings_goals_v2', JSON.stringify([
      { id: 'g1', name: 'Trip', targetCents: 499999, currentCents: 20295, currency: 'USD', createdAt: '' },
    ]));
    const { ExpenseProvider, useExpense } = await import('../context/ExpenseContext');
    let ctx!: ReturnType<typeof useExpense>;
    const Probe = () => { ctx = useExpense(); return null; };
    renderToString(<ExpenseProvider><Probe /></ExpenseProvider>);
    expect(ctx.savingsGoals[0].currentCents).toBe(1928025); // shows ₹19,280.25

    ctx.contributeToSavingsGoal('g1', 100000); // deposit ₹1,000.00
    const saved = JSON.parse(localStorage.getItem('monthly_expense_tracker_savings_goals_v2')!)[0];
    expect(saved.currentCents).toBe(2028025); // exactly ₹20,280.25, not ₹20,280.60
    expect(saved.currentCurrency).toBe('INR');
    expect(saved.targetCents).toBe(499999); // target untouched, still $4,999.99
    expect(saved.currency).toBe('USD');

    renderToString(<ExpenseProvider><Probe /></ExpenseProvider>);
    expect(ctx.savingsGoals[0]).toMatchObject({ currentCents: 2028025, targetCents: 47499905, currency: 'INR' });
  });
});

describe('Entry counts and calendar', () => {
  it('Daily Log, tab badges and Transactions agree on the same entries', async () => {
    const today = getTodayDateString();
    const month = today.slice(0, 7);
    const mk = (id: string, date: string): Transaction => ({ id, type: 'expense', amountCents: 500, currency: 'USD', description: `item ${id}`, category: 'Other', date, createdAt: `2026-01-01T00:00:0${id}Z` });
    localStorage.setItem('monthly_expense_tracker_transactions_v2', JSON.stringify([mk('1', today), mk('2', today), mk('3', `${month}-01`)]));
    localStorage.setItem('monthly_expense_tracker_budget_config_v2', JSON.stringify({ monthlyBudgetCents: 0, openingBalanceCents: 0, currency: 'USD' }));

    const { ExpenseProvider } = await import('../context/ExpenseContext');
    const { Navbar } = await import('../components/common/Navbar');
    const { DailyLogView } = await import('../components/daily/DailyLogView');
    const { TransactionsView } = await import('../components/transactions/TransactionsView');
    const text = (el: React.ReactElement) => renderToString(el).replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

    const nav = text(<ExpenseProvider><Navbar /></ExpenseProvider>);
    expect(nav).toMatch(/Daily Log\|2\|/); // two entries today
    expect(nav).toMatch(/Transactions\|3\|/); // three in the month (or two if the 1st is today)
    const daily = text(<ExpenseProvider><DailyLogView /></ExpenseProvider>);
    expect(daily).toContain('Entries this day|2|');
    expect(daily).toContain('3 in the month');
    const list = text(<ExpenseProvider><TransactionsView /></ExpenseProvider>);
    expect(list).toMatch(/Showing\s*\|3\|\s*of\s*\|3\|\s*transactions in/);
  });
});
