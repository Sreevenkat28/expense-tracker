import React from 'react';
import { ExpenseProvider, useExpense } from './context/ExpenseContext';
import { Header } from './components/common/Header';
import { Navbar } from './components/common/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { BudgetView } from './components/budget/BudgetView';
import { SavingsGoalsView } from './components/savings/SavingsGoalsView';
import { InsightsView } from './components/insights/InsightsView';
import { AIAssistantView } from './components/ai/AIAssistantView';
import { TransactionFormModal } from './components/transactions/TransactionFormModal';
import { SmartEntryModal } from './components/common/SmartEntryModal';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    isQuickAddOpen,
    setIsQuickAddOpen,
    isSmartEntryOpen,
    setIsSmartEntryOpen,
    editingTransaction,
    setEditingTransaction,
  } = useExpense();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Top Header */}
      <Header />

      {/* 6-Section Navigation Bar */}
      <Navbar />

      {/* Main Section Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {(activeTab === 'dashboard' || activeTab === 'home') && <DashboardView />}
        {activeTab === 'transactions' && <TransactionsView />}
        {(activeTab === 'budgets' || activeTab === 'budget') && <BudgetView />}
        {activeTab === 'savings' && <SavingsGoalsView />}
        {activeTab === 'insights' && <InsightsView />}
        {activeTab === 'ai' && <AIAssistantView />}
      </main>

      {/* Add / Edit Transaction Modal */}
      <TransactionFormModal
        isOpen={isQuickAddOpen || editingTransaction !== null}
        onClose={() => {
          setIsQuickAddOpen(false);
          setEditingTransaction(null);
        }}
        transactionToEdit={editingTransaction}
      />

      {/* Smart Natural Language Entry Modal */}
      <SmartEntryModal
        isOpen={isSmartEntryOpen}
        onClose={() => setIsSmartEntryOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">Expense Tracker</span>
            <span>•</span>
            <span>Personal Finance & Ledger</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Integer Cents Arithmetic</span>
            <span>•</span>
            <span>Local & Private Storage</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ExpenseProvider>
      <MainLayout />
    </ExpenseProvider>
  );
}
