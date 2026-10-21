import { Transaction, BudgetConfig, SavingsGoal } from '../types';

export const INITIAL_BUDGET_CONFIG: BudgetConfig = {
  monthlyBudgetCents: 320000, // $3,200.00 default monthly budget
  openingBalanceCents: 450000, // $4,500.00 initial bank balance
  monthBudgets: {
    '2026-09': 300000, // $3,000.00 for September 2026
    '2026-10': 320000, // $3,200.00 for October 2026
  },
  categoryBudgets: {
    'Food and groceries': 60000, // $600.00
    'Bills and subscriptions': 150000, // $1,500.00
    'Transportation': 25000, // $250.00
    'Shopping': 40000, // $400.00
    'Entertainment': 20000, // $200.00
  },
};

export const SAMPLE_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'goal-1',
    name: 'Emergency Fund (3 Months)',
    targetCents: 1000000, // $10,000
    currentCents: 650000, // $6,500
    targetDate: '2026-12-31',
    category: 'Safety',
    color: '#10b981',
    createdAt: '2026-08-01T00:00:00Z',
  },
  {
    id: 'goal-2',
    name: 'Winter Holiday Vacation',
    targetCents: 250000, // $2,500
    currentCents: 180000, // $1,800
    targetDate: '2026-12-15',
    category: 'Travel',
    color: '#3b82f6',
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'goal-3',
    name: 'Workstation Tech Upgrade',
    targetCents: 200000, // $2,000
    currentCents: 90000, // $900
    targetDate: '2027-02-28',
    category: 'Tech',
    color: '#a855f7',
    createdAt: '2026-09-15T00:00:00Z',
  },
];

