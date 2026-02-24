// src/stores/RootStore.ts
import { AuthStore } from './AuthStore'
import { TripStore } from './TripStore'
import { ExpenseStore } from './ExpenseStore'
import { BalanceStore } from './BalanceStore'
import { CurrencyStore } from './CurrencyStore'

export class RootStore {
  auth = new AuthStore(this)
  trips = new TripStore(this)
  expenses = new ExpenseStore(this)
  balances = new BalanceStore(this)
  currency = new CurrencyStore()
}

// Singleton — import this everywhere
export const rootStore = new RootStore()
