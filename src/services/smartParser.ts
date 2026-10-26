import {
  Transaction,
  Category,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  MonthSummary,
  CategorySpending,
  BudgetConfig,
  SavingsGoal,
} from '../types';
import { getCurrencyInfo } from '../utils/currency';

export interface ParsedSmartEntry {
  success: boolean;
  type: 'income' | 'expense';
  amountCents: number;
  category: Category;
  description: string;
  date: string;
  currencySymbol: string;
  currency: string; // ISO code the amount is in: detected from the sentence, else the default
  currencyDetected: boolean; // true when the sentence itself named a currency
  originalText: string;
}

// ─── Currency & amount detection ───────────────────────────────────────────────

// Longest symbols first so "CA$" is not read as "$"
const SYMBOL_CODES: Array<[string, string]> = [
  ['CA$', 'CAD'], ['AU$', 'AUD'], ['US$', 'USD'], ['A$', 'AUD'], ['C$', 'CAD'],
  ['₹', 'INR'], ['€', 'EUR'], ['£', 'GBP'], ['¥', 'JPY'], ['$', 'USD'],
];

function markerToCode(marker: string): string | undefined {
  const m = marker.trim().toLowerCase().replace(/\.$/, '');
  for (const [symbol, code] of SYMBOL_CODES) if (m === symbol.toLowerCase()) return code;
  if (m === 'rs' || m === 'inr' || m.startsWith('rupee')) return 'INR';
  if (m === 'usd' || m.startsWith('dollar') || m === 'bucks') return 'USD';
  if (m === 'eur' || m.startsWith('euro')) return 'EUR';
  if (m === 'gbp' || m.startsWith('pound') || m === 'quid') return 'GBP';
  if (m === 'cad') return 'CAD';
  if (m === 'aud') return 'AUD';
  if (m === 'jpy' || m === 'yen') return 'JPY';
  if (m === 'aed' || m.startsWith('dirham')) return 'AED';
  return undefined;
}

// A number: 1,250.50 | 12,50 (decimal comma) | 250 | 45.5
const NUMBER_TOKEN = /\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?(?!\d)|\d+,\d{1,2}(?!\d)|\d+(?:\.\d{1,2})?/g;
// Marker right before / after a number. Words must stand alone so "shirts" is never "rs".
const PREFIX_MARKER = /(?:CA\$|AU\$|US\$|A\$|C\$|[$₹€£¥]|(?:^|[^a-z])(?:rs\.?|inr|usd|eur|gbp|cad|aud|jpy|aed))\s*$/i;
const SUFFIX_MARKER = /^\s*(?:rs\.?|rupees?|inr|usd|dollars?|bucks|eur|euros?|gbp|pounds?|quid|cad|aud|jpy|yen|aed|dirhams?)(?![a-z])/i;

function tokenToNumber(token: string): number {
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(token)) return parseFloat(token.replace(/,/g, ''));
  if (/^\d+,\d{1,2}$/.test(token)) return parseFloat(token.replace(',', '.'));
  return parseFloat(token);
}

interface AmountMatch {
  value: number;
  code?: string;
  start: number; // span to remove from the description (number plus its currency marker)
  end: number;
}

/** Finds the amount in the sentence, preferring a number that has a currency attached. */
function findAmount(text: string): AmountMatch | null {
  let first: AmountMatch | null = null;
  for (const m of text.matchAll(NUMBER_TOKEN)) {
    const idx = m.index ?? 0;
    const value = tokenToNumber(m[0]);
    if (!(value > 0)) continue;
    const before = text.slice(0, idx);
    const after = text.slice(idx + m[0].length);
    const pre = PREFIX_MARKER.exec(before);
    const suf = pre ? null : SUFFIX_MARKER.exec(after);
    const marker = pre?.[0] ?? suf?.[0];
    const found: AmountMatch = {
      value,
      code: marker ? markerToCode(marker.replace(/^[^a-z$₹€£¥]/i, '')) : undefined,
      start: pre ? idx - pre[0].length : idx,
      end: suf ? idx + m[0].length + suf[0].length : idx + m[0].length,
    };
    if (found.code) return found;
    if (!first) first = found;
  }
  return first;
}

/**
 * Intelligent client-side natural language parser for financial transactions.
 * Handles inputs like:
 * - "Spent ₹250 on lunch"
 * - "Spent $45 on groceries"
 * - "Earned $1200 from freelance client"
 * - "Paid $85 for electric bill yesterday"
 */
