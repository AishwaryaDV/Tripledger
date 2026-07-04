// src/stores/BalanceStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import { api } from '../lib/api'
import type { Balance, Settlement, SettlementSuggestion } from '../types'
import type { RootStore } from './RootStore'

export class BalanceStore {
  balances: Balance[] = []
  suggestions: SettlementSuggestion[] = []
  settlements: Settlement[] = []
  isLoading = false
  error: string | null = null
  private currentTripId: string | null = null
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

  // Drop the previous trip's data when switching trips so it never renders
  // under the new trip; same-trip refetches keep showing current data (QA H2).
  private switchTrip(tripId: string) {
    if (this.currentTripId === tripId) return
    this.currentTripId = tripId
    this.balances = []
    this.suggestions = []
    this.settlements = []
  }

  async fetchBalances(tripId: string) {
    runInAction(() => { this.switchTrip(tripId); this.isLoading = true; this.error = null })
    try {
      const [bal, sug] = await Promise.all([
        api.get<Balance[]>(`/trips/${tripId}/balances`),
        api.get<SettlementSuggestion[]>(`/trips/${tripId}/settle`),
      ])
      runInAction(() => { this.balances = bal.data; this.suggestions = sug.data })
    } catch (e: any) {
      runInAction(() => { this.error = e?.response?.data?.detail ?? e.message ?? 'Failed to load balances' })
    } finally {
      runInAction(() => { this.isLoading = false })
    }
  }

  async fetchSettlements(tripId: string) {
    runInAction(() => this.switchTrip(tripId))
    try {
      const res = await api.get<Settlement[]>(`/trips/${tripId}/settlements`)
      runInAction(() => { this.settlements = res.data })
    } catch {
      // non-fatal — activity tab just shows empty
    }
  }

  async recordSettlement(
    tripId: string,
    payload: Omit<Settlement, 'id' | 'tripId' | 'confirmedAt'>
  ) {
    const optimistic: Settlement = {
      ...payload,
      id: 'optimistic-' + Date.now(),
      tripId,
      confirmedAt: new Date().toISOString(),
    }
    runInAction(() => { this.settlements = [...this.settlements, optimistic] })

    try {
      const res = await api.post<Settlement>(`/trips/${tripId}/settlements`, payload)
      runInAction(() => {
        this.settlements = this.settlements.map(s =>
          s.id === optimistic.id ? res.data : s
        )
      })
      await this.fetchBalances(tripId)
    } catch (e) {
      runInAction(() => {
        this.settlements = this.settlements.filter(s => s.id !== optimistic.id)
      })
      throw e
    }
  }

  // Called by Supabase Realtime hook when DB changes
  updateFromRealtime(tripId: string) {
    this.fetchBalances(tripId)
    this.fetchSettlements(tripId)
  }
}
