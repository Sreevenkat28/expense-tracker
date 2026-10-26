import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import type { BalanceCheck } from '../../utils/balance';

/** Shown before an expense is saved when it would take your balance below zero. */
export const BalanceWarning: React.FC<{ check: BalanceCheck }> = ({ check }) => {
  const { formatAmount } = useExpense();
  return (
    <div role="alert" className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/70 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex gap-2.5 items-start">
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <div className="font-bold">{check.noMoneyRecorded ? "You don't have any balance yet" : 'Not enough balance for this expense'}</div>
        <p className="m-0 leading-relaxed">
          {check.noMoneyRecorded
            ? `You haven't recorded any income or a starting balance, so your balance is ${formatAmount(check.balanceCents)}. `
            : `Your balance is ${formatAmount(check.balanceCents)} and this expense is ${formatAmount(check.amountCents)}, `}
          {check.noMoneyRecorded ? `This ${formatAmount(check.amountCents)} expense would put you ` : "so you'd be "}
          <strong>{formatAmount(check.shortfallCents)} below zero</strong>.
        </p>
        <p className="m-0 leading-relaxed text-amber-800/90 dark:text-amber-300/80">
          Record your income, or set a starting balance in Budgets, first. Or press <strong>Add anyway</strong> if you're sure.
        </p>
      </div>
    </div>
  );
};
