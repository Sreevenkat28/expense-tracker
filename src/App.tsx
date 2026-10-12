import React from 'react';
import { ExpenseProvider, useExpense } from './context/ExpenseContext';
import { Header } from './components/common/Header';
import { Navbar } from './components/common/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { InsightsView } from './components/insights/InsightsView';
import { BudgetView } from './components/budget/BudgetView';
import { TransactionFormModal } from './components/transactions/TransactionFormModal';
import { Shield, Heart } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    isQuickAddOpen,
    setIsQuickAddOpen,
    editingTransaction,
    setEditingTransaction,
  } = useExpense();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <Header />

      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {activeTab === 'home' && <DashboardView />}
        {activeTab === 'transactions' && <TransactionsView />}
        {activeTab === 'insights' && <InsightsView />}
        {activeTab === 'budget' && <BudgetView />}
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Monthly Expense Tracker</span>
            <span>•</span>
            <span>Local & Private Ledger</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Integer Cents Arithmetic</span>
            <span>•</span>
            <span>Data stored in browser local storage</span>
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
