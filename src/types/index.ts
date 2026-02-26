// src/types/index.ts

export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'AUD' | 'JPY' | string

export type CircleType = 'trip' | 'personal' | 'household' | 'event'

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares'

export type ExpenseCategory =
  | 'food' | 'transport' | 'accommodation' | 'activities' | 'other'

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  defaultCurrency: Currency
}

export interface TripMember {
  userId: string
  displayName: string
  avatarUrl?: string
  role: 'owner' | 'member' | 'viewer'
}

export interface Trip {
  id: string
  name: string
  description?: string
  circleType: CircleType
  currencies: Currency[]
  baseCurrency: Currency
  members: TripMember[]
  isSettled: boolean
  createdAt: string
  joinCode: string
}

export interface ExpenseSplit {
  userId: string
  amountOwed: number // in base currency
  shareValue?: number // percentage or share count
  isSettled: boolean
}

export interface Expense {
  id: string
  tripId: string
  paidBy: string // userId
  title: string
  amount: number // in original currency
  currency: Currency
  amountBase: number // converted to base currency
  exchangeRate: number
  category: ExpenseCategory
  splitType: SplitType
  splits: ExpenseSplit[]
  receiptUrl?: string
  expenseDate: string
  notes?: string
}

export interface Balance {
  userId: string
  displayName: string
  netAmount: number // positive = owed money, negative = owes money
}

export interface SettlementSuggestion {
  fromUserId: string
  toUserId: string
  amount: number
  currency: Currency
}

export interface Settlement {
  id: string
  tripId: string
  fromUserId: string
  toUserId: string
  amount: number
  currency: Currency
  method?: string
  confirmedAt?: string
  isPartial: boolean
}

export interface Note {
  id: string
  tripId: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
  updatedAt?: string
}
