import React, { useState } from 'react';
import { UserX, X } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useEscapeKey } from '../../utils/useEscapeKey';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Permanently wipes the signed-in account (or guest ledger). Requires typing DELETE to confirm. */
export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, deleteAccount } = useExpense();
  const [confirmText, setConfirmText] = useState('');
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const handleDelete = () => {
    setConfirmText('');
    onClose();
    deleteAccount();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">
                {currentUser ? 'Delete Account?' : 'Delete Guest Data?'}
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5">This cannot be undone</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer" aria-label="Close dialog">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed m-0">
          {currentUser ? (
            <>
              The account <strong>{currentUser.username}</strong>
              {currentUser.email ? <> ({currentUser.email})</> : null} and all of its transactions, budgets
              and savings goals will be permanently removed from this device, and you will be signed out.
            </>
          ) : (
            <>All guest transactions, budgets and savings goals on this device will be permanently removed.</>
          )}
        </p>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Type <span className="font-mono text-rose-600">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button type="button" onClick={handleClose} className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE'}
            className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Delete Permanently</span>
          </button>
        </div>
      </div>
    </div>
  );
};
