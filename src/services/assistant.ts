/**
 * The AI assistant's answering engine.
 *
 * It works out WHAT was asked (a time period, a category or item such as "coffee", income vs expenses,
 * and the kind of answer wanted: a total, a biggest item, a comparison, a budget check ...) and then
 * calculates the answer from the real transactions. The first sentence always answers the question;
 * extra detail comes after it. Every number is computed, never invented.
 */
import {
  Transaction,
  Category,
  MonthSummary,
  CategorySpending,
  BudgetConfig,
  SavingsGoal,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../types';
import { formatCurrency } from '../utils/currency';
import { CATEGORY_WORDS, type AssistantContext } from './assistantShared';
import { solveMath } from './calculator';
import { correctSpelling } from './spellcheck';
import { matchProfile, matchAppRequest, isOffTopic, looksAppRelated, OUT_OF_SCOPE_TEXT, type AssistantAction } from './appKnowledge';
export type { AssistantAction } from './appKnowledge';
export type { AssistantContext } from './assistantShared';
import { formatMonthName, formatDate, getPreviousMonth, getDaysInMonth, getTodayDateString } from '../utils/dates';


type Intent =
  | 'help' | 'thanks' | 'afford' | 'goals' | 'compare' | 'biggest' | 'top-categories' | 'count'
  | 'average' | 'budget' | 'list' | 'summary' | 'net' | 'sum';

interface Period {
  start: string; // inclusive YYYY-MM-DD
  end: string; // inclusive
  label: string; // "October 2026", "today (Oct 25, 2026)"
  kind: 'month' | 'day' | 'range' | 'year' | 'all';
  month?: string; // YYYY-MM when kind === 'month'
  pre: 'in' | 'on' | ''; // how to introduce it in a sentence
}

interface Parsed {
  intent?: Intent;
  type?: 'expense' | 'income';
  categories?: Category[];
  /** Words that hint at a category; a specific one ("coffee") can instead name an item in the descriptions. */
  categoryHints: Array<{ cat: Category; words: string[]; generic: boolean }>;
  period?: Period;
  keywords: string[];
  wantsCategoryRanking: boolean;
  listCount?: number;
}

// ─── Small date helpers (local calendar dates, no UTC surprises) ─────────────

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (iso: string, n: number) => { const d = fromISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const mondayOf = (iso: string) => { const d = fromISO(iso); return addDays(iso, -((d.getDay() + 6) % 7)); };
const daysBetween = (a: string, b: string) => Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000) + 1;

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_ABBR: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

const monthPeriod = (ym: string): Period => ({ start: `${ym}-01`, end: `${ym}-${pad(getDaysInMonth(ym))}`, label: formatMonthName(ym), kind: 'month', month: ym, pre: 'in' });

// ─── What the user is talking about ──────────────────────────────────────────


/** "Food and groceries" -> "Food and Groceries" (how categories are written in answers). */
const catLabel = (c: string) => c.split(' ').map((w) => (w === 'and' ? 'and' : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');

// Words that name a whole category rather than one kind of item
const GENERIC_CATEGORY_WORDS = new Set(['food', 'foods', 'transport', 'transportation', 'travel', 'travelling', 'traveling', 'shopping', 'bill', 'bills', 'entertainment', 'education', 'salary', 'wages', 'wage', 'subscription', 'subscriptions', 'investment', 'investments', 'refund', 'refunds', 'gift', 'gifts', 'freelance', 'other']);

const STOP = new Set(('a an the i me my mine we you your did do does how much many what whats which is are was were in on at for to of from with and or this that month week year ' +
  'today yesterday last past previous total spend spent spending expense expenses cost costs paid pay earn earned income make made show list give tell about any all ever so far have has had ' +
  'been be it its can could should would there than more less vs versus compared compare average biggest highest largest most top number count transactions transaction entries entry money amount ' +
  'per day daily budget left remaining within over under afford buy get am im please thanks recent latest first only just also still now net balance saved saving savings goal goals ' +
  'category categories where went did eat').split(' '));

const wordsOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9$₹€£\s.-]/g, ' ').split(/\s+/).filter(Boolean);

function parsePeriod(q: string, selectedMonth: string, today: string): Period | undefined {
  if (/\byesterday\b/.test(q)) { const d = addDays(today, -1); return { start: d, end: d, label: 'yesterday', kind: 'day', pre: '' }; }
  if (/\btoday\b|\bso far today\b/.test(q)) return { start: today, end: today, label: 'today', kind: 'day', pre: '' };
  const iso = q.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return { start: iso[1], end: iso[1], label: formatDate(iso[1]), kind: 'day', pre: 'on' };
  const ordinal = q.match(/\bon (?:the )?(\d{1,2})(?:st|nd|rd|th)\b/);
  if (ordinal) { const d = `${selectedMonth}-${pad(Number(ordinal[1]))}`; return { start: d, end: d, label: formatDate(d), kind: 'day', pre: 'on' }; }
  if (/\blast week\b|\bprevious week\b/.test(q)) { const s = addDays(mondayOf(today), -7); return { start: s, end: addDays(s, 6), label: 'last week', kind: 'range', pre: '' }; }
  if (/\bthis week\b|\bso far this week\b/.test(q)) { const s = mondayOf(today); return { start: s, end: today, label: 'this week', kind: 'range', pre: '' }; }
  const lastN = q.match(/\b(?:last|past) (\d{1,3}) days\b/);
  if (lastN) return { start: addDays(today, -(Number(lastN[1]) - 1)), end: today, label: `the last ${lastN[1]} days`, kind: 'range', pre: 'in' };
  if (/\bpast week\b|\blast 7 days\b/.test(q)) return { start: addDays(today, -6), end: today, label: 'the last 7 days', kind: 'range', pre: 'in' };
  if (/\blast month\b|\bprevious month\b/.test(q)) return monthPeriod(getPreviousMonth(selectedMonth));
  if (/\bthis month\b/.test(q)) return monthPeriod(selectedMonth);
  if (/\bthis year\b|\byear to date\b|\bytd\b/.test(q)) { const y = selectedMonth.slice(0, 4); return { start: `${y}-01-01`, end: `${y}-12-31`, label: y, kind: 'year', pre: 'in' }; }
  if (/\blast year\b/.test(q)) { const y = String(Number(selectedMonth.slice(0, 4)) - 1); return { start: `${y}-01-01`, end: `${y}-12-31`, label: y, kind: 'year', pre: 'in' }; }
  if (/\b(all time|ever|overall|altogether|in total|since the beginning|lifetime)\b/.test(q)) return { start: '0000-01-01', end: '9999-12-31', label: 'overall', kind: 'all', pre: '' };
  // A named month: "in september", "for oct 2025", "march"
  const named = q.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\b(?:\s+(\d{4}))?/);
  if (named) {
    const isMay = named[1] === 'may';
    if (!isMay || /\b(in|during|for|of|on) may\b/.test(q) || named[2]) {
      const idx = MONTHS.indexOf(named[1]);
      const monthNum = idx >= 0 ? idx + 1 : MONTH_ABBR[named[1]];
      if (monthNum) return monthPeriod(`${named[2] ?? selectedMonth.slice(0, 4)}-${pad(monthNum)}`);
    }
  }
  return undefined;
}

