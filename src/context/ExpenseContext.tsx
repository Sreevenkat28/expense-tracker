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
import { getCurrentYearMonth, getDaysInMonth, getTodayDateString } from '../utils/dates';
import { RateSnapshot, getCachedRates, loadRates, convertCents, describeRate } from '../utils/exchange';
import { BalanceCheck, checkExpenseAgainstBalance } from '../utils/balance';
import {
  convertLedger,
  convertBudgetConfig,
  convertGoal,
  withFieldCurrency,
  withoutFieldCurrency,
  stampLegacyCurrency,
} from '../utils/ledgerCurrency';
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
  | 'daily'
  | 'transactions'
  | 'budgets'
  | 'savings'
  | 'insights'
  | 'ai'
  | 'admin'
  | 'home'
  | 'budget';

interface ExpenseContextType {
  // Auth
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (identifier: string, pin: string) => { success: boolean; error?: string };
  register: (name: string, username: string, email: string, pin: string, currency?: string) => { success: boolean; error?: string };
  logout: () => void;
  continueAsGuest: () => void;
  deleteAccount: () => void;
  refreshCurrentUser: () => void;

  // Data
  transactions: Transaction[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedDate: string | null;
  activeDay: string; // the day the Daily Log shows: the picked day, else today (or the 1st of the month shown)
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
  // Exchange rates used when switching currency
  convertToDisplay: (cents: number, fromCurrency: string) => number; // amount in another currency -> selected currency
  convertAmount: (amount: number, from: string, to: string) => number; // whole units, at the app's current rates
  /** Would this expense (in the selected currency) take your balance below zero? Pass the id when editing an entry. */
  checkBalance: (amountCents: number, excludeTxId?: string) => BalanceCheck;
  exchangeRateNote: string; // e.g. "1 USD = 95 INR"
  ratesSource: 'live' | 'cached' | 'fallback';
  ratesUpdatedAt: number | null;

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
  importTransactions: (rows: Omit<Transaction, 'id' | 'createdAt'>[]) => void;

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
  isShareReportOpen: boolean;
  setIsShareReportOpen: (open: boolean) => void;
  /** Text to pre-fill (and parse) the next time Smart Entry opens; cleared once used */
  smartEntryText: string;
  setSmartEntryText: (text: string) => void;
  isResetModalOpen: boolean;
  setIsResetModalOpen: (open: boolean) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

/**
 * Loads a ledger from storage. Data saved before currencies were tracked is stamped (and saved)
 * with the account's original currency, so it converts correctly from then on.
 */
function loadLedger(userId: string | null, legacyCurrency: string) {
  const loaded = storageService.loadData(userId);
  const { data, changed } = stampLegacyCurrency(loaded, legacyCurrency);
  if (changed) storageService.saveData(data.transactions, data.budgetConfig, data.savingsGoals, userId);
  return data;
}

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ─── Auth State ─────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.getCurrentUser() !== null);

