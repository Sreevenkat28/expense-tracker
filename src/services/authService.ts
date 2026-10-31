import { UserProfile, UserRole } from '../types/auth';
import { storageService } from './storage';
import { isValidEmail, canonicalEmail } from './emailCheck';
import { isAdminEmail } from '../config/admin';

export { isValidEmail };

const USERS_STORAGE_KEY = 'expense_tracker_profiles_v1';
const ACTIVE_USER_SESSION_KEY = 'expense_tracker_active_session_v1';
const REMEMBERED_USER_KEY = 'expense_tracker_remembered_user_v1';

const LAST_SEEN_KEY = 'expense_tracker_last_seen_v1';
/** Closed the tab for longer than this and the next visit asks you to log in again. */
export const SESSION_GRACE_MS = 5 * 60 * 1000;
const HEARTBEAT_MS = 10 * 1000;

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
      // If the device has no admin, restore one, but only for an account whose email is on the admin list.
      if (users.length > 0 && !users.some((u) => u.role === 'admin')) {
        const idx = users.findIndex((u) => isAdminEmail(u.email));
        if (idx >= 0) {
          users[idx] = { ...users[idx], role: 'admin' };
          this.saveUsers(users);
        }
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

  /** Runs every sign-up check without creating anything (used before emailing a code). */
  validateRegistration(name: string, username: string, email: string, pin: string): { success: boolean; error?: string } {
    const result = this.register(name, username, email, pin, 'USD', true);
    return { success: result.success, error: result.error };
  },

  register(name: string, username: string, email: string, pin: string, currency: string = 'USD', dryRun: boolean = false): AuthResult {
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
    if (users.some((u) => u.email && canonicalEmail(u.email) === canonicalEmail(cleanEmail))) {
      return { success: false, error: 'This email is already used by another account. Please log in instead, or use a different email.' };
    }

    if (dryRun) {
      return { success: true };
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      username: cleanUsername,
      email: cleanEmail,
      pin: cleanPin,
      role: isAdminEmail(cleanEmail) ? 'admin' : 'user',
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

  /** Stores an account that was fetched from the online master copy (another device made it). */
  importAccount(profile: Pick<UserProfile, 'id' | 'name' | 'username' | 'email' | 'currency' | 'createdAt'>, pin: string): UserProfile {
    const users = this.getUsers();
    const existing = users.find((u) => u.id === profile.id);
    const merged: UserProfile = {
      ...existing,
      ...profile,
      pin,
      role: existing?.role ?? (isAdminEmail(profile.email) ? 'admin' : 'user'),
    };
    this.saveUsers(existing ? users.map((u) => (u.id === profile.id ? merged : u)) : [...users, merged]);
    return merged;
  },

  /** Verifies username/email + PIN without starting a session. */
  checkCredentials(identifier: string, pin: string): AuthResult {
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
    return { success: true, user };
  },

  login(identifier: string, pin: string): AuthResult {
    const check = this.checkCredentials(identifier, pin);
    if (!check.success || !check.user) return check;
    const user = check.user;

    const loggedIn = { ...user, lastLoginAt: new Date().toISOString() };
    this.saveUsers(this.getUsers().map((u) => (u.id === user.id ? loggedIn : u)));
    try {
      localStorage.setItem(ACTIVE_USER_SESSION_KEY, user.id);
      return { success: true, user: loggedIn };
    } catch {
      return { success: false, error: 'Could not establish session.' };
    }
  },

  /** Saves the display currency the user picked so it survives reloads and log in. */
  setCurrency(userId: string, currency: string): UserProfile | null {
    const users = this.getUsers();
    if (!users.some((u) => u.id === userId)) return null;
    const updated = users.map((u) => (u.id === userId ? { ...u, currency } : u));
    this.saveUsers(updated);
    return updated.find((u) => u.id === userId) ?? null;
  },

  /** Remember this account on this device so the login screen can pre-fill it. Only the id is stored, never the PIN. */
  rememberAccount(userId: string): void {
    try {
      localStorage.setItem(REMEMBERED_USER_KEY, userId);
    } catch {}
  },

  forgetAccount(): void {
    try {
      localStorage.removeItem(REMEMBERED_USER_KEY);
    } catch {}
  },

  /** The remembered account for this device, if it still exists and is enabled. */
  getRememberedUser(): UserProfile | null {
    try {
      const id = localStorage.getItem(REMEMBERED_USER_KEY);
      if (!id) return null;
      const user = this.getUsers().find((u) => u.id === id);
      return user && !user.disabled ? user : null;
    } catch {
      return null;
    }
  },

  /**
   * Call once when the app opens. If the app was last open more than five minutes ago (tab closed),
   * the saved session is dropped so the login screen shows. Returns true if a session was ended.
   */
  expireStaleSession(now: number = Date.now()): boolean {
    try {
      if (!localStorage.getItem(ACTIVE_USER_SESSION_KEY)) return false;
      const seen = Number(localStorage.getItem(LAST_SEEN_KEY));
      if (seen && now - seen <= SESSION_GRACE_MS) return false;
      this.logout();
      return true;
    } catch {
      return false;
    }
  },

  /** While the app is open, keeps stamping "last seen" so a tab left open never expires. */
  startSessionHeartbeat(): () => void {
    const stamp = () => {
      try {
        if (localStorage.getItem(ACTIVE_USER_SESSION_KEY)) localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
      } catch {}
    };
    stamp();
    const timer = setInterval(stamp, HEARTBEAT_MS);
    window.addEventListener('pagehide', stamp);
    document.addEventListener('visibilitychange', stamp);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', stamp);
      document.removeEventListener('visibilitychange', stamp);
    };
  },

  /** Ends the session only. The account and its data stay on this device. */
  logout(): void {
    try {
      localStorage.removeItem(ACTIVE_USER_SESSION_KEY);
    } catch {}
  },

  /** Lets a signed-in user change their own PIN / password by proving they know the current one. */
  changePin(userId: string, currentPin: string, newPin: string): { success: boolean; error?: string } {
    const user = this.getUsers().find((u) => u.id === userId);
    if (!user) return { success: false, error: 'Account not found.' };
    if (user.pin !== currentPin.trim()) return { success: false, error: 'Your current PIN is not correct.' };
    const pinError = validatePin(newPin.trim());
    if (pinError) return { success: false, error: pinError };
    if (newPin.trim() === user.pin) return { success: false, error: 'Your new PIN must be different from your current one.' };
    this.saveUsers(this.getUsers().map((u) => (u.id === userId ? { ...u, pin: newPin.trim() } : u)));
    return { success: true };
  },

  /**
   * Sets a new PIN for an account. Callers must have proven ownership first
   * (see pinReset.ts: the emailed code) or be an admin.
   */
  setPin(userId: string, newPin: string): { success: boolean; error?: string } {
    const pinError = validatePin(newPin.trim());
    if (pinError) return { success: false, error: pinError };
    this.saveUsers(this.getUsers().map((u) => (u.id === userId ? { ...u, pin: newPin.trim() } : u)));
    return { success: true };
  },

  /** Permanently removes an account and all of its ledger data from this device. */
  deleteAccount(userId: string): void {
    this.saveUsers(this.getUsers().filter((u) => u.id !== userId));
    storageService.clearData(userId);
    if (this.getRememberedUser()?.id === userId) this.forgetAccount();
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

  adminResetPin(userId: string, newPin: string): { success: boolean; error?: string } {
    return this.setPin(userId, newPin);
  },
};
