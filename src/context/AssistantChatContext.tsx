import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useExpense } from './ExpenseContext';
import { answerQuestionDetailed, AssistantContext, AssistantAction } from '../services/assistant';
import { askAI, buildSummary } from '../services/aiChat';

/**
 * The assistant conversation, kept in one place so the AI page and the side popup show the same chat.
 * It survives moving between pages, and is reset when a different account signs in.
 */

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const QUICK_PROMPTS = [
  'What is my name?',
  'How much did I spend this month?',
  'What is 15% of 2000?',
  'Did I spend more than last month?',
  'Am I within my budget?',
  'Add an expense',
  'Turn on dark mode',
  'How do I export my data?',
];

interface AssistantChatValue {
  messages: ChatMessage[];
  thinking: boolean;
  send: (query: string) => Promise<void>;
  clear: () => void;
  /** Is the side popup open? (It is only shown on pages other than the AI page.) */
  popupOpen: boolean;
  openPopup: () => void;
  closePopup: () => void;
  /** Move the chat from the AI page into the side popup and go back to the dashboard */
  popOut: () => void;
  /** Move the chat from the popup to the full AI page */
  expand: () => void;
}

const Ctx = createContext<AssistantChatValue | undefined>(undefined);

const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const welcome = (month: string): ChatMessage => ({
  id: 'welcome',
  sender: 'assistant',
  text: `Hi! I'm your AI Financial Assistant. 👋\n\nI can answer questions about your money, your account and quick maths, and I can do things for you like adding an expense, opening a page, switching currency or turning on dark mode. For example: *"How much did I spend last month?"*, *"What's my name?"*, *"What's 15% of 2000?"* or *"I spent 250 on lunch"*.\n\nI can only help with things related to this app. I'm looking at **${month}** unless you name another time.`,
  timestamp: stamp(),
});

export const AssistantChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    monthSummary, categorySpendings, transactions, selectedMonth, budgetConfig, savingsGoals,
    setIsSmartEntryOpen, setSmartEntryText, setIsQuickAddOpen, setIsShareReportOpen, setActiveTab, activeTab, setCurrency, setDark,
    convertAmount, exchangeRateNote, currentUser, currency,
  } = useExpense();
  const owner = currentUser?.id ?? 'guest';

  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcome(selectedMonth)]);
  const messagesRef = useRef(messages);
  const [thinking, setThinking] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  const setChat = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);
  const push = useCallback((msg: ChatMessage) => setChat([...messagesRef.current, msg]), [setChat]);

  // A different account (or guest) signing in starts a fresh conversation
  const lastOwner = useRef(owner);
  useEffect(() => {
    if (lastOwner.current === owner) return;
    lastOwner.current = owner;
    setChat([welcome(selectedMonth)]);
    setPopupOpen(false);
    setThinking(false);
  }, [owner, selectedMonth, setChat]);

  // The few safe things the assistant can do for you (it never deletes, resets or signs out)
  const runAction = useCallback((action: AssistantAction) => {
    if (action.type === 'navigate') {
      // Leaving the AI page: keep the chat with you in the side popup so you can carry on talking
      if (activeTab === 'ai') setPopupOpen(true);
      setActiveTab(action.tab);
    } else if (action.type === 'open-add') setIsQuickAddOpen(true);
    else if (action.type === 'smart-entry') {
      setSmartEntryText(action.text);
      setIsSmartEntryOpen(true);
    } else if (action.type === 'share-report') setIsShareReportOpen(true);
    else if (action.type === 'set-currency') setCurrency(action.code);
    else if (action.type === 'dark-mode') setDark(action.value === 'toggle' ? (d) => !d : action.value);
  }, [activeTab, setActiveTab, setIsQuickAddOpen, setIsShareReportOpen, setSmartEntryText, setIsSmartEntryOpen, setCurrency, setDark]);

  const send = useCallback(async (query: string) => {
    const text = query.trim();
    if (!text || thinking) return;
    push({ id: `msg-${Date.now()}-user`, sender: 'user', text, timestamp: stamp() });
    setThinking(true);

    // 1) The app works out the answer itself (profile, maths, actions, exact money figures), so nothing is made up
    const ctx: AssistantContext = {
      previousQuestion: [...messagesRef.current].reverse().find((m) => m.sender === 'user' && m.text !== text)?.text,
      monthSummary, categorySpendings, transactions, selectedMonth, budgetConfig, savingsGoals, currency, exchangeRateNote,
      convertCurrency: convertAmount,
      profile: currentUser
        ? { name: currentUser.name, username: currentUser.username, email: currentUser.email, role: currentUser.role, createdAt: currentUser.createdAt, lastLoginAt: currentUser.lastLoginAt, currency: currentUser.currency, isGuest: false }
        : { name: 'Guest', username: '', isGuest: true },
    };
    const local = answerQuestionDetailed(text, ctx);

    // 2) A real AI (if it has been set up) makes chit-chat and money answers sound natural.
    //    Profile, maths, app help and out-of-scope replies stay local, so personal details never leave the app.
    let reply = local.text;
    if (local.kind === 'chat' || local.kind === 'data' || local.kind === 'unclear') {
      const history = messagesRef.current.map((m) => ({ role: m.sender, text: m.text })).slice(-8);
      const ai = await askAI({ question: text, history, facts: local.kind === 'data' ? local.text : undefined, summary: buildSummary(ctx, currency) });
      if (ai.ok) reply = ai.text;
      else if (ai.reason === 'limit' && ai.message) reply = `${ai.message}\n\n${local.text}`;
    }

    push({ id: `msg-${Date.now()}-ai`, sender: 'assistant', text: reply, timestamp: stamp() });
    setThinking(false);
    if (local.action) runAction(local.action);
  }, [thinking, push, monthSummary, categorySpendings, transactions, selectedMonth, budgetConfig, savingsGoals, currency, exchangeRateNote, convertAmount, currentUser, runAction]);

  const clear = useCallback(() => {
    setChat([{ id: 'reset', sender: 'assistant', text: `Chat reset. Ask me anything about your spending, income, budget or savings goals in **${selectedMonth}**!`, timestamp: stamp() }]);
  }, [selectedMonth, setChat]);

  const value = useMemo<AssistantChatValue>(() => ({
    messages, thinking, send, clear, popupOpen,
    openPopup: () => setPopupOpen(true),
    closePopup: () => setPopupOpen(false),
    popOut: () => { setPopupOpen(true); setActiveTab('dashboard'); },
    expand: () => { setPopupOpen(false); setActiveTab('ai'); },
  }), [messages, thinking, send, clear, popupOpen, setActiveTab]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAssistantChat = (): AssistantChatValue => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAssistantChat must be used within an AssistantChatProvider');
  return c;
};
