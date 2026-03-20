// src/stores/ExpenseStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import { api } from '../lib/api'
import type { Expense } from '../types'
import type { RootStore } from './RootStore'

export class ExpenseStore {
  expenses: Expense[] = []
  isLoading = false
  error: string | null = null
  private currentTripId: string | null = null
  // @ts-ignore - root will be used in future
  private _root: RootStore

  constructor(root: RootStore) {
    this._root = root
    makeAutoObservable(this)
  }

  get totalAmount() {
    return this.expenses.reduce((sum, e) => sum + e.amountBase, 0)
  }

  get byCategory() {
    return this.expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amountBase
      return acc
    }, {} as Record<string, number>)
  }

  async fetchExpenses(tripId: string, force = false) {
    if (this.currentTripId === tripId && !force) return

    runInAction(() => { this.isLoading = true })
    try {
      const data = (await api.get<Expense[]>(`/trips/${tripId}/expenses`)).data
      runInAction(() => { this.expenses = data; this.currentTripId = tripId })
    } catch (e: any) {
      runInAction(() => { this.error = e.message })
    } finally {
      runInAction(() => { this.isLoading = false })
    }
  }

  // Optimistic add — shows instantly, rolls back if API fails
  async addExpense(tripId: string, payload: Partial<Expense>) {
    const temp = { ...payload, id: 'temp-' + Date.now() } as Expense
    runInAction(() => { this.expenses.unshift(temp) })

    try {
      const data = (await api.post<Expense>(`/trips/${tripId}/expenses`, payload)).data
      runInAction(() => {
        const idx = this.expenses.findIndex(e => e.id === temp.id)
        this.expenses[idx] = data
      })
      return data
    } catch (e: any) {
      runInAction(() => {
        this.expenses = this.expenses.filter(e => e.id !== temp.id)
        this.error = e.message
      })
    }
  }

  // Optimistic edit — updates instantly, rolls back if API fails
  async editExpense(tripId: string, expenseId: string, payload: Partial<Expense>) {
    const idx = this.expenses.findIndex(e => e.id === expenseId)
    if (idx === -1) return
    const snapshot = { ...this.expenses[idx] }
    runInAction(() => { this.expenses[idx] = { ...snapshot, ...payload } })

    try {
      const data = (await api.put<Expense>(`/trips/${tripId}/expenses/${expenseId}`, payload)).data
      runInAction(() => { this.expenses[idx] = data })
    } catch (e: any) {
      runInAction(() => { this.expenses[idx] = snapshot; this.error = e.message })
    }
  }

  // Optimistic delete — removes instantly, restores if API fails
  async deleteExpense(tripId: string, expenseId: string) {
    const snapshot = this.expenses.find(e => e.id === expenseId)
    runInAction(() => { this.expenses = this.expenses.filter(e => e.id !== expenseId) })

    try {
      await api.delete(`/trips/${tripId}/expenses/${expenseId}`)
    } catch (e: any) {
      runInAction(() => {
        if (snapshot) this.expenses.push(snapshot)
        this.error = e.message
      })
    }
  }
}
