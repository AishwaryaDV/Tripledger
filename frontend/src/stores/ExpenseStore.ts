// src/stores/ExpenseStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import { api } from '../lib/api'
import { mockHandlers } from '../mocks/handlers'
import type { Expense } from '../types'
import type { RootStore } from './RootStore'

const USE_MOCK = true

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
      const data = USE_MOCK
        ? await mockHandlers.getExpenses(tripId) // mock
        : (await api.get<Expense[]>(`/trips/${tripId}/expenses`)).data // real
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
    runInAction(() => { this.expenses.unshift(temp) }) // show immediately

    try {
      const data = USE_MOCK
        ? await mockHandlers.addExpense(tripId, payload) // mock
        : (await api.post<Expense>(`/trips/${tripId}/expenses`, payload)).data // real
      runInAction(() => {
        const idx = this.expenses.findIndex(e => e.id === temp.id)
        this.expenses[idx] = data // replace temp with real data
      })
      return data
    } catch (e: any) {
      runInAction(() => {
        this.expenses = this.expenses.filter(e => e.id !== temp.id) // rollback
        this.error = e.message
      })
    }
  }

  // Optimistic edit — updates instantly, rolls back if API fails
  async editExpense(expenseId: string, payload: Partial<Expense>) {
    const idx = this.expenses.findIndex(e => e.id === expenseId)
    if (idx === -1) return
    const snapshot = { ...this.expenses[idx] }
    runInAction(() => { this.expenses[idx] = { ...snapshot, ...payload } })

    try {
      const data = USE_MOCK
        ? await mockHandlers.editExpense(expenseId, payload)
        : (await api.put<Expense>(`/expenses/${expenseId}`, payload)).data
      runInAction(() => { this.expenses[idx] = data })
    } catch (e: any) {
      runInAction(() => { this.expenses[idx] = snapshot; this.error = e.message })
    }
  }

  // Optimistic delete — removes instantly, restores if API fails
  async deleteExpense(id: string) {
    const snapshot = this.expenses.find(e => e.id === id)
    runInAction(() => { this.expenses = this.expenses.filter(e => e.id !== id) })

    try {
      if (USE_MOCK) await mockHandlers.deleteExpense(id)
      else await api.delete(`/expenses/${id}`)
    } catch (e: any) {
      runInAction(() => {
        if (snapshot) this.expenses.push(snapshot)
        this.error = e.message
      })
    }
  }
}
