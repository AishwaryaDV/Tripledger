// src/mocks/data.ts
import type { User, Trip, Expense, Balance, SettlementSuggestion } from '../types'

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
    members: [
      { userId: 'user-1', displayName: 'You', role: 'owner' },
      { userId: 'user-2', displayName: 'Priya', role: 'member' },
      { userId: 'user-3', displayName: 'Rahul', role: 'member' },
    ],
  },
  {
    id: 'trip-2', name: 'Bangkok 2025', baseCurrency: 'USD',
    currencies: ['USD', 'THB'], isSettled: true,
    description: 'All settled up!', createdAt: '2025-11-10T00:00:00Z',
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