export const SAMPLE_TRANSACTIONS: Transaction[] = [
  // --- September 2026 ---
  {
    id: 'tx-sep-01',
    type: 'income',
    amountCents: 385000, // $3,850.00
    description: 'TechCorp Bi-Weekly Salary',
    category: 'Salary',
    date: '2026-09-01',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'tx-sep-02',
    type: 'expense',
    amountCents: 125000, // $1,250.00
    description: 'Apartment Rent & Management',
    category: 'Bills and subscriptions',
    date: '2026-09-02',
    createdAt: '2026-09-02T10:00:00Z',
  },
  {
    id: 'tx-sep-03',
    type: 'expense',
    amountCents: 14250, // $142.50
    description: 'Whole Foods Grocery Run',
    category: 'Food and groceries',
    date: '2026-09-04',
    createdAt: '2026-09-04T16:30:00Z',
  },
  {
    id: 'tx-sep-04',
    type: 'expense',
    amountCents: 4500, // $45.00
    description: 'Chevron Gas Station Fill-up',
    category: 'Transportation',
    date: '2026-09-06',
    createdAt: '2026-09-06T11:15:00Z',
  },
  {
    id: 'tx-sep-05',
    type: 'expense',
    amountCents: 1899, // $18.99
    description: 'Netflix Premium Subscription',
    category: 'Bills and subscriptions',
    date: '2026-09-08',
    createdAt: '2026-09-08T09:00:00Z',
  },
  {
    id: 'tx-sep-06',
    type: 'expense',
    amountCents: 8520, // $85.20
    description: 'Downtown Bistro Dinner',
    category: 'Food and groceries',
    date: '2026-09-11',
    createdAt: '2026-09-11T20:00:00Z',
  },
  {
    id: 'tx-sep-07',
    type: 'income',
    amountCents: 385000, // $3,850.00
    description: 'TechCorp Bi-Weekly Salary',
    category: 'Salary',
    date: '2026-09-15',
    createdAt: '2026-09-15T08:00:00Z',
  },
  {
    id: 'tx-sep-08',
    type: 'expense',
    amountCents: 12000, // $120.00
    description: 'Electricity & High-speed Internet',
    category: 'Bills and subscriptions',
    date: '2026-09-16',
    createdAt: '2026-09-16T14:20:00Z',
  },
  {
    id: 'tx-sep-09',
    type: 'expense',
    amountCents: 11500, // $115.00
    description: 'New Autumn Running Shoes',
    category: 'Shopping',
    date: '2026-09-18',
    createdAt: '2026-09-18T15:45:00Z',
  },
  {
    id: 'tx-sep-10',
    type: 'expense',
    amountCents: 6500, // $65.00
    description: 'Monthly Metro Pass',
    category: 'Transportation',
    date: '2026-09-20',
    createdAt: '2026-09-20T08:30:00Z',
  },
  {
    id: 'tx-sep-11',
    type: 'expense',
    amountCents: 4999, // $49.99
    description: 'TypeScript Masterclass Course',
    category: 'Education',
    date: '2026-09-22',
    createdAt: '2026-09-22T19:00:00Z',
  },
  {
    id: 'tx-sep-12',
    type: 'expense',
    amountCents: 6800, // $68.00
    description: 'Cinema Tickets & IMAX Popcorn',
    category: 'Entertainment',
    date: '2026-09-25',
    createdAt: '2026-09-25T21:00:00Z',
  },
  {
    id: 'tx-sep-13',
    type: 'expense',
    amountCents: 18530, // $185.30
    description: 'Trader Joes Restock',
    category: 'Food and groceries',
    date: '2026-09-28',
    createdAt: '2026-09-28T17:10:00Z',
  },

  // --- October 2026 (Current Month) ---
  {
    id: 'tx-oct-01',
    type: 'income',
    amountCents: 385000, // $3,850.00
    description: 'TechCorp Bi-Weekly Salary',
    category: 'Salary',
    date: '2026-10-01',
    createdAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'tx-oct-02',
    type: 'income',
    amountCents: 62000, // $620.00
    description: 'Web Development Client Freelance',
    category: 'Freelance',
    date: '2026-10-02',
    createdAt: '2026-10-02T13:00:00Z',
  },
  {
    id: 'tx-oct-03',
    type: 'expense',
    amountCents: 125000, // $1,250.00
    description: 'Apartment Rent & Management',
    category: 'Bills and subscriptions',
    date: '2026-10-02',
    createdAt: '2026-10-02T10:00:00Z',
  },
  {
    id: 'tx-oct-04',
    type: 'expense',
    amountCents: 16840, // $168.40
    description: 'Costco Wholesale Grocery Bulk',
    category: 'Food and groceries',
    date: '2026-10-03',
    createdAt: '2026-10-03T16:20:00Z',
  },
  {
    id: 'tx-oct-05',
    type: 'expense',
    amountCents: 5200, // $52.00
    description: 'Shell Gas Station Fill-up',
    category: 'Transportation',
    date: '2026-10-05',
    createdAt: '2026-10-05T09:40:00Z',
  },
  {
    id: 'tx-oct-06',
    type: 'expense',
    amountCents: 1899, // $18.99
    description: 'Netflix Premium Subscription',
    category: 'Bills and subscriptions',
    date: '2026-10-08',
    createdAt: '2026-10-08T09:00:00Z',
  },
  {
    id: 'tx-oct-07',
    type: 'expense',
    amountCents: 1199, // $11.99
    description: 'Spotify Family Plan',
    category: 'Bills and subscriptions',
    date: '2026-10-08',
    createdAt: '2026-10-08T09:05:00Z',
  },
  {
    id: 'tx-oct-08',
    type: 'expense',
    amountCents: 24500, // $245.00
    description: 'Warm Winter Jacket & Apparel',
    category: 'Shopping',
    date: '2026-10-09',
    createdAt: '2026-10-09T14:15:00Z',
  },
  {
    id: 'tx-oct-09',
    type: 'expense',
    amountCents: 9450, // $94.50
    description: 'Italian Trattoria Family Dinner',
    category: 'Food and groceries',
    date: '2026-10-10',
    createdAt: '2026-10-10T19:45:00Z',
  },
  {
    id: 'tx-oct-10',
    type: 'expense',
    amountCents: 3500, // $35.00
    description: 'Concert Livestream Ticket',
    category: 'Entertainment',
    date: '2026-10-11',
    createdAt: '2026-10-11T20:30:00Z',
  },
  {
    id: 'tx-oct-11',
    type: 'expense',
    amountCents: 4500, // $45.00
    description: 'Audiobook Library Subscription',
    category: 'Education',
    date: '2026-10-11',
    createdAt: '2026-10-11T11:00:00Z',
  },
];
