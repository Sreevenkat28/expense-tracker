import {
  Transaction,
  MonthSummary,
  CategorySpending,
  MonthComparison,
  SavingsSuggestion,
} from '../types';
import { formatCurrency } from './currency';

/**
 * Generate transparent, data-driven savings recommendations.
 * Clearly identified as estimates based on actual spending history.
 */
export function generateSavingsSuggestions(
  summary: MonthSummary,
  categorySpendings: CategorySpending[],
  comparison: MonthComparison,
  transactions: Transaction[]
): SavingsSuggestion[] {
  const suggestions: SavingsSuggestion[] = [];

  // 1. Budget Status Rule: Budget exceeded or near limit
  if (summary.budgetCents > 0) {
    if (summary.totalExpensesCents > summary.budgetCents) {
      const overspendCents = summary.totalExpensesCents - summary.budgetCents;
      suggestions.push({
        id: 'budget-exceeded',
        title: 'Monthly Budget Exceeded',
        description: `You have spent ${formatCurrency(summary.totalExpensesCents)}, which exceeds your monthly budget of ${formatCurrency(summary.budgetCents)} by ${formatCurrency(overspendCents)}. Consider trimming discretionary expenses for the rest of the period.`,
        severity: 'alert',
        type: 'budget_exceeded',
        potentialSavingsCents: overspendCents,
      });
    } else if (summary.budgetUsagePercent >= 80) {
      const remainingCents = summary.remainingBudgetCents;
      suggestions.push({
        id: 'budget-warning',
        title: 'Approaching Budget Limit (80%+)',
        description: `You have utilized ${summary.budgetUsagePercent.toFixed(1)}% of your monthly budget. You have ${formatCurrency(remainingCents)} remaining. Pace your spending to stay within your targets.`,
        severity: 'warning',
        type: 'budget_exceeded',
      });
    }
  }

  // 2. Spending Spikes compared to previous month
  const significantSpikes = comparison.categoryChanges.filter(
    (c) => c.diffCents > 4000 && (c.percentChange !== null && c.percentChange >= 20)
  );

  for (const spike of significantSpikes) {
    const projectedReductionCents = Math.round(spike.diffCents * 0.5); // Estimate 50% recovery of the spike
    suggestions.push({
      id: `spike-${spike.category}`,
      title: `Spending Increase in ${spike.category}`,
      description: `Spending in ${spike.category} grew by ${spike.percentChange?.toFixed(0)}% (+${formatCurrency(spike.diffCents)}) compared to last month. Reducing this back towards baseline could save an estimated ${formatCurrency(projectedReductionCents)}/month.`,
      severity: 'warning',
      type: 'spending_spike',
      potentialSavingsCents: projectedReductionCents,
    });
  }

  // 3. Dominant Category Rule (>30% of total spending)
  const dominantCategories = categorySpendings.filter(
    (c) => c.percentage >= 30 && c.amountCents > 15000 && c.category !== 'Bills and subscriptions'
  );

  for (const dominant of dominantCategories) {
    // 15% optimization estimate
    const estimatedSavingsCents = Math.round(dominant.amountCents * 0.15);
    suggestions.push({
      id: `dominant-${dominant.category}`,
      title: `High Concentration: ${dominant.category}`,
      description: `${dominant.category} accounts for ${dominant.percentage.toFixed(1)}% of your total spending this month (${formatCurrency(dominant.amountCents)}). A modest 15% reduction would yield an estimated ${formatCurrency(estimatedSavingsCents)} in extra monthly savings.`,
      severity: 'info',
      type: 'high_category',
      potentialSavingsCents: estimatedSavingsCents,
    });
  }

  // 4. Recurring Bills and Subscriptions Audit
  const recurringCategory = categorySpendings.find(
    (c) => c.category === 'Bills and subscriptions'
  );
  if (recurringCategory && recurringCategory.amountCents > 10000) {
    // Estimate reviewing 1 or 2 unused subscriptions (~$25 - $35/mo)
    const subscriptionSavingsEstimate = Math.min(3500, Math.round(recurringCategory.amountCents * 0.1));
    suggestions.push({
      id: 'subscription-audit',
      title: 'Review Recurring Subscriptions',
      description: `You have ${formatCurrency(recurringCategory.amountCents)} recorded in Bills and Subscriptions. Auditing forgotten recurring services or negotiating rates can typically save an estimated ${formatCurrency(subscriptionSavingsEstimate)} each month.`,
      severity: 'info',
      type: 'recurring_review',
      potentialSavingsCents: subscriptionSavingsEstimate,
    });
  }

  // 5. Positive habit recognition when net savings is strong
  if (summary.totalIncomeCents > 0 && summary.savingsRatePercent >= 20) {
    suggestions.push({
      id: 'healthy-savings-rate',
      title: 'Strong Savings Rate',
      description: `Great financial health! You are saving ${summary.savingsRatePercent.toFixed(1)}% of your income this month (${formatCurrency(summary.netSavingsCents)} net savings). Consider allocating surplus funds to an emergency reserve or long-term goals.`,
      severity: 'success',
      type: 'positive_habit',
    });
  }

  // Fallback if no specific trigger fired
  if (suggestions.length === 0 && summary.totalExpensesCents > 0) {
    const modestTenPercent = Math.round(summary.totalExpensesCents * 0.1);
    suggestions.push({
      id: 'general-optimization',
      title: 'Pacing and Discretionary Budgeting',
      description: `Your spending is currently stable. Trimming discretionary spending across non-essential categories by just 10% could add an estimated ${formatCurrency(modestTenPercent)} to your monthly savings balance.`,
      severity: 'info',
      type: 'high_category',
      potentialSavingsCents: modestTenPercent,
    });
  }

  return suggestions;
}

/**
 * Summarize spending patterns into clear, human-readable insights.
 */
export function generateSpendingPatternSummaries(
  summary: MonthSummary,
  categorySpendings: CategorySpending[],
  comparison: MonthComparison
): string[] {
  const summaries: string[] = [];

  const activeCategories = categorySpendings.filter((c) => c.amountCents > 0);

  if (activeCategories.length > 0) {
    const top = activeCategories[0];
    summaries.push(
      `Your largest spending area is ${top.category}, representing ${top.percentage.toFixed(1)}% (${formatCurrency(top.amountCents)}) of total expenses.`
    );
  }

  if (summary.averageDailySpendingCents > 0) {
    summaries.push(
      `Your average daily expenditure is ${formatCurrency(summary.averageDailySpendingCents)} per day.`
    );
  }

  if (comparison.previousExpensesCents > 0) {
    const diff = comparison.expenseDiffCents;
    const pct = comparison.expensePercentChange;
    if (diff > 0 && pct !== null) {
      summaries.push(
        `Total expenses are currently up ${pct.toFixed(1)}% (+${formatCurrency(diff)}) compared to last month.`
      );
    } else if (diff < 0 && pct !== null) {
      summaries.push(
        `Total expenses are down ${Math.abs(pct).toFixed(1)}% (${formatCurrency(diff)}) compared to last month.`
      );
    } else {
      summaries.push(`Total expenses are identical to last month.`);
    }
  }

  if (summary.totalIncomeCents > 0) {
    if (summary.netSavingsCents > 0) {
      summaries.push(
        `You have retained ${summary.savingsRatePercent.toFixed(1)}% of your income as net savings (${formatCurrency(summary.netSavingsCents)}).`
      );
    } else if (summary.netSavingsCents < 0) {
      summaries.push(
        `Expenses currently exceed income by ${formatCurrency(Math.abs(summary.netSavingsCents))}.`
      );
    }
  }

  return summaries;
}
