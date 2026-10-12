import { describe, it, expect } from 'vitest';
import {
  calculateMonthSummary,
  calculateCategorySpending,
  calculateMonthComparison,
} from '../utils/calculations';
import { dollarsToCents, centsToDollars, formatCurrency, isValidAmount } from '../utils/currency';
import { getElapsedDaysInMonth } from '../utils/dates';
import type { Transaction } from '../types';

describe('Currency and Integer Cents Arithmetic', () => {
  it('correctly converts dollar amounts to integer cents without floating point errors', () => {
    expect(dollarsToCents(0.1 + 0.2)).toBe(30);
    expect(dollarsToCents('19.99')).toBe(1999);
    expect(dollarsToCents('$1,250.50')).toBe(125050);
    expect(dollarsToCents(0)).toBe(0);
  });

  it('correctly converts cents back to dollars', () => {
    expect(centsToDollars(1999)).toBe(19.99);
    expect(centsToDollars(30)).toBe(0.3);
  });

  it('formats currency cleanly including negative values', () => {
    expect(formatCurrency(125000)).toBe('$1,250.00');
    expect(formatCurrency(-4500)).toBe('-$45.00');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(5000, true)).toBe('+$50.00');
  });

  it('validates transaction amount inputs properly', () => {
    expect(isValidAmount('15.50').valid).toBe(true);
    expect(isValidAmount('0').valid).toBe(false);
    expect(isValidAmount('-10').valid).toBe(false);
    expect(isValidAmount('abc').valid).toBe(false);
    expect(isValidAmount('').valid).toBe(false);
  });
});

describe('Financial Calculation Rules', () => {
  const sampleTransactions: Transaction[] = [
    {
      id: '1',
      type: 'income',
      amountCents: 500000, // $5,000.00
      description: 'Monthly Salary',
      category: 'Salary',
      date: '2026-10-01',
      createdAt: '2026-10-01T00:00:00Z',
    },
    {
      id: '2',
      type: 'expense',
      amountCents: 150000, // $1,500.00
      description: 'Rent',
      category: 'Bills and subscriptions',
      date: '2026-10-02',
      createdAt: '2026-10-02T00:00:00Z',
    },
    {
      id: '3',
      type: 'expense',
      amountCents: 50000, // $500.00
      description: 'Groceries',
      category: 'Food and groceries',
      date: '2026-10-05',
      createdAt: '2026-10-05T00:00:00Z',
    },
  ];

  it('calculates ending balance = opening balance + income - expenses', () => {
    const openingBalanceCents = 1000000; // $10,000.00
    const budgetCents = 250000; // $2,500.00

    const summary = calculateMonthSummary(
      sampleTransactions,
      '2026-10',
      openingBalanceCents,
      budgetCents,
      new Date('2026-10-15')
    );

    // Cumulative: 1000000 + 500000 - 200000 = 1300000 ($13,000.00)
    expect(summary.totalIncomeCents).toBe(500000);
    expect(summary.totalExpensesCents).toBe(200000);
    expect(summary.endingBalanceCents).toBe(1300000);
  });

  it('calculates net monthly savings = monthly income - monthly expenses', () => {
    const summary = calculateMonthSummary(
      sampleTransactions,
      '2026-10',
      0,
      300000,
      new Date('2026-10-15')
    );

    // Net savings: 500000 - 200000 = 300000 ($3,000.00)
    expect(summary.netSavingsCents).toBe(300000);
  });

  it('calculates remaining budget = budget - expenses counted toward that budget', () => {
    const budgetCents = 250000; // $2,500.00
    const summary = calculateMonthSummary(
      sampleTransactions,
      '2026-10',
      0,
      budgetCents,
      new Date('2026-10-15')
    );

    // Remaining budget: 250000 - 200000 = 50000 ($500.00)
    expect(summary.remainingBudgetCents).toBe(50000);
    expect(summary.budgetUsagePercent).toBe(80); // exactly 80%
  });

  it('calculates savings rate = net monthly savings / monthly income * 100 when income > 0', () => {
    const summary = calculateMonthSummary(
      sampleTransactions,
      '2026-10',
      0,
      300000,
      new Date('2026-10-15')
    );

    // (300000 / 500000) * 100 = 60%
    expect(summary.savingsRatePercent).toBe(60);
  });

  it('handles zero income and negative savings gracefully', () => {
    const noIncomeTx: Transaction[] = [
      {
        id: '1',
        type: 'expense',
        amountCents: 40000,
        description: 'Dinner',
        category: 'Food and groceries',
        date: '2026-10-01',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ];

    const summary = calculateMonthSummary(
      noIncomeTx,
      '2026-10',
      50000,
      100000,
      new Date('2026-10-10')
    );

    expect(summary.totalIncomeCents).toBe(0);
    expect(summary.totalExpensesCents).toBe(40000);
    expect(summary.netSavingsCents).toBe(-40000);
    expect(summary.savingsRatePercent).toBe(0); // Safely returns 0% when income is 0
  });

  it('calculates average daily spending based on elapsed days', () => {
    // Reference date: 10th day of October 2026 (local noon)
    const refDate = new Date(2026, 9, 10, 12, 0, 0);
    const summary = calculateMonthSummary(
      sampleTransactions,
      '2026-10',
      0,
      300000,
      refDate
    );

    // 200000 cents total expenses / 10 elapsed days = 20000 cents/day ($200.00/day)
    expect(summary.averageDailySpendingCents).toBe(20000);
  });

  it('uses total days in month for past months when calculating average daily spending', () => {
    const refDate = new Date('2026-10-15');
    // September 2026 has 30 days
    const elapsed = getElapsedDaysInMonth('2026-09', refDate);
    expect(elapsed).toBe(30);
  });
});

describe('Category Spending and Month Comparisons', () => {
  it('correctly aggregates category breakdown sorted by amount descending', () => {
    const txs: Transaction[] = [
      {
        id: '1',
        type: 'expense',
        amountCents: 10000,
        description: 'Lunch',
        category: 'Food and groceries',
        date: '2026-10-01',
        createdAt: '',
      },
      {
        id: '2',
        type: 'expense',
        amountCents: 30000,
        description: 'Gas',
        category: 'Transportation',
        date: '2026-10-02',
        createdAt: '',
      },
    ];

    const spending = calculateCategorySpending(txs, '2026-10');
    expect(spending[0].category).toBe('Transportation');
    expect(spending[0].amountCents).toBe(30000);
    expect(spending[0].percentage).toBe(75);
    expect(spending[1].category).toBe('Food and groceries');
    expect(spending[1].percentage).toBe(25);
  });

  it('calculates month over month comparison shifts accurately', () => {
    const txs: Transaction[] = [
      // September
      {
        id: '1',
        type: 'expense',
        amountCents: 20000,
        description: 'Old spend',
        category: 'Shopping',
        date: '2026-09-10',
        createdAt: '',
      },
      // October
      {
        id: '2',
        type: 'expense',
        amountCents: 30000,
        description: 'New spend',
        category: 'Shopping',
        date: '2026-10-10',
        createdAt: '',
      },
    ];

    const comp = calculateMonthComparison(txs, '2026-10');
    expect(comp.previousExpensesCents).toBe(20000);
    expect(comp.currentExpensesCents).toBe(30000);
    expect(comp.expenseDiffCents).toBe(10000);
    expect(comp.expensePercentChange).toBe(50); // 50% increase
  });
});
