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

export const storageService = {
  /**
   * Load initial application data from localStorage.
   * Everything is strictly user-inputted with zero demo/sample data.
   */
  loadData(): StorageData {
    try {
      const storedTx = localStorage.getItem(TRANSACTIONS_KEY);
      const storedConfig = localStorage.getItem(BUDGET_CONFIG_KEY);
      const storedGoals = localStorage.getItem(SAVINGS_GOALS_KEY);

      if (storedTx && storedConfig) {
        const parsedTx: Transaction[] = JSON.parse(storedTx);
        const parsedConfig: BudgetConfig = JSON.parse(storedConfig);
        const parsedGoals: SavingsGoal[] = storedGoals ? JSON.parse(storedGoals) : [];

        // Filter out any mock sample data from previous versions
        const userOnlyTx = parsedTx.filter(
          t => !t.id.startsWith('tx-sep-') && !t.id.startsWith('tx-oct-') && !t.id.startsWith('sample-')
        );
        const userOnlyGoals = parsedGoals.filter(
          g => !g.id.startsWith('goal-1') && !g.id.startsWith('goal-2') && !g.id.startsWith('goal-3')
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
    storageService.saveData(initialData.transactions, initialData.budgetConfig, initialData.savingsGoals);
    return initialData;
  },

  /**
   * Save current transactions, budget config, and savings goals to localStorage.
   */
  saveData(
    transactions: Transaction[],
    config: BudgetConfig,
    savingsGoals: SavingsGoal[] = []
  ): void {
    try {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
      localStorage.setItem(BUDGET_CONFIG_KEY, JSON.stringify(config));
      localStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(savingsGoals));
    } catch (e) {
      console.error('Failed to write to localStorage:', e);
    }
  },

  /**
   * Reset to an empty clean account (0 transactions, user-defined starting balance).
   */
  resetToCleanAccount(openingBalanceCents: number = 0, defaultBudgetCents: number = 0): StorageData {
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
    storageService.saveData(data.transactions, data.budgetConfig, data.savingsGoals);
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
