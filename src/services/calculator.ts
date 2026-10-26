/**
 * A small, safe calculator for the assistant ("what is 15% of 2000", "1200 divided by 4", "split 900 between 3").
 * It uses its own tiny parser (no eval), so only arithmetic can ever be run.
 */

export interface MathResult {
  /** The cleaned-up expression, e.g. "15% of 2,000" */
  expression: string;
  value: number;
  /** Ready-to-show reply, e.g. "15% of 2,000 = **300**" */
  text: string;
}

const NUMBER = String.raw`\d+(?:\.\d+)?|\.\d+`;

const pretty = (n: number): string => {
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return parseFloat(n.toFixed(6)).toLocaleString('en-US', { maximumFractionDigits: 6 });
};

// ─── Parser ──────────────────────────────────────────────────────────────────

interface Val { v: number; pct: boolean } // pct = the number was written with a % sign

function evaluate(src: string): number | null {
  const tokens = src.match(/sqrt|\d+(?:\.\d+)?|\.\d+|[()+\-*/^%]/g);
  if (!tokens || tokens.join('') !== src.replace(/\s+/g, '')) return null;
  let i = 0;
  let divZero = false;
  const peek = () => tokens[i];
  const next = () => tokens[i++];

  function expr(): Val {
    let left = term();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const right = term();
      // "1000 + 18%" means 1000 plus 18% OF 1000
      const r = right.pct ? (left.v * right.v) / 100 : right.v;
      left = { v: op === '+' ? left.v + r : left.v - r, pct: false };
    }
    return left;
  }
  function term(): Val {
    let left = power();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const right = power();
      if (op === '/' && right.v === 0) { divZero = true; left = { v: NaN, pct: false }; continue; }
      left = { v: op === '*' ? left.v * (right.pct ? right.v / 100 : right.v) : left.v / (right.pct ? right.v / 100 : right.v), pct: false };
    }
    return left;
  }
  function power(): Val {
    const base = unary();
    if (peek() === '^') { next(); const e = power(); return { v: Math.pow(base.v, e.v), pct: false }; }
    return base;
  }
  function unary(): Val {
    if (peek() === '-') { next(); const x = unary(); return { v: -x.v, pct: x.pct }; }
    if (peek() === '+') { next(); return unary(); }
    return atom();
  }
  function atom(): Val {
    const t = next();
    if (t === undefined) return { v: NaN, pct: false };
    if (t === 'sqrt') {
      const arg = atom();
      return { v: Math.sqrt(arg.v), pct: false };
    }
    if (t === '(') { const inner = expr(); if (next() !== ')') return { v: NaN, pct: false }; return inner; }
    if (/^[\d.]/.test(t)) {
      const n = parseFloat(t);
      if (peek() === '%') { next(); return { v: n, pct: true }; }
      return { v: n, pct: false };
    }
    return { v: NaN, pct: false };
  }

  const result = expr();
  if (i !== tokens.length) return null;
  if (divZero) return Infinity; // signalled to the caller
  return Number.isFinite(result.v) ? (result.pct ? result.v / 100 : result.v) : null;
}

// ─── Understanding the question ──────────────────────────────────────────────

