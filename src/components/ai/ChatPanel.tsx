import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { useAssistantChat, QUICK_PROMPTS } from '../../context/AssistantChatContext';

/** Shows **bold** and *italic* from the assistant's answers as real formatting instead of raw asterisks. */
export const RichText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part, i) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
      return <React.Fragment key={i}>{part}</React.Fragment>;
    })}
  </>
);

/** The conversation, suggestions and input. Used on the AI page and in the side popup (same chat in both). */
export const ChatPanel: React.FC<{ variant: 'page' | 'popup' }> = ({ variant }) => {
  const { messages, thinking, send } = useAssistantChat();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const compact = variant === 'popup';

  // Keep the newest message in view
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, thinking]);

  const ask = (q: string) => {
    void send(q);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className={`flex-1 min-h-0 overflow-y-auto space-y-3 scrollbar-thin ${compact ? 'p-3' : 'p-5 space-y-4'}`}>
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs`}>
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`rounded-2xl leading-relaxed whitespace-pre-line break-words min-w-0 ${compact ? 'max-w-[85%] px-3 py-2 text-xs' : 'max-w-xl px-4 py-3 text-xs sm:text-sm'} ${
                  isUser
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-600/60'
                }`}
              >
                {isUser ? msg.text : <RichText text={msg.text} />}
                <span className={`block text-[10px] mt-1.5 ${isUser ? 'text-slate-300' : 'text-slate-400'}`}>{msg.timestamp}</span>
              </div>
            </div>
          );
        })}
        {thinking && (
          <div className="flex gap-2.5 justify-start" aria-live="polite">
            <div className={`${compact ? 'w-7 h-7' : 'w-8 h-8'} rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs`}>
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none px-4 py-3 text-xs bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              <span className="ml-1">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      <div className={`bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none ${compact ? 'px-3 py-2' : 'px-5 py-2.5'}`}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Suggested:</span>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={thinking}
            onClick={() => ask(prompt)}
            className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className={`border-t border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 ${compact ? 'p-2.5 rounded-b-2xl' : 'p-3.5 rounded-b-2xl'}`}>
        <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-center gap-2">
          <input
            type="text"
            placeholder={compact ? 'Ask me anything about your money…' : 'Ask about your money or account, do a quick calculation, or tell me what to do...'}
            disabled={thinking}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Message the assistant"
            className="flex-1 min-w-0 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <button
            type="submit"
            aria-label="Ask the assistant"
            disabled={!input.trim() || thinking}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span className={compact ? 'sr-only' : 'hidden sm:inline'}>Ask</span>
          </button>
        </form>
        {!compact && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 mb-0 px-1">
            Your totals are calculated here on your device. When smart AI replies are switched on, your question and a short summary of your totals (never your individual transactions) are sent to the AI service to write the reply.
          </p>
        )}
      </div>
    </div>
  );
};
