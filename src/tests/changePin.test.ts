import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../services/authService';
import { answerQuestionDetailed } from '../services/assistant';
import type { AssistantContext } from '../services/assistantShared';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
}
beforeEach(() => { (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage(); });

describe('Change PIN / password', () => {
  it('changes the PIN only when the current one is right and the new one is valid', () => {
    const { user } = authService.register('Alice', 'alice', 'alice@gmail.com', '1234');
    expect(authService.changePin(user!.id, '9999', '5678')).toEqual({ success: false, error: 'Your current PIN is not correct.' });
    expect(authService.changePin(user!.id, '1234', '12').error).toMatch(/at least 4/);
    expect(authService.changePin(user!.id, '1234', '1234').error).toMatch(/different/);
    expect(authService.changePin('nobody', '1234', '5678').error).toMatch(/not found/);
    expect(authService.checkCredentials('alice', '1234').success).toBe(true); // nothing changed yet

    expect(authService.changePin(user!.id, ' 1234 ', ' 5678 ')).toEqual({ success: true });
    expect(authService.checkCredentials('alice', '1234').success).toBe(false);
    expect(authService.checkCredentials('alice', '5678').success).toBe(true);
  });

  it('the assistant explains where it is', () => {
    const ctx = { monthSummary: {} as never, categorySpendings: [], transactions: [], selectedMonth: '2026-10', budgetConfig: { monthlyBudgetCents: 0, openingBalanceCents: 0 }, savingsGoals: [], today: '2026-10-25' } as AssistantContext;
    for (const q of ['how do I change my password', 'change my pin', 'I want to update my PIN']) {
      const a = answerQuestionDetailed(q, ctx);
      expect(a.kind, q).toBe('app');
      expect(a.text, q).toContain('Change PIN / password');
    }
    expect(answerQuestionDetailed('I forgot my pin', ctx).text).toContain('Forgot PIN?');
  });
});
