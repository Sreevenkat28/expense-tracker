import { describe, it, expect } from 'vitest';
import { parseSmartTransaction, answerSpendingQuestion } from '../services/aiService';
import { isValidAmount } from '../utils/currency';
import { calculateMonthSummary, calculateCategorySpending } from '../utils/calculations';
import { Transaction, BudgetConfig, SavingsGoal } from '../types';

describe('Validation & Smart Natural Language Parser', () => {
  it('correctly parses "Spent ₹250 on lunch"', () => {
    const res = parseSmartTransaction('Spent ₹250 on lunch', '2026-10-20');
    expect(res.success).toBe(true);
    expect(res.amountCents).toBe(25000);
    expect(res.type).toBe('expense');
    expect(res.category).toBe('Food and groceries');
    expect(res.description.toLowerCase()).toContain('lunch');
  });

  it('correctly parses "Spent $45 on groceries"', () => {
    const res = parseSmartTransaction('Spent $45 on groceries', '2026-10-20');
    expect(res.success).toBe(true);
    expect(res.amountCents).toBe(4500);
    expect(res.type).toBe('expense');
    expect(res.category).toBe('Food and groceries');
  });

  it('correctly parses "Earned $1200 from freelance client"', () => {
    const res = parseSmartTransaction('Earned $1200 from freelance client', '2026-10-20');
    expect(res.success).toBe(true);
    expect(res.amountCents).toBe(120000);
    expect(res.type).toBe('income');
    expect(res.category).toBe('Freelance');
  });

  it('correctly parses "Paid $80 for electric bill"', () => {
    const res = parseSmartTransaction('Paid $80 for electric bill', '2026-10-20');
    expect(res.success).toBe(true);
    expect(res.amountCents).toBe(8000);
    expect(res.type).toBe('expense');
    expect(res.category).toBe('Bills and subscriptions');
  });

  it('rejects empty, zero, or negative amounts gracefully', () => {
    expect(isValidAmount('').valid).toBe(false);
    expect(isValidAmount('0').valid).toBe(false);
    expect(isValidAmount('-15').valid).toBe(false);
    expect(isValidAmount('abc').valid).toBe(false);

    expect(isValidAmount('25.50').valid).toBe(true);
    expect(isValidAmount('25.50').cents).toBe(2550);
  });
});

describe('AI Grounded Spending Assistant', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      type: 'income',
      amountCents: 300000,
      description: 'Monthly Salary',
      category: 'Salary',
      date: '2026-10-01',
      createdAt: '2026-10-01T08:00:00Z',
    },
    {
      id: 'tx-2',
      type: 'expense',
      amountCents: 50000,
      description: 'Supermarket Groceries',
      category: 'Food and groceries',
      date: '2026-10-05',
      createdAt: '2026-10-05T08:00:00Z',
    },
  ];

  const budgetConfig: BudgetConfig = {
    monthlyBudgetCents: 200000,
    openingBalanceCents: 100000,
  };

  const savingsGoals: SavingsGoal[] = [
    {
      id: 'goal-1',
      name: 'Emergency Fund',
      targetCents: 500000,
      currentCents: 250000,
      createdAt: '2026-09-01T00:00:00Z',
    },
  ];

  const monthSummary = calculateMonthSummary(transactions, '2026-10', 100000, 200000);
  const categorySpendings = calculateCategorySpending(transactions, '2026-10');

  it('answers budget question with exact calculated remaining amount', () => {
    const answer = answerSpendingQuestion('Am I within my budget?', {
      monthSummary,
      categorySpendings,
      transactions,
      selectedMonth: '2026-10',
      budgetConfig,
      savingsGoals,
    });
    // Total budget 2000, spent 500, remaining 1500
    expect(answer).toContain('$1,500.00');
    expect(answer).toContain('Budget Status');
  });

  it('answers food category question with exact food total', () => {
    const answer = answerSpendingQuestion('How much did I spend on food?', {
      monthSummary,
      categorySpendings,
      transactions,
      selectedMonth: '2026-10',
      budgetConfig,
      savingsGoals,
    });
    expect(answer).toContain('$500.00');
    expect(answer).toContain('Food and Groceries');
  });

  it('answers savings goals question with real goals and percentages', () => {
    const answer = answerSpendingQuestion('How are my savings goals?', {
      monthSummary,
      categorySpendings,
      transactions,
      selectedMonth: '2026-10',
      budgetConfig,
      savingsGoals,
    });
    expect(answer).toContain('Emergency Fund');
    expect(answer).toContain('$2,500.00');
    expect(answer).toContain('$5,000.00');
    expect(answer).toContain('50%');
  });
});
