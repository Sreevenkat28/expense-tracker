import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Transaction,
  BudgetConfig,
  MonthSummary,
  CategorySpending,
  MonthComparison,
  SavingsSuggestion,
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

export type NavigationTab = 'home' | 'transactions' | 'insights' | 'budget';

interface ExpenseContextType {
  transactions: Transaction[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  budgetConfig: BudgetConfig;
  isSampleData: boolean;

  // Financial calculations for selectedMonth
  monthSummary: MonthSummary;
  categorySpendings: CategorySpending[];
  monthComparison: MonthComparison;
  savingsSuggestions: SavingsSuggestion[];
  patternSummaries: string[];

  // Actions
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  updateBudget: (budgetCents: number, monthSpecific?: boolean) => void;
  updateOpeningBalance: (cents: number) => void;
  loadSampleData: () => void;
  resetToCleanAccount: (openingBalanceCents?: number, defaultBudgetCents?: number) => void;

  // Quick modals
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
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
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Sync to localStorage on data change
  const syncStorage = useCallback((
    newTx: Transaction[],
    newConfig: BudgetConfig,
    isSample: boolean
  ) => {
    storageService.saveData(newTx, newConfig, isSample);
    setData({
      transactions: newTx,
      budgetConfig: newConfig,
      isSampleData: isSample,
    });
  }, []);

  const addTransaction = useCallback((txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newTx, ...data.transactions];
    syncStorage(updated, data.budgetConfig, false);
  }, [data, syncStorage]);

  const updateTransaction = useCallback((id: string, txData: Partial<Transaction>) => {
    const updated = data.transactions.map((tx) =>
      tx.id === id ? { ...tx, ...txData } : tx
    );
    syncStorage(updated, data.budgetConfig, false);
  }, [data, syncStorage]);

  const deleteTransaction = useCallback((id: string) => {
    const updated = data.transactions.filter((tx) => tx.id !== id);
    syncStorage(updated, data.budgetConfig, false);
  }, [data, syncStorage]);

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
    syncStorage(data.transactions, newConfig, data.isSampleData);
  }, [data, selectedMonth, syncStorage]);

  const updateOpeningBalance = useCallback((cents: number) => {
    const newConfig: BudgetConfig = {
      ...data.budgetConfig,
      openingBalanceCents: cents,
    };
    syncStorage(data.transactions, newConfig, data.isSampleData);
  }, [data, syncStorage]);

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
    activeTab,
    setActiveTab,
    budgetConfig: data.budgetConfig,
    isSampleData: data.isSampleData,
    monthSummary,
    categorySpendings,
    monthComparison,
    savingsSuggestions,
    patternSummaries,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateBudget,
    updateOpeningBalance,
    loadSampleData,
    resetToCleanAccount,
    isQuickAddOpen,
    setIsQuickAddOpen,
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
