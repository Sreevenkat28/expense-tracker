import { describe, it, expect } from 'vitest';
import { correctSpelling, editDistance } from '../services/spellcheck';
import { answerQuestionDetailed, AssistantContext } from '../services/assistant';
import { calculateMonthSummary, calculateCategorySpending } from '../utils/calculations';
import { Transaction } from '../types';

describe('Spelling correction', () => {
  it('counts a swapped pair of letters as one mistake', () => {
    expect(editDistance('mcuh', 'much')).toBe(1);
    expect(editDistance('budgtes', 'budgets')).toBe(1);
    expect(editDistance('lghit', 'light')).toBe(2);
  });

  it('fixes common typos and scrambled words', () => {
    const fix = (s: string) => correctSpelling(s).text;
    expect(fix('turn on lghit mode')).toBe('turn on light mode');
    expect(fix('hw mcuh did i spnd on fod')).toBe('how much did i spend on food');
    expect(fix('wats ur nmae')).toBe('whats your name');
    expect(fix('opne my budgtes')).toBe('open my budgets');
    expect(fix('swtich to rupess')).toBe('switch to rupees');
    expect(fix('squre root of 144')).toBe('square root of 144');
    expect(fix('15 precent of 2000')).toBe('15 percent of 2000');
    expect(fix('thnks')).toBe('thanks');
    expect(fix('whats my incme')).toBe('whats my income');
    expect(fix('how much did i spend yesterdy')).toBe('how much did i spend yesterday');
  });

  it('leaves correct text, numbers, symbols and short words alone', () => {
    for (const s of ['spent 250 on lunch', 'hello there', '₹1,250 on groceries', 'can i afford $5000', 'what is 15% of 2000']) {
      const r = correctSpelling(s);
      expect(r.changed, s).toBe(false);
      expect(r.text).toBe(s);
    }
  });

  it('learns words from your own data', () => {
    expect(correctSpelling('how much on starbuks', ['starbucks']).text).toBe('how much on starbucks');
    expect(correctSpelling('how is my emrgency fund', ['emergency']).text).toBe('how is my emergency fund');
  });
});

describe('Assistant understands misspelled messages', () => {
  const d = (n: number) => Math.round(n * 100);
  const txs: Transaction[] = [
    { id: '1', type: 'expense', amountCents: d(12), description: 'Coffee with team', category: 'Food and groceries', date: '2026-10-24', createdAt: '2026-10-24T01:00:00Z' },
    { id: '2', type: 'expense', amountCents: d(8), description: 'Groceries', category: 'Food and groceries', date: '2026-10-20', createdAt: '2026-10-20T01:00:00Z' },
  ];
  const ctx = (): AssistantContext => ({
    monthSummary: calculateMonthSummary(txs, '2026-10', 0, 0), categorySpendings: calculateCategorySpending(txs, '2026-10'), transactions: txs,
    selectedMonth: '2026-10', budgetConfig: { monthlyBudgetCents: 0, openingBalanceCents: 0 }, savingsGoals: [], today: '2026-10-25', currency: 'USD',
    convertCurrency: (a) => a * 95,
    profile: { name: 'Venkata Aditya', username: 'va', isGuest: false, role: 'admin', createdAt: '2026-10-01T00:00:00Z' },
  });
  const ask = (q: string) => answerQuestionDetailed(q, ctx());

  it('does what you meant', () => {
    expect(ask('turn on lghit mode').action).toEqual({ type: 'dark-mode', value: false });
    expect(ask('opne my budgtes').action).toEqual({ type: 'navigate', tab: 'budgets' });
    expect(ask('swtich to rupess').action).toEqual({ type: 'set-currency', code: 'INR' });
    expect(ask('squre root of 144').text).toContain('**12**');
    expect(ask('15 precent of 2000').text).toContain('**300**');
    expect(ask('helo')).toMatchObject({ kind: 'chat' });
    expect(ask('wats ur nmae')).toMatchObject({ kind: 'identity' });
    expect(ask('whats my nmae').text).toContain('Venkata Aditya');
  });

  it('answers money questions with typos, and says how it read them', () => {
    const a = ask('hw mcuh did i spnd on fod');
    expect(a.kind).toBe('data');
    expect(a.text).toContain('**$20.00**');
    expect(a.text).toContain('I read that as "how much did i spend on food"');
    expect(ask('how much did i spend on cofee').text).toContain('**$12.00** on **coffee**');
  });

  it('does not add a note for plain chit-chat, or for text it already understood', () => {
    expect(ask('helo').text).not.toContain('I read that as');
    expect(ask('how much did I spend on food').text).not.toContain('I read that as');
  });

  it('never turns nonsense or off-topic requests into something in-app', () => {
    for (const q of ['purple monkey dishwasher', 'I want a pizzza', 'whats the wether', 'tell me a storey', 'banana', 'qwertyuiop']) {
      expect(ask(q).kind, q).toBe('out-of-scope');
    }
  });
});
