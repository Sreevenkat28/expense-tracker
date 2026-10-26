import { describe, it, expect } from 'vitest';
import { buildReport, reportToText, whatsappLink, gmailLink, mailtoLink, fitForLink, reportFileName } from '../utils/report';
import { buildReportPdf, sanitizeForPdf, textWidth } from '../utils/reportPdf';
import { calculateMonthSummary } from '../utils/calculations';
import type { Transaction, BudgetConfig, SavingsGoal } from '../types';

const d = (n: number) => Math.round(n * 100);
const cats = ['Food and groceries', 'Transportation', 'Shopping', 'Bills and subscriptions'] as const;
const mk = (i: number, over: Partial<Transaction> = {}): Transaction => ({
  id: `t${i}`, type: 'expense', amountCents: d(5 + (i % 9) * 3.5), description: `Item number ${i} with a fairly long description to test fitting`, category: cats[i % 4],
  date: `2026-10-${String(1 + (i % 27)).padStart(2, '0')}`, createdAt: `2026-10-01T00:${String(i % 60).padStart(2, '0')}:00Z`, ...over,
});
const txs: Transaction[] = [
  { id: 'inc1', type: 'income', amountCents: d(5000), description: 'Salary (October)', category: 'Salary', date: '2026-10-01', createdAt: '2026-10-01T00:00:00Z' },
  ...Array.from({ length: 70 }, (_, i) => mk(i)),
  { id: 'old', type: 'expense', amountCents: d(999), description: 'September thing', category: 'Other', date: '2026-09-15', createdAt: '' },
];
const budget: BudgetConfig = { monthlyBudgetCents: d(1500), openingBalanceCents: d(200) };
const goals: SavingsGoal[] = [{ id: 'g', name: 'Trip to Goa', targetCents: d(1000), currentCents: d(250), createdAt: '' }];
const input = { transactions: txs, selectedMonth: '2026-10', budgetConfig: budget, savingsGoals: goals, currency: 'USD', ownerName: 'Test User', today: '2026-10-26' };

describe('Monthly report', () => {
  const r = buildReport(input);

  it('matches the dashboard numbers and only includes the chosen month', () => {
    const s = calculateMonthSummary(txs, '2026-10', budget.openingBalanceCents, budget.monthlyBudgetCents);
    expect(r.incomeCents).toBe(s.totalIncomeCents);
    expect(r.expenseCents).toBe(s.totalExpensesCents);
    expect(r.netCents).toBe(s.netSavingsCents);
    expect(r.transactionCount).toBe(71);
    expect(r.transactions.some((t) => t.id === 'old')).toBe(false);
    expect(r.categories.reduce((n, c) => n + c.cents, 0)).toBe(r.expenseCents);
    expect(r.topExpenses).toHaveLength(5);
    expect(r.topExpenses[0].amountCents).toBeGreaterThanOrEqual(r.topExpenses[4].amountCents);
    expect(r.goals[0]).toMatchObject({ name: 'Trip to Goa', percent: 25 });
  });

  it('writes a readable message for WhatsApp and for email', () => {
    const wa = reportToText(r, 'whatsapp');
    expect(wa).toContain('📊 *Expense report: October 2026*');
    expect(wa).toContain('*Summary*');
    expect(wa).toContain('Prepared for Test User on Oct 26, 2026');
    expect(wa).toContain('Latest 15 of 71 transactions');
    expect(wa).toContain('The full list is in the PDF report.');
    const plain = reportToText(r, 'plain');
    expect(plain).toContain('Expense report: October 2026');
    expect(plain).not.toMatch(/[*📊]/);
    expect(plain).toMatch(/Income: \$5,000\.00 \(1 entry\)/);
    expect(plain).toContain('Trip to Goa: $250.00 of $1,000.00 (25%)');
  });

  it('builds links that carry the report', () => {
    const text = reportToText(r, 'whatsapp');
    const wa = whatsappLink(text);
    expect(wa.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(wa.split('text=')[1])).toBe(fitForLink(text, 4000));
    expect(gmailLink('Subject here', 'Body').startsWith('https://mail.google.com/mail/?view=cm&fs=1&su=Subject%20here&body=Body')).toBe(true);
    const mailto = mailtoLink('S', 'x'.repeat(5000));
    expect(decodeURIComponent(mailto.split('body=')[1]).length).toBeLessThanOrEqual(1800);
    expect(decodeURIComponent(mailto.split('body=')[1])).toContain('Report shortened');
    expect(reportFileName(r)).toBe('expense-report-2026-10.pdf');
  });

  it('copes with an empty month', () => {
    const empty = buildReport({ ...input, selectedMonth: '2025-01' });
    expect(empty.transactionCount).toBe(0);
    expect(reportToText(empty)).toContain('Income: $0.00 (0 entries)');
    expect(buildReportPdf(empty)).toContain('No transactions were recorded this month.');
  });
});

describe('PDF file', () => {
  const r = buildReport(input);
  const pdf = buildReportPdf(r);

  it('is a well-formed PDF: header, every object where the index says, correct lengths, end marker', () => {
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    const startxref = Number(/startxref\n(\d+)\n/.exec(pdf)![1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe('xref');
    const entries = [...pdf.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    entries.forEach((offset, i) => expect(pdf.slice(offset, offset + `${i + 1} 0 obj`.length), `object ${i + 1}`).toBe(`${i + 1} 0 obj`));
    const size = Number(/\/Size (\d+)/.exec(pdf)![1]);
    expect(entries.length + 1).toBe(size);
    for (const m of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) expect(m[2].length).toBe(Number(m[1]));
  });

  it('is plain ASCII (so file offsets are exact) and has several pages for a long month', () => {
    expect(/^[\x09\x0a\x0d\x20-\x7e]*$/.test(pdf)).toBe(true);
    const count = Number(/\/Count (\d+)/.exec(pdf)![1]);
    expect(count).toBeGreaterThanOrEqual(2);
    expect((pdf.match(/\/Type \/Page /g) ?? []).length).toBe(count);
    for (let i = 1; i <= count; i++) expect(pdf).toContain(`(Page ${i} of ${count}) Tj`);
  });

  it('contains the report content', () => {
    for (const s of ['(Expense Report) Tj', '(October 2026) Tj', '(Prepared for Test User) Tj', '(Spending by category) Tj', '(Savings goals) Tj', '(USD 5,000.00) Tj', '(Trip to Goa) Tj']) expect(pdf).toContain(s);
    expect(pdf).toContain('(All transactions \\(71\\)) Tj');
  });

  it('handles special characters safely', () => {
    expect(sanitizeForPdf('Café – “quoted” ₹500 (rent) \\ 日本')).toBe('Cafe - "quoted" ?500 (rent) \\ ??');
    const nasty = buildReportPdf(buildReport({ ...input, transactions: [{ ...txs[1], description: 'Tea (large) \\ ) ( ₹ 日本語' }] }));
    expect(/^[\x09\x0a\x0d\x20-\x7e]*$/.test(nasty)).toBe(true);
    expect(nasty).toContain('(Tea \\(large\\) \\\\ \\) \\( ? ???)');
  });

  it('measures text so columns line up', () => {
    expect(textWidth('iiii', 10)).toBeLessThan(textWidth('MMMM', 10));
    expect(textWidth('Hello', 20)).toBeCloseTo(2 * textWidth('Hello', 10), 5);
  });
});
