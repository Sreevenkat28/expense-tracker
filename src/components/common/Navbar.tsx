import React from 'react';
import { LayoutDashboard, ReceiptText, LineChart, PieChart } from 'lucide-react';
import { useExpense, NavigationTab } from '../../context/ExpenseContext';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, transactions, monthSummary } = useExpense();

  const navItems: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'insights', label: 'Insights', icon: LineChart },
    { id: 'budget', label: 'Budget', icon: PieChart },
  ];

  return (
    <nav className="bg-white border-b border-slate-200/80 sticky top-[69px] z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.id === 'transactions' && monthSummary.transactionCount > 0 && (
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {monthSummary.transactionCount}
                  </span>
                )}
                {item.id === 'budget' && monthSummary.budgetUsagePercent >= 80 && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      monthSummary.budgetUsagePercent >= 100 ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    title={monthSummary.budgetUsagePercent >= 100 ? 'Budget exceeded' : '80%+ Budget used'}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
