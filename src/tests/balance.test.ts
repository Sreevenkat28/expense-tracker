import { describe, it, expect } from 'vitest';
import { checkExpenseAgainstBalance, currentBalanceCents } from '../utils/balance';
import type { Transaction } from '../types';

const d = (n: number) => Math.round(n * 100);
const tx = (id: string, type: 'income' | 'expense', dollars: number): Transaction => ({ id, type, amountCents: d(dollars), description: id, category: type === 'income' ? 'Salary' : 'Other', date: '2026-10-01', createdAt: '' });

describe('Balance warning', () => {
  it('adds the starting balance and income, and subtracts expenses', () => {
    expect(currentBalanceCents([tx('a', 'income', 1000), tx('b', 'expense', 250)], d(100))).toBe(d(850));
  });

  it('allows an expense the balance covers (even exactly)', () => {
    const t = [tx('a', 'income', 100)];
    expect(checkExpenseAgainstBalance(t, 0, d(60)).insufficient).toBe(false);
    expect(checkExpenseAgainstBalance(t, 0, d(100)).insufficient).toBe(false);
  });

  it('warns when the expense takes the balance below zero, and says by how much', () => {
    const c = checkExpenseAgainstBalance([tx('a', 'income', 100), tx('b', 'expense', 70)], 0, d(50));
    expect(c).toMatchObject({ insufficient: true, balanceCents: d(30), shortfallCents: d(20), noMoneyRecorded: false });
  });

  it('warns when there is no balance at all', () => {
    const c = checkExpenseAgainstBalance([], 0, d(5));
    expect(c).toMatchObject({ insufficient: true, balanceCents: 0, shortfallCents: d(5), noMoneyRecorded: true });
  });

  it('a starting balance counts as money', () => {
    expect(checkExpenseAgainstBalance([], d(500), d(20))).toMatchObject({ insufficient: false, noMoneyRecorded: false });
  });

  it('when editing, the entry being edited does not count against itself', () => {
    const t = [tx('a', 'income', 100), tx('b', 'expense', 80)]; // balance 20
    expect(checkExpenseAgainstBalance(t, 0, d(90)).insufficient).toBe(true); // as a new expense it would not fit
    expect(checkExpenseAgainstBalance(t, 0, d(90), 'b').insufficient).toBe(false); // replacing the $80 one with $90 is fine (100 - 90)
  });
});
