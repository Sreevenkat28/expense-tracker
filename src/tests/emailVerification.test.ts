import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EMAIL_SERVICE } from '../config/emailConfig';
import {
  checkEmailIsReal,
  generateVerificationCode,
  startChallenge,
  verifyChallenge,
  loginNeedsCode,
  trustDevice,
  untrustDevice,
  maskEmail,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
} from '../services/emailVerification';
import { authService } from '../services/authService';

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
  EMAIL_SERVICE.serviceId = 'service_x';
  EMAIL_SERVICE.templateId = 'template_x';
  EMAIL_SERVICE.publicKey = 'key_x';
});

/** Fake EmailJS: remembers the code it was asked to email. */
function fakeMailer() {
  const sent: { to: string; code: string }[] = [];
  const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    sent.push({ to: body.template_params.to_email, code: body.template_params.passcode });
    return new Response('OK', { status: 200 });
  }) as unknown as typeof fetch;
  return { sent, fetchImpl };
}

describe('Confirmation code', () => {
  it('is always exactly 6 digits and random', () => {
    const codes = new Set(Array.from({ length: 200 }, generateVerificationCode));
    expect([...codes].every((c) => /^\d{6}$/.test(c))).toBe(true);
    expect(codes.size).toBeGreaterThan(190);
  });

  it('is emailed, and only that code unlocks the challenge', async () => {
    const { sent, fetchImpl } = fakeMailer();
    const res = await startChallenge({ email: 'a@gmail.com', name: 'A', purpose: 'register', subject: 'a@gmail.com' }, fetchImpl);
    expect(res.ok).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('a@gmail.com');
    const wrong = sent[0].code === '000000' ? '111111' : '000000';
    expect((await verifyChallenge({ purpose: 'register', subject: 'a@gmail.com' }, wrong)).ok).toBe(false);
    expect((await verifyChallenge({ purpose: 'register', subject: 'a@gmail.com' }, sent[0].code)).ok).toBe(true);
    // single use
    expect((await verifyChallenge({ purpose: 'register', subject: 'a@gmail.com' }, sent[0].code)).ok).toBe(false);
  });

  it('does not store the plain code', async () => {
    const { sent, fetchImpl } = fakeMailer();
    await startChallenge({ email: 'a@gmail.com', name: 'A', purpose: 'login', subject: 'u1' }, fetchImpl);
    expect(String(sessionStorage.getItem('expense_tracker_email_challenge_v1'))).not.toContain(sent[0].code);
  });

  it('locks after too many wrong attempts and rejects expired codes', async () => {
    const { sent, fetchImpl } = fakeMailer();
    await startChallenge({ email: 'a@gmail.com', name: 'A', purpose: 'login', subject: 'u1' }, fetchImpl);
    const wrong = sent[0].code === '123456' ? '654321' : '123456';
    for (let i = 0; i < MAX_ATTEMPTS; i++) await verifyChallenge({ purpose: 'login', subject: 'u1' }, wrong);
    expect((await verifyChallenge({ purpose: 'login', subject: 'u1' }, sent[0].code)).ok).toBe(false);

    const second = fakeMailer();
    await startChallenge({ email: 'a@gmail.com', name: 'A', purpose: 'login', subject: 'u1' }, second.fetchImpl);
    const late = await verifyChallenge({ purpose: 'login', subject: 'u1' }, second.sent[0].code, Date.now() + CODE_TTL_MS + 1000);
    expect(late.ok).toBe(false);
    expect(late.error).toMatch(/expired/);
  });

  it('refuses a code for a different account or purpose', async () => {
    const { sent, fetchImpl } = fakeMailer();
    await startChallenge({ email: 'a@gmail.com', name: 'A', purpose: 'login', subject: 'u1' }, fetchImpl);
    expect((await verifyChallenge({ purpose: 'login', subject: 'u2' }, sent[0].code)).ok).toBe(false);
    expect((await verifyChallenge({ purpose: 'register', subject: 'u1' }, sent[0].code)).ok).toBe(false);
  });

  it('rate-limits resending and reports an unconfigured email service', async () => {
    const { fetchImpl } = fakeMailer();
    const p = { email: 'a@gmail.com', name: 'A', purpose: 'login' as const, subject: 'u1' };
    expect((await startChallenge(p, fetchImpl)).ok).toBe(true);
    expect((await startChallenge(p, fetchImpl)).error).toMatch(/wait/);
    EMAIL_SERVICE.publicKey = '';
    const unset = await startChallenge({ ...p, subject: 'u2' }, fetchImpl);
    expect(unset.ok).toBe(false);
    expect(unset.notConfigured).toBe(true);
  });

  it('masks the address', () => {
    expect(maskEmail('sreevenkat@gmail.com')).toBe('s*****@gmail.com');
  });
});

