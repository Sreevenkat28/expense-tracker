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
import { storageService } from '../services/storage';
import { getCurrentYearMonth } from '../utils/dates';
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
  | 'home'    // alias for dashboard
  | 'budget'; // alias for budgets

interface ExpenseContextType {
  transactions: Transaction[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  allMonths: string[];
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  budgetConfig: BudgetConfig;
  isSampleData: boolean;
  savingsGoals: SavingsGoal[];
  dark: boolean;
  setDark: (dark: boolean | ((prev: boolean) => boolean)) => void;

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

  // Setup / Reset Actions
  loadSampleData: () => void;
  resetToCleanAccount: (openingBalanceCents?: number, defaultBudgetCents?: number) => void;

  // Quick modals
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  isSmartEntryOpen: boolean;
  setIsSmartEntryOpen: (open: boolean) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from storage
  const [data, setData] = useState(() => storageService.loadData());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // If October 2026 transactions exist, default to 2026-10; otherwise current calendar month
    return '2026-10';
  });
  const [activeTab, setActiveTabRaw] = useState<NavigationTab>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSmartEntryOpen, setIsSmartEntryOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Dark mode state
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

  // Normalized active tab setter
  const setActiveTab = useCallback((tab: NavigationTab) => {
    if (tab === 'home') setActiveTabRaw('dashboard');
    else if (tab === 'budget') setActiveTabRaw('budgets');
    else setActiveTabRaw(tab);
  }, []);

  // Sync to localStorage on data change
  const syncStorage = useCallback((
    newTx: Transaction[],
    newConfig: BudgetConfig,
    newGoals: SavingsGoal[],
    isSample: boolean
  ) => {
    storageService.saveData(newTx, newConfig, newGoals, isSample);
    setData({
      transactions: newTx,
      budgetConfig: newConfig,
      savingsGoals: newGoals,
      isSampleData: isSample,
    });
  }, []);

  // ─── Transaction Handlers ──────────────────────────────────────────────────
  const addTransaction = useCallback((txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTx, ...data.transactions];
    syncStorage(updated, data.budgetConfig, data.savingsGoals, false);
  }, [data, syncStorage]);

  const updateTransaction = useCallback((id: string, txData: Partial<Transaction>) => {
    const updated = data.transactions.map((tx) =>
      tx.id === id ? { ...tx, ...txData } : tx
    );
    syncStorage(updated, data.budgetConfig, data.savingsGoals, false);
  }, [data, syncStorage]);

  const deleteTransaction = useCallback((id: string) => {
    const updated = data.transactions.filter((tx) => tx.id !== id);
    syncStorage(updated, data.budgetConfig, data.savingsGoals, false);
  }, [data, syncStorage]);

  // ─── Budget Handlers ───────────────────────────────────────────────────────
  const updateBudget = useCallback((budgetCents: number, monthSpecific: boolean = false) => {
    let newConfig: BudgetConfig;
    if (monthSpecific) {
      newConfig = {
        ...data.budgetConfig,
        monthBudgets: {
          ...(data.budgetConfig.monthBudgets || {}),
          [selectedMonth]: budgetCents,
        },
      };
    } else {
      newConfig = {
        ...data.budgetConfig,
        monthlyBudgetCents: budgetCents,
        monthBudgets: {
          ...(data.budgetConfig.monthBudgets || {}),
          [selectedMonth]: budgetCents,
        },
      };
    }
    syncStorage(data.transactions, newConfig, data.savingsGoals, data.isSampleData);
  }, [data, selectedMonth, syncStorage]);

  const setCategoryBudget = useCallback((category: string, limitCents: number) => {
    const newConfig: BudgetConfig = {
      ...data.budgetConfig,
      categoryBudgets: {
        ...(data.budgetConfig.categoryBudgets || {}),
        [category]: limitCents,
      },
    };
    syncStorage(data.transactions, newConfig, data.savingsGoals, data.isSampleData);
  }, [data, syncStorage]);

  const deleteCategoryBudget = useCallback((category: string) => {
    const newCatBudgets = { ...(data.budgetConfig.categoryBudgets || {}) };
    delete newCatBudgets[category];
    const newConfig: BudgetConfig = {
      ...data.budgetConfig,
      categoryBudgets: newCatBudgets,
    };
    syncStorage(data.transactions, newConfig, data.savingsGoals, data.isSampleData);
  }, [data, syncStorage]);

  const updateOpeningBalance = useCallback((cents: number) => {
    const newConfig: BudgetConfig = {
      ...data.budgetConfig,
      openingBalanceCents: cents,
    };
    syncStorage(data.transactions, newConfig, data.savingsGoals, data.isSampleData);
  }, [data, syncStorage]);

  // ─── Savings Goal Handlers ─────────────────────────────────────────────────
  const addSavingsGoal = useCallback((goalData: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const newGoal: SavingsGoal = {
      ...goalData,
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...data.savingsGoals, newGoal];
    syncStorage(data.transactions, data.budgetConfig, updated, false);
  }, [data, syncStorage]);

  const updateSavingsGoal = useCallback((id: string, goalData: Partial<SavingsGoal>) => {
    const updated = data.savingsGoals.map(g => g.id === id ? { ...g, ...goalData } : g);
    syncStorage(data.transactions, data.budgetConfig, updated, false);
  }, [data, syncStorage]);

  const deleteSavingsGoal = useCallback((id: string) => {
    const updated = data.savingsGoals.filter(g => g.id !== id);
    syncStorage(data.transactions, data.budgetConfig, updated, false);
  }, [data, syncStorage]);

  const contributeToSavingsGoal = useCallback((id: string, deltaCents: number) => {
    const updated = data.savingsGoals.map(g => {
      if (g.id === id) {
        const next = Math.max(0, g.currentCents + deltaCents);
        return { ...g, currentCents: next };
      }
      return g;
    });
    syncStorage(data.transactions, data.budgetConfig, updated, false);
  }, [data, syncStorage]);

  // ─── Reset Handlers ────────────────────────────────────────────────────────
  const loadSampleData = useCallback(() => {
    const freshSample = storageService.resetToSampleData();
    setData(freshSample);
    setSelectedMonth('2026-10');
  }, []);

  const resetToCleanAccount = useCallback((
    openingBalanceCents: number = 0,
    defaultBudgetCents: number = 250000
  ) => {
    const freshClean = storageService.resetToCleanAccount(openingBalanceCents, defaultBudgetCents);
    setData(freshClean);
    setSelectedMonth(getCurrentYearMonth());
  }, []);

  // Compute available months
  const allMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(selectedMonth);
    set.add(getCurrentYearMonth());
    for (const tx of data.transactions) {
      if (tx.date && tx.date.length >= 7) {
        set.add(tx.date.substring(0, 7));
      }
    }
    return Array.from(set).sort().reverse();
  }, [data.transactions, selectedMonth]);

  // Compute month budget (override takes precedence over default)
  const currentMonthBudgetCents = useMemo(() => {
    if (data.budgetConfig.monthBudgets && data.budgetConfig.monthBudgets[selectedMonth] !== undefined) {
      return data.budgetConfig.monthBudgets[selectedMonth];
    }
    return data.budgetConfig.monthlyBudgetCents;
  }, [data.budgetConfig, selectedMonth]);

  // Calculations
  const monthSummary = useMemo(() => {
    return calculateMonthSummary(
      data.transactions,
      selectedMonth,
      data.budgetConfig.openingBalanceCents,
      currentMonthBudgetCents
    );
  }, [data.transactions, selectedMonth, data.budgetConfig.openingBalanceCents, currentMonthBudgetCents]);

  const categorySpendings = useMemo(() => {
    return calculateCategorySpending(data.transactions, selectedMonth);
  }, [data.transactions, selectedMonth]);

  const monthComparison = useMemo(() => {
    return calculateMonthComparison(data.transactions, selectedMonth);
  }, [data.transactions, selectedMonth]);

  const savingsSuggestions = useMemo(() => {
    return generateSavingsSuggestions(
      monthSummary,
      categorySpendings,
      monthComparison,
      data.transactions
    );
  }, [monthSummary, categorySpendings, monthComparison, data.transactions]);

  const patternSummaries = useMemo(() => {
    return generateSpendingPatternSummaries(
      monthSummary,
      categorySpendings,
      monthComparison
    );
  }, [monthSummary, categorySpendings, monthComparison]);

  const value = {
    transactions: data.transactions,
    selectedMonth,
    setSelectedMonth,
    allMonths,
    activeTab,
    setActiveTab,
    budgetConfig: data.budgetConfig,
    isSampleData: data.isSampleData,
    savingsGoals: data.savingsGoals,
    dark,
    setDark,
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
    loadSampleData,
    resetToCleanAccount,
    isQuickAddOpen,
    setIsQuickAddOpen,
    isSmartEntryOpen,
    setIsSmartEntryOpen,
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
  if (!context) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
};
