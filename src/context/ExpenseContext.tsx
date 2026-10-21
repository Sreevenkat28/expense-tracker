import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Transaction,
  BudgetConfig,
  MonthSummary,
  CategorySpending,
  MonthComparison,
  SavingsSuggestion,
  SavingsGoal,
} from '../types';
import { UserProfile } from '../types/auth';
import { storageService } from '../services/storage';
import { authService } from '../services/authService';
import { getCurrentYearMonth } from '../utils/dates';
import {
  formatCurrency,
  getCurrencyInfo,
  SUPPORTED_CURRENCIES,
  CurrencyInfo,
  getGlobalCurrency,
  setGlobalCurrency,
} from '../utils/currency';
import {
  calculateMonthSummary,
  calculateCategorySpending,
  calculateMonthComparison,
} from '../utils/calculations';
import {
  generateSavingsSuggestions,
  generateSpendingPatternSummaries,
} from '../utils/insights';

export type NavigationTab =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'savings'
  | 'insights'
  | 'ai'
  | 'home'
  | 'budget';

interface ExpenseContextType {
  // Auth
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  login: (username: string, pin: string) => { success: boolean; error?: string };
  register: (name: string, username: string, pin: string, currency?: string) => { success: boolean; error?: string };
  logout: () => void;
  continueAsGuest: () => void;

  // Data
  transactions: Transaction[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  allMonths: string[];
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  budgetConfig: BudgetConfig;
  isSampleData: boolean;
  savingsGoals: SavingsGoal[];
  dark: boolean;
  setDark: (dark: boolean | ((prev: boolean) => boolean)) => void;

  // Currency support
  currency: string;
  setCurrency: (code: string) => void;
  currencyInfo: CurrencyInfo;
  formatAmount: (cents: number, showSign?: boolean) => string;

  // Financial calculations for selectedMonth
  monthSummary: MonthSummary;
  categorySpendings: CategorySpending[];
  monthComparison: MonthComparison;
  savingsSuggestions: SavingsSuggestion[];
  patternSummaries: string[];

  // Transaction Actions
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Budget Actions
  updateBudget: (budgetCents: number, monthSpecific?: boolean) => void;
  setCategoryBudget: (category: string, limitCents: number) => void;
  deleteCategoryBudget: (category: string) => void;
  updateOpeningBalance: (cents: number) => void;

  // Savings Goal Actions
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  updateSavingsGoal: (id: string, goal: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;
  contributeToSavingsGoal: (id: string, deltaCents: number) => void;

  // Reset
  resetAllData: () => void;
  resetToCleanAccount: (openingBalanceCents?: number, defaultBudgetCents?: number) => void;

  // Quick modals
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  isSmartEntryOpen: boolean;
  setIsSmartEntryOpen: (open: boolean) => void;
  isResetModalOpen: boolean;
  setIsResetModalOpen: (open: boolean) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ─── Auth State ─────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.getCurrentUser() !== null);

  const login = useCallback((username: string, pin: string) => {
    const result = authService.login(username, pin);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      // Load currency preference for this user
      if (result.user.currency) {
        setGlobalCurrency(result.user.currency);
        setCurrencyState(result.user.currency);
      }
      // Reload data scoped to this user
      setData(storageService.loadData(result.user.id));
    }
    return { success: result.success, error: result.error };
  }, []);

