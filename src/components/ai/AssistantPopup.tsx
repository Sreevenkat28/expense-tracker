import React from 'react';
import { Bot, Maximize2, Minus } from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { useAssistantChat } from '../../context/AssistantChatContext';
import { ChatPanel } from './ChatPanel';

/**
 * The assistant as a small chat in the corner of every page, so you can keep talking while you use the app
 * (and while it opens pages for you). On the AI page itself the full chat is shown instead.
 */
export const AssistantPopup: React.FC = () => {
  const { activeTab } = useExpense();
  const { popupOpen, openPopup, closePopup, expand, messages } = useAssistantChat();

  if (activeTab === 'ai') return null;

  if (!popupOpen) {
    const unread = messages.length > 1;
    return (
      <button
        type="button"
        onClick={openPopup}
        aria-label="Open the assistant chat"
        title="Chat with the AI Financial Assistant"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
      >
        <Bot className="w-5 h-5" />
        <span className="hidden sm:inline">Assistant</span>
        {unread && <span className="w-2 h-2 rounded-full bg-emerald-300" aria-hidden="true" />}
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Assistant chat"
      onKeyDown={(e) => { if (e.key === 'Escape') closePopup(); }}
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 w-[390px] max-w-[calc(100vw-1.5rem)] h-[580px] max-h-[calc(100dvh-5.5rem)] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl shadow-slate-900/20 flex flex-col overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shrink-0">
        <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold leading-tight truncate">AI Financial Assistant</div>
          <div className="text-[10px] text-indigo-100 leading-tight">Keep chatting while you use the app</div>
        </div>
        <button type="button" onClick={expand} aria-label="Open the full chat page" title="Open on the AI page" className="p-1.5 rounded-lg hover:bg-white/20 cursor-pointer">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={closePopup} aria-label="Minimize the chat" title="Minimize" className="p-1.5 rounded-lg hover:bg-white/20 cursor-pointer">
          <Minus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <ChatPanel variant="popup" />
      </div>
    </div>
  );
};
