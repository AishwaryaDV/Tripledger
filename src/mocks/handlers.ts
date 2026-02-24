// src/mocks/handlers.ts
import { MOCK_TRIPS, MOCK_EXPENSES, MOCK_BALANCES, MOCK_SUGGESTIONS, MOCK_SETTLEMENTS } from './data'
import type { Trip, Expense, Balance, SettlementSuggestion, Settlement } from '../types'

// In-memory stores so mutations persist within a session
let settlements = [...MOCK_SETTLEMENTS]
// Mutable trip objects so reopenTrip is reflected in subsequent getTrip calls
const mutableTrips = MOCK_TRIPS.map(t => ({ ...t }))

// Simulates network latency so loading spinners are visible
const delay = (ms = 300) => new Promise(res => setTimeout(res, ms))

export const mockHandlers = {
  async getTrips(): Promise<Trip[]> {
    await delay()
    return [...mutableTrips]
  },

  async getTrip(id: string): Promise<Trip> {
    await delay()
    return mutableTrips.find(t => t.id === id)!
  },

  async reopenTrip(id: string): Promise<Trip> {
    await delay()
    const trip = mutableTrips.find(t => t.id === id)!
    trip.isSettled = false
    return { ...trip }
  },

  async getExpenses(tripId: string): Promise<Expense[]> {
    await delay()
    return MOCK_EXPENSES.filter(e => e.tripId === tripId)
  },

  async getBalances(_tripId: string): Promise<{ balances: Balance[], suggestions: SettlementSuggestion[] }> {
    await delay()
    return { balances: MOCK_BALANCES, suggestions: MOCK_SUGGESTIONS }
  },

  async addExpense(_tripId: string, payload: Partial<Expense>): Promise<Expense> {
    await delay(600) // slightly longer to make the optimistic update visible
    return { ...payload, id: 'exp-' + Date.now() } as Expense
  },

  async getSettlements(tripId: string): Promise<Settlement[]> {
    await delay()
    return settlements.filter(s => s.tripId === tripId)
  },

  async recordSettlement(tripId: string, payload: Omit<Settlement, 'id' | 'tripId' | 'confirmedAt'>): Promise<Settlement> {
    await delay(500)
    const newSettlement: Settlement = {
      ...payload,
      id: 'settle-' + Date.now(),
      tripId,
      confirmedAt: new Date().toISOString(),
    }
    settlements = [...settlements, newSettlement]
    return newSettlement
  },
}
