import { describe, it, expect } from 'vitest';
import { answerQuestionDetailed, AssistantContext } from '../services/assistant';
import { calculateMonthSummary, calculateCategorySpending } from '../utils/calculations';
import { Transaction } from '../types';

const d = (n: number) => Math.round(n * 100);
const transactions: Transaction[] = [
  { id: '1', type: 'income', amountCents: d(1000), description: 'Salary', category: 'Salary', date: '2026-10-01', createdAt: '2026-10-01T00:00:00Z' },
  { id: '2', type: 'expense', amountCents: d(500), description: 'Rent payment', category: 'Bills and subscriptions', date: '2026-10-01', createdAt: '2026-10-01T01:00:00Z' },
  { id: '3', type: 'expense', amountCents: d(12), description: 'Coffee with team', category: 'Food and groceries', date: '2026-10-24', createdAt: '2026-10-24T01:00:00Z' },
  { id: '4', type: 'expense', amountCents: d(30), description: 'Flight tickets', category: 'Transportation', date: '2026-10-25', createdAt: '2026-10-25T01:00:00Z' },
];
const baseCtx = (over: Partial<AssistantContext> = {}): AssistantContext => ({
  monthSummary: calculateMonthSummary(transactions, '2026-10', 0, d(600)),
  categorySpendings: calculateCategorySpending(transactions, '2026-10'),
  transactions, selectedMonth: '2026-10', budgetConfig: { monthlyBudgetCents: d(600), openingBalanceCents: 0 }, savingsGoals: [],
  today: '2026-10-25', currency: 'USD', exchangeRateNote: '1 USD = 95 INR',
  convertCurrency: (a, f, t) => (f === 'USD' && t === 'INR' ? a * 95 : f === 'INR' && t === 'USD' ? a / 95 : a),
  profile: { name: 'Venkata Aditya', username: 'va', email: 'va@gmail.com', role: 'admin', createdAt: '2026-10-01T00:00:00Z', lastLoginAt: '2026-10-24T09:00:00Z', currency: 'USD', isGuest: false },
  ...over,
});
const ask = (q: string, over: Partial<AssistantContext> = {}) => answerQuestionDetailed(q, baseCtx(over));
const REFUSAL = 'Sorry, I can only help with things related to this app';

