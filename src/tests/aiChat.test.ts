import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';
import { EMAIL_SERVICE } from '../config/emailConfig';
import { askAI, buildSummary, resetAiState } from '../services/aiChat';
import { calculateMonthSummary, calculateCategorySpending } from '../utils/calculations';
import type { Transaction } from '../types';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
}
const g = globalThis as unknown as Record<string, unknown>;
beforeEach(() => {
  g.localStorage = new MemoryStorage();
  g.sessionStorage = new MemoryStorage();
  EMAIL_SERVICE.scriptUrl = 'https://script.google.com/macros/s/TEST/exec';
  resetAiState();
});

/** The real Code.gs in a sandbox with fake Google services and a fake AI service. */
function loadScript(props: Record<string, string> = {}) {
  const propStore = new Map<string, string>(Object.entries(props));
  const cacheData = new Map<string, string>();
  const aiCalls: { url: string; headers: Record<string, string>; payload: any }[] = [];
  let aiReply: { code: number; body: unknown } = { code: 200, body: {} };
  const sandbox: Record<string, unknown> = {
    Utilities: {
      getUuid: () => randomUUID(), base64Encode: (b: Buffer) => b.toString('base64'),
      computeDigest: (_a: unknown, s: string) => createHash('sha256').update(s).digest(),
      DigestAlgorithm: { SHA_256: 'SHA_256' }, formatDate: () => '2026-10-25',
    },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cacheData.get(k) ?? null, put: (k: string, v: string) => cacheData.set(k, v), remove: (k: string) => cacheData.delete(k) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => propStore.get(k) ?? null, setProperty: (k: string, v: string) => propStore.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    MailApp: { sendEmail: () => {} },
    UrlFetchApp: {
      fetch: (url: string, opts: { headers: Record<string, string>; payload: string }) => {
        aiCalls.push({ url, headers: opts.headers, payload: JSON.parse(opts.payload) });
        return { getResponseCode: () => aiReply.code, getContentText: () => JSON.stringify(aiReply.body) };
      },
    },
    ContentService: { MimeType: { JSON: 'JSON' }, createTextOutput: (t: string) => ({ text: t, setMimeType() { return this; } }) },
    JSON, Date, Number, String, Math, parseInt, Array, encodeURIComponent,
  };
  runInNewContext(readFileSync('google-apps-script/Code.gs', 'utf8'), sandbox);
  const doPost = sandbox.doPost as (e: unknown) => { text: string };
  const call = (payload: Record<string, unknown>) => JSON.parse(doPost({ postData: { contents: JSON.stringify(payload) } }).text) as { ok: boolean; text?: string; error?: string };
  const fetchImpl = vi.fn(async (_u: string, init?: RequestInit) => new Response(JSON.stringify(call(JSON.parse(String(init?.body)))))) as unknown as typeof fetch;
  return { call, fetchImpl, aiCalls, setReply: (r: typeof aiReply) => { aiReply = r; } };
}

const geminiOk = (text: string) => ({ code: 200, body: { candidates: [{ content: { parts: [{ text }] } }] } });
const chat = (over: Record<string, unknown> = {}) => ({ action: 'chat', clientId: 'c1', question: 'hi', history: [], facts: '', summary: 'Income: $1.00', ...over });

