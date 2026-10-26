/**
 * What the assistant knows about the app itself: the user's profile, how to use each feature, the few safe
 * things it can do for them (open a page, open the add form, switch currency, dark mode), and where its
 * boundary is (it only helps with this app).
 */
import { formatDate } from '../utils/dates';
import { parseSmartTransaction } from './smartParser';
import { CATEGORY_WORDS, type AssistantContext } from './assistantShared';

export type AssistantAction =
  | { type: 'navigate'; tab: 'dashboard' | 'daily' | 'transactions' | 'budgets' | 'savings' | 'insights' | 'admin' }
  | { type: 'open-add' }
  | { type: 'share-report' }
  | { type: 'smart-entry'; text: string }
  | { type: 'set-currency'; code: string }
  | { type: 'dark-mode'; value: boolean | 'toggle' };

export interface AppReply {
  text: string;
  action?: AssistantAction;
}

export const OUT_OF_SCOPE_TEXT =
  `Sorry, I can only help with things related to this app: your expenses, income, budget and savings goals, your profile, quick calculations, and how to use the app. 😊\n\nTry asking *"How much did I spend this month?"* or *"What's my name?"*.`;

const norm = (q: string) => q.toLowerCase().replace(/[^a-z0-9%$₹€£.\s'-]/g, ' ').replace(/\s+/g, ' ').trim();

// ─── Profile ────────────────────────────────────────────────────────────────

export function matchProfile(question: string, ctx: AssistantContext): string | null {
  const t = norm(question);
  // "change my name", "delete my account", "I forgot my email": that is a how-to, not a profile lookup
  if (/\b(change|edit|update|rename|reset|forgot|forget|delete|remove|close|recover|lost)\b/.test(t)) return null;
  const full = /\b(my (profile|account|details|info|information)|about me|what do you know about me|show (me )?my profile|account details|profile details)\b/.test(t);
  const name = /\b(what('?s| is) my (full )?name|my name|what am i called|who am i|tell me my name|do you know my name|what do you call me)\b/.test(t);
  const username = /\bmy (user ?name|login|user id|handle)\b/.test(t);
  const email = /\be-?mail\b|\bwhat('?s| is) my mail\b/.test(t) && /\b(my|which|what|show|tell)\b/.test(t);
  const role = /\bam i (an? )?(admin|administrator|normal user|standard user)\b|\bmy (role|permissions?|access level)\b|\bis my account (an )?admin\b/.test(t);
  const joined = /\b(when did i (join|sign ?up|register|create)|member since|my (join|sign ?up|registration) date|how long have i (been|used))\b/.test(t);
  const lastLogin = /\b(last (login|log in|sign in|seen)|when did i last (log|sign))\b/.test(t);
  const currency = /\bmy currency\b|\b(what|which) currency (am i|are we|is (this|the app)) (using|in|set)\b/.test(t);
  if (!(full || name || username || email || role || joined || lastLogin || currency)) return null;

  const p = ctx.profile;
  if (currency) return `You're viewing amounts in **${ctx.currency ?? 'USD'}**. You can change it from the currency menu at the top, or just tell me, for example *"switch to rupees"*.`;
  if (!p || p.isGuest) {
    return `You're using the **guest ledger**, so there's no account profile yet. 😊 To get one, open your profile (your name next to the title), choose **Sign out**, then **Create Account**. Your guest data stays on this device.`;
  }
  const asked = [name, username, email, role, joined, lastLogin].filter(Boolean).length;
  if (full || asked > 1) {
    const rows = [
      `• **Name:** ${p.name}`,
      `• **Username:** @${p.username}`,
      `• **Email:** ${p.email ?? 'not on file'}`,
      `• **Role:** ${p.role === 'admin' ? 'Admin' : 'Standard user'}`,
      p.createdAt ? `• **Member since:** ${formatDate(p.createdAt.slice(0, 10))}` : '',
      p.lastLoginAt ? `• **Last login:** ${formatDate(p.lastLoginAt.slice(0, 10))}` : '',
      `• **Currency:** ${ctx.currency ?? p.currency ?? 'USD'}`,
      `• **Recorded:** ${ctx.transactions.length} transaction${ctx.transactions.length === 1 ? '' : 's'} and ${ctx.savingsGoals.length} savings goal${ctx.savingsGoals.length === 1 ? '' : 's'}`,
    ].filter(Boolean);
    return `Here's your profile:\n\n${rows.join('\n')}`;
  }
  if (name) return `Your name is **${p.name}**${p.username ? ` (username **@${p.username}**)` : ''}. 😊`;
  if (username) return `Your username is **@${p.username}**.`;
  if (email) return p.email ? `Your email is **${p.email}**.` : `There's no email saved on your account (it was created before email sign-up existed).`;
  if (role) return p.role === 'admin' ? `Yes, you're an **admin**. You can manage accounts from the **Admin** tab.` : `You're a **standard user**, so you don't have the Admin tab. An admin can change that.`;
  if (joined) return p.createdAt ? `You joined on **${formatDate(p.createdAt.slice(0, 10))}**.` : `I don't have a join date for your account.`;
  return p.lastLoginAt ? `Your last login was on **${formatDate(p.lastLoginAt.slice(0, 10))}**.` : `I don't have a last-login date for your account.`;
}

// ─── Things the assistant can do or explain ──────────────────────────────────

const CURRENCY_WORDS: Array<[RegExp, string]> = [
  [/\b(inr|rupees?|rs|indian)\b/, 'INR'], [/\b(usd|dollars?|bucks|us dollars?)\b/, 'USD'], [/\b(eur|euros?)\b/, 'EUR'],
  [/\b(gbp|pounds?|sterling|quid)\b/, 'GBP'], [/\b(cad|canadian dollars?)\b/, 'CAD'], [/\b(aud|australian dollars?)\b/, 'AUD'],
  [/\b(jpy|yen)\b/, 'JPY'], [/\b(aed|dirhams?)\b/, 'AED'],
];
const currencyIn = (t: string): string | undefined => {
  if (/\bcanadian dollars?\b/.test(t)) return 'CAD';
  if (/\baustralian dollars?\b/.test(t)) return 'AUD';
  for (const [re, code] of CURRENCY_WORDS) if (re.test(t)) return code;
  return undefined;
};

const TABS: Array<{ re: RegExp; tab: 'dashboard' | 'daily' | 'transactions' | 'budgets' | 'savings' | 'insights' | 'admin'; label: string; tip: string }> = [
  { re: /\b(daily log|daily page|calendar)\b/, tab: 'daily', label: 'Daily Log', tip: 'Pick a day with the arrows or the calendar at the top, then add that day\'s expenses.' },
  { re: /\b(dashboard|home|overview|main page)\b/, tab: 'dashboard', label: 'Dashboard', tip: 'It shows your income, expenses, net amount and budget for the month.' },
  { re: /\b(transactions?|ledger|history)\b/, tab: 'transactions', label: 'Transactions', tip: 'Search, filter, edit, delete, and import or export your entries here.' },
  { re: /\b(budgets?)\b/, tab: 'budgets', label: 'Budgets', tip: 'Set your monthly cap and per-category limits here.' },
  { re: /\b(savings|goals?)\b/, tab: 'savings', label: 'Savings Goals', tip: 'Create goals and add or withdraw funds.' },
  { re: /\b(insights?|analytics|reports?|charts?)\b/, tab: 'insights', label: 'Insights', tip: 'Charts, month comparisons and saving suggestions live here.' },
  { re: /\badmin\b/, tab: 'admin', label: 'Admin', tip: 'Manage accounts here.' },
];

export function matchAppRequest(question: string, ctx: AssistantContext, today: string): AppReply | null {
  const t = norm(question);

  // Exchange rate / converting an amount
  const conv = t.match(/\bconvert\s+([\d,]+(?:\.\d+)?)\s*([a-z ]+?)\s+(?:to|into|in)\s+([a-z ]+)$/);
  if (conv && ctx.convertCurrency) {
    const amount = parseFloat(conv[1].replace(/,/g, ''));
    const from = currencyIn(conv[2]);
    const to = currencyIn(conv[3]);
    if (from && to) {
      const out = ctx.convertCurrency(amount, from, to);
      const f = (n: number, c: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
      return { text: `${f(amount, from)} is about **${f(out, to)}** at today's rate.` };
    }
  }
  if (/\b(exchange rate|conversion rate|currency rate)\b/.test(t)) {
    return { text: ctx.exchangeRateNote ? `Today's rate in this app: **${ctx.exchangeRateNote}**. It's updated daily when you're online.` : `The app converts amounts using live exchange rates, updated daily when you're online.` };
  }

  // Dark / light mode
  if (/\b(dark mode|dark theme|night mode|light mode|light theme|day mode)\b/.test(t)) {
    const off = /\b(off|disable|stop|remove)\b.*\bdark\b|\b(light mode|light theme|day mode)\b/.test(t);
    const toggle = /\btoggle\b|\bswitch (the )?(theme|mode)\b/.test(t);
    return off
      ? { text: `Done, switching to **light mode**. ☀️`, action: { type: 'dark-mode', value: false } }
      : toggle
      ? { text: `Done, I flipped the theme for you.`, action: { type: 'dark-mode', value: 'toggle' } }
      : { text: `Done, **dark mode** is on. 🌙 You can also change it from your profile card.`, action: { type: 'dark-mode', value: true } };
  }

  // Switching currency
  if (/\b(change|switch|set|use|show|display|convert|make)\b/.test(t) && !/\b(spend|spent|income|expense|earn)/.test(t)) {
    const code = currencyIn(t);
    if (code && (/\bcurrency\b/.test(t) || /\b(to|in|into|with|as)\b/.test(t) || /^(use|show) /.test(t))) {
      const rate = code !== 'USD' && ctx.convertCurrency ? ` (1 USD ≈ ${parseFloat(ctx.convertCurrency(1, 'USD', code).toFixed(4))} ${code})` : '';
      return { text: `Done, I switched the app to **${code}**. All your amounts are shown converted${rate}.`, action: { type: 'set-currency', code } };
    }
  }

  // "Spent 250 on lunch" / "add expense 250 for lunch": hand it to Smart Entry to review and save
  const statement = /^(i |we )?(just |also )?(spent|paid|bought|earned|received|got paid|add|record|log|note|enter|put in)\b/.test(t) || /\b(add|record|log|enter)\b.*\b(expense|income|transaction|payment)\b/.test(t);
  if (statement && /\d/.test(t)) {
    const parsed = parseSmartTransaction(question, today, ctx.currency ?? 'USD');
    if (parsed.success) {
      const kind = parsed.type === 'income' ? 'an income' : 'an expense';
      const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: parsed.currency }).format(parsed.amountCents / 100);
      return {
        text: `Got it: ${kind} of **${amount}** for *${parsed.description}* (${parsed.category}). I've opened **Smart Entry** with it filled in. Check the details and press **Confirm & Add Transaction** to save it.`,
        action: { type: 'smart-entry', text: question.replace(/^\s*(please\s+)?(can you\s+)?(add|record|log|enter|note)\s+(an?\s+)?(expense|income|transaction)?\s*(of|for)?\s*/i, (m) => (/\d/.test(m) ? m : '')).trim() || question },
      };
    }
  }

  // Add a transaction (no amount given)
  if (/\b(add|record|log|create|enter|make|new|put in)\b.*\b(transaction|expense|income|spending|payment|purchase)\b/.test(t) || /\bi (want|need|would like|wanna|'d like) to (add|record|log|enter)\b/.test(t) || /\b(add|new) (an? )?(expense|transaction|income)\b/.test(t))
    return { text: `Sure! I've opened the **Add Transaction** form. Enter the amount, a description and a category, then press **Record Transaction**.`, action: { type: 'open-add' } };

  // Go to a page
  const nav = /\b(go to|go back to|open|take me to|bring me to|switch to|navigate to|visit|head to|jump to|show me the|let me see the)\b/.test(t) || /\b(page|tab|screen|section)\b/.test(t);
  if (nav) {
    const hit = TABS.find((x) => x.re.test(t));
    if (hit) {
      if (hit.tab === 'admin' && ctx.profile?.role !== 'admin') return { text: `The **Admin** tab is only available to admins, and your account is a standard user.` };
      return { text: `Opening **${hit.label}**. ${hit.tip}`, action: { type: 'navigate', tab: hit.tab } };
    }
  }

  // How-to knowledge
  const go = (tab: 'transactions' | 'budgets' | 'savings' | 'daily'): AssistantAction => ({ type: 'navigate', tab });
  const kb: Array<[RegExp, AppReply]> = [
    [/\b(share|send|email|e-?mail|mail|whatsapp|forward|text)\b.*\b(report|summary|statement|expenses|spending|my month)\b|\b(report|summary|statement)\b.*\b(share|send|email|whatsapp|forward)\b|\bdetailed report\b|\bpdf report\b|\bmonthly report\b/, { text: `Opening **Share report** for the month shown at the top. You can send it by **WhatsApp**, **Gmail**, your email app or any app on your phone, copy it as text, or download it as a **PDF** to attach. Change the month at the top first if you want a different one.`, action: { type: 'share-report' } }],
    [/\b(export|download|back ?up)\b.*\b(data|transactions?|csv|spreadsheet|excel|json|ledger|everything)\b|\bcsv export\b|\bexport\b/, { text: `Go to **Transactions** and use **CSV Export** (a spreadsheet you can open in Excel) or **JSON** (a full backup). Exports follow that page's filters, so choose *All-Time Records* first if you want everything. I've taken you there.`, action: go('transactions') }],
    [/\b(import|upload|load)\b.*\b(csv|spreadsheet|excel|transactions?|data|file|statement)\b|\bcsv import\b/, { text: `On **Transactions**, click **CSV Import** and choose your file. It needs a header row with **Date** and **Amount** (Type, Description and Category are optional). You'll see a preview, and duplicates are skipped. I've taken you there.`, action: go('transactions') }],
    [/\b(change|update|edit|new|set)\b.*\b(pin|password|passcode)\b/, { text: `Click your name next to **Expense Tracker** at the top to open your profile card, then choose **Change PIN / password**. Enter your current PIN, then your new one twice. (Forgot the current one? Sign out and use **Forgot PIN? Reset it by email** on the login screen.)` }],
    [/\b(forgot|forget|reset|recover|lost)\b.*\b(pin|password|passcode)\b|\bcan'?t (log ?in|sign ?in)\b/, { text: `There's no "change PIN" setting yet, but you can reset it any time: sign out, click **Forgot PIN? Reset it by email** on the login screen, enter your email and the 6-digit code we send you, then choose a new PIN. If your account has no email, an admin can reset it from the **Admin** tab.` }],
    [/\b(sign|log) ?out\b|\blogout\b|\bsign me out\b/, { text: `Click your name next to **Expense Tracker** at the top to open your profile card, then choose **Sign out**. Your data stays saved for next time. (I can't sign you out myself.)` }],
    [/\b(delete|remove|close)\b.*\b(my )?(account|profile)\b/, { text: `Open your profile card (your name next to the title) and choose **Delete account**, then type DELETE to confirm. This permanently removes your account and all its data, so I won't do it for you.` }],
    [/\b(reset|clear|wipe|erase|start over|start fresh)\b.*\b(ledger|data|transactions|everything|app)\b/, { text: `Open your profile card (your name next to the title) and choose **Reset ledger**. It clears your transactions, budgets and savings goals after you confirm. I won't do it for you, since it can't be undone.` }],
    [/\b(set|change|edit|update|create|make|add)\b.*\b(budget|spending cap|spending limit|monthly cap)\b/, { text: `Open **Budgets**, type your monthly cap under **Monthly Spending Budget** and press **Save Budget**. You can also add limits per category below it. I've taken you there.`, action: go('budgets') }],
    [/\b(create|add|make|set up|start|new)\b.*\b(savings? goal|goal)\b|\bsave (up )?for\b/, { text: `Open **Savings Goals** and click **New Savings Goal**. Give it a name and a target amount, then use **+ Add Funds** as you save. I've taken you there.`, action: go('savings') }],
    [/\b(edit|change|fix|update|correct|delete|remove|undo)\b.*\b(transaction|expense|entry|payment|income|purchase)\b/, { text: `Go to **Transactions** (or the Recent list on the Dashboard) and use the pencil icon to edit an entry or the bin icon to delete it. I've taken you to Transactions.`, action: go('transactions') }],
    [/\b(smart entry|ai entry|natural language|type (in )?(an? )?(expense|transaction))\b/, { text: `Click **AI Entry** at the top and type a sentence like *"Spent ₹250 on lunch"* or *"Earned $1200 freelance"*. It works out the amount, currency, category and date, shows you a preview, and saves only after you confirm. You can also just tell me here, e.g. *"I spent 250 on lunch"*.` }],
    [/\b(single day|particular day|specific day|one day|each day|by day|daily log)\b|\b(how|where)\b.*\bcalendar\b|\bcalendar\b.*\b(work|use)\b/, { text: `Click the **Calendar** button at the top and pick a day. It opens the **Daily Log** for that day, where you can add expenses and see that day's total. **Whole month** takes you back to the monthly view.`, action: go('daily') }],
    [/\b(change|edit|update|rename)\b.*\b(my )?(name|e-?mail|username|profile)\b/, { text: `The app doesn't let you edit your name, username or email yet. If you need different details, you can create a new account with them.` }],
    [/\bremember\b.*\b(account|me|device|login)\b/, { text: `On the login screen, tick **Remember this account on this device**. Next time your username is filled in and you only type your PIN. Leave it unticked on shared computers.` }],
    [/\b(what|which) (are|is) (the )?insights?\b|\bwhat('?s| is) (on )?(the )?insights\b/, { text: `**Insights** shows your spending by category, how this month compares with last month, and suggestions for saving more.`, action: { type: 'navigate', tab: 'insights' } }],
    [/\badmin\b/, { text: ctx.profile?.role === 'admin' ? `You're an admin. In the **Admin** tab you can see every account, make or remove admins, disable or enable accounts, reset PINs and delete accounts.` : `Admins can see all accounts, disable them, reset PINs and delete them from the **Admin** tab. The first account created on a device is the admin.` }],
    [/\b(what is this (app|website|site|tool)|what does this (app|do)|how does this (app )?work|how (do|can) i use (this|the app)|features|tutorial|getting started|guide me|what is expense tracker)\b/, { text: `This is a personal expense tracker. You can:\n• record income and expenses (the form, **AI Entry**, a day at a time in **Daily Log**, or CSV import)\n• set monthly and per-category **budgets**\n• track **savings goals**\n• see **Insights** and compare months\n• switch **currency** (amounts convert at live rates) and **dark mode**\n• ask me about any of it. 😊` }],
  ];
  for (const [re, reply] of kb) if (re.test(t)) return reply;
  return null;
}

// ─── The boundary: is this about the app? ────────────────────────────────────

const OFF_TOPIC = new RegExp(
  String.raw`\b(weather|forecast|temperature outside|news|headlines|president|prime minister|capital of|population of|recipe|how to cook|lyrics|poem|poetry|essay|translate|python|javascript|typescript|html|css|programming|algorithm|horoscope|zodiac|astrology|who won|world cup|ipl|cricket|football|bitcoin|crypto price|stock price|share price|meaning of life|history of|wikipedia|youtube|instagram|facebook|tiktok|riddle|trivia|quiz|solar system|planet|who invented|who discovered|who is the (ceo|king|queen|president)|define \w+|how old is|how tall is|distance (between|to|from)|time in \w+|weather in|order (a|some|me)|book (a )?(flight|ticket|hotel|cab|table)|play (a )?(song|music|video|game)|open (youtube|google|instagram|facebook)|search (for|the web|google)|google it|write (me )?(a|an|some) \w+|generate (an? )?(image|picture|photo)|draw (me )?|tell me a story|sing (me )?|marry me|date me|are you single|your (age|birthday|favou?rite)|what is love|why is the sky|how many (legs|days in|people live|countries)|best (movie|song|book|phone|laptop|restaurant|place))\b`
);

const APP_WORDS = new RegExp(
  String.raw`\b(spend|spent|spending|expenses?|income|earn|earned|earning|salary|revenue|budgets?|savings?|saved|goals?|transactions?|categor(y|ies)|balance|net|cash ?flow|money|costs?|paid|pay|bills?|rent|purchase|purchases|bought|buy|afford|account|profile|username|e-?mail|password|pin|admin|currency|rupees?|dollars?|euros?|pounds?|yen|dirhams?|inr|usd|eur|gbp|cad|aud|jpy|aed|dashboard|insights?|calendar|daily log|export|import|csv|json|backup|dark mode|theme|sign ?out|log ?out|delete account|reset|ledger|tracker|app|assistant|smart entry|ai entry|month|week|year|today|yesterday|finances?|financial|wallet|invoice|subscription|groceries|grocery|food|transport)\b`
);

const GENERAL_KNOWLEDGE = /\b(in|of|for|from) (india|the usa|usa|america|the us|china|the uk|britain|england|europe|africa|australia|canada|japan|germany|france|russia|dubai|the world)\b|\b(recommend|suggest)\w* (me )?(a |an |some )?(good |nice |best )?(movie|film|show|series|song|book|restaurant|phone|laptop|place|game|anime)\b/;
const PERSONAL = /\b(my|i|me|mine|our|we)\b/;

export function isOffTopic(question: string): boolean {
  const t = norm(question);
  return OFF_TOPIC.test(t) || (GENERAL_KNOWLEDGE.test(t) && !PERSONAL.test(t));
}

/** True when the message is about something this app handles (money, profile, maths, how-to, actions). */
export function looksAppRelated(question: string, ctx: AssistantContext): boolean {
  const t = norm(question);
  if (APP_WORDS.test(t)) return true;
  if (CATEGORY_WORDS.some(([re]) => re.test(t))) return true;
  if (ctx.savingsGoals.some((g) => g.name.length > 2 && t.includes(g.name.toLowerCase()))) return true;
  const words = t.split(' ').filter((w) => w.length >= 4);
  if (words.some((w) => ctx.transactions.some((tx) => tx.description.toLowerCase().includes(w.replace(/s$/, ''))))) return true;
  return false;
}