describe('Assistant: profile questions', () => {
  it('answers about the user from their real profile', () => {
    expect(ask('What is my name?')).toMatchObject({ kind: 'profile' });
    expect(ask('what is my name').text).toContain('**Venkata Aditya**');
    expect(ask('who am i').text).toContain('Venkata Aditya');
    expect(ask('what is my username').text).toContain('@va');
    expect(ask('what is my email?').text).toContain('va@gmail.com');
    expect(ask('am I an admin?').text).toMatch(/Yes, you're an \*\*admin\*\*/);
    expect(ask('when did I join?').text).toContain('Oct 1, 2026');
    expect(ask('when was my last login').text).toContain('Oct 24, 2026');
    const full = ask('show my profile').text;
    expect(full).toMatch(/Name:\*\* Venkata Aditya[\s\S]*Username:\*\* @va[\s\S]*Email:\*\* va@gmail.com[\s\S]*Role:\*\* Admin[\s\S]*4 transactions/);
    expect(ask('what is my name and email').text).toContain('Email:');
  });

  it('tells standard users and guests the truth', () => {
    const guest = ask('what is my name', { profile: { name: 'Guest', username: '', isGuest: true } });
    expect(guest.text).toContain('guest ledger');
    expect(ask('what currency am I using').text).toContain('**USD**');
  });

  it("its own name is not the user's name", () => {
    expect(ask('what is your name')).toMatchObject({ kind: 'identity' });
    expect(ask('who made you')).toMatchObject({ kind: 'identity' });
    expect(ask('thanks')).toMatchObject({ kind: 'chat' });
    expect(ask('what is your name').text).toContain('My name is the AI Financial Assistant');
    expect(ask('what is my name').text).not.toContain('AI Financial Assistant');
  });
});

describe('Assistant: maths', () => {
  it('solves math problems', () => {
    expect(ask('what is 15% of 2000')).toMatchObject({ kind: 'math' });
    expect(ask('what is 15% of 2000').text).toContain('**300**');
    expect(ask('25 * 4').text).toContain('**100**');
    expect(ask('what is 1200 divided by 4?').text).toContain('**300**');
    expect(ask('split 900 between 3').text).toContain('**300** each');
    expect(ask('sqrt(144)').text).toContain('**12**');
    expect(ask('10/0').text).toContain("can't divide by zero");
  });
});

describe('Assistant: doing things in the app', () => {
  it('opens the add form', () => {
    for (const q of ['I want to add an expense', 'add a transaction', 'record an expense', 'new income']) expect(ask(q).action, q).toEqual({ type: 'open-add' });
  });

  it('opens pages', () => {
    expect(ask('open my budgets').action).toEqual({ type: 'navigate', tab: 'budgets' });
    expect(ask('go to the savings page').action).toEqual({ type: 'navigate', tab: 'savings' });
    expect(ask('take me to insights').action).toEqual({ type: 'navigate', tab: 'insights' });
    expect(ask('open transactions').action).toEqual({ type: 'navigate', tab: 'transactions' });
    expect(ask('open the admin tab').action).toEqual({ type: 'navigate', tab: 'admin' });
    const std = { profile: { ...baseCtx().profile!, role: 'user' as const } };
    for (const q of ['open the admin tab', 'what is the admin tab', 'am i an admin']) {
      const r = ask(q, std);
      expect(r.action).toBeUndefined();
      expect(r.text).not.toMatch(/only available to admins|standard user|admins can|\*\*admin\*\*/i);
    }
  });

  it('switches currency and theme', () => {
    expect(ask('switch to rupees').action).toEqual({ type: 'set-currency', code: 'INR' });
    expect(ask('change currency to euro').action).toEqual({ type: 'set-currency', code: 'EUR' });
    expect(ask('use dollars').action).toEqual({ type: 'set-currency', code: 'USD' });
    expect(ask('turn on dark mode').action).toEqual({ type: 'dark-mode', value: true });
    expect(ask('switch to light mode').action).toEqual({ type: 'dark-mode', value: false });
    expect(ask('turn off dark mode').action).toEqual({ type: 'dark-mode', value: false });
    expect(ask('convert 100 dollars to rupees').text).toContain('₹9,500.00');
    expect(ask("what's the exchange rate").text).toContain('1 USD = 95 INR');
  });

  it('turns "I spent 250 on lunch" into a Smart Entry to review, never saving silently', () => {
    const a = ask('I spent 250 on lunch');
    expect(a.kind).toBe('app');
    expect(a.action).toMatchObject({ type: 'smart-entry' });
    expect((a.action as { text: string }).text).toContain('lunch');
    expect(a.text).toContain('Confirm & Add Transaction');
    expect(a.text).toContain('*Lunch*'); // not "I lunch"
    expect(ask('switch to rupees').text).toContain('1 USD ≈ 95 INR');
    expect(ask('use dollars').text).not.toContain('1 USD ≈');
    expect(ask('Paid ₹250 for coffee').action).toMatchObject({ type: 'smart-entry' });
    // a QUESTION about spending is not a statement to record
    expect(ask('how much did I spend on lunch').action).toBeUndefined();
  });

  it('opens the share window for "send my report" style requests', () => {
    for (const q of ['share my monthly report', 'send my expenses on whatsapp', 'email me a detailed report', 'I want a pdf report', 'share my summary on gmail'])
      expect(ask(q).action, q).toEqual({ type: 'share-report' });
    // but WhatsApp on its own is still not something the app can help with
    expect(ask('open whatsapp and call mom').kind).toBe('out-of-scope');
    // plain export questions still go to the CSV help
    expect(ask('how do I export my data').action).toEqual({ type: 'navigate', tab: 'transactions' });
  });

  it('never performs destructive actions itself', () => {
    for (const q of ['delete my account', 'sign me out', 'reset my ledger']) { const a = ask(q); expect(a.action, q).toBeUndefined(); expect(a.kind).toBe('app'); }
    expect(ask('delete my account').text).toContain('type DELETE');
  });
});

describe('Assistant: how-to help', () => {
  it('explains the app', () => {
    expect(ask('how do I export my data').text).toContain('CSV Export');
    expect(ask('how do I import a csv').text).toContain('CSV Import');
    expect(ask('I forgot my pin').text).toContain('Forgot PIN?');
    expect(ask('how do I sign out').text).toContain('profile card');
    expect(ask('how do I set a budget').action).toEqual({ type: 'navigate', tab: 'budgets' });
    expect(ask('how do I create a savings goal').action).toEqual({ type: 'navigate', tab: 'savings' });
    expect(ask('how do I edit a transaction').text).toContain('pencil');
    expect(ask('can I change my name').text).toContain("doesn't let you edit");
    expect(ask('what is this app').text).toContain('personal expense tracker');
    expect(ask('what can you do').text).toContain('I can only help with things related to this app');
  });
});

describe('Assistant: stays inside the app', () => {
  it('politely declines anything unrelated', () => {
    for (const q of [
      'What is the weather today?', 'Who is the president of France?', 'Write me a poem', 'what is the capital of India', 'I want a pizza',
      'I want a new car', 'tell me a story', 'how tall is the Eiffel tower', 'translate hello to french', 'recommend a movie',
      'what is the average salary in India', 'give me a recipe for biryani', 'who won the world cup', 'write python code to sort a list',
      'purple monkey dishwasher', 'I want a girlfriend', 'what is the meaning of life', 'order me a cab',
    ]) {
      const a = ask(q);
      expect(a.kind, q).toBe('out-of-scope');
      expect(a.text, q).toContain(REFUSAL);
      expect(a.text, q).not.toMatch(/\$\d/); // never leaks the user's numbers
    }
  });

  it('still answers everything that IS about the app', () => {
    for (const q of ['my expenses', 'how much did I spend this month', 'what is my balance', 'I want to know my balance', 'I want to see my budget', 'can I afford 100', 'how much on coffee', 'what did I spend yesterday', 'show my transactions', 'I want to see my transactions']) {
      expect(ask(q).kind, q).not.toBe('out-of-scope');
    }
    expect(ask('my expenses').text).toMatch(/You spent \*\*\$542\.00\*\*.*Most of it went to \*\*Bills and Subscriptions\*\*/);
  });

  it('a question using money words about something else is searched in the data, not answered from thin air', () => {
    expect(ask('how much did I spend on helicopters').text).toContain("couldn't find anything matching");
  });

  it('follow-ups still work, but a random short reply does not inherit the last question', () => {
    expect(ask('and last month?', { previousQuestion: 'how much did I spend on food' }).kind).toBe('data');
    expect(ask('banana', { previousQuestion: 'how much did I spend on food' }).kind).toBe('out-of-scope');
  });

  it('a greeting in front of an off-topic request is still declined', () => {
    expect(ask('hi what is the weather').text).toMatch(/^Hi! Sorry, I can only help/);
  });
});