function parseQuery(question: string, ctx: AssistantContext, today: string): Parsed {
  const q = ` ${question.toLowerCase().replace(/\s+/g, ' ').trim()} `.replace(/[?!]+/g, ' ');
  const parsed: Parsed = { keywords: [], categoryHints: [], wantsCategoryRanking: false };

  // The kind of answer wanted (first match wins, most specific first)
  const rules: Array<[RegExp, Intent]> = [
    [/\b(afford|can i (buy|spend|get|purchase)|should i (buy|spend|get)|is it ok to (buy|spend))\b/, 'afford'],
    [/\b(goal|goals|savings? target|target date)\b/, 'goals'],
    [/\b(compare|compared|versus|vs|difference|than (last|previous)|more than|less than|increase[d]?|decrease[d]?|went up|went down|trend)\b/, 'compare'],
    [/\b(biggest|largest|highest|most expensive|top expense|maximum|costliest|priciest)\b/, 'biggest'],
    [/\b(top|which|what)\b.*\bcategor(y|ies)\b|\bwhere (did|does|do) (my|the) money (go|went)\b|\bbreakdown\b|\bby category\b|\bmost (on|of my (money|spending))\b/, 'top-categories'],
    [/\bhow many\b|\bnumber of\b|\bcount\b/, 'count'],
    [/\baverage\b|\bavg\b|\bper day\b|\bdaily (spend|spending|expense|average)\b|\bon average\b/, 'average'],
    [/\b(budget|within (my )?limit|over (my )?limit|remaining|how much (can|could) i (still )?(spend|use)|money left|left (to spend|for))\b|\bhow much (is |do i have )?left\b/, 'budget'],
    [/\b(list|show me|show my|recent|latest|history|last \d+ (transactions|expenses|entries)|what (were|are) my (transactions|expenses))\b|\b(see|view|check|display)\b.*\btransactions?\b/, 'list'],
    [/\b(summary|summarize|summarise|overview|report|status|income vs expense|income and expense)\b/, 'summary'],
    [/\b(net|balance|saved|surplus|deficit|profit|cash ?flow|left over|savings rate)\b|\bhow much (did|have) i save\b/, 'net'],
    [/\b(how much|total|spend|spent|spending|expenses?|costs?|paid|pay|earn|earned|earning|income|made|make|received|salary|revenue)\b/, 'sum'],
  ];
  for (const [re, intent] of rules) if (re.test(q)) { parsed.intent = intent; break; }
  if ((!parsed.intent || parsed.intent === 'sum' || parsed.intent === 'summary') && ctx.savingsGoals.some((g) => g.name.length > 2 && q.includes(g.name.toLowerCase()))) parsed.intent = 'goals';

  if (/\b(earn|earned|earning|income|salary|received|revenue|deposit|paid me|got paid)\b|\bhow much (did|do|have|will) i (make|made)\b/.test(q) && !/\b(spend|spent|expense|cost|paid for|buy)\b/.test(q)) parsed.type = 'income';
  else if (/\b(spend|spent|spending|expense|expenses|cost|costs|paid|pay|bought|buy|purchase)\b/.test(q)) parsed.type = 'expense';

  const cats: Category[] = [];
  for (const [re, cat] of CATEGORY_WORDS) {
    const words = [...q.matchAll(new RegExp(re.source, 'g'))].map((m) => m[0].trim());
    if (!words.length) continue;
    if (!cats.includes(cat)) cats.push(cat);
    parsed.categoryHints.push({ cat, words, generic: words.every((w) => GENERIC_CATEGORY_WORDS.has(w)) });
  }
  for (const cat of [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]) if (q.includes(cat.toLowerCase()) && !cats.includes(cat)) cats.push(cat);
  if (/\bother\b/.test(q) && !cats.includes('Other')) cats.push('Other');
  if (cats.length) parsed.categories = cats;
  parsed.wantsCategoryRanking = /\bcategor(y|ies)\b/.test(q) && /\b(biggest|largest|highest|most|top)\b/.test(q);

  parsed.period = parsePeriod(q, ctx.selectedMonth, today);
  const last = q.match(/\b(?:last|latest|recent|past) (\d{1,2}) (?:transactions|expenses|entries|purchases|payments)\b/);
  if (last) parsed.listCount = Math.min(20, Number(last[1]));

  // Leftover meaningful words may name an item ("coffee", "rent payment", "netflix") found in descriptions
  const consumed = new Set<string>();
  for (const [re] of CATEGORY_WORDS) for (const m of q.matchAll(new RegExp(re.source, 'g'))) consumed.add(m[0].trim());
  for (const w of wordsOf(q)) {
    if (STOP.has(w) || consumed.has(w) || MONTHS.includes(w) || MONTH_ABBR[w] || /^\d/.test(w) || /^[$₹€£]/.test(w) || w.length < 3) continue;
    parsed.keywords.push(w.replace(/s$/, ''));
  }
  return parsed;
}

