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
import { formatCurrency, centsToDollars, getCurrencyInfo } from '../utils/currency';

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

/**
 * AI Assistant grounded financial answers.
 * Strictly calculates all numbers from real user data so nothing is hallucinated.
 */
export function answerSpendingQuestion(
  question: string,
  context: {
    monthSummary: MonthSummary;
    categorySpendings: CategorySpending[];
    transactions: Transaction[];
    selectedMonth: string;
    budgetConfig: BudgetConfig;
    savingsGoals: SavingsGoal[];
  }
): string {
  const q = question.toLowerCase().trim();
  const { monthSummary, categorySpendings, transactions, selectedMonth, budgetConfig, savingsGoals } = context;

  const monthExpenses = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense');
  const monthIncome = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'income');

  // Highest spending category
  const topCat = categorySpendings.find(c => c.amountCents > 0);

  // 1. Budget queries
  if (q.includes('budget') || q.includes('remaining') || q.includes('limit')) {
    if (monthSummary.budgetCents <= 0) {
      return `You haven't set a budget ceiling for **${selectedMonth}** yet. You can set a monthly spending limit in the **Budgets** section. So far, you have spent **${formatCurrency(monthSummary.totalExpensesCents)}**.`;
    }
    const pct = monthSummary.budgetUsagePercent.toFixed(1);
    if (monthSummary.remainingBudgetCents < 0) {
      return `⚠️ **Over Budget Warning:** You have exceeded your **${formatCurrency(monthSummary.budgetCents)}** budget for ${selectedMonth} by **${formatCurrency(Math.abs(monthSummary.remainingBudgetCents))}** (${pct}% used). Total spent is **${formatCurrency(monthSummary.totalExpensesCents)}**.`;
    }
    return `✅ **Budget Status:** You have **${formatCurrency(monthSummary.remainingBudgetCents)}** left from your **${formatCurrency(monthSummary.budgetCents)}** budget for ${selectedMonth} (${pct}% utilized). Total spent is **${formatCurrency(monthSummary.totalExpensesCents)}**.`;
  }

  // 2. Food / Grocery queries
  if (q.includes('food') || q.includes('grocer') || q.includes('lunch') || q.includes('dinner')) {
    const foodCat = categorySpendings.find(c => c.category === 'Food and groceries');
    const spent = foodCat ? foodCat.amountCents : 0;
    const count = foodCat ? foodCat.count : 0;
    const pct = foodCat ? foodCat.percentage.toFixed(1) : '0';
    return `🥗 You have spent **${formatCurrency(spent)}** across **${count}** transaction(s) on **Food and Groceries** in ${selectedMonth}, representing **${pct}%** of your total monthly expenses.`;
  }

  // 3. Transportation queries
  if (q.includes('transport') || q.includes('uber') || q.includes('gas') || q.includes('fuel')) {
    const cat = categorySpendings.find(c => c.category === 'Transportation');
    const spent = cat ? cat.amountCents : 0;
    return `🚗 You spent **${formatCurrency(spent)}** on **Transportation** in ${selectedMonth} (${cat ? cat.count : 0} transactions).`;
  }

  // 4. Shopping queries
  if (q.includes('shopping') || q.includes('amazon') || q.includes('clothes')) {
    const cat = categorySpendings.find(c => c.category === 'Shopping');
    const spent = cat ? cat.amountCents : 0;
    return `🛍️ You spent **${formatCurrency(spent)}** on **Shopping** in ${selectedMonth} (${cat ? cat.count : 0} transactions).`;
  }

  // 5. Highest / Top expense
  if (q.includes('highest') || q.includes('biggest') || q.includes('most expensive') || q.includes('top category') || q.includes('top spend')) {
    if (monthExpenses.length === 0) {
      return `You have no recorded expenses in **${selectedMonth}**.`;
    }
    const maxTx = [...monthExpenses].sort((a, b) => b.amountCents - a.amountCents)[0];
    const topCatStr = topCat ? `Your biggest category is **${topCat.category}** with **${formatCurrency(topCat.amountCents)}** (${topCat.percentage.toFixed(1)}%).` : '';
    return `🏷️ Your single largest recorded expense in ${selectedMonth} was **"${maxTx.description}"** for **${formatCurrency(maxTx.amountCents)}** (${maxTx.category}) on ${maxTx.date}.\n\n${topCatStr}`;
  }

  // 6. Income queries
  if (q.includes('income') || q.includes('earn') || q.includes('salary') || q.includes('made')) {
    return `💰 In **${selectedMonth}**, your total recorded income is **${formatCurrency(monthSummary.totalIncomeCents)}** across **${monthIncome.length}** deposit(s).`;
  }

  // 7. Savings goals
  if (q.includes('savings goal') || q.includes('saving goal') || q.includes('goals') || q.includes('target')) {
    if (savingsGoals.length === 0) {
      return `You haven't created any savings goals yet. Head to the **Savings Goals** tab to set a target for an emergency fund, vacation, or big purchase!`;
    }
    const summaries = savingsGoals.map(g => {
      const pct = Math.min(100, Math.round((g.currentCents / g.targetCents) * 100));
      return `• **${g.name}**: ${formatCurrency(g.currentCents)} / ${formatCurrency(g.targetCents)} (${pct}%)`;
    }).join('\n');
    return `🎯 **Your Savings Goals Progress:**\n\n${summaries}`;
  }

  // 8. Total spending / Overview / Summary
  if (q.includes('spend') || q.includes('total') || q.includes('summary') || q.includes('overview') || q.includes('how much')) {
    const net = monthSummary.netSavingsCents;
    const netFormatted = formatCurrency(Math.abs(net));
    const netStatus = net >= 0 ? `positive cash flow (+${netFormatted})` : `deficit (-${netFormatted})`;

    return `📊 **${selectedMonth} Financial Summary:**\n` +
      `• **Total Income:** ${formatCurrency(monthSummary.totalIncomeCents)}\n` +
      `• **Total Expenses:** ${formatCurrency(monthSummary.totalExpensesCents)} (${monthExpenses.length} transactions)\n` +
      `• **Net Amount:** ${net >= 0 ? '+' : '-'}${netFormatted} (${netStatus})\n` +
      `• **Average Daily Spend:** ${formatCurrency(monthSummary.averageDailySpendingCents)}/day\n` +
      (monthSummary.budgetCents > 0
        ? `• **Budget Remaining:** ${formatCurrency(monthSummary.remainingBudgetCents)} of ${formatCurrency(monthSummary.budgetCents)}\n`
        : `• **Budget:** Not configured for this month\n`) +
      (topCat ? `• **Top Category:** ${topCat.category} (${formatCurrency(topCat.amountCents)})` : '');
  }

  // 9. General fallback with exact totals
  return `🤖 Here are your calculated financial numbers for **${selectedMonth}**:\n\n` +
    `• **Total Income:** ${formatCurrency(monthSummary.totalIncomeCents)}\n` +
    `• **Total Expenses:** ${formatCurrency(monthSummary.totalExpensesCents)}\n` +
    `• **Net Cashflow:** ${monthSummary.netSavingsCents >= 0 ? '+' : ''}${formatCurrency(monthSummary.netSavingsCents)}\n` +
    (monthSummary.budgetCents > 0 ? `• **Budget Left:** ${formatCurrency(monthSummary.remainingBudgetCents)}\n` : '') +
    `\nFeel free to ask specific questions like *"How much did I spend on food?"*, *"What was my biggest expense?"*, or *"Am I within budget?"*.`;
}
