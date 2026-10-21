import React, { useState } from 'react';
import {
  Wand2,
  X,
  Check,
  AlertCircle,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { parseSmartTransaction } from '../../services/aiService';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Category,
  TransactionType,
} from '../../types';
import { formatCurrency, isValidAmount } from '../../utils/currency';

interface SmartEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartEntryModal: React.FC<SmartEntryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addTransaction, selectedMonth } = useExpense();

  const [inputPrompt, setInputPrompt] = useState('');
  const [parsed, setParsed] = useState<{
    type: TransactionType;
    amountStr: string;
    description: string;
    category: Category;
    date: string;
    currencySymbol: string;
  } | null>(null);
  const [hasParsed, setHasParsed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim()) {
      setErrorMsg('Please enter a sentence describing your transaction.');
      return;
    }

    const defaultDate = new Date().toISOString().substring(0, 10).startsWith(selectedMonth)
      ? new Date().toISOString().substring(0, 10)
      : `${selectedMonth}-01`;

    const res = parseSmartTransaction(inputPrompt, defaultDate);

    if (!res.success || res.amountCents <= 0) {
      setErrorMsg('Could not detect an amount. Please specify an amount (e.g. ₹250 or $45).');
      return;
    }

    setErrorMsg(null);
    setParsed({
      type: res.type,
      amountStr: (res.amountCents / 100).toFixed(2),
      description: res.description,
      category: res.category,
      date: res.date,
      currencySymbol: res.currencySymbol,
    });
    setHasParsed(true);
  };

  const handleConfirmAdd = () => {
    if (!parsed) return;

    const val = isValidAmount(parsed.amountStr);
    if (!val.valid || val.cents! <= 0) {
      setErrorMsg('Invalid amount entered');
      return;
    }

    addTransaction({
      type: parsed.type,
      amountCents: val.cents!,
      description: parsed.description || 'Quick Transaction',
      category: parsed.category,
      date: parsed.date,
    });

    // Reset and close
    setInputPrompt('');
    setParsed(null);
    setHasParsed(false);
    onClose();
  };

  const samplePrompts = [
    'Spent ₹250 on lunch',
    'Spent $45 on groceries yesterday',
    'Earned $1200 from freelance client',
    'Paid $80 for electric bill',
    'Bought $15 books',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">
                Smart Natural Language Entry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Type what you spent or earned in plain text
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input box */}
        <form onSubmit={handleParse} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Natural Language Prompt
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Spent ₹250 on lunch or Earned $1200 freelance"
                value={inputPrompt}
                onChange={(e) => {
                  setInputPrompt(e.target.value);
                  setErrorMsg(null);
                }}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Parse
              </button>
            </div>
          </div>

          {/* Quick Examples */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Try an example:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setInputPrompt(p);
                    setErrorMsg(null);
                  }}
                  className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMsg}
            </p>
          )}
        </form>

        {/* ── Review & Confirmation Card ───────────────────────────────────── */}
        {parsed && (
          <div className="mt-5 p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Review Before Saving
              </span>
              <span className="text-[10px] text-slate-400">
                You can edit fields before confirming
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Type */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Type
                </label>
                <select
                  value={parsed.type}
                  onChange={(e) => setParsed({ ...parsed, type: e.target.value as TransactionType })}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                >
                  <option value="expense">Expense (-)</option>
                  <option value="income">Income (+)</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={parsed.amountStr}
                  onChange={(e) => setParsed({ ...parsed, amountStr: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                />
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={parsed.description}
                  onChange={(e) => setParsed({ ...parsed, description: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Category
                </label>
                <select
                  value={parsed.category}
                  onChange={(e) => setParsed({ ...parsed, category: e.target.value as Category })}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  {parsed.type === 'expense'
                    ? EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                    : INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                  }
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={parsed.date}
                  onChange={(e) => setParsed({ ...parsed, date: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setParsed(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Add Transaction</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