// ─── Calculations ────────────────────────────────────────────────────────────

interface Slice {
  txs: Transaction[];
  total: number;
}

function sliceOf(ctx: AssistantContext, p: { type?: 'expense' | 'income'; categories?: Category[]; period: Period; keywords?: string[] }): Slice {
  const kw = p.keywords ?? [];
  const txs = ctx.transactions.filter(
    (t) =>
      t.date >= p.period.start && t.date <= p.period.end &&
      (!p.type || t.type === p.type) &&
      (!p.categories || p.categories.includes(t.category)) &&
      (kw.length === 0 || kw.every((k) => t.description.toLowerCase().includes(k)))
  );
  return { txs, total: txs.reduce((s, t) => s + t.amountCents, 0) };
}

const money = (c: number) => formatCurrency(c);
const when = (p: Period) => (p.pre ? `${p.pre} **${p.label}**` : `**${p.label}**`);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const catList = (cats?: Category[]) => (cats && cats.length ? cats.map((c) => `**${catLabel(c)}**`).join(' / ') : '');
const pct = (part: number, whole: number) => (whole > 0 ? ((part / whole) * 100).toFixed(1) : '0');

function previousPeriod(p: Period): Period | undefined {
  if (p.kind === 'month' && p.month) return monthPeriod(getPreviousMonth(p.month));
  if (p.kind === 'day') { const d = addDays(p.start, -1); return { start: d, end: d, label: formatDate(d), kind: 'day', pre: 'on' }; }
  if (p.kind === 'range') { const n = daysBetween(p.start, p.end); const e = addDays(p.start, -1); const s = addDays(e, -(n - 1)); return { start: s, end: e, label: `the ${n} days before`, kind: 'range', pre: 'in' }; }
  if (p.kind === 'year') { const y = String(Number(p.start.slice(0, 4)) - 1); return { start: `${y}-01-01`, end: `${y}-12-31`, label: y, kind: 'year', pre: 'in' }; }
  return undefined;
}

/** One short sentence comparing against the previous period, only when it adds information. */
function trendNote(ctx: AssistantContext, p: Parsed, period: Period, current: number): string {
  const prev = previousPeriod(period);
  if (!prev) return '';
  const before = sliceOf(ctx, { type: p.type ?? 'expense', categories: p.categories, period: prev, keywords: p.keywords });
  if (before.total <= 0) return '';
  const diff = current - before.total;
  if (diff === 0) return ` That's the same as ${prev.label} (${money(before.total)}).`;
  return ` That's **${money(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'}** than ${prev.label} (${money(before.total)}, ${diff > 0 ? '+' : '-'}${pct(Math.abs(diff), before.total)}%).`;
}

const EXAMPLES = [
  'How much did I spend on food last month?',
  'What was my biggest expense this week?',
  'Did I spend more than last month?',
  'Am I within my budget?',
  'Can I afford 5000 this month?',
  'How much did I spend on coffee?',
];

// ─── Small talk (answers like a person, no data needed) ──────────────────────

const pickBy = (seed: string, options: string[]) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return options[h % options.length];
};

const HELP_TEXT = (examples: string[]) =>
  `I can help with anything inside this app:\n\n• **Your money:** spending, income, budget, savings goals and trends, from your real transactions\n• **Your account:** *"What's my name?"*, *"Am I an admin?"*\n• **Quick maths:** *"What's 15% of 2000?"*, *"Split 1200 between 4"*\n• **Doing things:** *"Add an expense"*, *"Open my budgets"*, *"Switch to rupees"*, *"Turn on dark mode"*\n• **How-to help:** exporting, importing, resetting your PIN and more\n\nTry asking:\n\n${examples.map((e) => `• *"${e}"*`).join('\n')}\n\nI can only help with things related to this app.`;

