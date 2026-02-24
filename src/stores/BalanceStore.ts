// src/stores/BalanceStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import { api } from '../lib/api'
import { mockHandlers } from '../mocks/handlers'
import type { Balance, Settlement, SettlementSuggestion } from '../types'
import type { RootStore } from './RootStore'

const USE_MOCK = true

export class BalanceStore {
  balances: Balance[] = []
  suggestions: SettlementSuggestion[] = []
  settlements: Settlement[] = []
  isLoading = false
  private root: RootStore

  constructor(root: RootStore) {
    this.root = root
    makeAutoObservable(this)
  }

  // What the current user owes (negative net)
  get myOwed() {
    const uid = this.root.auth.currentUser?.id
    return this.balances.find(b => b.userId === uid)?.netAmount ?? 0
  }

  // Suggestions where current user is the payer
  get myPendingPayments() {
    const uid = this.root.auth.currentUser?.id
    return this.suggestions.filter(s => s.fromUserId === uid)
  }

  async fetchBalances(tripId: string) {
    runInAction(() => { this.isLoading = true })
    try {
      if (USE_MOCK) {
        const { balances, suggestions } = await mockHandlers.getBalances(tripId)
        runInAction(() => { this.balances = balances; this.suggestions = suggestions })
      } else {
        const [bal, sug] = await Promise.all([
          api.get<Balance[]>(`/trips/${tripId}/balances`),
          api.get<SettlementSuggestion[]>(`/trips/${tripId}/settle`),
        ])
        runInAction(() => { this.balances = bal.data; this.suggestions = sug.data })
      }
    } finally {
      runInAction(() => { this.isLoading = false })
    }
  }

  async fetchSettlements(tripId: string) {
    try {
      if (USE_MOCK) {
        const data = await mockHandlers.getSettlements(tripId)
        runInAction(() => { this.settlements = data })
      } else {
        const res = await api.get<Settlement[]>(`/trips/${tripId}/settlements`)
        runInAction(() => { this.settlements = res.data })
      }
    } catch {
      // non-fatal — activity tab just shows empty
    }
  }

  async recordSettlement(
    tripId: string,
    payload: Omit<Settlement, 'id' | 'tripId' | 'confirmedAt'>
  ) {
    // Optimistic add
    const optimistic: Settlement = {
      ...payload,
      id: 'optimistic-' + Date.now(),
      tripId,
      confirmedAt: new Date().toISOString(),
    }
    runInAction(() => { this.settlements = [...this.settlements, optimistic] })

    try {
      if (USE_MOCK) {
        const confirmed = await mockHandlers.recordSettlement(tripId, payload)
        runInAction(() => {
          this.settlements = this.settlements.map(s =>
            s.id === optimistic.id ? confirmed : s
          )
        })
      } else {
        const res = await api.post<Settlement>(`/trips/${tripId}/settlements`, payload)
        runInAction(() => {
          this.settlements = this.settlements.map(s =>
            s.id === optimistic.id ? res.data : s
          )
        })
      }
    } catch {
      // Rollback on failure
      runInAction(() => {
        this.settlements = this.settlements.filter(s => s.id !== optimistic.id)
      })
    }
  }

  // Called by Supabase Realtime hook when DB changes
  updateFromRealtime(tripId: string) {
    this.fetchBalances(tripId)
    this.fetchSettlements(tripId)
  }
}
