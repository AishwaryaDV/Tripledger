// src/mocks/data.ts
import type { User, Trip, Expense, Balance, SettlementSuggestion, Settlement, Note } from '../types'

export const MOCK_USERS: User[] = [
  { id: 'user-1', email: 'you@example.com', displayName: 'You', defaultCurrency: 'INR' },
  { id: 'user-2', email: 'priya@example.com', displayName: 'Priya', defaultCurrency: 'INR' },
  { id: 'user-3', email: 'rahul@example.com', displayName: 'Rahul', defaultCurrency: 'INR' },
]

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'trip-1', name: 'Goa 2026', baseCurrency: 'INR',
    currencies: ['INR', 'USD', 'EUR'], isSettled: false,
    description: 'Beach trip with the squad',
    createdAt: '2026-03-01T00:00:00Z',
    joinCode: 'GOA26X',
    members: [
      { userId: 'user-1', displayName: 'You', role: 'owner' },
      { userId: 'user-2', displayName: 'Priya', role: 'member' },
      { userId: 'user-3', displayName: 'Rahul', role: 'member' },
    ],
  },
  {
    id: 'trip-3', name: 'Dubai 2026', baseCurrency: 'AED',
    currencies: ['AED', 'INR'], isSettled: false,
    description: 'Long weekend in the desert',
    createdAt: '2026-05-10T00:00:00Z',
    joinCode: 'DXB26Z',
    members: [
      { userId: 'user-1', displayName: 'You', role: 'owner' },
      { userId: 'user-2', displayName: 'Priya', role: 'member' },
    ],
  },
  {
    id: 'trip-2', name: 'Bangkok 2025', baseCurrency: 'USD',
    currencies: ['USD', 'THB'], isSettled: true,
    description: 'All settled up!', createdAt: '2025-11-10T00:00:00Z',
    joinCode: 'BKK25Y',
    members: [{ userId: 'user-1', displayName: 'You', role: 'owner' }],
  },
]

export const MOCK_EXPENSES: Expense[] = [
  {
    id: 'exp-1', tripId: 'trip-1', paidBy: 'user-1',
    title: 'Hotel Checkout', amount: 9000, currency: 'INR',
    amountBase: 9000, exchangeRate: 1, category: 'accommodation',
    splitType: 'equal', expenseDate: '2026-03-15',
    splits: [
      { userId: 'user-1', amountOwed: 3000, isSettled: true },
      { userId: 'user-2', amountOwed: 3000, isSettled: false },
      { userId: 'user-3', amountOwed: 3000, isSettled: false },
    ],
  },
  {
    id: 'exp-2', tripId: 'trip-1', paidBy: 'user-2',
    title: 'Beach Shack Dinner', amount: 42, currency: 'USD',
    amountBase: 3487, exchangeRate: 83.02, category: 'food',
    splitType: 'equal', expenseDate: '2026-03-16',
    splits: [
      { userId: 'user-1', amountOwed: 1162.33, isSettled: false },
      { userId: 'user-2', amountOwed: 1162.33, isSettled: true },
      { userId: 'user-3', amountOwed: 1162.34, isSettled: false },
    ],
  },
  {
    id: 'exp-3', tripId: 'trip-3', paidBy: 'user-1',
    title: 'Burj Khalifa Tickets', amount: 300, currency: 'AED',
    amountBase: 300, exchangeRate: 1, category: 'activities',
    splitType: 'equal', expenseDate: '2026-05-11',
    splits: [
      { userId: 'user-1', amountOwed: 150, isSettled: true },
      { userId: 'user-2', amountOwed: 150, isSettled: false },
    ],
  },
  {
    id: 'exp-4', tripId: 'trip-3', paidBy: 'user-2',
    title: 'Desert Safari', amount: 5800, currency: 'INR',
    amountBase: 237.7, exchangeRate: 0.041, category: 'activities',
    splitType: 'equal', expenseDate: '2026-05-12',
    splits: [
      { userId: 'user-1', amountOwed: 118.85, isSettled: false },
      { userId: 'user-2', amountOwed: 118.85, isSettled: true },
    ],
  },
]

export const MOCK_BALANCES: Balance[] = [
  { userId: 'user-1', displayName: 'You', netAmount: 4162.33 }, // is owed
  { userId: 'user-2', displayName: 'Priya', netAmount: -2000 }, // owes money
  { userId: 'user-3', displayName: 'Rahul', netAmount: -2162.33 }, // owes money
]

export const MOCK_SUGGESTIONS: SettlementSuggestion[] = [
  { fromUserId: 'user-3', toUserId: 'user-1', amount: 2162.33, currency: 'INR' },
  { fromUserId: 'user-2', toUserId: 'user-1', amount: 2000, currency: 'INR' },
]

export const MOCK_NOTES: Note[] = [
  {
    id: 'note-1', tripId: 'trip-1', authorId: 'user-1', authorName: 'You',
    content: 'Remember to split the airport taxi separately — Rahul took a different cab.',
    createdAt: '2026-03-15T08:00:00Z',
  },
  {
    id: 'note-2', tripId: 'trip-1', authorId: 'user-2', authorName: 'Priya',
    content: 'I'll handle the dinner reservation deposits. Deduct from my balance when settling.',
    createdAt: '2026-03-15T09:30:00Z',
  },
  {
    id: 'note-3', tripId: 'trip-3', authorId: 'user-1', authorName: 'You',
    content: 'Dubai Mall parking is free if you spend over 200 AED — keep receipts.',
    createdAt: '2026-05-10T14:00:00Z',
  },
]

export const MOCK_SETTLEMENTS: Settlement[] = [
  {
    id: 'settle-1',
    tripId: 'trip-1',
    fromUserId: 'user-2',
    toUserId: 'user-1',
    amount: 1000,
    currency: 'INR',
    method: 'UPI',
    confirmedAt: '2026-03-17T10:30:00Z',
    isPartial: true,
  },
  {
    id: 'settle-2',
    tripId: 'trip-1',
    fromUserId: 'user-3',
    toUserId: 'user-1',
    amount: 2162.33,
    currency: 'INR',
    method: 'Cash',
    confirmedAt: '2026-03-17T14:00:00Z',
    isPartial: false,
  },
]