  const register = useCallback((name: string, username: string, pin: string, currency: string = 'USD') => {
    const result = authService.register(name, username, pin, currency);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      setGlobalCurrency(currency);
      setCurrencyState(currency);
      setData(storageService.loadData(result.user.id));
    }
    return { success: result.success, error: result.error };
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setData(storageService.loadData(null));
    setSelectedMonth(getCurrentYearMonth());
    setSelectedDate(null);
  }, []);

  const continueAsGuest = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(true); // guest is still "in" the app
    setData(storageService.loadData(null));
  }, []);

  // ─── Data State ──────────────────────────────────────────────────────────────
  const [data, setData] = useState(() =>
    storageService.loadData(authService.getCurrentUser()?.id ?? null)
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentYearMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTabRaw] = useState<NavigationTab>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSmartEntryOpen, setIsSmartEntryOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // ─── Currency ────────────────────────────────────────────────────────────────
  const [currency, setCurrencyState] = useState<string>(() => {
    const user = authService.getCurrentUser();
    if (user?.currency) {
      setGlobalCurrency(user.currency);
      return user.currency;
    }
    return getGlobalCurrency();
  });

  const setCurrency = useCallback((code: string) => {
    setGlobalCurrency(code);
    setCurrencyState(code);
  }, []);

  const currencyInfo = useMemo(() => getCurrencyInfo(currency), [currency]);

  const formatAmount = useCallback(
    (cents: number, showSign: boolean = false) => formatCurrency(cents, showSign, currency),
    [currency]
  );

  // ─── Calendar Handlers ───────────────────────────────────────────────────────
  const handleSetSelectedMonth = useCallback((month: string) => {
    setSelectedMonth(month);
    setSelectedDate((prev) => (prev && prev.startsWith(month) ? prev : null));
  }, []);

  const handleSetSelectedDate = useCallback((date: string | null) => {
    setSelectedDate(date);
    if (date) setSelectedMonth(date.substring(0, 7));
  }, []);

  // ─── Dark Mode ───────────────────────────────────────────────────────────────
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('theme_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('theme_dark_mode', String(dark));
      document.documentElement.classList.toggle('dark', dark);
    } catch {}
  }, [dark]);

  // ─── Active Tab ──────────────────────────────────────────────────────────────
  const setActiveTab = useCallback((tab: NavigationTab) => {
    if (tab === 'home') setActiveTabRaw('dashboard');
    else if (tab === 'budget') setActiveTabRaw('budgets');
    else setActiveTabRaw(tab);
  }, []);

  // ─── Storage Sync ────────────────────────────────────────────────────────────
  const syncStorage = useCallback((
    newTx: Transaction[],
    newConfig: BudgetConfig,
    newGoals: SavingsGoal[]
  ) => {
    storageService.saveData(newTx, newConfig, newGoals, currentUser?.id ?? null);
    setData({ transactions: newTx, budgetConfig: newConfig, savingsGoals: newGoals, isSampleData: false });
  }, [currentUser]);

  // ─── Transactions ────────────────────────────────────────────────────────────
  const addTransaction = useCallback((txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    syncStorage([newTx, ...data.transactions], data.budgetConfig, data.savingsGoals);
  }, [data, syncStorage]);

  const updateTransaction = useCallback((id: string, txData: Partial<Transaction>) => {
    const updated = data.transactions.map((tx) => tx.id === id ? { ...tx, ...txData } : tx);
    syncStorage(updated, data.budgetConfig, data.savingsGoals);
  }, [data, syncStorage]);

  const deleteTransaction = useCallback((id: string) => {
    const updated = data.transactions.filter((tx) => tx.id !== id);
    syncStorage(updated, data.budgetConfig, data.savingsGoals);
  }, [data, syncStorage]);

  // ─── Budgets ─────────────────────────────────────────────────────────────────
  const updateBudget = useCallback((budgetCents: number, monthSpecific: boolean = false) => {
    const newConfig: BudgetConfig = monthSpecific
      ? { ...data.budgetConfig, monthBudgets: { ...(data.budgetConfig.monthBudgets || {}), [selectedMonth]: budgetCents } }
      : { ...data.budgetConfig, monthlyBudgetCents: budgetCents, monthBudgets: { ...(data.budgetConfig.monthBudgets || {}), [selectedMonth]: budgetCents } };
    syncStorage(data.transactions, newConfig, data.savingsGoals);
  }, [data, selectedMonth, syncStorage]);

  const setCategoryBudget = useCallback((category: string, limitCents: number) => {
    const newConfig: BudgetConfig = { ...data.budgetConfig, categoryBudgets: { ...(data.budgetConfig.categoryBudgets || {}), [category]: limitCents } };
    syncStorage(data.transactions, newConfig, data.savingsGoals);
  }, [data, syncStorage]);

  const deleteCategoryBudget = useCallback((category: string) => {
    const cats = { ...(data.budgetConfig.categoryBudgets || {}) };
    delete cats[category];
    syncStorage(data.transactions, { ...data.budgetConfig, categoryBudgets: cats }, data.savingsGoals);
  }, [data, syncStorage]);

  const updateOpeningBalance = useCallback((cents: number) => {
    syncStorage(data.transactions, { ...data.budgetConfig, openingBalanceCents: cents }, data.savingsGoals);
  }, [data, syncStorage]);

  // ─── Savings Goals ────────────────────────────────────────────────────────────
  const addSavingsGoal = useCallback((goalData: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const newGoal: SavingsGoal = { ...goalData, id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, createdAt: new Date().toISOString() };
    syncStorage(data.transactions, data.budgetConfig, [...data.savingsGoals, newGoal]);
  }, [data, syncStorage]);

  const updateSavingsGoal = useCallback((id: string, goalData: Partial<SavingsGoal>) => {
    syncStorage(data.transactions, data.budgetConfig, data.savingsGoals.map((g) => g.id === id ? { ...g, ...goalData } : g));
  }, [data, syncStorage]);

  const deleteSavingsGoal = useCallback((id: string) => {
    syncStorage(data.transactions, data.budgetConfig, data.savingsGoals.filter((g) => g.id !== id));
  }, [data, syncStorage]);

  const contributeToSavingsGoal = useCallback((id: string, deltaCents: number) => {
    syncStorage(data.transactions, data.budgetConfig, data.savingsGoals.map((g) =>
      g.id === id ? { ...g, currentCents: Math.max(0, g.currentCents + deltaCents) } : g
    ));
  }, [data, syncStorage]);

  // ─── Reset ────────────────────────────────────────────────────────────────────
  const resetToCleanAccount = useCallback((openingBalanceCents: number = 0, defaultBudgetCents: number = 0) => {
    const freshClean = storageService.resetToCleanAccount(openingBalanceCents, defaultBudgetCents, currentUser?.id ?? null);
    setData(freshClean);
    setSelectedMonth(getCurrentYearMonth());
    setSelectedDate(null);
  }, [currentUser]);

  const resetAllData = useCallback(() => resetToCleanAccount(0, 0), [resetToCleanAccount]);

  // ─── Derived Data ─────────────────────────────────────────────────────────────
  const allMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(selectedMonth);
    set.add(getCurrentYearMonth());
    for (const tx of data.transactions) {
      if (tx.date && tx.date.length >= 7) set.add(tx.date.substring(0, 7));
    }
    return Array.from(set).sort().reverse();
  }, [data.transactions, selectedMonth]);

  const currentMonthBudgetCents = useMemo(() => {
    if (data.budgetConfig.monthBudgets?.[selectedMonth] !== undefined) {
      return data.budgetConfig.monthBudgets[selectedMonth];
    }
    return data.budgetConfig.monthlyBudgetCents;
  }, [data.budgetConfig, selectedMonth]);

  const monthSummary = useMemo(() =>
    calculateMonthSummary(data.transactions, selectedMonth, data.budgetConfig.openingBalanceCents, currentMonthBudgetCents),
    [data.transactions, selectedMonth, data.budgetConfig.openingBalanceCents, currentMonthBudgetCents]
  );

  const categorySpendings = useMemo(() =>
    calculateCategorySpending(data.transactions, selectedMonth),
    [data.transactions, selectedMonth]
  );

  const monthComparison = useMemo(() =>
    calculateMonthComparison(data.transactions, selectedMonth),
    [data.transactions, selectedMonth]
  );

  const savingsSuggestions = useMemo(() =>
    generateSavingsSuggestions(monthSummary, categorySpendings, monthComparison, data.transactions),
    [monthSummary, categorySpendings, monthComparison, data.transactions]
  );

  const patternSummaries = useMemo(() =>
    generateSpendingPatternSummaries(monthSummary, categorySpendings, monthComparison),
    [monthSummary, categorySpendings, monthComparison]
  );

  const value: ExpenseContextType = {
    currentUser,
    isAuthenticated,
    login,
    register,
    logout,
    continueAsGuest,
    transactions: data.transactions,
    selectedMonth,
    setSelectedMonth: handleSetSelectedMonth,
    selectedDate,
    setSelectedDate: handleSetSelectedDate,
    allMonths,
    activeTab,
    setActiveTab,
    budgetConfig: data.budgetConfig,
    isSampleData: false,
    savingsGoals: data.savingsGoals,
    dark,
    setDark,
    currency,
    setCurrency,
    currencyInfo,
    formatAmount,
    monthSummary,
    categorySpendings,
    monthComparison,
    savingsSuggestions,
    patternSummaries,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateBudget,
    setCategoryBudget,
    deleteCategoryBudget,
    updateOpeningBalance,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    contributeToSavingsGoal,
    resetAllData,
    resetToCleanAccount,
    isQuickAddOpen,
    setIsQuickAddOpen,
    isSmartEntryOpen,
    setIsSmartEntryOpen,
    isResetModalOpen,
    setIsResetModalOpen,
    editingTransaction,
    setEditingTransaction,
  };

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpense = (): ExpenseContextType => {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error('useExpense must be used within an ExpenseProvider');
  return context;
};