describe('Real email check', () => {
  const dns = (answers: Record<string, { Status: number; Answer?: { type: number; data: string }[] }>) =>
    vi.fn(async (url: string) => {
      const u = new URL(url);
      const key = `${u.searchParams.get('type')}:${u.searchParams.get('name')}`;
      return new Response(JSON.stringify(answers[key] ?? { Status: 0 }), { status: 200 });
    }) as unknown as typeof fetch;

  it('accepts a domain with mail servers', async () => {
    const f = dns({ 'MX:gmail.com': { Status: 0, Answer: [{ type: 15, data: '5 gmail-smtp-in.l.google.com.' }] } });
    expect((await checkEmailIsReal('Me@Gmail.com', f)).ok).toBe(true);
  });

  it('rejects fake domains, disposable inboxes, typos, null MX and bad format', async () => {
    const f = dns({
      'MX:notarealdomain-xyz.com': { Status: 3 },
      'MX:nomail.org': { Status: 0, Answer: [{ type: 15, data: '0 .' }] },
    });
    expect((await checkEmailIsReal('a@notarealdomain-xyz.com', f)).error).toMatch(/does not exist/);
    expect((await checkEmailIsReal('a@mailinator.com', f)).error).toMatch(/Disposable/);
    expect((await checkEmailIsReal('a@gmial.com', f)).error).toMatch(/Did you mean a@gmail.com/);
    expect((await checkEmailIsReal('a@nomail.org', f)).ok).toBe(false);
    expect((await checkEmailIsReal('not-an-email', f)).ok).toBe(false);
  });

  it('falls back to an A record, and fails safely offline', async () => {
    const f = dns({ 'A:small.example.io': { Status: 0, Answer: [{ type: 1, data: '1.2.3.4' }] } });
    expect((await checkEmailIsReal('a@small.example.io', f)).ok).toBe(true);
    const offline = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect((await checkEmailIsReal('a@gmail.com', offline)).ok).toBe(false);
  });
});

describe('Remember this account', () => {
  const user = { id: 'u1', email: 'a@gmail.com' };

  it('asks for a code unless remembered AND previously verified on this device', () => {
    expect(loginNeedsCode(user, false)).toBe(true);
    expect(loginNeedsCode(user, true)).toBe(true); // ticked, but never verified here yet
    trustDevice('u1');
    expect(loginNeedsCode(user, true)).toBe(false); // remembered: no email sent
    expect(loginNeedsCode(user, false)).toBe(true); // not ticked: code again
    untrustDevice('u1');
    expect(loginNeedsCode(user, true)).toBe(true);
  });

  it('never asks accounts that have no email on file', () => {
    expect(loginNeedsCode({ id: 'old' }, false)).toBe(false);
  });

  it('forgets the device when the account is deleted', () => {
    const { user: created } = authService.register('A', 'alice', 'a@gmail.com', '1234');
    trustDevice(created!.id);
    authService.deleteAccount(created!.id);
    expect(loginNeedsCode({ id: created!.id, email: 'a@gmail.com' }, true)).toBe(true);
  });
});

describe('Registration validation', () => {
  it('validates without creating the account', () => {
    expect(authService.validateRegistration('A', 'alice', 'bad', '1234').success).toBe(false);
    expect(authService.validateRegistration('A', 'alice', 'a@gmail.com', '1234').success).toBe(true);
    expect(authService.getUsers()).toHaveLength(0);
  });

  it('checkCredentials verifies without starting a session', () => {
    authService.register('A', 'alice', 'a@gmail.com', '1234');
    authService.logout();
    expect(authService.checkCredentials('alice', '1234').success).toBe(true);
    expect(authService.getCurrentUser()).toBeNull();
    expect(authService.checkCredentials('alice', '0000').success).toBe(false);
  });
});
