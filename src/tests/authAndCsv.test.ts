import { describe, it, expect, beforeEach } from 'vitest';
import { authService, isValidEmail } from '../services/authService';
import { storageService } from '../services/storage';
import {
  parseTransactionsCSV,
  transactionsToCSV,
  normalizeDate,
  parseAmountToCents,
} from '../utils/csv';
import { Transaction } from '../types';

// Tests run in Node, so provide a minimal in-memory localStorage
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  get length() { return this.store.size; }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

describe('Accounts: email, sign out, delete, PIN reset, admin', () => {
  it('validates email format', () => {
    expect(isValidEmail('name@gmail.com')).toBe(true);
    expect(isValidEmail('name@gmail')).toBe(false);
    expect(isValidEmail('not an email')).toBe(false);
  });

  it('rejects sign-up with invalid or duplicate email', () => {
    expect(authService.register('A', 'alice', 'bad', '1234').success).toBe(false);
    expect(authService.register('A', 'alice', 'a@x.com', '1234').success).toBe(true);
    const dup = authService.register('B', 'bob', 'A@X.com', '1234');
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/email already exists/);
  });

  it('logs in with username or email, and first account is admin', () => {
    const reg = authService.register('Alice', 'alice', 'alice@x.com', '1234');
    expect(reg.user?.role).toBe('admin');
    expect(authService.register('Bob', 'bob', 'bob@x.com', '5678').user?.role).toBe('user');
    authService.logout();
    expect(authService.login('ALICE@x.com', '1234').success).toBe(true);
    authService.logout();
    expect(authService.login('alice', '1234').success).toBe(true);
    expect(authService.login('alice', '0000').success).toBe(false);
  });

  it('sign out ends the session but keeps the account and data', () => {
    const { user } = authService.register('Alice', 'alice', 'alice@x.com', '1234');
    storageService.saveData([{ id: 't1' } as Transaction], { monthlyBudgetCents: 0, openingBalanceCents: 0 }, [], user!.id);
    authService.logout();
    expect(authService.getCurrentUser()).toBeNull();
    expect(authService.getUsers()).toHaveLength(1);
    expect(storageService.countTransactions(user!.id)).toBe(1);
  });

  it('delete account wipes the profile, session and ledger data', () => {
    const { user } = authService.register('Alice', 'alice', 'alice@x.com', '1234');
    storageService.saveData([{ id: 't1' } as Transaction], { monthlyBudgetCents: 0, openingBalanceCents: 0 }, [], user!.id);
    authService.deleteAccount(user!.id);
    expect(authService.getUsers()).toHaveLength(0);
    expect(authService.getCurrentUser()).toBeNull();
    expect(storageService.countTransactions(user!.id)).toBe(0);
    expect(localStorage.length).toBe(1); // only the (now empty) profiles list remains
  });

  it('admin can disable users, and the last admin cannot be demoted', () => {
    const alice = authService.register('Alice', 'alice', 'alice@x.com', '1234').user!;
    const bob = authService.register('Bob', 'bob', 'bob@x.com', '5678').user!;
    expect(authService.adminSetRole(alice.id, 'user').success).toBe(false);
    authService.adminSetDisabled(bob.id, true);
    expect(authService.login('bob', '5678').error).toMatch(/disabled/);
    authService.adminSetDisabled(bob.id, false);
    expect(authService.login('bob', '5678').success).toBe(true);
  });

  it('keeps an admin available when the admin account is deleted', () => {
    const alice = authService.register('Alice', 'alice', 'alice@x.com', '1234').user!; // first account = admin
    const bob = authService.register('Bob', 'bob', 'bob@x.com', '5678').user!;
    const carol = authService.register('Carol', 'carol', 'carol@x.com', '9999').user!;
    expect(authService.getUsers().map((u) => u.role)).toEqual(['admin', 'user', 'user']);
    authService.deleteAccount(alice.id);
    // the oldest remaining account is promoted so the app is never without an admin
    expect(authService.getUsers().map((u) => [u.id, u.role])).toEqual([[bob.id, 'admin'], [carol.id, 'user']]);
    // admins can appoint more admins, and the last one cannot be demoted
    expect(authService.adminSetRole(carol.id, 'admin').success).toBe(true);
    expect(authService.adminSetRole(bob.id, 'user').success).toBe(true);
    expect(authService.adminSetRole(carol.id, 'user').success).toBe(false);
  });

  it('promotes the oldest account to admin for accounts created before roles existed', () => {
    localStorage.setItem('expense_tracker_profiles_v1', JSON.stringify([
      { id: 'u1', name: 'Old', username: 'old', pin: '1234', createdAt: '2026-01-01' },
    ]));
    expect(authService.getUsers()[0].role).toBe('admin');
  });
});

describe('CSV import / export', () => {
  const sample: Transaction[] = [
    { id: '1', type: 'income', amountCents: 5000000, description: 'Salary, Oct', category: 'Salary', date: '2026-10-01', createdAt: '' },
    { id: '2', type: 'expense', amountCents: 125050, description: 'Dinner "special" #2', category: 'Food and groceries', date: '2026-10-02', createdAt: '' },
  ];

  it('round-trips an export back through the importer', () => {
    const csv = transactionsToCSV(sample, 'INR');
    expect(csv.split('\r\n')[0]).toBe('Date,Type,Description,Category,Amount (INR)');
    const { transactions, errors } = parseTransactionsCSV(csv);
    expect(errors).toEqual([]);
    expect(transactions).toEqual(sample.map(({ id: _id, createdAt: _c, ...rest }) => rest));
  });

  it('infers type from sign and maps loose category names', () => {
    const csv = '﻿date,description,category,amount\n15/10/2026,Bus,transportation,-₹45\n16/10/2026,Refund,refunds,"1,200.00"\n';
    const { transactions, errors } = parseTransactionsCSV(csv);
    expect(errors).toEqual([]);
    expect(transactions[0]).toMatchObject({ date: '2026-10-15', type: 'expense', amountCents: 4500, category: 'Transportation' });
    expect(transactions[1]).toMatchObject({ type: 'income', amountCents: 120000, category: 'Refunds' });
  });

  it('reports bad rows without dropping good ones', () => {
    const csv = 'Date,Type,Amount\n2026-13-01,expense,10\n2026-10-01,expense,abc\n2026-10-01,transfer,5\n2026-10-01,expense,5';
    const { transactions, errors } = parseTransactionsCSV(csv);
    expect(transactions).toHaveLength(1);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toMatch(/^Row 2: invalid date/);
  });

  it('requires date and amount columns', () => {
    expect(parseTransactionsCSV('Name,Value\na,1').errors[0]).toMatch(/Missing required column/);
  });

  it('parses dates and amounts', () => {
    expect(normalizeDate('2026/2/30')).toBeNull();
    expect(normalizeDate('2026-02-28')).toBe('2026-02-28');
    expect(parseAmountToCents('(45.00)')).toBe(-4500);
    expect(parseAmountToCents('$12')).toBe(1200);
    expect(parseAmountToCents('1.234')).toBeNull();
  });
});
