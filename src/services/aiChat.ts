import { EMAIL_SERVICE, isEmailServiceConfigured } from '../config/emailConfig';
import { formatCurrency } from '../utils/currency';
import { formatMonthName, getTodayDateString } from '../utils/dates';
import type { AssistantContext } from './assistant';

/**
 * Real-AI replies. The question goes to the Google script (the same one that sends reset emails), which holds
 * the AI key privately and calls the AI service. The browser never sees the key. If the script has no key,
 * or the AI is busy or offline, the caller falls back to the built-in assistant.
 */

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export type AskAIResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'not-configured' | 'limit' | 'unavailable'; message?: string };

const CLIENT_ID_KEY = 'expense_tracker_client_id';
let skipUntil = 0; // after "not configured", don't ask again for a while

function clientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = `c${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

/** Short text version of the user's totals. Individual transactions are never included. */
export function buildSummary(ctx: AssistantContext, currencyCode: string, today: string = ctx.today ?? getTodayDateString()): string {
  const m = ctx.monthSummary;
  const money = (c: number) => formatCurrency(c);
  const lines = [
    `Today's date: ${today}. Display currency: ${currencyCode}.`,
    `Month shown in the app: ${formatMonthName(ctx.selectedMonth)}.`,
    `Income: ${money(m.totalIncomeCents)}. Expenses: ${money(m.totalExpensesCents)}. Net: ${money(m.netSavingsCents)}. Transactions this month: ${m.transactionCount}.`,
    m.budgetCents > 0
      ? `Monthly budget: ${money(m.budgetCents)}, remaining ${money(m.remainingBudgetCents)} (${m.budgetUsagePercent.toFixed(1)}% used).`
      : 'Monthly budget: not set.',
    `Average daily spending: ${money(m.averageDailySpendingCents)}.`,
  ];
  const cats = ctx.categorySpendings.filter((c) => c.amountCents > 0).slice(0, 8);
  if (cats.length) lines.push(`Spending by category: ${cats.map((c) => `${c.category} ${money(c.amountCents)} (${c.percentage.toFixed(0)}%)`).join('; ')}.`);
  if (ctx.savingsGoals.length)
    lines.push(`Savings goals: ${ctx.savingsGoals.map((g) => `${g.name} ${money(g.currentCents)} of ${money(g.targetCents)}`).join('; ')}.`);
  lines.push(`Total transactions recorded overall: ${ctx.transactions.length}.`);
  return lines.join('\n');
}

export async function askAI(
  params: { question: string; history: ChatTurn[]; facts?: string; summary: string },
  fetchImpl: typeof fetch = (...args) => fetch(...args),
  timeoutMs = 25000
): Promise<AskAIResult> {
  if (!isEmailServiceConfigured()) return { ok: false, reason: 'not-configured' };
  if (Date.now() < skipUntil) return { ok: false, reason: 'not-configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(EMAIL_SERVICE.scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'chat',
        clientId: clientId(),
        question: params.question,
        history: params.history.slice(-8),
        facts: params.facts ?? '',
        summary: params.summary,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const data = (await res.json()) as { ok: boolean; text?: string; error?: string };
    if (data.ok && data.text) return { ok: true, text: data.text };
    if (data.error === 'AI_NOT_CONFIGURED') {
      skipUntil = Date.now() + 10 * 60 * 1000;
      return { ok: false, reason: 'not-configured' };
    }
    if (data.error === 'LIMIT_HOURLY') return { ok: false, reason: 'limit', message: "You've asked a lot of questions in the last hour, so I'm switching to my built-in answers for a while." };
    if (data.error === 'LIMIT_DAILY') return { ok: false, reason: 'limit', message: "I've reached my AI limit for today, so I'm using my built-in answers." };
    return { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

/** For tests: forget that the AI was found to be unconfigured. */
export function resetAiState(): void {
  skipUntil = 0;
}
