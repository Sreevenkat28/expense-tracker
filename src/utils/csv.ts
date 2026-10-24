/**
 * CSV import / export for transactions.
 *
 * Export columns: Date, Type, Description, Category, Amount (<CURRENCY>)
 * The importer accepts that same layout (so an export can be re-imported), plus
 * spreadsheets where the Type column is missing and expenses are negative amounts.
 */
import {
  Transaction,
  TransactionType,
  Category,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../types';

export type ImportedTransaction = Omit<Transaction, 'id' | 'createdAt'>;

export interface CSVParseResult {
  transactions: ImportedTransaction[];
  errors: string[]; // human readable, e.g. "Row 4: invalid date "31/31/2026""
}

function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function transactionsToCSV(transactions: Transaction[], currencyCode: string): string {
  const header = ['Date', 'Type', 'Description', 'Category', `Amount (${currencyCode})`];
  const rows = transactions.map((tx) => [
    tx.date,
    tx.type.toUpperCase(),
    escapeCell(tx.description),
    escapeCell(tx.category),
    `${tx.type === 'expense' ? '-' : ''}${(tx.amountCents / 100).toFixed(2)}`,
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export const CSV_TEMPLATE = [
  'Date,Type,Description,Category,Amount',
  '2026-10-01,INCOME,October salary,Salary,50000.00',
  '2026-10-02,EXPENSE,Groceries at market,Food and groceries,-1250.50',
  '2026-10-03,EXPENSE,Metro card recharge,Transportation,-500',
].join('\r\n');

export function downloadTextFile(content: string, filename: string, mime: string): void {
  // BOM so Excel opens UTF-8 (₹, €, accents) correctly
  const blob = new Blob(['﻿' + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** RFC 4180 style parser: handles quoted cells, escaped quotes, commas and newlines inside quotes. */
export function parseCSVRows(text: string): string[][] {
  const input = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Accepts YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY and DD/MM/YYYY. Returns YYYY-MM-DD or null. */
export function normalizeDate(raw: string): string | null {
  const value = raw.trim();
  let y: number, m: number, d: number;
  let match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Parses "1,250.50", "-₹500", "$12", "(45.00)" into signed cents. */
export function parseAmountToCents(raw: string): number | null {
  let value = raw.trim();
  let negative = false;
  if (/^\(.*\)$/.test(value)) {
    negative = true;
    value = value.slice(1, -1);
  }
  value = value.replace(/[^\d.\-+]/g, '');
  if (value.startsWith('-')) {
    negative = true;
    value = value.slice(1);
  } else if (value.startsWith('+')) {
    value = value.slice(1);
  }
  if (!/^\d+(\.\d{1,2})?$/.test(value) && !/^\.\d{1,2}$/.test(value)) return null;
  const cents = Math.round(parseFloat(value) * 100);
  return negative ? -cents : cents;
}

const categoryKey = (c: string) => c.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');

function matchCategory(raw: string, type: TransactionType): Category {
  const list: Category[] = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const key = categoryKey(raw);
  const found = list.find((c) => categoryKey(c) === key);
  if (found) return found;
  return type === 'expense' ? 'Other' : 'Gifts & Other';
}

function findColumn(headers: string[], ...names: string[]): number {
  return headers.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
}

export function parseTransactionsCSV(text: string): CSVParseResult {
  const rows = parseCSVRows(text);
  if (rows.length === 0) {
    return { transactions: [], errors: ['The file is empty.'] };
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const col = {
    date: findColumn(headers, 'date'),
    type: findColumn(headers, 'type'),
    description: findColumn(headers, 'description', 'note', 'details', 'title'),
    category: findColumn(headers, 'category'),
    amount: findColumn(headers, 'amount'),
  };

  const missing = (['date', 'amount'] as const).filter((k) => col[k] === -1);
  if (missing.length > 0) {
    return {
      transactions: [],
      errors: [`Missing required column(s): ${missing.join(', ')}. The first row must be a header such as "Date,Type,Description,Category,Amount".`],
    };
  }

  const transactions: ImportedTransaction[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((cells, idx) => {
    const rowNum = idx + 2; // 1-based, header is row 1
    const get = (i: number) => (i >= 0 ? (cells[i] ?? '').trim() : '');

    const date = normalizeDate(get(col.date));
    if (!date) {
      errors.push(`Row ${rowNum}: invalid date "${get(col.date)}" (use YYYY-MM-DD or DD/MM/YYYY).`);
      return;
    }

    const signedCents = parseAmountToCents(get(col.amount));
    if (signedCents === null || signedCents === 0) {
      errors.push(`Row ${rowNum}: invalid amount "${get(col.amount)}".`);
      return;
    }

    const rawType = get(col.type).toLowerCase();
    let type: TransactionType;
    if (rawType.startsWith('inc') || rawType === 'credit' || rawType === 'cr') {
      type = 'income';
    } else if (rawType.startsWith('exp') || rawType === 'debit' || rawType === 'dr') {
      type = 'expense';
    } else if (rawType === '') {
      type = signedCents < 0 ? 'expense' : 'income';
    } else {
      errors.push(`Row ${rowNum}: unknown type "${get(col.type)}" (use INCOME or EXPENSE).`);
      return;
    }

    const category = matchCategory(get(col.category), type);
    const description = get(col.description) || category;

    transactions.push({
      type,
      amountCents: Math.abs(signedCents),
      description,
      category,
      date,
    });
  });

  return { transactions, errors };
}

/** Key used to skip rows that already exist (e.g. re-importing an earlier export). */
export function transactionFingerprint(t: Pick<Transaction, 'date' | 'type' | 'amountCents' | 'description'>): string {
  return `${t.date}|${t.type}|${t.amountCents}|${t.description.trim().toLowerCase()}`;
}
