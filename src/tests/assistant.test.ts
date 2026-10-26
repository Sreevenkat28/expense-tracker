import { describe, it, expect } from 'vitest';
import { answerSpendingQuestion } from '../services/aiService';
import { calculateMonthSummary, calculateCategorySpending } from '../utils/calculations';
import { Transaction, SavingsGoal, BudgetConfig } from '../types';

const d = (dollars: number) => Math.round(dollars * 100);
let n = 0;
const tx = (type: 'expense' | 'income', dollars: number, description: string, category: Transaction['category'], date: string): Transaction =>
  ({ id: `t${++n}`, type, amountCents: d(dollars), description, category, date, createdAt: `${date}T0${n % 9}:00:00Z` });

const transactions: Transaction[] = [
  tx('income', 1000, 'Salary', 'Salary', '2026-10-01'),
  tx('expense', 500, 'Rent payment', 'Bills and subscriptions', '2026-10-01'),
  tx('expense', 12, 'Coffee with team', 'Food and groceries', '2026-10-24'),
  tx('expense', 8, 'Groceries', 'Food and groceries', '2026-10-20'),
  tx('expense', 30, 'Flight tickets', 'Transportation', '2026-10-25'),
  tx('expense', 7, 'Groceries', 'Food and groceries', '2026-09-15'),
  tx('expense', 20, 'Gym', 'Education', '2026-09-10'),
];
const budgetConfig: BudgetConfig = { monthlyBudgetCents: d(600), openingBalanceCents: d(100), categoryBudgets: { 'Food and groceries': d(15) } };
const goals: SavingsGoal[] = [
  { id: 'g1', name: 'Emergency Fund', targetCents: d(5000), currentCents: d(2500), createdAt: '', targetDate: '2027-04-25' },
  { id: 'g2', name: 'Laptop', targetCents: d(1000), currentCents: d(900), createdAt: '' },
];
const ask = (q: string, extra: Record<string, unknown> = {}) =>
  answerSpendingQuestion(q, {
    monthSummary: calculateMonthSummary(transactions, '2026-10', d(100), d(600)),
    categorySpendings: calculateCategorySpending(transactions, '2026-10'),
    transactions, selectedMonth: '2026-10', budgetConfig, savingsGoals: goals, today: '2026-10-25', ...extra,
  });