export function parseSmartTransaction(input: string, defaultDate: string, defaultCurrency: string = 'USD'): ParsedSmartEntry {
  const text = input.trim();
  const lower = text.toLowerCase();

  // 1+2. Amount and its currency (e.g. "₹250", "Rs 1,250", "45 dollars", "$45")
  const found = findAmount(text);
  const amountCents = found ? Math.round(found.value * 100) : 0;
  const currency = found?.code ?? defaultCurrency;
  const currencyDetected = Boolean(found?.code);
  const currencySymbol = getCurrencyInfo(currency).symbol;

  // 3. Detect Type (Income vs Expense)
  const incomeKeywords = [
    'income', 'salary', 'earned', 'received', 'freelance', 'client',
    'deposit', 'refund', 'bonus', 'dividend', 'invested', 'gift', 'paycheck', 'got paid'
  ];
  const isIncome = incomeKeywords.some(kw => lower.includes(kw));
  const type = isIncome ? 'income' : 'expense';

  // 4. Detect Category
  let category: Category = isIncome ? 'Salary' : 'Other';

  if (isIncome) {
    if (lower.includes('freelance') || lower.includes('contract') || lower.includes('gig')) {
      category = 'Freelance';
    } else if (lower.includes('invest') || lower.includes('dividend') || lower.includes('stock')) {
      category = 'Investments';
    } else if (lower.includes('refund') || lower.includes('cashback') || lower.includes('reimburse')) {
      category = 'Refunds';
    } else if (lower.includes('gift') || lower.includes('birthday') || lower.includes('bonus')) {
      category = 'Gifts & Other';
    } else {
      category = 'Salary';
    }
  } else {
    if (
      lower.includes('lunch') || lower.includes('dinner') || lower.includes('breakfast') ||
      lower.includes('food') || lower.includes('grocery') || lower.includes('groceries') ||
      lower.includes('coffee') || lower.includes('cafe') || lower.includes('starbucks') ||
      lower.includes('restaurant') || lower.includes('meal') || lower.includes('pizza') ||
      lower.includes('burger') || lower.includes('supermarket') || lower.includes('snack')
    ) {
      category = 'Food and groceries';
    } else if (
      lower.includes('uber') || lower.includes('lyft') || lower.includes('gas') ||
      lower.includes('petrol') || lower.includes('fuel') || lower.includes('transport') ||
      lower.includes('taxi') || lower.includes('metro') || lower.includes('subway') ||
      lower.includes('bus') || lower.includes('train') || lower.includes('flight') ||
      lower.includes('toll') || lower.includes('parking')
    ) {
      category = 'Transportation';
    } else if (
      lower.includes('shopping') || lower.includes('amazon') || lower.includes('clothes') ||
      lower.includes('shoes') || lower.includes('mall') || lower.includes('gadget') ||
      lower.includes('electronics') || lower.includes('bought')
    ) {
      category = 'Shopping';
    } else if (
      lower.includes('rent') || lower.includes('bill') || lower.includes('wifi') ||
      lower.includes('internet') || lower.includes('netflix') || lower.includes('spotify') ||
      lower.includes('electric') || lower.includes('water') || lower.includes('phone') ||
      lower.includes('utility') || lower.includes('subscription')
    ) {
      category = 'Bills and subscriptions';
    } else if (
      lower.includes('movie') || lower.includes('cinema') || lower.includes('game') ||
      lower.includes('concert') || lower.includes('fun') || lower.includes('outing')
    ) {
      category = 'Entertainment';
    } else if (
      lower.includes('course') || lower.includes('udemy') || lower.includes('book') ||
      lower.includes('tuition') || lower.includes('school') || lower.includes('class')
    ) {
      category = 'Education';
    } else {
      category = 'Other';
    }
  }

  // 5. Clean Description (drop the amount with its currency marker, filler verbs and prepositions)
  const withoutAmount = found ? `${text.slice(0, found.start)} ${text.slice(found.end)}` : text;
  let cleanDesc = withoutAmount
    .replace(/\b(?:spent|spend|paid|pay|bought|buy|earned|earn|received|got|deposit)\b/gi, ' ')
    .replace(/\b(?:on|for|from|to|at|in|yesterday|today)\b/gi, ' ')
    .replace(/\b(?:i|we|just|also|my)\b(?=\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Fallback if description is empty or just punctuation
  if (!cleanDesc || cleanDesc.length < 2) {
    if (category !== 'Other' && category !== 'Gifts & Other') {
      cleanDesc = category;
    } else {
      cleanDesc = isIncome ? 'Income' : 'Expense';
    }
  } else {
    // Capitalize first letter
    cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
  }

  // 6. Detect Date (today vs yesterday)
  let date = defaultDate;
  if (lower.includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    // Local calendar date (toISOString would use UTC and can land on the wrong day)
    date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return {
    success: amountCents > 0,
    type,
    amountCents,
    category,
    description: cleanDesc,
    date,
    currencySymbol,
    currency,
    currencyDetected,
    originalText: text,
  };
}

