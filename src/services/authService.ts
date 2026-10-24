import { UserProfile, UserRole } from '../types/auth';
import { storageService } from './storage';

const USERS_STORAGE_KEY = 'expense_tracker_profiles_v1';
const ACTIVE_USER_SESSION_KEY = 'expense_tracker_active_session_v1';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/** Generates a code like "K7QM-2XPA-9DRT" (no 0/O/1/I to avoid misreading). */
export function generateRecoveryCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(12);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function validatePin(pin: string): string | null {
  if (!pin || pin.length < 4) return 'PIN / Password must be at least 4 characters.';
  return null;
}

type AuthResult = { success: boolean; error?: string; user?: UserProfile };

export const authService = {
  getUsers(): UserProfile[] {
    try {
      const data = localStorage.getItem(USERS_STORAGE_KEY);
      const users: UserProfile[] = data ? JSON.parse(data) : [];
      // Every device with accounts needs one admin; promote the oldest account if none exists
      // (covers accounts created before roles existed, and the last admin being deleted).
      if (users.length > 0 && !users.some((u) => u.role === 'admin')) {
        users[0] = { ...users[0], role: 'admin' };
        this.saveUsers(users);
      }
      return users;
    } catch {
      return [];
    }
  },

  saveUsers(users: UserProfile[]): boolean {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      return true;
    } catch {
      return false;
    }
  },

  getCurrentUser(): UserProfile | null {
    try {
      const activeId = localStorage.getItem(ACTIVE_USER_SESSION_KEY);
      if (!activeId) return null;
      const user = this.getUsers().find((u) => u.id === activeId);
      if (!user || user.disabled) {
        localStorage.removeItem(ACTIVE_USER_SESSION_KEY);
        return null;
      }
      return user;
    } catch {
      return null;
    }
  },

  /** Finds an account by username or email (case-insensitive). */
  findUser(identifier: string): UserProfile | undefined {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return undefined;
    return this.getUsers().find(
      (u) => u.username === clean || (u.email && u.email.toLowerCase() === clean)
    );
  },

  register(name: string, username: string, email: string, pin: string, currency: string = 'USD'): AuthResult {
    const trimmedName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!trimmedName) {
      return { success: false, error: 'Full name is required.' };
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    if (cleanUsername.includes('@')) {
      return { success: false, error: 'Username cannot contain "@". Use the email field for your email address.' };
    }
    if (!isValidEmail(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address (e.g. name@example.com).' };
    }
    const pinError = validatePin(cleanPin);
    if (pinError) {
      return { success: false, error: pinError };
    }

    const users = this.getUsers();
    if (users.some((u) => u.username === cleanUsername)) {
      return { success: false, error: 'Username already exists. Please choose another or log in.' };
    }
    if (users.some((u) => u.email?.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists. Please log in instead.' };
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      username: cleanUsername,
      email: cleanEmail,
      pin: cleanPin,
      recoveryCode: generateRecoveryCode(),
      role: users.length === 0 ? 'admin' : 'user',
      currency,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    if (!this.saveUsers([...users, newUser])) {
      return { success: false, error: 'Failed to save account locally.' };
    }
    try {
      localStorage.setItem(ACTIVE_USER_SESSION_KEY, newUser.id);
    } catch {}
    return { success: true, user: newUser };
  },

  login(identifier: string, pin: string): AuthResult {
    const user = this.findUser(identifier);

    if (!user) {
      return { success: false, error: 'Account not found. Check your username / email, or create an account.' };
    }
    if (user.pin !== pin.trim()) {
      return { success: false, error: 'Incorrect PIN / Password.' };
    }
    if (user.disabled) {
      return { success: false, error: 'This account has been disabled by an admin.' };
    }

    const loggedIn = { ...user, lastLoginAt: new Date().toISOString() };
    this.saveUsers(this.getUsers().map((u) => (u.id === user.id ? loggedIn : u)));
    try {
      localStorage.setItem(ACTIVE_USER_SESSION_KEY, user.id);
      return { success: true, user: loggedIn };
    } catch {
      return { success: false, error: 'Could not establish session.' };
    }
  },

  /** Ends the session only. The account and its data stay on this device. */
  logout(): void {
    try {
      localStorage.removeItem(ACTIVE_USER_SESSION_KEY);
    } catch {}
  },

  /**
   * Resets a forgotten PIN using the recovery code shown at sign-up.
   * The code is single-use: a new one is issued and returned.
   */
  resetPinWithRecoveryCode(identifier: string, recoveryCode: string, newPin: string): {
    success: boolean;
    error?: string;
    newRecoveryCode?: string;
  } {
    const user = this.findUser(identifier);
    if (!user) {
      return { success: false, error: 'Account not found. Check your username / email.' };
    }
    if (!user.recoveryCode) {
      return {
        success: false,
        error: 'This account has no recovery code (it was created before recovery codes existed). Ask the admin to reset your PIN.',
      };
    }
    if (normalizeCode(recoveryCode) !== normalizeCode(user.recoveryCode)) {
      return { success: false, error: 'Recovery code is incorrect.' };
    }
    const pinError = validatePin(newPin.trim());
    if (pinError) {
      return { success: false, error: pinError };
    }

    const newRecoveryCode = generateRecoveryCode();
    this.saveUsers(
      this.getUsers().map((u) =>
        u.id === user.id ? { ...u, pin: newPin.trim(), recoveryCode: newRecoveryCode } : u
      )
    );
    return { success: true, newRecoveryCode };
  },

  /** Permanently removes an account and all of its ledger data from this device. */
  deleteAccount(userId: string): void {
    this.saveUsers(this.getUsers().filter((u) => u.id !== userId));
    storageService.clearData(userId);
    try {
      if (localStorage.getItem(ACTIVE_USER_SESSION_KEY) === userId) {
        localStorage.removeItem(ACTIVE_USER_SESSION_KEY);
      }
    } catch {}
  },

  // ─── Admin actions ────────────────────────────────────────────────────────

  adminSetRole(userId: string, role: UserRole): { success: boolean; error?: string } {
    const users = this.getUsers();
    if (role === 'user' && users.filter((u) => u.role === 'admin').length <= 1) {
      return { success: false, error: 'There must be at least one admin.' };
    }
    this.saveUsers(users.map((u) => (u.id === userId ? { ...u, role } : u)));
    return { success: true };
  },

  adminSetDisabled(userId: string, disabled: boolean): void {
    this.saveUsers(this.getUsers().map((u) => (u.id === userId ? { ...u, disabled } : u)));
  },

  /** Sets a new PIN and issues a fresh recovery code, which the admin hands to the user. */
  adminResetPin(userId: string, newPin: string): { success: boolean; error?: string; newRecoveryCode?: string } {
    const pinError = validatePin(newPin.trim());
    if (pinError) return { success: false, error: pinError };
    const newRecoveryCode = generateRecoveryCode();
    this.saveUsers(
      this.getUsers().map((u) =>
        u.id === userId ? { ...u, pin: newPin.trim(), recoveryCode: newRecoveryCode } : u
      )
    );
    return { success: true, newRecoveryCode };
  },
};
