// src/stores/RootStore.ts
import { AuthStore } from './AuthStore'
import { TripStore } from './TripStore'
import { ExpenseStore } from './ExpenseStore'
import { BalanceStore } from './BalanceStore'
import { CurrencyStore } from './CurrencyStore'
import { NoteStore } from './NoteStore'

export class RootStore {
  auth = new AuthStore(this)
  trips = new TripStore(this)
  expenses = new ExpenseStore(this)
  balances = new BalanceStore(this)
  currency = new CurrencyStore()
  notes = new NoteStore(this)
}

// Singleton — import this everywhere
export const rootStore = new RootStore()