describe('The assistant answers the question that was asked', () => {
  it('gives a direct total for a category, with the share and the trend', () => {
    const a = ask('How much did I spend on food?');
    expect(a).toMatch(/^You spent \*\*\$20\.00\*\* on \*\*Food and Groceries\*\* in \*\*October 2026\*\*, across 2 transactions/);
    expect(a).toContain('$13.00 more'); // vs September groceries $7.00
  });

  it('answers for a named item, not the whole category', () => {
    expect(ask('How much did I spend on coffee?')).toContain('**$12.00** on **coffee**');
    expect(ask('how much on rent')).toContain('**$500.00** on **rent**');
  });

  it('understands time words', () => {
    expect(ask('How much did I spend today?')).toContain('**$30.00**');
    expect(ask('How much did I spend today?')).toContain('**today**');
    expect(ask('How much did I spend yesterday?')).toMatch(/\*\*\$12\.00\*\*.*\*\*yesterday\*\*/); // the coffee
    expect(ask('How much did I spend on 2026-10-12?')).toContain("haven't spent anything");
    expect(ask('What did I spend in September?')).toContain('**$27.00**');
    expect(ask('how much did I spend last month')).toContain('**$27.00**');
    expect(ask('Food spending last month?')).toContain('**$7.00**');
  });

  it('answers income questions', () => {
    expect(ask('How much did I earn this month?')).toMatch(/^You earned \*\*\$1,000\.00\*\*/);
  });

  it('answers yes/no comparisons with the numbers', () => {
    const a = ask('Did I spend more than last month?');
    expect(a).toMatch(/^Yes\. You spent \*\*\$523\.00 more\*\*/);
    expect(a).toContain('$550.00');
    expect(ask('Did I spend less than last month?')).toMatch(/^No\./);
  });

  it('finds the biggest expense and top category', () => {
    expect(ask('What was my biggest expense?')).toContain('**"Rent payment"**: **$500.00**');
    expect(ask('What was my biggest expense this week?')).toContain('**"Flight tickets"**'); // only this week's items
    expect(ask('Where did most of my money go?')).toMatch(/went to \*\*Bills and Subscriptions\*\*/);
    expect(ask('which category did I spend the most on')).toContain('**Bills and Subscriptions**');
  });

  it('counts and averages', () => {
    expect(ask('How many transactions did I make?')).toContain('**5 transactions**');
    expect(ask('How many expenses this month')).toContain('**4 expenses**');
    expect(ask('What is my average daily spending?')).toMatch(/about \*\*\$22\.00 per day\*\*/); // $550 over 25 days
  });

  it('checks the budget with a yes/no first, and a category limit when asked', () => {
    const within = ask('Am I within my budget?');
    expect(within).toContain('Budget Status');
    expect(within).toMatch(/Yes, you're within your budget\. You have \*\*\$50\.00\*\* left/);
    expect(ask('Am I within my food budget?')).toMatch(/Yes\. You have \*\*\$-?5\.00\*\* left in your \*\*Food and Groceries\*\* limit|over\*\* your/);
  });

  it('answers "can I afford" against what is left', () => {
    expect(ask('Can I afford 40?')).toMatch(/Yes, you can afford \$40\.00.*\$10\.00/);
    expect(ask('Can I afford $100 this month?')).toMatch(/over budget.*\$50\.00 over/);
    expect(ask('can I afford it?')).toContain('How much is it?');
  });

  it('reports net savings and balance', () => {
    expect(ask('How much did I save this month?')).toMatch(/You saved \*\*\$450\.00\*\*/);
    expect(ask('What is my balance?')).toContain('$550.00'); // ending balance incl. $100 opening
  });

  it('answers goal questions directly, including a named goal', () => {
    expect(ask('How are my savings goals doing?')).toMatch(/closest goal is \*\*Laptop\*\* at \*\*90%\*\*/);
    expect(ask('How is my Emergency Fund doing?')).toMatch(/Emergency Fund\*\* is at \*\*50%\*\*.*\$2,500\.00.*to go/);
    expect(ask('How is my Emergency Fund doing?')).toContain('per month');
  });

  it('lists recent transactions only when asked to', () => {
    const a = ask('show my last 3 transactions');
    expect(a).toContain('3 most recent');
    expect(a.split('\n').filter((l) => l.startsWith('•')).length).toBe(3);
  });

  it('follow-up questions reuse the earlier question', () => {
    expect(ask('and last month?', { previousQuestion: 'How much did I spend on food?' })).toContain('**$7.00** on **Food and Groceries** in **September 2026**');
    expect(ask('what about transport?', { previousQuestion: 'How much did I spend this month?' })).toContain('**$30.00** on **Transportation**');
    // gibberish after a real question must not inherit its meaning
    const g = ask('blah blah purple', { previousQuestion: 'How many transactions do I have?' });
    expect(g).toMatch(/not sure what you'd like to know|couldn't find anything matching/);
    expect(g).not.toMatch(/\d+ transactions/);
  });

  it('is friendly to greetings and never dumps your numbers when it is unsure', () => {
    expect(ask('hi')).toContain('Try asking');
    const unsure = ask('purple monkey dishwasher');
    expect(unsure).toMatch(/couldn't find anything matching|not sure what you'd like to know/);
    expect(unsure).not.toMatch(/\$\d/); // no financial numbers listed
    expect(ask('how much did I spend on helicopters')).toContain("couldn't find anything matching");
  });
});
