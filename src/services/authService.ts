import { UserProfile } from '../types/auth';

const USERS_STORAGE_KEY = 'expense_tracker_profiles_v1';
const ACTIVE_USER_SESSION_KEY = 'expense_tracker_active_session_v1';

export const authService = {
  getUsers(): UserProfile[] {
    try {
      const data = localStorage.getItem(USERS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getCurrentUser(): UserProfile | null {
    try {
      const activeId = localStorage.getItem(ACTIVE_USER_SESSION_KEY);
      if (!activeId) return null;
      const users = this.getUsers();
      return users.find((u) => u.id === activeId) || null;
    } catch {
      return null;
    }
  },

  register(name: string, username: string, pin: string, currency: string = 'USD'): {
    success: boolean;
    error?: string;
    user?: UserProfile;
  } {
    const trimmedName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!trimmedName) {
      return { success: false, error: 'Full name is required.' };
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    if (!cleanPin || cleanPin.length < 4) {
      return { success: false, error: 'PIN / Password must be at least 4 digits.' };
    }

    const users = this.getUsers();
    if (users.some((u) => u.username === cleanUsername)) {
      return { success: false, error: 'Username already exists. Please choose another or log in.' };
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      username: cleanUsername,
      pin: cleanPin,
      currency,
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(ACTIVE_USER_SESSION_KEY, newUser.id);
      return { success: true, user: newUser };
    } catch (e) {
      return { success: false, error: 'Failed to save account locally.' };
    }
  },

  login(username: string, pin: string): {
    success: boolean;
    error?: string;
    user?: UserProfile;
  } {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPin = pin.trim();

    const users = this.getUsers();
    const user = users.find((u) => u.username === cleanUsername);

    if (!user) {
      return { success: false, error: 'Account not found. Please check username or create an account.' };
    }

    if (user.pin !== cleanPin) {
      return { success: false, error: 'Incorrect PIN / Password.' };
    }

    try {
      localStorage.setItem(ACTIVE_USER_SESSION_KEY, user.id);
      return { success: true, user };
    } catch {
      return { success: false, error: 'Could not establish session.' };
    }
  },

  logout(): void {
    try {
      localStorage.removeItem(ACTIVE_USER_SESSION_KEY);
    } catch {}
  },
};
