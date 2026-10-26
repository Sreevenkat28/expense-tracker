/**
 * Forgiving spelling for the assistant: "lghit mode" -> "light mode", "how mcuh did i spnd on fod" -> "how much did i spend on food".
 *
 * Only words the assistant does not recognise are touched, and each is replaced by the closest known word
 * (a command word, a category, a month, one of your own transaction or goal words ...). The assistant also
 * checks that the corrected sentence makes sense before using it (see assistant.ts).
 */

// Words the assistant understands. Earlier = more common, used to break ties.
const BASE_WORDS = `
hello thanks thank welcome goodbye please help name your you who what whats which when where why how much many did does do is are was were can could should would will
spend spent spending expense expenses income earn earned earning salary budget budgets saving savings saved goal goals transaction transactions category categories balance
total average daily weekly monthly yearly biggest largest highest lowest smallest compare compared difference more less left remaining afford buy bought paid pay cost costs
today yesterday tomorrow this last previous next week month year january february march april june july august september october november december
food foods groceries grocery lunch dinner breakfast coffee restaurant snack snacks pizza burger transport transportation taxi fuel petrol flight metro train shopping clothes shoes
entertainment movies movie cinema games bills rent subscription subscriptions internet electricity education books tuition freelance investments investment refund refunds gift gifts bonus
dashboard insights calendar daily transactions ledger history admin profile account username email password currency rupees rupee dollars dollar euros euro pounds pound yen dirhams
theme dark light night mode switch change turn enable disable toggle open show take export import download upload backup add record create edit delete remove update reset sign login logout register
smart entry assistant app page tab screen section list latest recent biggest count number percent percentage square root power split between among discount tax increase decrease calculate sum minus plus times divided multiplied
profile joined member role standard exchange rate convert rates money cash finances financial wallet monthly cap limit target
summary overview report trend trends spending income savings expenses incomes joke jokes funny create account guest sorry okay
weather news recipe poem story song movie president capital population translate cricket football bitcoin horoscope
`.split(/\s+/).filter(Boolean);

// Everyday English words that must never be "corrected" into something else (so "there" does not become "where")
const COMMON = new Set(`
the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is are was were been being am has had having does did doing here where why too very much many more less such own same both each few those through during before between under again further once while above below down off until against within without along across around among near far still yet already always never often sometimes really maybe perhaps please yes okay thing things something anything nothing everything someone anyone everyone nobody every another next last long little big small old young high low right left early late hard easy free full sure true false real best better worse great fine nice bad happy sad ask tell try need feel leave call keep let begin seem help talk turn start show hear play run move live believe hold bring happen write provide sit stand lose pay meet include continue set learn change lead understand watch follow stop create speak read allow add spend grow open walk win offer remember love consider appear buy wait serve die send expect build stay fall cut reach kill remain suggest raise pass sell require report decide pull fund funds fun money bank loan card cash price pay paid bill bills tax tips tip trip car bus bike home house shop store market online app apps phone mobile laptop book books movie music game games gym fees fee gift gifts coffee tea water milk bread rice fruit
`.split(/\s+/).filter(Boolean));

// Very short or very common slips that are too short for the general rule
const ALIASES: Record<string, string> = {
  hw: 'how', wat: 'what', wut: 'what', wats: 'whats', whts: 'whats', ur: 'your', u: 'you', r: 'are', pls: 'please', plz: 'please', thx: 'thanks', thnx: 'thanks',
  abt: 'about', mnth: 'month', mnths: 'months', wk: 'week', yr: 'year', fod: 'food', hlp: 'help', gud: 'good', hlo: 'hello', helo: 'hello', hii: 'hi', hy: 'hi', bdget: 'budget',
  amnt: 'amount', expnse: 'expense', expnses: 'expenses', incm: 'income', sav: 'save', trnsactions: 'transactions', tday: 'today', yesterdy: 'yesterday', tmrw: 'tomorrow',
};

/** Optimal-string-alignment distance: counts a swapped pair of neighbouring letters as ONE mistake. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

const sortedLetters = (w: string) => w.split('').sort().join('');

/** Is `candidate` a believable intended word for the misspelling `word`? Returns a cost (lower = better) or null. */
function plausibleCost(word: string, candidate: string): number | null {
  const len = Math.max(word.length, candidate.length);
  if (Math.abs(word.length - candidate.length) > 2 || len < 4) return null;
  const d = editDistance(word, candidate);
  if (d === 0) return 0;
  // One slip. Two swapped neighbours ("precent" -> "percent") is the likeliest typo, then a missing/extra/wrong letter.
  if (d === 1) return word.length === candidate.length && sortedLetters(word) === sortedLetters(candidate) ? 0.8 : word[0] === candidate[0] ? 1 : 1.1;
  // Scrambled letters ("lghit" -> "light"), same first and last letter
  if (word.length === candidate.length && word.length >= 4 && sortedLetters(word) === sortedLetters(candidate) && word[0] === candidate[0]) return 1.5;
  if (d === 2 && len >= 5 && word[0] === candidate[0]) return 2;
  if (d === 3 && len >= 8 && word[0] === candidate[0]) return 3;
  return null;
}

export interface Correction {
  from: string;
  to: string;
}

export interface SpellResult {
  text: string;
  changed: boolean;
  changes: Correction[];
}

/**
 * Fixes likely typos. `extraWords` are words from the user's own data (transaction descriptions, goal names)
 * so that e.g. "cofee" can become "coffee" if they have a coffee entry.
 */
export function correctSpelling(text: string, extraWords: string[] = []): SpellResult {
  const known = new Set<string>([...BASE_WORDS, ...extraWords.map((w) => w.toLowerCase())]);
  const order = new Map<string, number>();
  [...BASE_WORDS, ...extraWords.map((w) => w.toLowerCase())].forEach((w, i) => { if (!order.has(w)) order.set(w, i); });
  const vocabulary = [...known];
  const changes: Correction[] = [];

  const fixed = text.replace(/[A-Za-z']+/g, (token) => {
    const w = token.toLowerCase().replace(/'s$/, '');
    if (w.length < 1 || known.has(w) || COMMON.has(w) || known.has(w.replace(/s$/, '')) || known.has(w + 's') || COMMON.has(w.replace(/s$/, ''))) return token;
    const alias = ALIASES[w];
    if (alias) { changes.push({ from: token, to: alias }); return alias; }
    let best: { word: string; cost: number } | null = null;
    for (const v of vocabulary) {
      const cost = plausibleCost(w, v);
      if (cost === null) continue;
      if (!best || cost < best.cost || (cost === best.cost && (order.get(v) ?? 1e9) < (order.get(best.word) ?? 1e9))) best = { word: v, cost };
    }
    if (!best) return token;
    changes.push({ from: token, to: best.word });
    return best.word;
  });

  return { text: fixed, changed: changes.length > 0, changes };
}
