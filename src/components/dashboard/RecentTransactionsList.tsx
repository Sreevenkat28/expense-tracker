import React from 'react';
import { ArrowUpRight, ArrowDownRight, Edit2, Trash2, Plus, ArrowRight, Receipt } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { getTransactionsForMonth } from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/dates';
import { CATEGORY_COLORS } from '../../types';

export const RecentTransactionsList: React.FC = () => {
  const {
    transactions,
    selectedMonth,
    setActiveTab,
    setIsQuickAddOpen,
    setEditingTransaction,
    deleteTransaction,
  } = useExpense();

  const monthTx = React.useMemo(() => {
    return getTransactionsForMonth(transactions, selectedMonth)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [transactions, selectedMonth]);

  const recentTx = monthTx.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 m-0">Recent Transactions</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Latest activities for this month
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>View All ({monthTx.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {recentTx.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
            <Receipt className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No transactions recorded</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You don't have any income or expenses logged for this month yet.
          </p>
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Transaction</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {recentTx.map((tx) => {
            const isIncome = tx.type === 'income';
            const catStyle = CATEGORY_COLORS[tx.category] || {
              bg: 'bg-slate-100',
              text: 'text-slate-700',
              border: 'border-slate-200',
            };

            return (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between group hover:bg-slate-50/70 px-2 -mx-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{formatDate(tx.date)}</span>
                      <span
                        className={`text-[11px] px-2 py-0.2 rounded-full font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      >
                        {tx.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span
                    className={`text-sm font-bold ${
                      isIncome ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(tx.amountCents, true)}
                  </span>

                  {/* Actions on hover/focus */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingTransaction(tx)}
                      aria-label="Edit transaction"
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/50 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      aria-label="Delete transaction"
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
