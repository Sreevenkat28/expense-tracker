import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Tag, FileText, AlertCircle } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import {
  type TransactionType,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Category,
  type Transaction,
} from '../../types';
import { centsToDollars, isValidAmount } from '../../utils/currency';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  transactionToEdit,
}) => {
  const { addTransaction, updateTransaction, selectedMonth, currencyInfo } = useExpense();
  const currencySymbol = currencyInfo.symbol;

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<Category>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState<string>('');
  const [errors, setErrors] = useState<{ amount?: string; description?: string; date?: string }>({});

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmountStr((centsToDollars(transactionToEdit.amountCents)).toFixed(2));
      setDescription(transactionToEdit.description);
      setCategory(transactionToEdit.category);
      setDate(transactionToEdit.date);
    } else {
      const todayISO = new Date().toISOString().substring(0, 10);
      const initialDate = todayISO.startsWith(selectedMonth)
        ? todayISO
        : `${selectedMonth}-01`;

      setType('expense');
      setAmountStr('');
      setDescription('');
      setCategory(EXPENSE_CATEGORIES[0]);
      setDate(initialDate);
    }
    setErrors({});
  }, [transactionToEdit, isOpen, selectedMonth]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'expense') {
      if (!EXPENSE_CATEGORIES.includes(category as any)) {
        setCategory(EXPENSE_CATEGORIES[0]);
      }
    } else {
      if (!INCOME_CATEGORIES.includes(category as any)) {
        setCategory(INCOME_CATEGORIES[0]);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    // Validate amount
    const amountVal = isValidAmount(amountStr);
    if (!amountVal.valid) {
      newErrors.amount = amountVal.error;
    }

    // Validate description
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    // Validate date
    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const amountCents = amountVal.cents!;

    if (transactionToEdit) {
      updateTransaction(transactionToEdit.id, {
        type,
        amountCents,
        description: description.trim(),
        category,
        date,
      });
    } else {
      addTransaction({
        type,
        amountCents,
        description: description.trim(),
        category,
        date,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white m-0">
              {transactionToEdit ? 'Edit Transaction' : 'Record Transaction'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {transactionToEdit ? 'Update transaction details' : 'Record a new income deposit or expense entry'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transaction Type Segmented Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 px-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Expense (-)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 px-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Income (+)
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Amount ({currencySymbol})
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                {currencySymbol}
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                className={`w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-lg font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 transition-all ${
                  errors.amount
                    ? 'border-rose-300 dark:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
                autoFocus
              />
            </div>
            {errors.amount && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.amount}
              </p>
            )}
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="e.g. Whole Foods Groceries, TechCorp Salary"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                }}
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 transition-all ${
                  errors.description
                    ? 'border-rose-300 dark:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.description && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.description}
              </p>
            )}
          </div>

          {/* Category & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Tag className="w-4 h-4" />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
                >
                  {type === 'expense'
                    ? EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c} className="dark:bg-slate-800 dark:text-white">
                          {c}
                        </option>
                      ))
                    : INCOME_CATEGORIES.map((c) => (
                        <option key={c} value={c} className="dark:bg-slate-800 dark:text-white">
                          {c}
                        </option>
                      ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-3 text-slate-400 text-xs">▼</div>
              </div>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 transition-all ${
                    errors.date
                      ? 'border-rose-300 dark:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/20 focus:border-emerald-500'
                  }`}
                />
              </div>
              {errors.date && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.date}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{transactionToEdit ? 'Save Changes' : 'Record Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
