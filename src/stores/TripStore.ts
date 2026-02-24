// src/stores/TripStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import { api } from '../lib/api'
import { mockHandlers } from '../mocks/handlers'
import type { Trip } from '../types'
import type { RootStore } from './RootStore'

const USE_MOCK = true

export class TripStore {
  trips: Trip[] = []
  currentTrip: Trip | null = null
  isLoading = false
  error: string | null = null
  private lastFetched: number | null = null
  private root: RootStore

  constructor(root: RootStore) {
    this.root = root
    makeAutoObservable(this)
  }

  // Computed — trips the current user is part of
  get myTrips() {
    const uid = this.root.auth.currentUser?.id
    return this.trips.filter(t => t.members.some(m => m.userId === uid))
  }

  get activeTrips() { return this.myTrips.filter(t => !t.isSettled) }
  get settledTrips() { return this.myTrips.filter(t => t.isSettled) }

  async fetchTrips(force = false) {
    const stale = !this.lastFetched || Date.now() - this.lastFetched > 60_000
    if (!stale && !force) return

    runInAction(() => { this.isLoading = true })
    try {
      const data = USE_MOCK
        ? await mockHandlers.getTrips() // mock
        : (await api.get<Trip[]>('/trips')).data // real
      runInAction(() => { this.trips = data; this.lastFetched = Date.now() })
    } catch (e: any) {
      runInAction(() => { this.error = e.message })
    } finally {
      runInAction(() => { this.isLoading = false })
    }
  }

  async fetchTrip(id: string) {
    runInAction(() => { this.isLoading = true })
    try {
      const data = USE_MOCK
        ? await mockHandlers.getTrip(id)
        : (await api.get<Trip>(`/trips/${id}`)).data
      runInAction(() => {
        this.currentTrip = data
        const idx = this.trips.findIndex(t => t.id === id)
        if (idx >= 0) this.trips[idx] = data
      })
    } catch (e: any) {
      runInAction(() => { this.error = e.message })
    } finally {
      runInAction(() => { this.isLoading = false })
    }
  }

  async reopenTrip(id: string) {
    try {
      const updated = USE_MOCK
        ? await mockHandlers.reopenTrip(id)
        : (await api.patch<Trip>(`/trips/${id}`, { isSettled: false })).data
      runInAction(() => {
        if (this.currentTrip?.id === id) this.currentTrip = updated
        const idx = this.trips.findIndex(t => t.id === id)
        if (idx >= 0) this.trips[idx] = updated
      })
    } catch (e: any) {
      runInAction(() => { this.error = e.message })
    }
  }

  async createTrip(payload: Partial<Trip>) {
    const { data } = await api.post<Trip>('/trips', payload)
    runInAction(() => { this.trips.push(data) })
    return data
  }
}
