import React, { useMemo, useRef, useState } from 'react';
import { Share2, X, Download, Copy, Mail, MessageCircle, Send, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useEscapeKey } from '../../utils/useEscapeKey';
import { getTodayDateString } from '../../utils/dates';
import { buildReport, reportToText, reportSubject, reportFileName, whatsappLink, gmailLink, mailtoLink } from '../../utils/report';
import { reportPdfBlob } from '../../utils/reportPdf';

/** Share the month's detailed report: WhatsApp, Gmail, any app on the phone's share sheet, or as a PDF. */
export const ShareReportModal: React.FC = () => {
  const { isShareReportOpen, setIsShareReportOpen, transactions, selectedMonth, budgetConfig, savingsGoals, currency, currentUser, formatAmount } = useExpense();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const urlRef = useRef<string | null>(null);
  const close = () => { setStatus(null); setIsShareReportOpen(false); };
  useEscapeKey(isShareReportOpen, close);

  const report = useMemo(
    () => (isShareReportOpen ? buildReport({ transactions, selectedMonth, budgetConfig, savingsGoals, currency, ownerName: currentUser?.name ?? 'Guest', today: getTodayDateString() }) : null),
    [isShareReportOpen, transactions, selectedMonth, budgetConfig, savingsGoals, currency, currentUser]
  );
  if (!isShareReportOpen || !report) return null;

  const subject = reportSubject(report);
  const waText = reportToText(report, 'whatsapp');
  const plainText = reportToText(report, 'plain');
  const fileName = reportFileName(report);
  const ok = (text: string) => setStatus({ ok: true, text });
  const fail = (text: string) => setStatus({ ok: false, text });

  const makeFile = () => new File([reportPdfBlob(report)], fileName, { type: 'application/pdf' });
  const canShareText = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  let canSharePdf = false;
  try {
    canSharePdf = canShareText && typeof navigator.canShare === 'function' && navigator.canShare({ files: [makeFile()] });
  } catch {
    canSharePdf = false;
  }

  const openLink = (url: string, what: string) => {
    const w = window.open(url, '_blank');
    if (!w) { fail(`Your browser blocked the new window. Use "Copy text" and paste it into ${what}.`); return; }
    w.opener = null;
    ok(`Opened ${what}. Choose who to send it to.`);
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      ok('Report copied. Paste it into any chat or email.');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = plainText; document.body.appendChild(ta); ta.select();
      const done = document.execCommand?.('copy');
      document.body.removeChild(ta);
      done ? ok('Report copied. Paste it into any chat or email.') : fail('Could not copy automatically. Select the preview text and copy it.');
    }
  };

  const downloadPdf = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(reportPdfBlob(report));
    urlRef.current = url;
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    ok(`Saved ${fileName}. Attach it to an email or send it in any chat.`);
  };

  const nativeShare = async (withPdf: boolean) => {
    try {
      if (withPdf) await navigator.share({ title: subject, text: `${subject}`, files: [makeFile()] });
      else await navigator.share({ title: subject, text: plainText });
      ok('Shared.');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') fail('Sharing is not available here. Use WhatsApp, Gmail, Copy or Download instead.');
    }
  };

  const btn = 'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer';
  const quiet = `${btn} text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Share monthly report">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-900 shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white m-0">Share your {report.monthLabel} report</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">A detailed summary with categories, biggest expenses and every transaction. Change the month at the top to share a different one.</p>
            </div>
          </div>
          <button onClick={close} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer shrink-0" aria-label="Close dialog">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ['Income', formatAmount(report.incomeCents), 'text-emerald-600 dark:text-emerald-400'],
            ['Expenses', formatAmount(report.expenseCents), 'text-rose-600 dark:text-rose-400'],
            ['Net', `${report.netCents >= 0 ? '+' : '-'}${formatAmount(Math.abs(report.netCents))}`, report.netCents >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'],
          ].map(([label, value, color]) => (
            <div key={label} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-500">{label}</div>
              <div className={`text-sm font-black break-words ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">What will be shared</div>
          <pre className="m-0 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words max-h-44 overflow-y-auto font-sans">{plainText}</pre>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => openLink(whatsappLink(waText), 'WhatsApp')} className={`${btn} text-white bg-emerald-600 hover:bg-emerald-700 border-emerald-600`}>
            <MessageCircle className="w-4 h-4" /><span>WhatsApp</span>
          </button>
          <button type="button" onClick={() => openLink(gmailLink(subject, plainText), 'Gmail')} className={`${btn} text-white bg-rose-600 hover:bg-rose-700 border-rose-600`}>
            <Mail className="w-4 h-4" /><span>Gmail</span>
          </button>
          <button type="button" onClick={() => { const a = document.createElement('a'); a.href = mailtoLink(subject, plainText); a.click(); ok('Opening your email app.'); }} className={quiet}>
            <Send className="w-4 h-4" /><span>Email app</span>
          </button>
          <button type="button" onClick={copyText} className={quiet}>
            <Copy className="w-4 h-4" /><span>Copy text</span>
          </button>
          <button type="button" onClick={downloadPdf} className={quiet}>
            <Download className="w-4 h-4" /><span>Download PDF</span>
          </button>
          {canSharePdf && (
            <button type="button" onClick={() => nativeShare(true)} className={`${btn} text-white bg-indigo-600 hover:bg-indigo-700 border-indigo-600`}>
              <FileText className="w-4 h-4" /><span>Share PDF…</span>
            </button>
          )}
          {canShareText && !canSharePdf && (
            <button type="button" onClick={() => nativeShare(false)} className={`${btn} text-white bg-indigo-600 hover:bg-indigo-700 border-indigo-600`}>
              <Share2 className="w-4 h-4" /><span>Share…</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 leading-relaxed">
          <strong>Tip:</strong> to send the full report as a file, press <strong>Download PDF</strong> and attach it in WhatsApp or Gmail{canSharePdf ? ', or use Share PDF… to pick the app directly' : ''}. The message options above include a shortened text version.
        </p>

        {status && (
          <div role="status" aria-live="polite" className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${status.ok ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400'}`}>
            {status.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{status.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
