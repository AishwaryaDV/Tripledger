// src/mocks/handlers.ts
import { MOCK_TRIPS, MOCK_EXPENSES, MOCK_BALANCES, MOCK_SUGGESTIONS, MOCK_SETTLEMENTS, MOCK_NOTES } from './data'
import type { Trip, Expense, Balance, SettlementSuggestion, Settlement, TripMember, Note } from '../types'

let notes = [...MOCK_NOTES]

// In-memory stores so mutations persist within a session
let settlements = [...MOCK_SETTLEMENTS]
// Mutable trip objects so reopenTrip/createTrip/joinTrip are reflected in subsequent calls
const mutableTrips: Trip[] = MOCK_TRIPS.map(t => ({ ...t }))

const generateJoinCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase()

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

  async createTrip(payload: { name: string; description?: string; currencies: string[]; baseCurrency: string }, creator: TripMember): Promise<Trip> {
    await delay(500)
    const newTrip: Trip = {
      id: 'trip-' + Date.now(),
      name: payload.name,
      description: payload.description,
      currencies: payload.currencies,
      baseCurrency: payload.baseCurrency,
      members: [creator],
      isSettled: false,
      createdAt: new Date().toISOString(),
      joinCode: generateJoinCode(),
    }
    mutableTrips.push(newTrip)
    return { ...newTrip }
  },

  async joinTrip(code: string, joiner: TripMember): Promise<Trip> {
    await delay(400)
    const trip = mutableTrips.find(t => t.joinCode === code.toUpperCase())
    if (!trip) throw new Error('Trip not found. Check the code and try again.')
    const alreadyMember = trip.members.some(m => m.userId === joiner.userId)
    if (!alreadyMember) trip.members.push(joiner)
    return { ...trip }
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

  async addExpense(tripId: string, payload: Partial<Expense>): Promise<Expense> {
    await delay(600) // slightly longer to make the optimistic update visible
    return { ...payload, tripId, id: 'exp-' + Date.now() } as Expense
  },

  async getSettlements(tripId: string): Promise<Settlement[]> {
    await delay()
    return settlements.filter(s => s.tripId === tripId)
  },

  async getNotes(tripId: string): Promise<Note[]> {
    await delay()
    return notes.filter(n => n.tripId === tripId)
  },

  async addNote(tripId: string, authorId: string, authorName: string, content: string): Promise<Note> {
    await delay(300)
    const note: Note = { id: 'note-' + Date.now(), tripId, authorId, authorName, content, createdAt: new Date().toISOString() }
    notes = [...notes, note]
    return note
  },

  async editNote(noteId: string, content: string): Promise<Note> {
    await delay(300)
    notes = notes.map(n => n.id === noteId ? { ...n, content, updatedAt: new Date().toISOString() } : n)
    return notes.find(n => n.id === noteId)!
  },

  async deleteNote(noteId: string): Promise<void> {
    await delay(300)
    notes = notes.filter(n => n.id !== noteId)
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
