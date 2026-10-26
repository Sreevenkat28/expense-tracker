import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  Receipt,
  Download,
  FileSpreadsheet,
  FileJson,
  Printer,
  Wand2,
  Upload,
  Share2,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  CATEGORY_COLORS,
} from '../../types';
import { formatDate, formatMonthName } from '../../utils/dates';
import { transactionsToCSV, downloadTextFile } from '../../utils/csv';
import { ImportCSVModal } from './ImportCSVModal';

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    selectedMonth,
    setIsQuickAddOpen,
    setIsSmartEntryOpen,
    setIsShareReportOpen,
    setEditingTransaction,
    deleteTransaction,
    budgetConfig,
    formatAmount,
    currency,
    selectedDate,
  } = useExpense();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const formatCurrency = formatAmount;

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [scopeFilter, setScopeFilter] = useState<'day' | 'month' | 'all'>(selectedDate ? 'day' : 'month');

  // Picking a day in the header calendar narrows the list to that day; clearing it returns to the month.
  // (State adjusted while rendering when the day changes, which avoids an extra effect-driven render.)
  const [seenDate, setSeenDate] = useState(selectedDate);
  if (seenDate !== selectedDate) {
    setSeenDate(selectedDate);
    setScopeFilter(selectedDate ? 'day' : scopeFilter === 'day' ? 'month' : scopeFilter);
  }

  // All available categories for filter dropdown
  const allCategories = useMemo(() => {
    return Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]));
  }, []);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    const result = transactions.filter((tx) => {
      // Month scope check
      if (scopeFilter === 'day' && selectedDate && tx.date !== selectedDate) {
        return false;
      }
      if (scopeFilter === 'month' && !tx.date.startsWith(selectedMonth)) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
        return false;
      }

      // Search query (matches description or category)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesDesc = tx.description.toLowerCase().includes(query);
        const matchesCat = tx.category.toLowerCase().includes(query);
        if (!matchesDesc && !matchesCat) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
        case 'date-asc':
          return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
        case 'amount-desc':
          return b.amountCents - a.amountCents;
        case 'amount-asc':
          return a.amountCents - b.amountCents;
        default:
          return 0;
      }
    });

    return result;
  }, [transactions, selectedMonth, selectedDate, scopeFilter, typeFilter, categoryFilter, searchQuery, sortBy]);

  // Entries in the chosen scope before type / category / search filters, so the count reads "N of M"
  const scopeTotal = useMemo(
    () =>
      transactions.filter((tx) =>
        scopeFilter === 'day' && selectedDate
          ? tx.date === selectedDate
          : scopeFilter === 'month'
          ? tx.date.startsWith(selectedMonth)
          : true
      ).length,
    [transactions, scopeFilter, selectedDate, selectedMonth]
  );
  const scopeLabel =
    scopeFilter === 'day' && selectedDate ? formatDate(selectedDate) : scopeFilter === 'month' ? formatMonthName(selectedMonth) : 'all time';

  // Aggregate totals for the filtered results
  const summaryTotals = useMemo(() => {
    let incomeCents = 0;
    let expenseCents = 0;
    for (const t of filteredTransactions) {
      if (t.type === 'income') incomeCents += t.amountCents;
      if (t.type === 'expense') expenseCents += t.amountCents;
    }
    return {
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('There are no transactions in the current view to export. Try switching the scope to "All-Time".');
      return;
    }
    downloadTextFile(
      transactionsToCSV(filteredTransactions, currency),
      `transactions_${scopeFilter === 'day' && selectedDate ? selectedDate : scopeFilter === 'month' ? selectedMonth : 'all_records'}.csv`,
      'text/csv'
    );
  };

  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      scope: scopeFilter,
      selectedMonth,
      transactionCount: filteredTransactions.length,
      transactions: filteredTransactions,
    };
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `transactions_backup_${selectedMonth}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight m-0">
            Transaction Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, record income and expenses, and import / export CSV files
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
          {/* Share report */}
          <button
            onClick={() => setIsShareReportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-xl transition-colors border border-indigo-200 dark:border-indigo-800 cursor-pointer"
            title="Share a detailed report of this month on WhatsApp, Gmail or as a PDF"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share report</span>
          </button>

          {/* Import CSV button */}
          <button
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Import transactions from a CSV spreadsheet"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>CSV Import</span>
          </button>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Download CSV spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>CSV Export</span>
          </button>

          {/* Export JSON backup button */}
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Download JSON backup"
          >
            <FileJson className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>JSON</span>
          </button>

          {/* Smart Entry */}
          <button
            onClick={() => setIsSmartEntryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-xl transition-colors border border-indigo-200 dark:border-indigo-800 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Smart Entry</span>
          </button>

          {/* Add Transaction */}
          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search description or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Scope Selector (Month vs All-Time) */}
          <div className="lg:col-span-2">
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as 'day' | 'month' | 'all')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              {selectedDate && <option value="day">Day: {formatDate(selectedDate)}</option>}
              <option value="month">Month: {formatMonthName(selectedMonth)}</option>
              <option value="all">All-Time Records</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="lg:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only (-)</option>
              <option value="income">Income Only (+)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="date-desc">Date: Newest First</option>
              <option value="date-asc">Date: Oldest First</option>
              <option value="amount-desc">Amount: Highest First</option>
              <option value="amount-asc">Amount: Lowest First</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Metrics */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <span className="font-bold text-slate-800 dark:text-slate-200">{summaryTotals.count}</span> of{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">{scopeTotal}</span> transaction{scopeTotal === 1 ? '' : 's'} in {scopeLabel}
          </div>

          <div className="flex items-center gap-4">
            <span>
              Income:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(summaryTotals.incomeCents)}</strong>
            </span>
            <span>
              Expenses:{' '}
              <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(summaryTotals.expenseCents)}</strong>
            </span>
            <span>
              Net:{' '}
              <strong className={summaryTotals.netCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {summaryTotals.netCents >= 0 ? '+' : ''}{formatCurrency(summaryTotals.netCents)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">No transactions match your criteria</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Try adjusting your filters, searching for a different keyword, or record a new transaction.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setCategoryFilter('all');
              }}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                {filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const catStyle = CATEGORY_COLORS[tx.category] || {
                    bg: 'bg-slate-100 dark:bg-slate-700',
                    text: 'text-slate-700 dark:text-slate-300',
                    border: 'border-slate-200 dark:border-slate-600',
                  };

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {tx.description}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {tx.category}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isIncome ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                          )}
                          <span className="capitalize">{tx.type}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                        <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}>
                          {isIncome ? '+' : '-'}{formatCurrency(tx.amountCents)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingTransaction(tx)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            aria-label="Edit transaction"
                            title="Edit transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${tx.description}"?`)) {
                                deleteTransaction(tx.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                            aria-label="Delete transaction"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ImportCSVModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
};
