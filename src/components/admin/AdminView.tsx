import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  KeyRound,
  Trash2,
  Crown,
  Ban,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { authService } from '../../services/authService';
import { storageService } from '../../services/storage';
import { formatDate } from '../../utils/dates';

type Notice = { kind: 'success' | 'error'; text: string } | null;

export const AdminView: React.FC = () => {
  const { currentUser, isAdmin, refreshCurrentUser } = useExpense();
  // Bumped after every change so the list re-reads localStorage
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPinValue, setResetPinValue] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const users = useMemo(() => {
    void version;
    return authService.getUsers().map((u) => ({
      ...u,
      transactionCount: storageService.countTransactions(u.id),
    }));
  }, [version]);

  if (!isAdmin || !currentUser) {
    return (
      <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Only admins can view this page.</div>
    );
  }

  const changed = (n: Notice) => {
    setNotice(n);
    setVersion((v) => v + 1);
    refreshCurrentUser();
  };

  const handleToggleRole = (id: string, makeAdmin: boolean) => {
    const res = authService.adminSetRole(id, makeAdmin ? 'admin' : 'user');
    changed(res.success ? { kind: 'success', text: makeAdmin ? 'User promoted to admin.' : 'Admin rights removed.' } : { kind: 'error', text: res.error ?? 'Failed.' });
  };

  const handleToggleDisabled = (id: string, disabled: boolean) => {
    authService.adminSetDisabled(id, disabled);
    changed({ kind: 'success', text: disabled ? 'Account disabled. The user can no longer log in.' : 'Account re-enabled.' });
  };

  const handleResetPin = (id: string) => {
    const res = authService.adminResetPin(id, resetPinValue);
    if (!res.success) {
      setNotice({ kind: 'error', text: res.error ?? 'Failed.' });
      return;
    }
    setResetTargetId(null);
    setResetPinValue('');
    changed({ kind: 'success', text: 'PIN reset. Give the user their new PIN.' });
  };

  const handleDelete = (id: string) => {
    authService.deleteAccount(id);
    setDeleteTargetId(null);
    changed({ kind: 'success', text: 'Account and all its data deleted.' });
  };

  const activeCount = users.filter((u) => !u.disabled).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const guestTxCount = storageService.countTransactions(null);

  const actionBtn = 'inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-2 sm:py-1.5 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer';

  return (
    <div className="space-y-6">
      <div className="pb-1 border-b border-slate-200/60 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight m-0 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Admin: User Management
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage the accounts stored in this browser. Accounts are local to this device and are not shared with other devices.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Accounts', value: users.length, icon: Users },
          { label: 'Active', value: activeCount, icon: UserCheck },
          { label: 'Admins', value: adminCount, icon: Crown },
          { label: 'Guest Transactions', value: guestTxCount, icon: UserX },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</div>
          </div>
        ))}
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
            notice.kind === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400'
          }`}
        >
          {notice.kind === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="select-all">{notice.text}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {users.map((u) => {
          const isSelf = u.id === currentUser.id;
          return (
            <div key={u.id} className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{u.name}</span>
                    <span className="text-xs text-slate-500">@{u.username}</span>
                    {u.role === 'admin' && (
                      <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-full">ADMIN</span>
                    )}
                    {u.disabled && (
                      <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-full">DISABLED</span>
                    )}
                    {isSelf && (
                      <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">YOU</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                    {u.email ?? 'No email on file'} · {u.transactionCount} transactions · joined {formatDate(u.createdAt.slice(0, 10))}
                    {u.lastLoginAt ? ` · last login ${formatDate(u.lastLoginAt.slice(0, 10))}` : ''}
                  </div>
                </div>

                {!isSelf && (
                  <div className="flex items-center gap-1.5 flex-wrap sm:justify-end">
                    <button
                      onClick={() => handleToggleRole(u.id, u.role !== 'admin')}
                      className={`${actionBtn} border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40`}
                    >
                      <Crown className="w-3 h-3" />
                      {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                    </button>
                    <button
                      onClick={() => handleToggleDisabled(u.id, !u.disabled)}
                      className={`${actionBtn} border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800`}
                    >
                      {u.disabled ? <UserCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                      {u.disabled ? 'Enable' : 'Disable'}
                    </button>
                    <button
                      onClick={() => {
                        setResetTargetId(resetTargetId === u.id ? null : u.id);
                        setResetPinValue('');
                        setDeleteTargetId(null);
                      }}
                      className={`${actionBtn} border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800`}
                    >
                      <KeyRound className="w-3 h-3" />
                      Reset PIN
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTargetId(deleteTargetId === u.id ? null : u.id);
                        setResetTargetId(null);
                      }}
                      className={`${actionBtn} border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
                {isSelf && (
                  <span className="text-[11px] text-slate-400">Use "Delete account" in the header to remove your own account.</span>
                )}
              </div>

              {resetTargetId === u.id && (
                <div className="flex items-center gap-2 flex-wrap bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
                  <input
                    type="text"
                    placeholder="New PIN (min 4 characters)"
                    value={resetPinValue}
                    onChange={(e) => setResetPinValue(e.target.value)}
                    className="flex-1 min-w-40 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    autoFocus
                  />
                  <button onClick={() => handleResetPin(u.id)} className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer">
                    Set New PIN
                  </button>
                </div>
              )}

              {deleteTargetId === u.id && (
                <div className="flex items-center justify-between gap-2 flex-wrap bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-300">
                  <span>Permanently delete @{u.username} and all {u.transactionCount} transactions?</span>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteTargetId(null)} className="px-3 py-1.5 font-semibold rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 cursor-pointer">
                      Cancel
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="px-3 py-1.5 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
