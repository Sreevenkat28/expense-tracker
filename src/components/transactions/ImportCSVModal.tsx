import React, { useMemo, useRef, useState } from 'react';
import { Upload, X, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import {
  parseTransactionsCSV,
  transactionFingerprint,
  downloadTextFile,
  CSV_TEMPLATE,
  CSVParseResult,
} from '../../utils/csv';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportCSVModal: React.FC<ImportCSVModalProps> = ({ isOpen, onClose }) => {
  const { transactions, importTransactions, formatAmount } = useExpense();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<CSVParseResult | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  // Rows that already exist in the ledger (e.g. re-importing a previous export) are skipped
  const { newRows, duplicateCount } = useMemo(() => {
    if (!parsed) return { newRows: [], duplicateCount: 0 };
    const existing = new Set(transactions.map(transactionFingerprint));
    const rows = parsed.transactions.filter((t) => !existing.has(transactionFingerprint(t)));
    return { newRows: rows, duplicateCount: parsed.transactions.length - rows.length };
  }, [parsed, transactions]);

  if (!isOpen) return null;

  const reset = () => {
    setFileName(null);
    setParsed(null);
    setImportedCount(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportedCount(null);
    setFileName(file.name);
    try {
      setParsed(parseTransactionsCSV(await file.text()));
    } catch {
      setParsed({ transactions: [], errors: ['Could not read the file.'] });
    }
  };

  const handleImport = () => {
    importTransactions(newRows);
    setImportedCount(newRows.length);
    setParsed(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-900">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Import Transactions from CSV</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Excel / Google Sheets → File → Download as CSV</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer" aria-label="Close dialog">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1.5">
          <p className="m-0">
            First row must be a header. Required columns: <strong>Date</strong> and <strong>Amount</strong>. Optional:{' '}
            <strong>Type</strong> (INCOME / EXPENSE), <strong>Description</strong>, <strong>Category</strong>.
          </p>
          <p className="m-0 text-slate-500 dark:text-slate-400">
            Dates as YYYY-MM-DD or DD/MM/YYYY. Without a Type column, negative amounts are expenses. Unknown
            categories go to "Other". A CSV exported from this app can be imported back as-is.
          </p>
          <button
            type="button"
            onClick={() => downloadTextFile(CSV_TEMPLATE, 'expense_tracker_import_template.csv', 'text/csv')}
            className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download sample template</span>
          </button>
        </div>

        <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
          <FileSpreadsheet className="w-6 h-6 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {fileName ?? 'Choose a .csv file'}
          </span>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        </label>

        {importedCount !== null && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Imported {importedCount} transaction{importedCount === 1 ? '' : 's'}.</span>
          </div>
        )}

        {parsed && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{newRows.length}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">To import</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                <div className="text-lg font-black text-slate-600 dark:text-slate-300">{duplicateCount}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Already exist</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60">
                <div className="text-lg font-black text-rose-600 dark:text-rose-400">{parsed.errors.length}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Rows with errors</div>
              </div>
            </div>

            {newRows.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                {newRows.slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 gap-2">
                    <span className="text-slate-500 shrink-0">{t.date}</span>
                    <span className="flex-1 truncate text-slate-800 dark:text-slate-100">{t.description}</span>
                    <span className="text-slate-400 hidden sm:inline">{t.category}</span>
                    <span className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatAmount(t.amountCents)}
                    </span>
                  </div>
                ))}
                {newRows.length > 5 && (
                  <div className="px-3 py-2 text-slate-400 text-center">…and {newRows.length - 5} more</div>
                )}
              </div>
            )}

            {parsed.errors.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>These rows will be skipped:</span>
                </div>
                {parsed.errors.slice(0, 8).map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
                {parsed.errors.length > 8 && <div>…and {parsed.errors.length - 8} more</div>}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button type="button" onClick={handleClose} className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer">
            {importedCount !== null ? 'Done' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={newRows.length === 0}
            className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import {newRows.length > 0 ? newRows.length : ''} Transactions</span>
          </button>
        </div>
      </div>
    </div>
  );
};
