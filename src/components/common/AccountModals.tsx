import React, { useState } from 'react';
import { UserX, X, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/authService';
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

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Change your own PIN / password: enter the current one, then a new one twice. */
export const ChangePinModal: React.FC<ChangePinModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, refreshCurrentUser } = useExpense();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useEscapeKey(isOpen, onClose);

  if (!isOpen || !currentUser) return null;

  const close = () => {
    setCurrent(''); setNext(''); setConfirm(''); setError(null); setDone(false); setShow(false);
    onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!current || !next || !confirm) { setError('Please fill in all three boxes.'); return; }
    if (next !== confirm) { setError('The new PIN and its confirmation do not match.'); return; }
    const res = authService.changePin(currentUser.id, current, next);
    if (!res.success) { setError(res.error ?? 'Could not change the PIN.'); return; }
    refreshCurrentUser();
    setDone(true);
  };

  const field = 'w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500';
  const label = 'block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Change PIN">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-900">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Change PIN / Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">For @{currentUser.username}</p>
            </div>
          </div>
          <button onClick={close} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer" aria-label="Close dialog">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-sm text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Your PIN has been changed. Use the new one the next time you log in.</span>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={close} className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer">Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className={label} htmlFor="cp-current">Current PIN</label>
              <input id="cp-current" type={show ? 'text' : 'password'} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={field} autoFocus />
            </div>
            <div>
              <label className={label} htmlFor="cp-new">New PIN (at least 4 characters)</label>
              <input id="cp-new" type={show ? 'text' : 'password'} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="cp-confirm">Confirm new PIN</label>
              <input id="cp-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
            </div>
            <button type="button" onClick={() => setShow((v) => !v)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer">
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{show ? 'Hide PINs' : 'Show PINs'}</span>
            </button>
            {error && (
              <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button type="button" onClick={close} className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 cursor-pointer">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Change PIN</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