export function solveMath(question: string): MathResult | null {
  let s = question.toLowerCase().trim();
  if (!s || /\d{4}-\d{2}-\d{2}/.test(s)) return null; // a date, not a sum

  s = s.replace(/[$₹€£]/g, '').replace(/(\d),(?=\d{3}\b)/g, '$1');
  const filler = /^(?:(?:please|can you|could you|can u|would you|just|quickly|hey|hi)\s+)*(?:(?:what\s+is|what's|whats|what\s+are|calculate|calc|compute|solve|work\s+out|find|how\s+much\s+is|how\s+much\s+are|tell\s+me|evaluate|what\s+do\s+you\s+get\s+for|the\s+answer\s+to|math|maths)\s+)+/;
  s = s.replace(/[?!]+$/g, '').replace(/\s*(?:=|equals?|is\s+what)\s*$/g, '').trim();
  s = s.replace(filler, '').trim();
  if (!s) return null;

  const done = (expression: string, value: number, label = expression): MathResult => ({
    expression, value, text: `${label} = **${pretty(value)}**`,
  });

  // percent of: "15% of 2000", "15 percent of 2000"
  let m = s.match(new RegExp(`^(${NUMBER})\\s*(?:%|percent|per\\s*cent)\\s+of\\s+(${NUMBER})$`));
  if (m) { const p = parseFloat(m[1]); const b = parseFloat(m[2]); return done(`${pretty(p)}% of ${pretty(b)}`, (p * b) / 100); }

  // "what percent is 50 of 200" / "50 is what percent of 200"
  m = s.match(new RegExp(`^(?:what\\s+)?(?:percent|percentage|%)\\s+(?:is|of)\\s+(${NUMBER})\\s+(?:of|from|in)\\s+(${NUMBER})$`)) ?? s.match(new RegExp(`^(${NUMBER})\\s+is\\s+what\\s+(?:percent|percentage|%)\\s+of\\s+(${NUMBER})$`));
  if (m) {
    const a = parseFloat(m[1]); const b = parseFloat(m[2]);
    if (b === 0) return divideByZero();
    const pct = (a / b) * 100;
    return { expression: `${pretty(a)} of ${pretty(b)}`, value: pct, text: `${pretty(a)} is **${pretty(pct)}%** of ${pretty(b)}` };
  }

  // increase / decrease / add tax / discount
  m = s.match(new RegExp(`^(?:increase|raise|add)\\s+(${NUMBER})\\s*(?:%|percent)\\s*(?:tax\\s+|gst\\s+|vat\\s+|tip\\s+)?(?:to|on|for|of)\\s+(${NUMBER})$`));
  if (m) { const p = parseFloat(m[1]); const b = parseFloat(m[2]); return done(`${pretty(b)} + ${pretty(p)}%`, b * (1 + p / 100)); }
  m = s.match(new RegExp(`^(?:increase|raise)\\s+(${NUMBER})\\s+by\\s+(${NUMBER})\\s*(?:%|percent)$`));
  if (m) { const b = parseFloat(m[1]); const p = parseFloat(m[2]); return done(`${pretty(b)} + ${pretty(p)}%`, b * (1 + p / 100)); }
  m = s.match(new RegExp(`^(?:decrease|reduce|cut|lower)\\s+(${NUMBER})\\s+by\\s+(${NUMBER})\\s*(?:%|percent)$`));
  if (m) { const b = parseFloat(m[1]); const p = parseFloat(m[2]); return done(`${pretty(b)} - ${pretty(p)}%`, b * (1 - p / 100)); }
  m = s.match(new RegExp(`^(?:discount|take\\s+off|knock\\s+off)\\s+(${NUMBER})\\s*(?:%|percent)\\s*(?:off\\s+)?(?:on|from|of|off)\\s+(${NUMBER})$`));
  if (m) { const p = parseFloat(m[1]); const b = parseFloat(m[2]); return done(`${pretty(b)} - ${pretty(p)}%`, b * (1 - p / 100)); }
  m = s.match(new RegExp(`^(${NUMBER})\\s+(?:with|after)\\s+(${NUMBER})\\s*(?:%|percent)\\s+discount$`));
  if (m) { const b = parseFloat(m[1]); const p = parseFloat(m[2]); return done(`${pretty(b)} - ${pretty(p)}%`, b * (1 - p / 100)); }
  m = s.match(new RegExp(`^(?:tip)\\s+(?:of\\s+)?(${NUMBER})\\s*(?:%|percent)\\s+(?:on|for|of)\\s+(${NUMBER})$`));
  if (m) { const p = parseFloat(m[1]); const b = parseFloat(m[2]); return { expression: `${pretty(p)}% tip on ${pretty(b)}`, value: (p * b) / 100, text: `A ${pretty(p)}% tip on ${pretty(b)} is **${pretty((p * b) / 100)}**, so the total is **${pretty(b + (p * b) / 100)}**.` }; }

  // split / share
  m = s.match(new RegExp(`^(?:split|share|divide)\\s+(${NUMBER})\\s+(?:between|among|amongst|by|into|over|with|equally\\s+between)\\s+(\\d+)(?:\\s+(?:people|persons|friends|ways|parts))?$`)) ?? s.match(new RegExp(`^(${NUMBER})\\s+(?:split|shared)\\s+(?:between|among|by)?\\s*(\\d+)(?:\\s+(?:people|persons|friends|ways))?$`));
  if (m) {
    const total = parseFloat(m[1]); const n = parseFloat(m[2]);
    if (n === 0) return divideByZero();
    return { expression: `${pretty(total)} ÷ ${pretty(n)}`, value: total / n, text: `${pretty(total)} split ${pretty(n)} ways is **${pretty(total / n)}** each.` };
  }

  // roots and powers in words
  s = s.replace(new RegExp(`(?:the\\s+)?square\\s+root\\s+of\\s+(${NUMBER})`, 'g'), 'sqrt($1)')
    .replace(new RegExp(`sqrt\\s*(?:of\\s+)?(${NUMBER})`, 'g'), 'sqrt($1)')
    .replace(new RegExp(`√\\s*(${NUMBER})`, 'g'), 'sqrt($1)')
    .replace(new RegExp(`(?:the\\s+)?square\\s+of\\s+(${NUMBER})`, 'g'), '($1)^2')
    .replace(new RegExp(`(?:the\\s+)?cube\\s+of\\s+(${NUMBER})`, 'g'), '($1)^3')
    .replace(new RegExp(`(${NUMBER})\\s+squared`, 'g'), '($1)^2')
    .replace(new RegExp(`(${NUMBER})\\s+cubed`, 'g'), '($1)^3')
    .replace(/\s*(?:to\s+the\s+power\s+of|to\s+the\s+power|power)\s*/g, '^')
    .replace(/\s+(?:multiplied\s+by|times|into)\s+/g, '*')
    .replace(/(\d)\s*[x×]\s*(?=[\d(])/g, '$1*')
    .replace(/\s+(?:divided\s+by|over)\s+/g, '/')
    .replace(/÷/g, '/')
    .replace(/\s+plus\s+/g, '+')
    .replace(/\s+minus\s+/g, '-')
    .replace(/\s+percent\b/g, '%');

  // Only arithmetic may remain
  const compact = s.replace(/\s+/g, '');
  if (!/^[\d.+\-*/^()%sqrt]+$/.test(compact) || !/\d/.test(compact)) return null;
  if (!/[+\-*/^%]|sqrt/.test(compact)) return null; // a lone number is not a question
  if (!/\s/.test(s) && /^\d{1,4}[-/]\d{1,2}[-/]\d{2,4}$/.test(compact)) return null; // 25-10-2026 style dates (a sum has spaces or short parts)

  const value = evaluate(compact);
  if (value === Infinity) return divideByZero();
  if (value === null) return null;
  const shown = compact.replace(/\*/g, '×').replace(/\//g, '÷').replace(/([\d)])([+\-×÷^])/g, '$1 $2 ').replace(/([+\-×÷^])(?=[\d(])/g, '$1 ').replace(/\s+/g, ' ').replace(/^- /, '-');
  return done(shown, value);
}

function divideByZero(): MathResult {
  return { expression: '÷ 0', value: NaN, text: `I can't divide by zero. 🙂 Try a different number.` };
}
