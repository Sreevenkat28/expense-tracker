import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';
import { EMAIL_SERVICE } from '../config/emailConfig';
import { startChallenge, verifyChallenge, maskEmail } from '../services/emailCodes';
import { authService } from '../services/authService';
import { requestPinReset, completePinReset } from '../services/pinReset';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  get length() { return this.store.size; }
}

/**
 * Loads the real google-apps-script/Code.gs into a sandbox with fake Google services
 * (cache, mail, properties, locks) so the mailer's rules are tested exactly as written.
 */
function loadMailer() {
  const sent: { to: string; subject: string; body: string; code: string }[] = [];
  const cacheData = new Map<string, { value: string; expires: number }>();
  const props = new Map<string, string>();
  const clock = { now: 1_000_000 };

  const sandbox: Record<string, unknown> = {
    Utilities: {
      getUuid: () => randomUUID(),
      base64Encode: (b: Buffer) => b.toString('base64'),
      computeDigest: (_alg: unknown, s: string) => createHash('sha256').update(s).digest(),
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      formatDate: () => '2026-10-23',
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k: string) => {
          const e = cacheData.get(k);
          return e && e.expires > clock.now ? e.value : null;
        },
        put: (k: string, v: string, ttl: number) => cacheData.set(k, { value: v, expires: clock.now + ttl * 1000 }),
        remove: (k: string) => cacheData.delete(k),
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props.get(k) ?? null,
        setProperty: (k: string, v: string) => props.set(k, v),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    MailApp: {
      sendEmail: (m: { to: string; subject: string; body: string }) =>
        sent.push({ ...m, code: /(\d{6})/.exec(m.body)![1] }),
    },
    ContentService: {
      MimeType: { JSON: 'JSON' },
      createTextOutput: (t: string) => ({ text: t, setMimeType() { return this; } }),
    },
    JSON, Date, Number, String, Math, parseInt,
  };
  runInNewContext(readFileSync('google-apps-script/Code.gs', 'utf8'), sandbox);
  const doPost = sandbox.doPost as (e: unknown) => { text: string };
  const call = (payload: Record<string, string>) =>
    JSON.parse(doPost({ postData: { contents: JSON.stringify(payload) } }).text) as { ok: boolean; error?: string };

  // A fetch() that talks to the sandboxed script the way the browser talks to the deployed one
  const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) =>
    new Response(JSON.stringify(call(JSON.parse(String(init?.body)))), { status: 200 })
  ) as unknown as typeof fetch;

  return { sent, call, fetchImpl, advance: (ms: number) => (clock.now += ms) };
}

const g = globalThis as unknown as Record<string, unknown>;

beforeEach(() => {
  g.localStorage = new MemoryStorage();
  g.sessionStorage = new MemoryStorage();
  EMAIL_SERVICE.scriptUrl = 'https://script.google.com/macros/s/TEST/exec';
});

describe('Gmail mailer script (Code.gs)', () => {
  it('emails a random 6-digit code and accepts only that code, once', () => {
    const m = loadMailer();
    expect(m.call({ action: 'send', email: 'Alice@Gmail.com', name: 'Alice' }).ok).toBe(true);
    expect(m.sent).toHaveLength(1);
    expect(m.sent[0].to).toBe('alice@gmail.com');
    expect(m.sent[0].code).toMatch(/^\d{6}$/);
    expect(m.sent[0].subject).toContain(m.sent[0].code);

    const wrong = m.sent[0].code === '000000' ? '111111' : '000000';
    expect(m.call({ action: 'verify', email: 'alice@gmail.com', code: wrong }).error).toMatch(/Incorrect code. 4 attempts left/);
    expect(m.call({ action: 'verify', email: 'alice@gmail.com', code: m.sent[0].code }).ok).toBe(true);
    expect(m.call({ action: 'verify', email: 'alice@gmail.com', code: m.sent[0].code }).ok).toBe(false); // single use
  });

  it('locks a code after 5 wrong tries, and expires it after 10 minutes', () => {
    const m = loadMailer();
    m.call({ action: 'send', email: 'a@gmail.com' });
    const wrong = m.sent[0].code === '123456' ? '654321' : '123456';
    for (let i = 0; i < 5; i++) m.call({ action: 'verify', email: 'a@gmail.com', code: wrong });
    expect(m.call({ action: 'verify', email: 'a@gmail.com', code: m.sent[0].code }).ok).toBe(false);

    m.advance(31_000);
    m.call({ action: 'send', email: 'a@gmail.com' });
    m.advance(11 * 60_000);
    expect(m.call({ action: 'verify', email: 'a@gmail.com', code: m.sent[1].code }).error).toMatch(/expired/);
  });

  it('limits resends: 30 s cooldown, 3 per hour per address', () => {
    const m = loadMailer();
    expect(m.call({ action: 'send', email: 'a@gmail.com' }).ok).toBe(true);
    expect(m.call({ action: 'send', email: 'a@gmail.com' }).error).toMatch(/wait/);
    m.advance(31_000);
    expect(m.call({ action: 'send', email: 'a@gmail.com' }).ok).toBe(true);
    m.advance(31_000);
    expect(m.call({ action: 'send', email: 'a@gmail.com' }).ok).toBe(true);
    m.advance(31_000);
    expect(m.call({ action: 'send', email: 'a@gmail.com' }).error).toMatch(/Too many codes/);
    expect(m.sent).toHaveLength(3);
  });

  it('stops at the daily cap, rejects bad addresses and cleans the name', () => {
    const m = loadMailer();
    expect(m.call({ action: 'send', email: 'not-an-email' }).ok).toBe(false);
    m.call({ action: 'send', email: 'x@gmail.com', name: 'Eve <script>\nBcc: spam' });
    expect(m.sent[0].body).not.toContain('<');
    expect(m.sent[0].body.split('\n')[0]).toBe('Hi Eve  script  Bcc: spam,');
    for (let i = 0; i < 90; i++) m.call({ action: 'send', email: `user${i}@gmail.com` });
    expect(m.sent.length).toBeLessThanOrEqual(80);
  });
});

