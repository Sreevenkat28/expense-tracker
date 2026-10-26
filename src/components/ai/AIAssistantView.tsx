import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wand2,
  RotateCcw,
} from 'lucide-react';
import { useExpense } from '../../context/ExpenseContext';
import { answerQuestionDetailed, AssistantContext } from '../../services/assistant';
import { askAI, buildSummary } from '../../services/aiChat';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

/** Shows **bold** and *italic* from the assistant's answers as real formatting instead of raw asterisks. */
const RichText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part, i) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
      return <React.Fragment key={i}>{part}</React.Fragment>;
    })}
  </>
);

export const AIAssistantView: React.FC = () => {
  const {
    monthSummary,
    categorySpendings,
    transactions,
    selectedMonth,
    budgetConfig,
    savingsGoals,
    setIsSmartEntryOpen,
    currency,
  } = useExpense();

  const [questionInput, setQuestionInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hi! I'm your AI Financial Assistant. 👋\n\nYou can chat with me normally, or ask about your money, for example *"How much did I spend on food last month?"* or *"Can I afford 5000 this month?"*. I'm looking at **${selectedMonth}** unless you name another time (today, this week, last month, a month name).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  // Keep the newest message in view
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, thinking]);

  const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleAsk = async (query: string) => {
    const text = query.trim();
    if (!text || thinking) return;

    setMessages((prev) => [...prev, { id: `msg-${Date.now()}-user`, sender: 'user', text, timestamp: stamp() }]);
    setQuestionInput('');
    setThinking(true);

    // 1) The app works out the exact numbers itself, so nothing can be made up
    const ctx: AssistantContext = {
      previousQuestion: [...messages].reverse().find((m) => m.sender === 'user')?.text,
      monthSummary,
      categorySpendings,
      transactions,
      selectedMonth,
      budgetConfig,
      savingsGoals,
    };
    const local = answerQuestionDetailed(text, ctx);

    // 2) A real AI (if it has been set up) turns that into a natural reply; otherwise use the built-in one
    const history = messages.map((m) => ({ role: m.sender, text: m.text })).slice(-8);
    const ai = await askAI({
      question: text,
      history,
      facts: local.understood && !local.smallTalk ? local.text : undefined,
      summary: buildSummary(ctx, currency),
    });

    let reply = local.text;
    if (ai.ok) reply = ai.text;
    else if (ai.reason === 'limit' && ai.message) reply = `${ai.message}\n\n${local.text}`;

    setMessages((prev) => [...prev, { id: `msg-${Date.now()}-ai`, sender: 'assistant', text: reply, timestamp: stamp() }]);
    setThinking(false);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'reset',
        sender: 'assistant',
        text: `Chat reset. Ask me any question about your spending, income, budget, or savings goals in **${selectedMonth}**!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const quickPrompts = [
    'How much did I spend this month?',
    'How much did I spend today?',
    'What is my highest expense?',
    'Did I spend more than last month?',
    'Am I within my budget?',
    'How much did I spend on food?',
    'Where did most of my money go?',
    'How are my savings goals doing?',
  ];

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
              Grounded
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ask questions about your finances, analyze spending habits, and smart-record transactions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSmartEntryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-xl transition-all border border-indigo-200 dark:border-indigo-800 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Open Smart Entry</span>
          </button>
          <button
            onClick={handleClearChat}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Reset Chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grounding Notice */}
      <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40 rounded-2xl flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
          <span className="font-bold">Strict Mathematical Integrity:</span> All answers are calculated directly from your recorded transactions for <strong>{selectedMonth}</strong>. As required by financial rules, the assistant never fabricates totals or guesses numbers.
        </div>
      </div>

      {/* Chat Area Container */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col h-[520px]">
        {/* Messages Log */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-xl rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    isUser
                      ? 'bg-slate-900 dark:bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-600/60'
                  }`}
                >
                  {isUser ? msg.text : <RichText text={msg.text} />}
                  <span
                    className={`block text-[10px] mt-1.5 ${
                      isUser ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}
          {thinking && (
            <div className="flex gap-3 justify-start" aria-live="polite">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-2xl rounded-tl-none px-4 py-3 text-xs sm:text-sm bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="ml-1">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Suggested:
          </span>
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={thinking}
              onClick={() => handleAsk(prompt)}
              className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3.5 border-t border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 rounded-b-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(questionInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Say hi or ask about your spending, income, budget or savings..."
              disabled={thinking}
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={!questionInput.trim() || thinking}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 mb-0 px-1">
            Your totals are calculated here on your device. When smart AI replies are switched on, your question and a short summary of your totals (never your individual transactions) are sent to the AI service to write the reply.
          </p>
        </div>
      </div>
    </div>
  );
};
