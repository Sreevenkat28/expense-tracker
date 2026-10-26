import type { Transaction } from '../types';

/**
 * "Do I have enough money for this expense?"
 * Balance = starting bank balance + every income - every expense recorded so far (all in one currency).
 */

export interface BalanceCheck {
  balanceCents: number;
  amountCents: number;
  /** true when this expense would take the balance below zero */
  insufficient: boolean;
  /** how far below zero it would go (0 when there is enough) */
  shortfallCents: number;
  /** nothing at all recorded as money in: no income and no starting balance */
  noMoneyRecorded: boolean;
}

export function currentBalanceCents(transactions: Transaction[], openingBalanceCents: number, excludeId?: string): number {
  let balance = openingBalanceCents;
  for (const t of transactions) {
    if (t.id === excludeId) continue;
    balance += t.type === 'income' ? t.amountCents : -t.amountCents;
  }
  return balance;
}

export function checkExpenseAgainstBalance(
  transactions: Transaction[],
  openingBalanceCents: number,
  amountCents: number,
  excludeId?: string
): BalanceCheck {
  const balanceCents = currentBalanceCents(transactions, openingBalanceCents, excludeId);
  const after = balanceCents - amountCents;
  const anyMoneyIn = openingBalanceCents > 0 || transactions.some((t) => t.type === 'income' && t.id !== excludeId);
  return {
    balanceCents,
    amountCents,
    insufficient: after < 0,
    shortfallCents: after < 0 ? -after : 0,
    noMoneyRecorded: !anyMoneyIn,
  };
}