/** A natural reply to greetings and chit-chat, or null when the message is about the user's money. */
export function smallTalk(question: string, today: string): string | null {
  const t = question.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const is = (re: RegExp) => re.test(t);

  const timeGreeting = t.match(/^good (morning|afternoon|evening)\b/);
  if (is(/^(hi+|hello+|hey+|heya|hiya|yo|sup|hola|namaste|howdy)( there| assistant| bot| buddy| friend| everyone)?$/) || is(/^good (morning|afternoon|evening)( there| assistant)?$/)) {
    const hello = timeGreeting ? `Good ${timeGreeting[1]}!` : pickBy(t, ['Hi there!', 'Hello!', 'Hey!']);
    return `${hello} 👋 I'm your AI Financial Assistant. What would you like to know about your money today?`;
  }
  if (is(/^(hi|hello|hey)( there)? (how are you|how are you doing|how r u|how are u)$/) || is(/^(how are you|how are you doing|how are u|how r u|how's it going|hows it going|how do you do|how have you been|whats up|what's up|what is up)( today| doing)?$/))
    return pickBy(t, [`I'm doing great, thanks for asking! 😊 How can I help with your finances today?`, `All good here, thank you! 😊 What would you like to check: spending, budget or savings?`]);
  if (is(/^(what is|what's|whats|tell me|say) (your|ur) name$/) || is(/^(who are you|what are you|what are you called|who r u|your name|do you have a name|what should i call you|what can i call you|introduce yourself|tell me about yourself)$/))
    return `My name is the AI Financial Assistant. 😊 I'm here to help you understand your spending, budgets and savings, so ask me anything about your money.`;
  if (is(/(who|what company) (made|created|built|developed|programmed|designed) you|who is your (creator|developer|maker)/))
    return `I was built into this Expense Tracker app to help you keep track of your money. I answer from your own transactions, budgets and savings goals.`;
  if (is(/^(are you|r u|are u) (a |an )?(real |human|person|robot|bot|ai|chatgpt|claude|gemini|gpt|alive|smart)/))
    return `I'm an AI assistant, not a person. 🤖 I'm the AI Financial Assistant inside this app, and I answer from your own numbers.`;
  if (is(/^(help|help me|can you help( me)?|what can you do|what do you do|how can you help( me)?|what can i ask( you)?|how do you work|what are your features|what are you able to do)$/))
    return HELP_TEXT(EXAMPLES);
  if (is(/^(thanks|thank you|thank u|thx|ty|thanks a lot|thank you so much|many thanks|cheers|great thanks|ok thanks|okay thanks|appreciate it|thanks a ton)( a lot| so much)?$/))
    return pickBy(t, [`You're welcome! 😊 Anything else you'd like to check?`, `Happy to help! 😊 Ask me anything else about your money.`]);
  if (is(/^(great|good job|nice|cool|awesome|perfect|amazing|wow|nice one|well done|good bot|great job|you re (great|awesome|amazing|smart|helpful|the best)|you are (great|awesome|amazing|smart|helpful|the best)|love it|i love you)$/))
    return `Thank you, that's kind of you! 😊 What else can I help with?`;
  if (is(/^(bye|goodbye|good bye|see you|see ya|later|good night|gn|take care|talk later|cya|bye bye|see you later)( soon| later)?$/))
    return pickBy(t, [`Goodbye! 👋 Come back anytime to check on your spending.`, `Take care! 👋 I'll be here whenever you want to look at your finances.`]);
  if (is(/\b(joke|make me laugh|something funny|funny)\b/))
    return pickBy(t, [`Why did the budget go to therapy? It had too many unresolved expenses. 😄`, `I told my wallet a joke, but it didn't get it. It was too empty to laugh. 😄`, `Why don't piggy banks ever win arguments? They always break under pressure. 😄`]);
  if (is(/^(what('s| is) (the )?(date|day|time)( today| now)?|what day is it( today)?|what is today'?s date|today'?s date|what's today's date)$/)) {
    const d = fromISO(today).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return `Today is **${d}**. Want me to look at today's spending?`;
  }
  if (is(/^(ok|okay|k|kk|sure|yes|yeah|yep|yup|no|nope|alright|all right|got it|i see|hmm+|lol|haha+|hehe|oh|ah|oops|sorry)$/))
    return `Alright! 😊 Let me know what you'd like to look at: your spending, budget, income or savings goals.`;
  return null;
}

// ─── Answers ─────────────────────────────────────────────────────────────────

/** Answers questions about the user's own transactions, budget and goals. */
function answerFromData(question: string, ctx: AssistantContext): string {
  const today = ctx.today ?? getTodayDateString();
  let parsed = parseQuery(question, ctx, today);

  // Follow-ups such as "and last month?" or "what about food?" reuse the earlier question's meaning
  if (ctx.previousQuestion && !parsed.intent) {
    const prev = parseQuery(ctx.previousQuestion, ctx, today);
    const cue = /^\s*(and|what about|how about|also|same for|then|ok and)\b/i.test(question);
    const carriesSomething = Boolean(parsed.period || parsed.categories || parsed.type);
    const looksLikeFollowUp = carriesSomething && (cue || question.trim().split(/\s+/).length <= 4);
    if (looksLikeFollowUp && prev.intent) {
      parsed = {
        ...prev,
        type: parsed.type ?? prev.type,
        categories: parsed.categories ?? prev.categories,
        period: parsed.period ?? prev.period,
        keywords: parsed.keywords.length ? parsed.keywords : prev.keywords,
        intent: prev.intent,
      };
    }
  }

  const monthPeriodSelected = monthPeriod(ctx.selectedMonth);
  const period = parsed.period ?? monthPeriodSelected;
  const isSelectedMonth = period.kind === 'month' && period.month === ctx.selectedMonth;

  // Words that name an item only count if some transaction actually has them
  const inDescriptions = (w: string) => ctx.transactions.some((t) => t.description.toLowerCase().includes(w));
  const itemWords = parsed.keywords.filter(inDescriptions);
  const unknownWords = parsed.keywords.filter((k) => !itemWords.includes(k));
  // A specific word that appears in your descriptions ("coffee", "rent") means that item, not its whole category
  const cats = new Set<Category>(parsed.categories ?? []);
  for (const h of parsed.categoryHints) {
    const named = h.generic ? [] : h.words.filter((w) => inDescriptions(w.replace(/s$/, '')) || inDescriptions(w));
    if (named.length) {
      cats.delete(h.cat);
      for (const w of named) { const base = inDescriptions(w) ? w : w.replace(/s$/, ''); if (!itemWords.includes(base)) itemWords.push(base); }
    }
  }
  for (const c of [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]) if (question.toLowerCase().includes(c.toLowerCase())) cats.add(c);
  parsed.categories = cats.size ? [...cats] : undefined;
  const filters = { type: parsed.type, categories: parsed.categories, keywords: itemWords };
  const what = itemWords.length ? `**${itemWords.join(' ')}**` : catList(parsed.categories);

  let intent = parsed.intent;
  if (!intent && (parsed.categories || itemWords.length)) intent = 'sum'; // "food last month"
  if (!intent) {
    if (unknownWords.length) return `I couldn't find anything matching **"${unknownWords.join(' ')}"** in your transactions. Try a category (food, transport, shopping, bills) or ask something like *"${EXAMPLES[0]}"*.`;
    return `I'm not sure what you'd like to know. I can answer questions about your spending, income, budget, savings goals and trends. For example:\n\n${EXAMPLES.slice(0, 4).map((e) => `• *"${e}"*`).join('\n')}`;
  }

  switch (intent) {
    case 'help':
      return HELP_TEXT(EXAMPLES);

    case 'thanks':
      return `You're welcome! Ask me anything else about your spending, budget or savings goals.`;

    case 'sum': {
      const type = parsed.type ?? 'expense';
      const target = question.toLowerCase().match(/\b(?:on|for|at|towards)\s+(?:the |my |a |an |some )?([a-z]{3,})/)?.[1];
      if (target && unknownWords.includes(target.replace(/s$/, '')) && !parsed.categories && itemWords.length === 0)
        return `I couldn't find anything matching **"${target}"** in your transactions. Try a category (food, transport, shopping, bills) or an item you've recorded, like *"${EXAMPLES[5]}"*.`;
      const s = sliceOf(ctx, { ...filters, type, period });
      const verb = type === 'income' ? 'earned' : 'spent';
      const noun = type === 'income' ? 'deposit' : 'transaction';
      if (s.txs.length === 0) {
        if (unknownWords.length && !parsed.categories && itemWords.length === 0) return `I couldn't find anything matching **"${unknownWords.join(' ')}"**. Try a category (food, transport, shopping, bills) or a different time period.`;
        return `You haven't ${type === 'income' ? 'recorded any income' : 'spent anything'}${what ? ` on ${what}` : ''} ${when(period)}.`;
      }
      const all = sliceOf(ctx, { type, period });
      const share = what && all.total > 0 && s.total < all.total ? ` That's **${pct(s.total, all.total)}%** of everything you ${type === 'income' ? 'earned' : 'spent'} in that time.` : '';
      let budgetNote = '';
      if (type === 'expense' && !what && isSelectedMonth && ctx.monthSummary.budgetCents > 0)
        budgetNote = ` That's **${ctx.monthSummary.budgetUsagePercent.toFixed(1)}%** of your ${money(ctx.monthSummary.budgetCents)} budget.`;
      // For a plain "my expenses", also point out where most of it went
      let topNote = '';
      if (!what && type === 'expense' && s.txs.length > 1) {
        const byCat = new Map<string, number>();
        s.txs.forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amountCents));
        const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
        if (top && byCat.size > 1) topNote = ` Most of it went to **${catLabel(top[0])}** (**${money(top[1])}**).`;
      }
      return `You ${verb} **${money(s.total)}**${what ? ` on ${what}` : ''} ${when(period)}, across ${plural(s.txs.length, noun)}.${topNote}${share}${budgetNote}${trendNote(ctx, parsed, period, s.total)}`;
    }

    case 'biggest': {
      const type = parsed.type ?? 'expense';
      if (parsed.wantsCategoryRanking && !itemWords.length) {
        const byCat = new Map<string, number>();
        const s = sliceOf(ctx, { type, period });
        s.txs.forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amountCents));
        const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
        if (!top) return `You have no ${type === 'income' ? 'income' : 'expenses'} recorded ${when(period)}.`;
        return `Your biggest ${type === 'income' ? 'income source' : 'spending category'} ${when(period)} is **${catLabel(top[0])}** with **${money(top[1])}** (${pct(top[1], s.total)}% of the total).`;
      }
      const s = sliceOf(ctx, { ...filters, type, period });
      if (s.txs.length === 0) return `You have no ${type === 'income' ? 'income' : 'expenses'}${what ? ` for ${what}` : ''} recorded ${when(period)}.`;
      const sorted = [...s.txs].sort((a, b) => b.amountCents - a.amountCents);
      const t = sorted[0];
      const next = sorted[1] ? ` The next biggest was **"${sorted[1].description}"** at ${money(sorted[1].amountCents)}.` : '';
      return `Your biggest ${type === 'income' ? 'income' : 'expense'}${what ? ` on ${what}` : ''} ${when(period)} was **"${t.description}"**: **${money(t.amountCents)}** (${catLabel(t.category)}) on ${formatDate(t.date)}, ${pct(t.amountCents, s.total)}% of the total.${next}`;
    }

    case 'top-categories': {
      const type = parsed.type ?? 'expense';
      const s = sliceOf(ctx, { type, period });
      if (!s.txs.length) return `You have no ${type === 'income' ? 'income' : 'expenses'} recorded ${when(period)}.`;
      const byCat = new Map<string, number>();
      s.txs.forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amountCents));
      const ranked = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      const lines = ranked.map(([c, v], i) => `${i + 1}. **${catLabel(c)}**: ${money(v)} (${pct(v, s.total)}%)`).join('\n');
      return `Most of your ${type === 'income' ? 'income' : 'money'} ${when(period)} went to **${catLabel(ranked[0][0])}** (${pct(ranked[0][1], s.total)}%). Here is the ranking:\n\n${lines}`;
    }

    case 'count': {
      const s = sliceOf(ctx, { ...filters, period });
      const exp = s.txs.filter((t) => t.type === 'expense').length;
      const inc = s.txs.length - exp;
      const typed = parsed.type === 'expense' ? plural(exp, 'expense') : parsed.type === 'income' ? plural(inc, 'income entry', 'income entries') : null;
      if (typed) return `You have **${typed}**${what ? ` for ${what}` : ''} ${when(period)}.`;
      return `You have **${plural(s.txs.length, 'transaction')}**${what ? ` for ${what}` : ''} ${when(period)}: ${plural(exp, 'expense')} and ${plural(inc, 'income entry', 'income entries')}.`;
    }

    case 'average': {
      const type = parsed.type ?? 'expense';
      const s = sliceOf(ctx, { ...filters, type, period });
      if (!s.txs.length) return `You have no ${type === 'income' ? 'income' : 'spending'}${what ? ` on ${what}` : ''} ${when(period)}, so there is nothing to average.`;
      const end = period.end < today ? period.end : today;
      const start = period.start > '0000-01-01' ? period.start : s.txs.reduce((m, t) => (t.date < m ? t.date : m), s.txs[0].date);
      const days = Math.max(1, daysBetween(start, end < start ? start : end));
      if (/\bper (transaction|purchase|expense)\b|\beach (transaction|purchase)\b/.test(question.toLowerCase()))
        return `On average each ${type === 'income' ? 'deposit' : 'expense'}${what ? ` on ${what}` : ''} ${when(period)} was **${money(Math.round(s.total / s.txs.length))}** (${plural(s.txs.length, 'transaction')}).`;
      return `You ${type === 'income' ? 'earned' : 'spent'} about **${money(Math.round(s.total / days))} per day**${what ? ` on ${what}` : ''} ${when(period)} (${money(s.total)} over ${plural(days, 'day')}).`;
    }

    case 'compare': {
      const type = parsed.type ?? 'expense';
      // "than last month" / "vs last week": the thing being measured is the current period, last one is the baseline
      const ql = question.toLowerCase();
      let cmpPeriod = period;
      if (/\b(than|vs\.?|versus|compared (to|with)|from|against) (last|previous) month\b/.test(ql) || (/\bthis month\b/.test(ql) && /\b(last|previous) month\b/.test(ql))) cmpPeriod = monthPeriodSelected;
      else if (/\b(than|vs\.?|versus|compared (to|with)|from|against) (last|previous) week\b/.test(ql) || (/\bthis week\b/.test(ql) && /\blast week\b/.test(ql))) cmpPeriod = { start: mondayOf(today), end: today, label: 'this week', kind: 'range', pre: '' };
      else if (/\b(than|vs\.?|versus|compared (to|with)|from|against) last year\b/.test(ql)) cmpPeriod = { start: `${ctx.selectedMonth.slice(0, 4)}-01-01`, end: `${ctx.selectedMonth.slice(0, 4)}-12-31`, label: ctx.selectedMonth.slice(0, 4), kind: 'year', pre: 'in' };
      const prev = cmpPeriod.label === 'this week' ? (() => { const st = addDays(mondayOf(today), -7); return { start: st, end: addDays(st, 6), label: 'last week', kind: 'range' as const, pre: '' as const }; })() : previousPeriod(cmpPeriod);
      if (!prev) return `Tell me a time to compare, for example *"Did I spend more than last month?"*.`;
      const cur = sliceOf(ctx, { ...filters, type, period: cmpPeriod });
      const old = sliceOf(ctx, { ...filters, type, period: prev });
      if (cur.total === 0 && old.total === 0) return `You have no ${type === 'income' ? 'income' : 'spending'}${what ? ` on ${what}` : ''} in either **${cmpPeriod.label}** or **${prev.label}**.`;
      const diff = cur.total - old.total;
      const word = type === 'income' ? 'earned' : 'spent';
      if (diff === 0) return `You ${word} the same ${when(cmpPeriod)} and **${prev.label}**: **${money(cur.total)}**.`;
      const more = diff > 0;
      const yesNo = /\b(did|have|am|is|was)\b.*\b(more|less)\b/.test(question.toLowerCase());
      const lead = yesNo ? `${(/\bmore\b/.test(question.toLowerCase()) ? more : !more) ? 'Yes' : 'No'}. ` : '';
      return `${lead}You ${word} **${money(Math.abs(diff))} ${more ? 'more' : 'less'}**${what ? ` on ${what}` : ''} ${when(cmpPeriod)} (${money(cur.total)}) than ${when(prev)} (${money(old.total)})${old.total > 0 ? `, ${more ? 'up' : 'down'} ${pct(Math.abs(diff), old.total)}%` : ''}.`;
    }

    case 'net': {
      const inc = sliceOf(ctx, { period, type: 'income' }).total;
      const exp = sliceOf(ctx, { period, type: 'expense' }).total;
      const net = inc - exp;
      const rate = inc > 0 ? ` That's a savings rate of **${pct(net, inc)}%**.` : '';
      const balance = isSelectedMonth && /\bbalance\b/.test(question.toLowerCase()) ? ` Including your starting balance, your balance at the end of ${period.label} is **${money(ctx.monthSummary.endingBalanceCents)}**.` : '';
      return `${net >= 0 ? 'You saved' : 'You overspent by'} **${money(Math.abs(net))}** ${when(period)}: ${money(inc)} income minus ${money(exp)} expenses.${net >= 0 ? rate : ''}${balance}`;
    }

    case 'budget': {
      const m = ctx.monthSummary;
      // A category limit, if the question is about one
      const catLimit = parsed.categories?.map((c) => ({ c, limit: ctx.budgetConfig.categoryBudgets?.[c] })).find((x) => x.limit && x.limit > 0);
      if (catLimit && catLimit.limit) {
        const spent = sliceOf(ctx, { type: 'expense', categories: [catLimit.c], period: monthPeriodSelected }).total;
        const left = catLimit.limit - spent;
        return left >= 0
          ? `✅ **Budget Status:** Yes. You have **${money(left)}** left in your **${catLabel(catLimit.c)}** limit for ${monthPeriodSelected.label} (${money(spent)} of ${money(catLimit.limit)} used, ${pct(spent, catLimit.limit)}%).`
          : `⚠️ **Budget Status:** No. You are **${money(-left)} over** your **${catLabel(catLimit.c)}** limit for ${monthPeriodSelected.label} (${money(spent)} spent against ${money(catLimit.limit)}).`;
      }
      if (m.budgetCents <= 0) return `You haven't set a budget for **${m.yearMonth}** yet, so I can't tell if you're within it. So far you have spent **${money(m.totalExpensesCents)}**. Set a monthly cap in the **Budgets** tab and I'll track it for you.`;
      const used = m.budgetUsagePercent.toFixed(1);
      if (m.remainingBudgetCents < 0)
        return `⚠️ **Budget Status:** No, you're over budget by **${money(-m.remainingBudgetCents)}**. You've spent ${money(m.totalExpensesCents)} against a ${money(m.budgetCents)} budget for ${formatMonthName(m.yearMonth)} (${used}% used).`;
      let pace = '';
      const [y, mo] = m.yearMonth.split('-').map(Number);
      const now = fromISO(today);
      if (now.getFullYear() === y && now.getMonth() + 1 === mo && now.getDate() > 2) {
        const projected = Math.round((m.totalExpensesCents / now.getDate()) * getDaysInMonth(m.yearMonth));
        pace = projected > m.budgetCents
          ? ` At your current pace you'd spend about **${money(projected)}** by month end, which is **${money(projected - m.budgetCents)} over**, so slow down a little.`
          : ` At your current pace you'll finish around **${money(projected)}**, so you're on track.`;
      }
      return `✅ **Budget Status:** Yes, you're within your budget. You have **${money(m.remainingBudgetCents)}** left of your **${money(m.budgetCents)}** budget for ${formatMonthName(m.yearMonth)} (${used}% used).${pace}`;
    }

    case 'afford': {
      const m = ctx.monthSummary;
      const nums = [...question.matchAll(/(?:[$₹€£]\s*)?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g)].map((x) => parseFloat(x[1].replace(/,/g, '')));
      const wanted = nums.find((n) => n > 0);
      if (!wanted) return `How much is it? Ask me like *"Can I afford 5000?"* and I'll check it against your budget.`;
      const cents = Math.round(wanted * 100);
      if (m.budgetCents > 0) {
        const left = m.remainingBudgetCents - cents;
        return left >= 0
          ? `✅ **Yes, you can afford ${money(cents)}.** You have ${money(m.remainingBudgetCents)} left in your ${formatMonthName(m.yearMonth)} budget, so you'd still have **${money(left)}** afterwards.`
          : `⚠️ **That would put you over budget.** You have ${money(Math.max(0, m.remainingBudgetCents))} left in your ${formatMonthName(m.yearMonth)} budget, so ${money(cents)} would take you **${money(-left)} over**.`;
      }
      const net = m.netSavingsCents - cents;
      return `You haven't set a budget, so I compared it with your ${formatMonthName(m.yearMonth)} cash flow (${money(m.netSavingsCents)} net so far). ${net >= 0 ? `**Yes**, after ${money(cents)} you'd still be at **${money(net)}**.` : `Spending ${money(cents)} would leave you **${money(-net)} short** for the month.`}`;
    }

    case 'goals': {
      const goals = ctx.savingsGoals;
      if (goals.length === 0) return `You haven't created any savings goals yet. Open the **Savings Goals** tab to set a target for an emergency fund, a trip or a big purchase.`;
      const q = question.toLowerCase();
      const named = goals.find((g) => g.name.length > 2 && q.includes(g.name.toLowerCase()));
      const describe = (g: SavingsGoal) => {
        const p = g.targetCents > 0 ? Math.min(100, Math.round((g.currentCents / g.targetCents) * 100)) : 0;
        const toGo = Math.max(0, g.targetCents - g.currentCents);
        return { p, toGo, line: `• **${g.name}**: ${money(g.currentCents)} / ${money(g.targetCents)} (${p}%)` };
      };
      if (named) {
        const d = describe(named);
        let need = '';
        if (named.targetDate && d.toGo > 0) {
          const monthsLeft = Math.max(1, Math.round(daysBetween(today, named.targetDate) / 30));
          need = ` To reach it by ${formatDate(named.targetDate)} you'd need about **${money(Math.ceil(d.toGo / monthsLeft))} per month**.`;
        }
        return d.toGo === 0 ? `🎯 **${named.name}** is complete: ${money(named.currentCents)} of ${money(named.targetCents)} (100%).` : `🎯 **${named.name}** is at **${d.p}%**: ${money(named.currentCents)} of ${money(named.targetCents)}, with **${money(d.toGo)}** still to go.${need}`;
      }
      const ranked = goals.map((g) => ({ g, ...describe(g) })).sort((a, b) => b.p - a.p);
      const best = ranked[0];
      const lead = best.toGo === 0 ? `**${best.g.name}** is complete!` : `Your closest goal is **${best.g.name}** at **${best.p}%**, with ${money(best.toGo)} to go.`;
      return `🎯 ${lead}\n\n**Your Savings Goals Progress:**\n\n${ranked.map((r) => r.line).join('\n')}`;
    }

    case 'list': {
      const n = parsed.listCount ?? 5;
      const s = sliceOf(ctx, { ...filters, period });
      if (!s.txs.length) return `There are no transactions${what ? ` for ${what}` : ''} ${when(period)}.`;
      const rows = [...s.txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, n);
      return `Here ${rows.length === 1 ? 'is your only transaction' : `are your ${rows.length} most recent transactions`}${what ? ` for ${what}` : ''} ${when(period)}:\n\n${rows.map((t) => `• ${formatDate(t.date)}: **${t.description}** ${t.type === 'income' ? '+' : '-'}${money(t.amountCents)} (${catLabel(t.category)})`).join('\n')}${s.txs.length > rows.length ? `\n\n(${s.txs.length - rows.length} more not shown)` : ''}`;
    }

    case 'summary': {
      const inc = sliceOf(ctx, { period, type: 'income' });
      const exp = sliceOf(ctx, { period, type: 'expense' });
      const net = inc.total - exp.total;
      const byCat = new Map<string, number>();
      exp.txs.forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amountCents));
      const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
      return `📊 **${period.label}:** you earned **${money(inc.total)}** and spent **${money(exp.total)}**, leaving **${net >= 0 ? '+' : '-'}${money(Math.abs(net))}** (${net >= 0 ? 'a surplus' : 'a deficit'}).\n` +
        `• **Expenses:** ${plural(exp.txs.length, 'transaction')}${top ? `, mostly **${catLabel(top[0])}** (${money(top[1])})` : ''}\n` +
        `• **Income:** ${plural(inc.txs.length, 'deposit')}` +
        (isSelectedMonth ? `\n• **Average daily spend:** ${money(ctx.monthSummary.averageDailySpendingCents)}${ctx.monthSummary.budgetCents > 0 ? `\n• **Budget left:** ${money(ctx.monthSummary.remainingBudgetCents)} of ${money(ctx.monthSummary.budgetCents)}` : '\n• **Budget:** not set for this month'}` : '');
    }
  }
}


