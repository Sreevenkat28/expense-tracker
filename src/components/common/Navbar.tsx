import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  PiggyBank,
  LineChart,
  Bot,
  ShieldCheck,
  CalendarDays,
} from 'lucide-react';
import { useExpense, NavigationTab } from '../../context/ExpenseContext';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab, monthSummary, savingsGoals, isAdmin, transactions, activeDay } = useExpense();
  const dayCount = transactions.filter((t) => t.date === activeDay).length;

  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    title?: string;
    badgeColor?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'daily',
      label: 'Daily Log',
      icon: CalendarDays,
      badge: dayCount > 0 ? dayCount : undefined,
      title: `${dayCount} entr${dayCount === 1 ? 'y' : 'ies'} on ${activeDay}`,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: ReceiptText,
      badge: monthSummary.transactionCount > 0 ? monthSummary.transactionCount : undefined,
      title: `${monthSummary.transactionCount} transaction${monthSummary.transactionCount === 1 ? '' : 's'} in the selected month`,
    },
    {
      id: 'budgets',
      label: 'Budgets',
      icon: PieChart,
      badge: monthSummary.budgetUsagePercent >= 100 ? 'Alert' : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'savings',
      label: 'Savings Goals',
      icon: PiggyBank,
      badge: savingsGoals.length > 0 ? savingsGoals.length : undefined,
    },
    { id: 'insights', label: 'Insights', icon: LineChart },
    {
      id: 'ai',
      label: 'AI Assistant',
      icon: Bot,
      badge: 'Smart',
      badgeColor: 'bg-indigo-500 text-white',
    },
    ...(isAdmin ? [{ id: 'admin' as NavigationTab, label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 md:top-[var(--header-h,69px)] z-20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.title}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      item.badgeColor
                        ? item.badgeColor
                        : isActive
                        ? 'bg-slate-700 dark:bg-emerald-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
