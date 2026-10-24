export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email?: string; // optional for accounts created before email sign-up existed
  pin: string; // 4-digit or password for personal privacy
  recoveryCode?: string; // shown once at sign-up, used to reset a forgotten PIN
  role?: UserRole; // missing means 'user'
  disabled?: boolean; // set by an admin to block log in
  currency?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthState {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
}