const UNSURE = /not sure what you'd like to know|couldn't find anything matching/;

export type AnswerKind = 'chat' | 'identity' | 'profile' | 'math' | 'app' | 'data' | 'unclear' | 'out-of-scope';

export interface DetailedAnswer {
  text: string;
  /** false when the built-in engine could not work out what was asked */
  understood: boolean;
  /** true for greetings and chit-chat */
  smallTalk: boolean;
  /** which part of the assistant produced the answer */
  kind: AnswerKind;
  /** something the app should do for the user (open a page, switch currency...) */
  action?: AssistantAction;
}

const WANTS = /^\s*(i want|i need|i would like|i'd like|i wanna|give me|get me|can i have|could i have|bring me|buy me|order me|i demand)\b/i;
const WANTS_TO_KNOW = /\b(to (know|see|check|find|view|understand|learn|look)|know (about|how|what)|see (my|the|how|what))\b/i;
const FOLLOW_UP_HINT = /^\s*(and|what about|how about|also|same for|then)\b|\b(today|yesterday|this (week|month|year)|last (week|month|year)|previous month|january|february|march|april|june|july|august|september|october|november|december)\b/i;

const done = (text: string, kind: AnswerKind, extra: Partial<DetailedAnswer> = {}): DetailedAnswer => ({
  text, kind, understood: kind !== 'unclear' && kind !== 'out-of-scope', smallTalk: kind === 'chat', ...extra,
});

/** Works out what the message is about and answers it, or politely declines when it is not about this app. */
function answerOnce(question: string, ctx: AssistantContext): DetailedAnswer {
  const today = ctx.today ?? getTodayDateString();

  // Greetings, name, thanks, jokes...
  const talk = smallTalk(question, today);
  if (talk) {
    // Who/what the assistant is stays a fixed, local answer so it can never say anything else
    const t = question.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
    const identity = /\b(your name|who are you|who r u|what are you|what should i call you|what can i call you|introduce yourself|about yourself|who (made|created|built|developed|programmed|designed) you|your (creator|developer|maker))\b|^(are you|r u|are u) (a |an )?(real |human|person|robot|bot|ai|chatgpt|claude|gemini|gpt|alive|smart)/.test(t);
    return done(talk, identity ? 'identity' : 'chat');
  }

  // "Hi, how much did I spend on food?": say hi, then answer the real question
  const opener = question.match(/^\s*(hi+|hello+|hey+|hiya|good (?:morning|afternoon|evening))[\s,!.:-]+(?=\S)/i);
  if (opener) {
    const inner = answerOnce(question.slice(opener[0].length), ctx);
    return { ...inner, text: `${opener[1].replace(/^./, (c) => c.toUpperCase())}! ${inner.text}` };
  }

  // Questions about the user ("what's my name?") and quick maths
  const profile = matchProfile(question, ctx);
  if (profile) return done(profile, 'profile');
  const math = solveMath(question);
  if (math) return done(math.text, 'math');

  // Clearly not about this app
  if (isOffTopic(question)) return done(OUT_OF_SCOPE_TEXT, 'out-of-scope');

  // Doing or explaining something in the app
  const app = matchAppRequest(question, ctx, today);
  if (app) return done(app.text, 'app', { action: app.action });

  // "I want a pizza" / "get me a ticket": requests the app cannot fulfil
  if (WANTS.test(question) && !WANTS_TO_KNOW.test(question)) return done(OUT_OF_SCOPE_TEXT, 'out-of-scope');

  // Money questions, as long as the message is plausibly about the app
  const shortFollowUp = Boolean(ctx.previousQuestion) && question.trim().split(/\s+/).length <= 6 && FOLLOW_UP_HINT.test(question);
  const mentionsCategory = CATEGORY_WORDS.some(([re]) => re.test(question.toLowerCase()));
  if (!looksAppRelated(question, ctx) && !(shortFollowUp && (mentionsCategory || FOLLOW_UP_HINT.test(question)))) return done(OUT_OF_SCOPE_TEXT, 'out-of-scope');

  const text = answerFromData(question, ctx);
  return done(text, UNSURE.test(text) ? 'unclear' : 'data');
}


const UNDERSTOOD: AnswerKind[] = ['chat', 'identity', 'profile', 'math', 'app', 'data'];

/** Words from the user's own data, so a typo of "coffee" or "Emergency Fund" can be fixed too. */
function ownWords(ctx: AssistantContext): string[] {
  const words = new Set<string>();
  const add = (text?: string) => text?.toLowerCase().match(/[a-z]{3,}/g)?.forEach((w) => words.add(w));
  ctx.transactions.slice(0, 1500).forEach((t) => add(t.description));
  ctx.savingsGoals.forEach((g) => add(g.name));
  add(ctx.profile?.name);
  add(ctx.profile?.username);
  return [...words];
}

/**
 * The assistant's answer to a message. If it cannot make sense of it as typed, it tries again with likely
 * spelling mistakes fixed ("turn on lghit mode" -> "turn on light mode") and uses that only if it then understands.
 */
export function answerQuestionDetailed(question: string, ctx: AssistantContext): DetailedAnswer {
  const first = answerOnce(question, ctx);
  if (first.kind !== 'out-of-scope' && first.kind !== 'unclear') return first;

  const fixed = correctSpelling(question, ownWords(ctx));
  if (!fixed.changed) return first;
  const second = answerOnce(fixed.text, ctx);
  if (!UNDERSTOOD.includes(second.kind)) return first;

  // Say what was understood, except for plain chit-chat where it would just be noise
  const quiet = second.kind === 'chat' || second.kind === 'identity';
  return { ...second, text: quiet ? second.text : `*I read that as "${fixed.text.trim()}".*\n\n${second.text}` };
}

export function answerQuestion(question: string, ctx: AssistantContext): string {
  return answerQuestionDetailed(question, ctx).text;
}
