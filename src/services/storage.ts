import { Transaction, BudgetConfig } from '../types';
import { SAMPLE_TRANSACTIONS, INITIAL_BUDGET_CONFIG } from '../data/sampleData';

const TRANSACTIONS_KEY = 'monthly_expense_tracker_transactions_v1';
const BUDGET_CONFIG_KEY = 'monthly_expense_tracker_budget_config_v1';
const IS_SAMPLE_KEY = 'monthly_expense_tracker_is_sample_v1';

export interface StorageData {
  transactions: Transaction[];
  budgetConfig: BudgetConfig;
  isSampleData: boolean;
}

export const storageService = {
  /**
   * Load initial application data from localStorage, falling back to sample data.
   */
  loadData(): StorageData {
    try {
      const storedTx = localStorage.getItem(TRANSACTIONS_KEY);
      const storedConfig = localStorage.getItem(BUDGET_CONFIG_KEY);
      const storedIsSample = localStorage.getItem(IS_SAMPLE_KEY);

      if (storedTx && storedConfig) {
        return {
          transactions: JSON.parse(storedTx),
          budgetConfig: JSON.parse(storedConfig),
          isSampleData: storedIsSample !== null ? JSON.parse(storedIsSample) : false,
        };
      }
    } catch (e) {
      console.warn('Failed to parse localStorage data, loading sample data instead:', e);
    }

    // Default to sample data so the dashboard is immediately interactive
    const initialData: StorageData = {
      transactions: SAMPLE_TRANSACTIONS,
      budgetConfig: INITIAL_BUDGET_CONFIG,
      isSampleData: true,
    };
    storageService.saveData(initialData.transactions, initialData.budgetConfig, true);
    return initialData;
  },

  /**
   * Save current transactions and budget config to localStorage.
   */
  saveData(transactions: Transaction[], config: BudgetConfig, isSampleData: boolean = false): void {
    try {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
      localStorage.setItem(BUDGET_CONFIG_KEY, JSON.stringify(config));
      localStorage.setItem(IS_SAMPLE_KEY, JSON.stringify(isSampleData));
    } catch (e) {
      console.error('Failed to write to localStorage:', e);
    }
  },

  /**
   * Reset data to the default sample dataset.
   */
  resetToSampleData(): StorageData {
    const data: StorageData = {
      transactions: [...SAMPLE_TRANSACTIONS],
      budgetConfig: { ...INITIAL_BUDGET_CONFIG },
      isSampleData: true,
    };
    storageService.saveData(data.transactions, data.budgetConfig, true);
    return data;
  },

  /**
   * Reset to an empty clean account (0 transactions, user-defined starting balance).
   */
  resetToCleanAccount(openingBalanceCents: number = 0, defaultBudgetCents: number = 250000): StorageData {
    const data: StorageData = {
      transactions: [],
      budgetConfig: {
        monthlyBudgetCents: defaultBudgetCents,
        openingBalanceCents,
        monthBudgets: {},
      },
      isSampleData: false,
    };
    storageService.saveData(data.transactions, data.budgetConfig, false);
    return data;
  },

  /**
   * Export all data as a JSON file download.
   */
  exportData(): void {
    const current = storageService.loadData();
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense_tracker_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
