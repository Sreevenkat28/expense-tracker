import React from 'react';
import { Bot, Maximize2, Minus, GripHorizontal } from 'lucide-react';
import { useDraggableAnchor } from '../../utils/useDraggableAnchor';
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
  // One remembered spot for both the small button and the open chat; drag either one anywhere on screen
  const drag = useDraggableAnchor('expense_tracker_assistant_pos_v1', { right: 16, bottom: 16 }, popupOpen ? 'chat' : 'button');

  if (activeTab === 'ai') return null;

  if (!popupOpen) {
    const unread = messages.length > 1;
    return (
      <button
        type="button"
        ref={drag.ref}
        {...drag.handleProps}
        onClick={() => { if (!drag.consumeClick()) openPopup(); }}
        onDoubleClick={drag.reset}
        style={drag.style}
        aria-label="Open the assistant chat"
        title="Chat with the AI Financial Assistant (drag to move it anywhere)"
        className={`fixed z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 touch-none select-none ${drag.dragging ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-105 active:scale-95 transition-transform'}`}
      >
        <Bot className="w-5 h-5" />
        <span className="hidden sm:inline">Assistant</span>
        {unread && <span className="w-2 h-2 rounded-full bg-emerald-300" aria-hidden="true" />}
      </button>
    );
  }

  return (
    <div
      ref={drag.ref}
      role="dialog"
      aria-label="Assistant chat"
      onKeyDown={(e) => { if (e.key === 'Escape') closePopup(); }}
      style={drag.style}
      className="fixed z-40 w-[390px] max-w-[calc(100vw-1.5rem)] h-[580px] max-h-[calc(100dvh-5.5rem)] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl shadow-slate-900/20 flex flex-col overflow-hidden"
    >
      <div
        {...drag.handleProps}
        onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest('[data-no-drag]')) drag.reset(); }}
        tabIndex={0}
        role="toolbar"
        aria-label="Move the chat: drag this bar, or focus it and use the arrow keys. Double-click to put it back."
        title="Drag to move · double-click to put it back"
        className={`flex items-center gap-2.5 px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shrink-0 touch-none select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 ${drag.dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold leading-tight truncate">AI Financial Assistant</div>
          <div className="text-[10px] text-indigo-100 leading-tight">Keep chatting while you use the app</div>
        </div>
        <GripHorizontal className="w-4 h-4 text-white/60 shrink-0" aria-hidden="true" />
        <button type="button" data-no-drag onClick={expand} aria-label="Open the full chat page" title="Open on the AI page" className="p-1.5 rounded-lg hover:bg-white/20 cursor-pointer">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button type="button" data-no-drag onClick={closePopup} aria-label="Minimize the chat" title="Minimize" className="p-1.5 rounded-lg hover:bg-white/20 cursor-pointer">
          <Minus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <ChatPanel variant="popup" />
      </div>
    </div>
  );
};
