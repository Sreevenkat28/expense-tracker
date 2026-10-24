import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkEmailIsReal } from '../services/emailCheck';
import { authService } from '../services/authService';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  get length() { return this.store.size; }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
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

  it('falls back to an A record, and does not block sign-up if the lookup itself is unreachable', async () => {
    const f = dns({ 'A:small.example.io': { Status: 0, Answer: [{ type: 1, data: '1.2.3.4' }] } });
    expect((await checkEmailIsReal('a@small.example.io', f)).ok).toBe(true);
    const offline = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect((await checkEmailIsReal('a@gmail.com', offline)).ok).toBe(true);
  });
});

describe('Remember this account', () => {
  it('remembers only the account id, and survives sign out', () => {
    const { user } = authService.register('Alice', 'alice', 'a@gmail.com', '1234');
    expect(authService.getRememberedUser()).toBeNull();
    authService.rememberAccount(user!.id);
    authService.logout();
    expect(authService.getRememberedUser()?.username).toBe('alice');
  });

  it('forgets on request, when disabled, and when the account is deleted', () => {
    const a = authService.register('Alice', 'alice', 'a@gmail.com', '1234').user!;
    const b = authService.register('Bob', 'bob', 'b@gmail.com', '5678').user!;
    authService.rememberAccount(b.id);
    authService.forgetAccount();
    expect(authService.getRememberedUser()).toBeNull();

    authService.rememberAccount(b.id);
    authService.adminSetDisabled(b.id, true);
    expect(authService.getRememberedUser()).toBeNull();
    authService.adminSetDisabled(b.id, false);

    authService.deleteAccount(b.id);
    expect(authService.getRememberedUser()).toBeNull();
    expect(authService.getUsers().map((u) => u.id)).toEqual([a.id]);
  });

  it('login never asks for a code: correct PIN signs in directly', () => {
    authService.register('Alice', 'alice', 'a@gmail.com', '1234');
    authService.logout();
    expect(authService.login('alice@x.com', '1234').success).toBe(false);
    expect(authService.login('a@gmail.com', '1234').success).toBe(true);
  });
});
