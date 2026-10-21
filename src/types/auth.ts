export interface UserProfile {
  id: string;
  name: string;
  username: string;
  pin: string; // 4-digit or password for personal privacy
  currency?: string;
  createdAt: string;
}

export interface AuthState {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
}
