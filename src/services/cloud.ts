import { isEmailServiceConfigured } from '../config/emailConfig';
import type { UserProfile } from '../types/auth';
import { callMailer, MailerReply } from './emailCodes';
import { authService } from './authService';
import { storageService, StorageData } from './storage';

/**
 * Accounts and ledgers that follow the user to any device. The browser keeps a working copy in localStorage
 * (so the app is fast and still opens offline); the Google Apps Script keeps the master copy (Code.gs, "Accounts").
 */

const DEVICE_KEY = 'expense_tracker_device_id_v1';
const SYNC_KEY = 'expense_tracker_sync_v1'; // { [userId]: updatedAt of the last version this browser has seen }

export const cloudEnabled = (): boolean => isEmailServiceConfigured();

export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `d-${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'd-unknown';
  }
}

function syncMarks(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SYNC_KEY) ?? '{}');
  } catch {
    return {};
  }
}
export const getSyncMark = (userId: string): number => syncMarks()[userId] ?? 0;
export function setSyncMark(userId: string, updatedAt: number): void {
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify({ ...syncMarks(), [userId]: updatedAt }));
  } catch {}
}
function clearSyncMark(userId: string): void {
  const marks = syncMarks();
  delete marks[userId];
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify(marks));
  } catch {}
}

type Ledger = Pick<StorageData, 'transactions' | 'budgetConfig' | 'savingsGoals'>;
const toLedger = (d: StorageData): Ledger => ({ transactions: d.transactions, budgetConfig: d.budgetConfig, savingsGoals: d.savingsGoals });

/** Is this username / email free across every device? */
export async function checkAvailable(username: string, email: string, fetchImpl?: typeof fetch): Promise<{ ok: boolean; error?: string; offline?: boolean }> {
  if (!cloudEnabled()) return { ok: true };
  const r = await callMailer({ action: 'acct_available', username, email }, fetchImpl);
  return r.ok ? { ok: true } : { ok: false, error: r.error, offline: isOffline(r) };
}

// An old, not-yet-updated script answers account requests with "Enter a valid email address" / "Unknown action": treated like offline
const isOffline = (r: MailerReply) => /Could not reach|email service returned|Enter a valid email address|Unknown action|Bad request/i.test(r.error ?? '');

export async function cloudRegister(user: UserProfile, fetchImpl?: typeof fetch): Promise<{ ok: boolean; error?: string }> {
  const ledger = toLedger(storageService.loadData(user.id));
  const r = await callMailer({
    action: 'acct_register',
    profile: { id: user.id, name: user.name, username: user.username, email: user.email, currency: user.currency, createdAt: user.createdAt },
    pin: user.pin,
    deviceId: deviceId(),
    ledger: ledger.transactions.length || ledger.savingsGoals.length ? ledger : undefined,
  }, fetchImpl);
  if (r.ok) setSyncMark(user.id, Number(r.updatedAt ?? 0));
  return { ok: r.ok || isOffline(r), error: r.error };
}

export type CloudLoginResult =
  | { kind: 'ok' }
  | { kind: 'new-device'; email: string; name: string }
  | { kind: 'not-found' }
  | { kind: 'offline' }
  | { kind: 'error'; error: string };

/**
 * Logs in against the master copy. On success the account and its ledger are written into this browser,
 * so the normal local login that follows finds everything "exactly like before".
 * `verified` is true right after the user typed the emailed code for a new device.
 */
export async function cloudLogin(identifier: string, pin: string, verified = false, fetchImpl?: typeof fetch): Promise<CloudLoginResult> {
  if (!cloudEnabled()) return { kind: 'offline' };
  const r = await callMailer({ action: 'acct_login', identifier, pin: pin.trim(), deviceId: deviceId(), verified }, fetchImpl);
  if (r.ok) {
    const profile = r.profile as Pick<UserProfile, 'id' | 'name' | 'username' | 'email' | 'currency' | 'createdAt'>;
    authService.importAccount(profile, pin.trim());
    const ledger = r.ledger as Ledger | null;
    if (ledger) {
      storageService.saveData(ledger.transactions, ledger.budgetConfig, ledger.savingsGoals, profile.id);
      setSyncMark(profile.id, Number(r.updatedAt ?? 0));
    } else {
      // Cloud copy has no ledger yet: this browser's ledger (if any) becomes the master copy
      const pushed = await pushNow({ ...profile, pin: pin.trim() } as UserProfile, fetchImpl);
      if (!pushed.ok && !pushed.offline) return { kind: 'error', error: pushed.error ?? 'Could not save your data online.' };
    }
    return { kind: 'ok' };
  }
  if (r.needsDeviceCode) return { kind: 'new-device', email: String(r.email ?? ''), name: String(r.name ?? '') };
  if (r.notFound) return { kind: 'not-found' };
  if (isOffline(r)) return { kind: 'offline' };
  return { kind: 'error', error: r.error ?? 'Could not log in.' };
}

/** Saves this browser's ledger to the master copy. Returns conflict=true if another device saved newer changes (they are pulled in). */
export async function pushNow(user: UserProfile, fetchImpl?: typeof fetch): Promise<{ ok: boolean; conflict?: boolean; offline?: boolean; error?: string }> {
  if (!cloudEnabled()) return { ok: true };
  const ledger = toLedger(storageService.loadData(user.id));
  const r = await callMailer({
    action: 'acct_push', identifier: user.username, pin: user.pin, deviceId: deviceId(),
    ledger, base: getSyncMark(user.id), currency: user.currency,
  }, fetchImpl);
  if (r.ok) {
    setSyncMark(user.id, Number(r.updatedAt ?? 0));
    return { ok: true };
  }
  if (r.conflict) {
    applyRemote(user.id, r);
    return { ok: false, conflict: true };
  }
  return { ok: false, offline: isOffline(r), error: r.error };
}

function applyRemote(userId: string, r: MailerReply): void {
  const ledger = r.ledger as Ledger | null;
  if (ledger) storageService.saveData(ledger.transactions, ledger.budgetConfig, ledger.savingsGoals, userId);
  setSyncMark(userId, Number(r.updatedAt ?? 0));
}

/** Pulls newer changes made on another device. Returns true if this browser's copy was replaced. */
export async function pullIfNewer(user: UserProfile, fetchImpl?: typeof fetch): Promise<boolean> {
  if (!cloudEnabled()) return false;
  const r = await callMailer({ action: 'acct_pull', identifier: user.username, pin: user.pin, deviceId: deviceId(), since: getSyncMark(user.id) }, fetchImpl);
  if (!r.ok || !r.changed) return false;
  applyRemote(user.id, r);
  return true;
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;
/** Debounced save after any change; `onConflict` runs if another device had saved newer changes. */
export function schedulePush(user: UserProfile | null, onConflict: () => void): void {
  if (!user || !cloudEnabled()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushNow(user).then((res) => { if (res.conflict) onConflict(); });
  }, 1500);
}

export async function cloudChangePin(identifier: string, pin: string, newPin: string, fetchImpl?: typeof fetch): Promise<void> {
  if (!cloudEnabled()) return;
  await callMailer({ action: 'acct_change_pin', identifier, pin, newPin: newPin }, fetchImpl);
}

/** Sets a new PIN online after the emailed code was checked. `notFound` means the account only exists on this device. */
export async function cloudResetPin(email: string, newPin: string, fetchImpl?: typeof fetch): Promise<{ ok: boolean; notFound?: boolean; error?: string }> {
  if (!cloudEnabled()) return { ok: false, notFound: true };
  const r = await callMailer({ action: 'acct_reset_pin', email, newPin: newPin.trim() }, fetchImpl);
  return { ok: r.ok, notFound: Boolean(r.notFound), error: r.error };
}

export async function cloudDelete(user: UserProfile, fetchImpl?: typeof fetch): Promise<void> {
  clearSyncMark(user.id);
  if (!cloudEnabled()) return;
  await callMailer({ action: 'acct_delete', identifier: user.username, pin: user.pin }, fetchImpl);
}
