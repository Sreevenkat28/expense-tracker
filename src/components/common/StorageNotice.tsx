import React, { useState } from 'react';
import { ShieldCheck, HardDrive, Download, X } from 'lucide-react';
import { storageService } from '../../services/storage';

export const StorageNotice: React.FC = () => {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('hide_storage_notice_v1') === 'true';
  });

  const handleDismiss = () => {
    localStorage.setItem('hide_storage_notice_v1', 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-slate-100/90 border border-slate-200/90 rounded-2xl p-3.5 mb-6 text-xs text-slate-600 flex items-start justify-between gap-3 shadow-2xs">
      <div className="flex items-start gap-2.5">
        <HardDrive className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
        <div className="leading-relaxed">
          <span className="font-semibold text-slate-800">Private Local Storage:</span>{' '}
          Your transactions and budget settings are saved directly in your browser's private local storage. Data does not automatically sync across separate browsers or devices.
          <button
            onClick={() => storageService.exportData()}
            className="ml-2 font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 underline"
          >
            <Download className="w-3 h-3 inline" /> Export JSON Backup
          </button>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-200/50 transition-colors shrink-0"
        aria-label="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