describe('Google script: AI chat action', () => {
  it('reports "not configured" until a key is stored, without touching the AI service', () => {
    const s = loadScript();
    expect(s.call(chat())).toEqual({ ok: false, error: 'AI_NOT_CONFIGURED' });
    expect(s.aiCalls).toHaveLength(0);
  });

  it('asks Gemini with the key in a header, the system prompt, facts and history; never leaks the key', () => {
    const s = loadScript({ AI_API_KEY: 'SECRET-KEY-123', AI_PROVIDER: 'gemini' });
    s.setReply(geminiOk('Hey! Nice to meet you.'));
    const r = s.call(chat({ question: 'What is your name?', facts: 'You spent **$12.00**', history: [{ role: 'assistant', text: 'Welcome' }, { role: 'user', text: 'hi' }, { role: 'assistant', text: 'Hello!' }, { role: 'user', text: 'what is your name?' }] }));
    expect(r).toEqual({ ok: true, text: 'Hey! Nice to meet you.' });
    const call = s.aiCalls[0];
    expect(call.url).toContain('generativelanguage.googleapis.com');
    expect(call.url).not.toContain('SECRET-KEY-123');
    expect(call.headers['x-goog-api-key']).toBe('SECRET-KEY-123');
    expect(JSON.stringify(r)).not.toContain('SECRET-KEY-123');
    expect(call.payload.systemInstruction.parts[0].text).toMatch(/AI Financial Assistant.*You spent \*\*\$12\.00\*\*/s);
    expect(call.payload.systemInstruction.parts[0].text).toContain('Sorry, I can only help with things related to this app');
    // history starts with a user turn and alternates; the new question is last
    const roles = call.payload.contents.map((c: any) => c.role);
    expect(roles).toEqual(['user', 'model', 'user']);
    expect(call.payload.contents[2].parts[0].text).toBe('What is your name?');
  });

  it('can use Claude instead, through the Anthropic API', () => {
    const s = loadScript({ AI_API_KEY: 'K', AI_PROVIDER: 'anthropic', AI_MODEL: 'my-model' });
    s.setReply({ code: 200, body: { content: [{ type: 'text', text: 'Hello from Claude' }] } });
    expect(s.call(chat()).text).toBe('Hello from Claude');
    const c = s.aiCalls[0];
    expect(c.url).toBe('https://api.anthropic.com/v1/messages');
    expect(c.headers['x-api-key']).toBe('K');
    expect(c.payload.model).toBe('my-model');
    expect(c.payload.messages.at(-1)).toEqual({ role: 'user', content: 'hi' });
  });

  it('limits input size and usage', () => {
    const s = loadScript({ AI_API_KEY: 'K' });
    s.setReply(geminiOk('ok'));
    s.call(chat({ question: 'x'.repeat(5000), summary: 'y'.repeat(50000), facts: 'z'.repeat(50000) }));
    const sys = s.aiCalls[0].payload.systemInstruction.parts[0].text as string;
    expect(sys.length).toBeLessThan(12000);
    expect(s.aiCalls[0].payload.contents.at(-1).parts[0].text.length).toBe(600);
    let last = { ok: true as boolean, error: '' as string | undefined };
    for (let i = 0; i < 35; i++) last = s.call(chat({ clientId: 'same' })) as typeof last;
    expect(last.error).toBe('LIMIT_HOURLY');
    expect(s.call(chat({ clientId: 'someone-else' })).ok).toBe(true);
  });

  it('reports a failing AI service as unavailable (so the app can fall back)', () => {
    const s = loadScript({ AI_API_KEY: 'K' });
    s.setReply({ code: 500, body: {} });
    expect(s.call(chat())).toEqual({ ok: false, error: 'AI_UNAVAILABLE' });
    s.setReply({ code: 200, body: { candidates: [] } });
    expect(s.call(chat()).error).toBe('AI_UNAVAILABLE');
  });

  it('still handles the reset-email actions as before', () => {
    const s = loadScript();
    expect(s.call({ action: 'send', email: 'not-an-email' }).error).toMatch(/valid email/);
  });
});

describe('App: asking the AI', () => {
  it('returns the AI text, sends no individual transactions, and includes the summary', async () => {
    const s = loadScript({ AI_API_KEY: 'K' });
    s.setReply(geminiOk('Hi! I am your AI Financial Assistant.'));
    const txs: Transaction[] = [{ id: 'a', type: 'expense', amountCents: 1234, description: 'Secret dinner with Alice', category: 'Food and groceries', date: '2026-10-05', createdAt: '' }];
    const ctx = { monthSummary: calculateMonthSummary(txs, '2026-10', 0, 0), categorySpendings: calculateCategorySpending(txs, '2026-10'), transactions: txs, selectedMonth: '2026-10', budgetConfig: { monthlyBudgetCents: 0, openingBalanceCents: 0 }, savingsGoals: [], today: '2026-10-25' };
    const summary = buildSummary(ctx, 'USD');
    expect(summary).toContain('Expenses: $12.34');
    expect(summary).toContain('Food and groceries $12.34');
    expect(summary).not.toContain('Secret dinner');
    const r = await askAI({ question: 'hi', history: [], summary }, s.fetchImpl);
    expect(r).toEqual({ ok: true, text: 'Hi! I am your AI Financial Assistant.' });
    expect(JSON.stringify(s.aiCalls[0].payload)).not.toContain('Secret dinner');
  });

  it('falls back quietly when the AI is not set up, and stops asking for a while', async () => {
    const s = loadScript();
    expect(await askAI({ question: 'hi', history: [], summary: '' }, s.fetchImpl)).toEqual({ ok: false, reason: 'not-configured' });
    expect(s.fetchImpl).toHaveBeenCalledTimes(1);
    await askAI({ question: 'again', history: [], summary: '' }, s.fetchImpl);
    expect(s.fetchImpl).toHaveBeenCalledTimes(1); // did not hit the network again
    EMAIL_SERVICE.scriptUrl = '';
    resetAiState();
    expect((await askAI({ question: 'hi', history: [], summary: '' }, s.fetchImpl)).ok).toBe(false);
  });

  it('maps limits, errors and offline to a fallback', async () => {
    const offline = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await askAI({ question: 'hi', history: [], summary: '' }, offline)).toEqual({ ok: false, reason: 'unavailable' });
    const limited = vi.fn(async () => new Response(JSON.stringify({ ok: false, error: 'LIMIT_DAILY' }))) as unknown as typeof fetch;
    const r = await askAI({ question: 'hi', history: [], summary: '' }, limited);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toBe('limit');
  });
});
