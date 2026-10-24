import { Transaction, BudgetConfig, SavingsGoal } from '../types';

const TRANSACTIONS_KEY = 'monthly_expense_tracker_transactions_v2';
const BUDGET_CONFIG_KEY = 'monthly_expense_tracker_budget_config_v2';
const SAVINGS_GOALS_KEY = 'monthly_expense_tracker_savings_goals_v2';

export interface StorageData {
  transactions: Transaction[];
  budgetConfig: BudgetConfig;
  savingsGoals: SavingsGoal[];
  isSampleData: boolean;
}

const CLEAN_BUDGET_CONFIG: BudgetConfig = {
  monthlyBudgetCents: 0,
  openingBalanceCents: 0,
  monthBudgets: {},
  categoryBudgets: {},
};

function getKey(baseKey: string, userId?: string | null): string {
  return userId ? `${baseKey}_usr_${userId}` : baseKey;
}

export const storageService = {
  /**
   * Load application data for the specific user (or global guest).
   * Everything is strictly user-inputted with zero demo/sample data.
   */
  loadData(userId?: string | null): StorageData {
    const txKey = getKey(TRANSACTIONS_KEY, userId);
    const configKey = getKey(BUDGET_CONFIG_KEY, userId);
    const goalsKey = getKey(SAVINGS_GOALS_KEY, userId);

    try {
      const storedTx = localStorage.getItem(txKey);
      const storedConfig = localStorage.getItem(configKey);
      const storedGoals = localStorage.getItem(goalsKey);

      if (storedTx && storedConfig) {
        const parsedTx: Transaction[] = JSON.parse(storedTx);
        const parsedConfig: BudgetConfig = JSON.parse(storedConfig);
        const parsedGoals: SavingsGoal[] = storedGoals ? JSON.parse(storedGoals) : [];

        // Filter out any mock sample data from previous versions
        const userOnlyTx = parsedTx.filter(
          (t) =>
            !t.id.startsWith('tx-sep-') &&
            !t.id.startsWith('tx-oct-') &&
            !t.id.startsWith('sample-')
        );
        const userOnlyGoals = parsedGoals.filter(
          (g) => !g.id.startsWith('goal-1') && !g.id.startsWith('goal-2') && !g.id.startsWith('goal-3')
        );

        return {
          transactions: userOnlyTx,
          budgetConfig: parsedConfig,
          savingsGoals: userOnlyGoals,
          isSampleData: false,
        };
      }
    } catch (e) {
      console.warn('Failed to parse localStorage data:', e);
    }

    // Default to clean empty ledger — all data is user-inputted
    const initialData: StorageData = {
      transactions: [],
      budgetConfig: CLEAN_BUDGET_CONFIG,
      savingsGoals: [],
      isSampleData: false,
    };
    storageService.saveData(
      initialData.transactions,
      initialData.budgetConfig,
      initialData.savingsGoals,
      userId
    );
    return initialData;
  },

  /**
   * Save transactions, budget config, and savings goals to localStorage for the specific user.
   */
  saveData(
    transactions: Transaction[],
    config: BudgetConfig,
    savingsGoals: SavingsGoal[] = [],
    userId?: string | null
  ): void {
    const txKey = getKey(TRANSACTIONS_KEY, userId);
    const configKey = getKey(BUDGET_CONFIG_KEY, userId);
    const goalsKey = getKey(SAVINGS_GOALS_KEY, userId);

    try {
      localStorage.setItem(txKey, JSON.stringify(transactions));
      localStorage.setItem(configKey, JSON.stringify(config));
      localStorage.setItem(goalsKey, JSON.stringify(savingsGoals));
    } catch (e) {
      console.error('Failed to write to localStorage:', e);
    }
  },

  /**
   * Reset to an empty clean account (0 transactions, user-defined starting balance).
   */
  resetToCleanAccount(
    openingBalanceCents: number = 0,
    defaultBudgetCents: number = 0,
    userId?: string | null
  ): StorageData {
    const data: StorageData = {
      transactions: [],
      budgetConfig: {
        monthlyBudgetCents: defaultBudgetCents,
        openingBalanceCents,
        monthBudgets: {},
        categoryBudgets: {},
      },
      savingsGoals: [],
      isSampleData: false,
    };
    storageService.saveData(data.transactions, data.budgetConfig, data.savingsGoals, userId);
    return data;
  },

  /**
   * Permanently remove all ledger data for the specific user (or global guest).
   */
  clearData(userId?: string | null): void {
    try {
      localStorage.removeItem(getKey(TRANSACTIONS_KEY, userId));
      localStorage.removeItem(getKey(BUDGET_CONFIG_KEY, userId));
      localStorage.removeItem(getKey(SAVINGS_GOALS_KEY, userId));
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  },

  /**
   * Count stored transactions for a user without triggering a default save.
   */
  countTransactions(userId?: string | null): number {
    try {
      const stored = localStorage.getItem(getKey(TRANSACTIONS_KEY, userId));
      return stored ? (JSON.parse(stored) as Transaction[]).length : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Export all data as a JSON file download.
   */
  exportData(userId?: string | null): void {
    const current = storageService.loadData(userId);
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