describe('App side of the reset code', () => {
  it('startChallenge / verifyChallenge talk to the mailer', async () => {
    const m = loadMailer();
    const p = { email: 'a@gmail.com', name: 'A', purpose: 'reset' as const, subject: 'u1' };
    expect((await startChallenge(p, m.fetchImpl)).ok).toBe(true);
    expect((await startChallenge(p, m.fetchImpl)).error).toMatch(/wait/); // app-side cooldown too
    expect((await verifyChallenge({ purpose: 'reset', subject: 'u2' }, m.sent[0].code, m.fetchImpl)).ok).toBe(false);
    expect((await verifyChallenge({ purpose: 'reset', subject: 'u1' }, '12', m.fetchImpl)).ok).toBe(false);
    expect((await verifyChallenge({ purpose: 'reset', subject: 'u1' }, m.sent[0].code, m.fetchImpl)).ok).toBe(true);
  });

  it('reports a missing or unreachable mailer', async () => {
    const m = loadMailer();
    EMAIL_SERVICE.scriptUrl = '';
    const unset = await startChallenge({ email: 'a@gmail.com', name: 'A', purpose: 'reset', subject: 'u1' }, m.fetchImpl);
    expect(unset.notConfigured).toBe(true);
    EMAIL_SERVICE.scriptUrl = 'https://script.google.com/macros/s/TEST/exec';
    const offline = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    const down = await startChallenge({ email: 'a@gmail.com', name: 'A', purpose: 'reset', subject: 'u1' }, offline);
    expect(down.error).toMatch(/Could not reach/);
  });

  it('masks the address', () => {
    expect(maskEmail('sreevenkat@gmail.com')).toBe('s*****@gmail.com');
  });
});

describe('Reset PIN by email', () => {
  const setup = () => {
    authService.register('Alice', 'alice', 'alice@gmail.com', '1234');
    authService.logout();
  };

  it('emails the address given at sign-up, then sets the new PIN with the right code', async () => {
    setup();
    const m = loadMailer();
    expect((await requestPinReset('Alice@Gmail.com', m.fetchImpl)).ok).toBe(true);
    expect(m.sent.map((s) => s.to)).toEqual(['alice@gmail.com']);

    const wrong = m.sent[0].code === '000000' ? '111111' : '000000';
    expect((await completePinReset('alice@gmail.com', wrong, '9999', m.fetchImpl)).ok).toBe(false);
    expect(authService.checkCredentials('alice', '1234').success).toBe(true); // unchanged

    expect((await completePinReset('alice@gmail.com', m.sent[0].code, '9999', m.fetchImpl)).ok).toBe(true);
    expect(authService.checkCredentials('alice', '9999').success).toBe(true);
    expect(authService.checkCredentials('alice', '1234').success).toBe(false);
    expect((await completePinReset('alice@gmail.com', m.sent[0].code, '5555', m.fetchImpl)).ok).toBe(false);
  });

  it('rejects unknown emails, accounts without email, disabled accounts and short PINs', async () => {
    setup();
    const m = loadMailer();
    expect((await requestPinReset('nobody@gmail.com', m.fetchImpl)).ok).toBe(false);
    authService.adminSetDisabled(authService.findUser('alice')!.id, true);
    expect((await requestPinReset('alice@gmail.com', m.fetchImpl)).error).toMatch(/disabled/);

    localStorage.setItem('expense_tracker_profiles_v1', JSON.stringify([
      { id: 'old', name: 'Old', username: 'old', pin: '1234', role: 'admin', createdAt: '2026-01-01' },
    ]));
    expect((await requestPinReset('old', m.fetchImpl)).error).toMatch(/no email on file/);
    expect((await completePinReset('old', '123456', '12', m.fetchImpl)).ok).toBe(false);
    expect(m.sent).toHaveLength(0);
  });
});