  const login = useCallback((identifier: string, pin: string) => {
    const result = authService.login(identifier, pin);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      // Load currency preference for this user
      if (result.user.currency) {
        setGlobalCurrency(result.user.currency);
        setCurrencyState(result.user.currency);
      }
      // Reload data scoped to this user
      setData(loadLedger(result.user.id, result.user.currency ?? 'USD'));
    }
    return { success: result.success, error: result.error };
  }, []);

  const register = useCallback((name: string, username: string, email: string, pin: string, currency: string = 'USD') => {
    const result = authService.register(name, username, email, pin, currency);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setIsAuthenticated(true);
      setGlobalCurrency(currency);
      setCurrencyState(currency);
      setData(loadLedger(result.user.id, currency));
    }
    return { success: result.success, error: result.error };
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setData(loadLedger(null, getGlobalCurrency()));
    setSelectedMonth(getCurrentYearMonth());
    setSelectedDate(null);
    setActiveTabRaw('dashboard');
  }, []);

  const continueAsGuest = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(true); // guest is still "in" the app
    setData(loadLedger(null, getGlobalCurrency()));
  }, []);

  // Re-read the signed-in profile (e.g. after an admin edits accounts); signs out if it was removed
  const refreshCurrentUser = useCallback(() => {
    if (!currentUser) return;
    const fresh = authService.getCurrentUser();
    if (fresh) setCurrentUser(fresh);
    else logout();
  }, [currentUser, logout]);

  // ─── Data State ──────────────────────────────────────────────────────────────
  const [data, setData] = useState(() => {
    const user = authService.getCurrentUser();
    return loadLedger(user?.id ?? null, user?.currency ?? getGlobalCurrency());
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentYearMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTabRaw] = useState<NavigationTab>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSmartEntryOpen, setIsSmartEntryOpen] = useState(false);
  const [isShareReportOpen, setIsShareReportOpen] = useState(false);
  const [smartEntryText, setSmartEntryText] = useState('');
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
    // Remember the choice for this account so it survives reloads and the next log in
    if (currentUser) {
      const updated = authService.setCurrency(currentUser.id, code);
      if (updated) setCurrentUser(updated);
    }
  }, [currentUser]);

  // Exchange rates: cached/approximate ones immediately, live ones as soon as they load
  const [rateInfo, setRateInfo] = useState<RateSnapshot>(() => getCachedRates());
  useEffect(() => {
    let cancelled = false;
    loadRates().then((snapshot) => {
      if (!cancelled) setRateInfo(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const rates = rateInfo.rates;

  // Everything the screens see is converted to the selected currency; `data` keeps the originals
  const view = useMemo(() => convertLedger(data, currency, rates), [data, currency, rates]);
  const convertAmount = useCallback(
    (amount: number, from: string, to: string) => convertCents(Math.round(amount * 100), from, to, rates) / 100,
    [rates]
  );
  const checkBalance = useCallback(
    (amountCents: number, excludeTxId?: string) => checkExpenseAgainstBalance(view.transactions, view.budgetConfig.openingBalanceCents, amountCents, excludeTxId),
    [view]
  );
  const convertToDisplay = useCallback(
    (cents: number, fromCurrency: string) => convertCents(cents, fromCurrency, currency, rates),
    [currency, rates]
  );

  const currencyInfo = useMemo(() => getCurrencyInfo(currency), [currency]);

  const formatAmount = useCallback(
    (cents: number, showSign: boolean = false) => formatCurrency(cents, showSign, currency),
    [currency]
  );

  const activeDay = selectedDate ?? (selectedMonth === getCurrentYearMonth() ? getTodayDateString() : `${selectedMonth}-01`);

  // ─── Calendar Handlers ───────────────────────────────────────────────────────
  const handleSetSelectedMonth = useCallback((month: string) => {
    setSelectedMonth(month);
    // In day mode, moving to another month keeps the same day-of-month (e.g. 31st -> 30th)
    setSelectedDate((prev) => {
      if (!prev) return null;
      if (prev.startsWith(month)) return prev;
      const day = Math.min(Number(prev.slice(8, 10)) || 1, getDaysInMonth(month));
      return `${month}-${String(day).padStart(2, '0')}`;
    });
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
      currency: txData.currency ?? currency,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    syncStorage([newTx, ...data.transactions], data.budgetConfig, data.savingsGoals);
  }, [data, currency, syncStorage]);

  const updateTransaction = useCallback((id: string, txData: Partial<Transaction>) => {
    // A new amount is always typed in the selected currency, so it is saved in that currency
    const updated = data.transactions.map((tx) =>
      tx.id === id
        ? { ...tx, ...txData, ...(txData.amountCents !== undefined ? { currency: txData.currency ?? currency } : {}) }
        : tx
    );
    syncStorage(updated, data.budgetConfig, data.savingsGoals);
  }, [data, currency, syncStorage]);

  const deleteTransaction = useCallback((id: string) => {
    const updated = data.transactions.filter((tx) => tx.id !== id);
    syncStorage(updated, data.budgetConfig, data.savingsGoals);
  }, [data, syncStorage]);

  const importTransactions = useCallback((rows: Omit<Transaction, 'id' | 'createdAt'>[]) => {
    const now = new Date().toISOString();
    const imported: Transaction[] = rows.map((row, i) => ({
      ...row,
      currency: row.currency ?? currency,
      id: `tx-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
    }));
    syncStorage([...imported, ...data.transactions], data.budgetConfig, data.savingsGoals);
  }, [data, currency, syncStorage]);

  // ─── Budgets ─────────────────────────────────────────────────────────────────
  const updateBudget = useCallback((budgetCents: number, monthSpecific: boolean = false) => {
    const cfg = data.budgetConfig;
    const newConfig: BudgetConfig = monthSpecific
      ? withFieldCurrency(
          { ...cfg, monthBudgets: { ...(cfg.monthBudgets || {}), [selectedMonth]: budgetCents } },
          ['month:' + selectedMonth],
          currency
        )
      : withFieldCurrency(
          { ...cfg, monthlyBudgetCents: budgetCents, monthBudgets: { ...(cfg.monthBudgets || {}), [selectedMonth]: budgetCents } },
          ['monthly', 'month:' + selectedMonth],
          currency
        );
    syncStorage(data.transactions, newConfig, data.savingsGoals);
  }, [data, selectedMonth, currency, syncStorage]);

  const setCategoryBudget = useCallback((category: string, limitCents: number) => {
    const newConfig = withFieldCurrency(
      { ...data.budgetConfig, categoryBudgets: { ...(data.budgetConfig.categoryBudgets || {}), [category]: limitCents } },
      ['cat:' + category],
      currency
    );
    syncStorage(data.transactions, newConfig, data.savingsGoals);
  }, [data, currency, syncStorage]);

  const deleteCategoryBudget = useCallback((category: string) => {
    const cats = { ...(data.budgetConfig.categoryBudgets || {}) };
    delete cats[category];
    syncStorage(data.transactions, withoutFieldCurrency({ ...data.budgetConfig, categoryBudgets: cats }, 'cat:' + category), data.savingsGoals);
  }, [data, syncStorage]);

  const updateOpeningBalance = useCallback((cents: number) => {
    syncStorage(data.transactions, withFieldCurrency({ ...data.budgetConfig, openingBalanceCents: cents }, ['opening'], currency), data.savingsGoals);
  }, [data, currency, syncStorage]);

  // ─── Savings Goals ────────────────────────────────────────────────────────────
  const addSavingsGoal = useCallback((goalData: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const newGoal: SavingsGoal = { ...goalData, currency: goalData.currency ?? currency, id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, createdAt: new Date().toISOString() };
    syncStorage(data.transactions, data.budgetConfig, [...data.savingsGoals, newGoal]);
  }, [data, currency, syncStorage]);

  const updateSavingsGoal = useCallback((id: string, goalData: Partial<SavingsGoal>) => {
    const touchesAmounts = goalData.targetCents !== undefined || goalData.currentCents !== undefined;
    syncStorage(data.transactions, data.budgetConfig, data.savingsGoals.map((g) => {
      if (g.id !== id) return g;
      // New amounts are typed in the selected currency: bring the goal into it first
      return touchesAmounts ? { ...convertGoal(g, currency, rates), ...goalData } : { ...g, ...goalData };
    }));
  }, [data, currency, rates, syncStorage]);

  const deleteSavingsGoal = useCallback((id: string) => {
    syncStorage(data.transactions, data.budgetConfig, data.savingsGoals.filter((g) => g.id !== id));
  }, [data, syncStorage]);

  const contributeToSavingsGoal = useCallback((id: string, deltaCents: number) => {
    syncStorage(data.transactions, data.budgetConfig, data.savingsGoals.map((g) => {
      if (g.id !== id) return g;
      // Bring what is saved so far into the selected currency (exactly what the card shows), then add the
      // amount as typed. The target is left alone, so nothing else is re-rounded.
      const savedNow = convertCents(g.currentCents, g.currentCurrency ?? g.currency ?? currency, currency, rates);
      return { ...g, currentCents: Math.max(0, savedNow + deltaCents), currentCurrency: currency };
    }));
  }, [data, currency, rates, syncStorage]);

  // ─── Reset ────────────────────────────────────────────────────────────────────
  const resetToCleanAccount = useCallback((openingBalanceCents: number = 0, defaultBudgetCents: number = 0) => {
    const freshClean = storageService.resetToCleanAccount(openingBalanceCents, defaultBudgetCents, currentUser?.id ?? null);
    setData({ ...freshClean, budgetConfig: { ...freshClean.budgetConfig, currency } });
    setSelectedMonth(getCurrentYearMonth());
    setSelectedDate(null);
  }, [currentUser, currency]);

  const resetAllData = useCallback(() => resetToCleanAccount(0, 0), [resetToCleanAccount]);

  // Permanently wipes the signed-in account (or the guest ledger) from this device, then signs out
  const deleteAccount = useCallback(() => {
    if (currentUser) authService.deleteAccount(currentUser.id);
    else storageService.clearData(null);
    logout();
  }, [currentUser, logout]);

  // ─── Derived Data ─────────────────────────────────────────────────────────────
  const allMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(selectedMonth);
    set.add(getCurrentYearMonth());
    for (const tx of view.transactions) {
      if (tx.date && tx.date.length >= 7) set.add(tx.date.substring(0, 7));
    }
    return Array.from(set).sort().reverse();
  }, [view.transactions, selectedMonth]);

  const currentMonthBudgetCents = useMemo(() => {
    if (view.budgetConfig.monthBudgets?.[selectedMonth] !== undefined) {
      return view.budgetConfig.monthBudgets[selectedMonth];
    }
    return view.budgetConfig.monthlyBudgetCents;
  }, [view.budgetConfig, selectedMonth]);

  const monthSummary = useMemo(() =>
    calculateMonthSummary(view.transactions, selectedMonth, view.budgetConfig.openingBalanceCents, currentMonthBudgetCents),
    [view.transactions, selectedMonth, view.budgetConfig.openingBalanceCents, currentMonthBudgetCents]
  );

  const categorySpendings = useMemo(() =>
    calculateCategorySpending(view.transactions, selectedMonth),
    [view.transactions, selectedMonth]
  );

  const monthComparison = useMemo(() =>
    calculateMonthComparison(view.transactions, selectedMonth),
    [view.transactions, selectedMonth]
  );

  const savingsSuggestions = useMemo(() =>
    generateSavingsSuggestions(monthSummary, categorySpendings, monthComparison, view.transactions),
    [monthSummary, categorySpendings, monthComparison, view.transactions]
  );

  const patternSummaries = useMemo(() =>
    generateSpendingPatternSummaries(monthSummary, categorySpendings, monthComparison),
    [monthSummary, categorySpendings, monthComparison]
  );

  const value: ExpenseContextType = {
    currentUser,
    isAuthenticated,
    isAdmin: currentUser?.role === 'admin',
    login,
    register,
    logout,
    continueAsGuest,
    deleteAccount,
    refreshCurrentUser,
    transactions: view.transactions,
    selectedMonth,
    setSelectedMonth: handleSetSelectedMonth,
    selectedDate,
    activeDay,
    setSelectedDate: handleSetSelectedDate,
    allMonths,
    activeTab,
    setActiveTab,
    budgetConfig: view.budgetConfig,
    isSampleData: false,
    savingsGoals: view.savingsGoals,
    dark,
    setDark,
    currency,
    setCurrency,
    currencyInfo,
    formatAmount,
    convertToDisplay,
    checkBalance,
    exchangeRateNote: describeRate('USD', currency, rates),
    ratesSource: rateInfo.source,
    ratesUpdatedAt: rateInfo.updatedAt,
    monthSummary,
    categorySpendings,
    monthComparison,
    savingsSuggestions,
    patternSummaries,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    importTransactions,
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
    isShareReportOpen,
    setIsShareReportOpen,
    smartEntryText,
    setSmartEntryText,
    convertAmount,
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
