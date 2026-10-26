import React from 'react';
import { Sparkles, Wand2, RotateCcw, PanelRightOpen } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useAssistantChat } from '../../context/AssistantChatContext';
import { ChatPanel } from './ChatPanel';

export const AIAssistantView: React.FC = () => {
  const { selectedMonth, setIsSmartEntryOpen } = useExpense();
  const { clear, popOut } = useAssistantChat();

  return (
    <div className="space-y-6">
      {/* Top Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight m-0">
              AI Financial Assistant
            </h2>
            <span className="text-[10px] font-semibold tracking-wider uppercase bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
              In-app only
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ask about your finances or account, do quick calculations, or tell me what to do in the app
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={popOut}
            title="Keep this chat in a small popup at the side while you use other pages"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <PanelRightOpen className="w-3.5 h-3.5" />
            <span>Pop out</span>
          </button>
          <button
            onClick={() => setIsSmartEntryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-xl transition-all border border-indigo-200 dark:border-indigo-800 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Open Smart Entry</span>
          </button>
          <button
            onClick={clear}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Reset Chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notice */}
      <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40 rounded-2xl flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
          <span className="font-bold">Your in-app assistant:</span> it answers about your money (<strong>{selectedMonth}</strong> unless you name another time), your account and quick maths, and can open pages or add expenses for you. When it opens another page, the chat moves to a small popup so you can keep talking. Money figures are always calculated from your recorded transactions, never guessed. It only helps with things inside this app.
        </div>
      </div>

      {/* Chat */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs h-[520px]">
        <ChatPanel variant="page" />
      </div>
    </div>
  );
};
