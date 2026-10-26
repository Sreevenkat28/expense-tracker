import type { MonthlyReport } from './report';

/**
 * Writes the monthly report as a real PDF file (A4, several pages if needed) with no extra libraries.
 * Uses the standard Helvetica fonts, so amounts are shown with the currency code ("INR 9,500.00") and
 * characters outside basic Latin appear as "?".
 */

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 44;

// Helvetica glyph widths (1/1000 em) for ASCII 32..126
const WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const C = {
  indigo: hex('#4f46e5'), ink: hex('#0f172a'), grey: hex('#64748b'), light: hex('#f1f5f9'), line: hex('#e2e8f0'),
  green: hex('#059669'), red: hex('#e11d48'), white: [1, 1, 1] as RGB, amber: hex('#d97706'),
};
const PALETTE = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#64748b'].map(hex);

export const sanitizeForPdf = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[–—]/g, '-').replace(/[·•]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/[^\x20-\x7e]/g, '?');

const escapePdf = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

export function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of sanitizeForPdf(s)) w += WIDTHS[ch.charCodeAt(0) - 32] ?? 556;
  return (w * size * (bold ? 1.06 : 1)) / 1000;
}

function fit(s: string, size: number, maxW: number, bold = false): string {
  let t = sanitizeForPdf(s);
  if (textWidth(t, size, bold) <= maxW) return t;
  while (t.length > 1 && textWidth(`${t}...`, size, bold) > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

const money = (cents: number, code: string) => `${cents < 0 ? '-' : ''}${code} ${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (n: number) => n.toFixed(2).replace(/\.?0+$/, '');

class Page {
  ops: string[] = [];
  text(x: number, y: number, str: string, size: number, o: { bold?: boolean; color?: RGB; align?: 'left' | 'right'; maxW?: number } = {}) {
    let t = o.maxW ? fit(str, size, o.maxW, o.bold) : sanitizeForPdf(str);
    const w = textWidth(t, size, o.bold);
    const px = o.align === 'right' ? x - w : x;
    const [r, g, b] = o.color ?? C.ink;
    this.ops.push(`BT /${o.bold ? 'F2' : 'F1'} ${fmt(size)} Tf ${fmt(r)} ${fmt(g)} ${fmt(b)} rg ${fmt(px)} ${fmt(PAGE_H - y)} Td (${escapePdf(t)}) Tj ET`);
    t = '';
  }
  rect(x: number, y: number, w: number, h: number, color: RGB) {
    this.ops.push(`${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg ${fmt(x)} ${fmt(PAGE_H - y - h)} ${fmt(w)} ${fmt(h)} re f`);
  }
}

export function buildReportPdf(r: MonthlyReport): string {
  const code = r.currency;
  const m = (c: number) => money(c, code);
  const pages: Page[] = [];
  let page = new Page();
  pages.push(page);
  let y = 0;

  const header = (continued: boolean) => {
    page.rect(0, 0, PAGE_W, continued ? 40 : 82, C.indigo);
    if (continued) {
      page.text(MARGIN, 26, `Expense report: ${r.monthLabel} (continued)`, 12, { bold: true, color: C.white });
      y = 64;
      return;
    }
    page.text(MARGIN, 40, 'Expense Report', 23, { bold: true, color: C.white });
    page.text(MARGIN, 64, r.monthLabel, 13, { color: C.white });
    page.text(PAGE_W - MARGIN, 40, `Generated ${r.generatedOn}`, 9, { color: C.white, align: 'right' });
    page.text(PAGE_W - MARGIN, 64, `Prepared for ${r.ownerName}`, 10, { color: C.white, align: 'right', bold: true, maxW: 260 });
    y = 108;
  };
  const newPage = () => {
    page = new Page();
    pages.push(page);
    header(true);
  };
  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - 56) newPage();
  };
  const heading = (title: string) => {
    ensure(40);
    page.text(MARGIN, y, title, 12.5, { bold: true });
    page.rect(MARGIN, y + 6, PAGE_W - 2 * MARGIN, 0.8, C.line);
    y += 24;
  };

  header(false);

  // Summary cards
  const cardW = (PAGE_W - 2 * MARGIN - 2 * 10) / 3;
  const cards: Array<[string, string, RGB, string?]> = [
    ['INCOME', m(r.incomeCents), C.green, `${r.incomeCount} ${r.incomeCount === 1 ? 'entry' : 'entries'}`],
    ['EXPENSES', m(r.expenseCents), C.red, `${r.expenseCount} ${r.expenseCount === 1 ? 'entry' : 'entries'}`],
    ['NET', `${r.netCents >= 0 ? '+' : ''}${m(r.netCents)}`, r.netCents >= 0 ? C.green : C.red, r.incomeCents > 0 ? `Savings rate ${r.savingsRatePercent.toFixed(1)}%` : undefined],
    ['BALANCE AT MONTH END', m(r.endingBalanceCents), r.endingBalanceCents >= 0 ? C.ink : C.red],
    ['BUDGET', r.budgetCents > 0 ? m(r.budgetCents) : 'Not set', C.ink, r.budgetCents > 0 ? `${r.remainingBudgetCents >= 0 ? `${m(r.remainingBudgetCents)} left` : `${m(-r.remainingBudgetCents)} over`} (${r.budgetUsagePercent.toFixed(1)}%)` : undefined],
    ['AVERAGE PER DAY', m(r.averageDailySpendingCents), C.ink, 'Spending'],
  ];
  cards.forEach(([label, value, color, sub], i) => {
    const cx = MARGIN + (i % 3) * (cardW + 10);
    const cy = y + Math.floor(i / 3) * 62;
    page.rect(cx, cy, cardW, 54, C.light);
    page.text(cx + 10, cy + 15, label, 7.5, { bold: true, color: C.grey });
    page.text(cx + 10, cy + 33, value, 12.5, { bold: true, color, maxW: cardW - 20 });
    if (sub) page.text(cx + 10, cy + 46, sub, 7.5, { color: C.grey, maxW: cardW - 20 });
  });
  y += 2 * 62 + 14;

  // Spending by category
  if (r.categories.length) {
    heading('Spending by category');
    const barX = MARGIN + 175;
    const barMax = 150;
    const top = Math.max(...r.categories.map((c) => c.cents));
    r.categories.forEach((c, i) => {
      ensure(22);
      page.text(MARGIN, y, c.category, 9.5, { maxW: 165 });
      page.rect(barX, y - 8, Math.max(2, (c.cents / top) * barMax), 9, PALETTE[i % PALETTE.length]);
      page.text(PAGE_W - MARGIN - 56, y, m(c.cents), 9.5, { align: 'right', bold: true });
      page.text(PAGE_W - MARGIN, y, `${c.percent.toFixed(1)}%`, 9, { align: 'right', color: C.grey });
      y += 18;
    });
    y += 10;
  }

  const listRows = (rows: Array<[string, string, string]>) => {
    rows.forEach(([a, b, c]) => {
      ensure(18);
      page.text(MARGIN, y, a, 9.5, { maxW: 70, color: C.grey });
      page.text(MARGIN + 78, y, b, 9.5, { maxW: PAGE_W - 2 * MARGIN - 78 - 110 });
      page.text(PAGE_W - MARGIN, y, c, 9.5, { align: 'right', bold: true });
      y += 17;
    });
    y += 10;
  };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const shortDate = (iso: string) => `${iso.slice(8, 10)} ${MONTHS[Number(iso.slice(5, 7)) - 1] ?? ''}`;

  if (r.topExpenses.length) {
    heading('Biggest expenses');
    listRows(r.topExpenses.map((t) => [shortDate(t.date), `${t.description}  (${t.category})`, m(t.amountCents)]));
  }
  if (r.busiestDays.length) {
    heading('Highest-spending days');
    listRows(r.busiestDays.map((d) => [shortDate(d.date), 'Total spent', m(d.cents)]));
  }
  if (r.incomeSources.length) {
    heading('Income');
    listRows(r.incomeSources.map((s) => ['', s.category, m(s.cents)]));
  }
  if (r.goals.length) {
    heading('Savings goals');
    r.goals.forEach((g) => {
      ensure(28);
      page.text(MARGIN, y, g.name, 9.5, { maxW: 230, bold: true });
      page.text(PAGE_W - MARGIN, y, `${m(g.currentCents)} of ${m(g.targetCents)} (${g.percent}%)`, 9, { align: 'right', color: C.grey });
      page.rect(MARGIN, y + 6, PAGE_W - 2 * MARGIN, 5, C.light);
      page.rect(MARGIN, y + 6, Math.max(1, ((PAGE_W - 2 * MARGIN) * g.percent) / 100), 5, C.green);
      y += 26;
    });
    y += 6;
  }

  // All transactions
  heading(`All transactions (${r.transactions.length})`);
  const col = { date: MARGIN, desc: MARGIN + 62, cat: MARGIN + 290, amt: PAGE_W - MARGIN };
  const tableHead = () => {
    page.rect(MARGIN, y - 11, PAGE_W - 2 * MARGIN, 16, C.light);
    page.text(col.date + 4, y, 'DATE', 7.5, { bold: true, color: C.grey });
    page.text(col.desc, y, 'DESCRIPTION', 7.5, { bold: true, color: C.grey });
    page.text(col.cat, y, 'CATEGORY', 7.5, { bold: true, color: C.grey });
    page.text(col.amt - 4, y, 'AMOUNT', 7.5, { bold: true, color: C.grey, align: 'right' });
    y += 17;
  };
  if (r.transactions.length === 0) {
    page.text(MARGIN, y, 'No transactions were recorded this month.', 10, { color: C.grey });
    y += 20;
  } else {
    tableHead();
    r.transactions.forEach((t, i) => {
      if (y + 16 > PAGE_H - 56) {
        newPage();
        tableHead();
      }
      if (i % 2 === 1) page.rect(MARGIN, y - 10.5, PAGE_W - 2 * MARGIN, 15, [0.976, 0.98, 0.988]);
      page.text(col.date + 4, y, shortDate(t.date), 8.5, { color: C.grey });
      page.text(col.desc, y, t.description, 8.5, { maxW: 220 });
      page.text(col.cat, y, t.category, 8.5, { maxW: 130, color: C.grey });
      page.text(col.amt - 4, y, `${t.type === 'income' ? '+' : '-'}${m(t.amountCents)}`, 8.5, { align: 'right', bold: true, color: t.type === 'income' ? C.green : C.ink });
      y += 15;
    });
  }

  // Footer on every page
  pages.forEach((p, i) => {
    p.rect(MARGIN, PAGE_H - 40, PAGE_W - 2 * MARGIN, 0.8, C.line);
    p.text(MARGIN, PAGE_H - 26, 'Created with Expense Tracker', 8, { color: C.grey });
    p.text(PAGE_W - MARGIN, PAGE_H - 26, `Page ${i + 1} of ${pages.length}`, 8, { color: C.grey, align: 'right' });
  });

  // Assemble the file
  const objects: string[] = [];
  const add = (body: string) => objects.push(body);
  const pageIds = pages.map((_, i) => 6 + i * 2);
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  add(`<< /Title (${escapePdf(sanitizeForPdf(`Expense report ${r.monthLabel}`))}) /Producer (Expense Tracker) >>`);
  pages.forEach((p, i) => {
    const content = p.ops.join('\n');
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${7 + i * 2} 0 R >>`);
    add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { out += `${String(o).padStart(10, '0')} 00000 n \n`; });
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

export function reportPdfBlob(r: MonthlyReport): Blob {
  return new Blob([buildReportPdf(r)], { type: 'application/pdf' });
}
