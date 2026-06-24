// src/stores/TripStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import { api } from '../lib/api'
import type { Trip } from '../types'
import type { RootStore } from './RootStore'

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
      const { data } = await api.get<Trip[]>('/trips')
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
      const { data } = await api.get<Trip>(`/trips/${id}`)
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
      const { data } = await api.patch<Trip>(`/trips/${id}`, { isSettled: false })
      runInAction(() => {
        if (this.currentTrip?.id === id) this.currentTrip = data
        const idx = this.trips.findIndex(t => t.id === id)
        if (idx >= 0) this.trips[idx] = data
      })
    } catch (e: any) {
      runInAction(() => { this.error = e.message })
      throw e
    }
  }

  async settleTrip(id: string) {
    try {
      const { data } = await api.patch<Trip>(`/trips/${id}`, { isSettled: true })
      runInAction(() => {
        if (this.currentTrip?.id === id) this.currentTrip = data
        const idx = this.trips.findIndex(t => t.id === id)
        if (idx >= 0) this.trips[idx] = data
      })
    } catch (e: any) {
      runInAction(() => { this.error = e.message })
      throw e
    }
  }

  async createTrip(payload: { name: string; description?: string; circleType: string; currencies: string[]; baseCurrency: string; startDate?: string; endDate?: string }) {
    try {
      const { data } = await api.post<Trip>('/trips', payload)
      runInAction(() => { this.trips.push(data) })
      return data
    } catch (e: any) {
      runInAction(() => { this.error = e.message })
      throw e
    }
  }

  async fetchTripByCode(code: string): Promise<Trip> {
    const { data } = await api.get<Trip>(`/trips/by-code/${code}`)
    return data
  }

  async leaveTrip(id: string) {
    await api.delete(`/trips/${id}/members/me`)
    runInAction(() => {
      this.trips = this.trips.filter(t => t.id !== id)
      if (this.currentTrip?.id === id) this.currentTrip = null
    })
  }

  async deleteTrip(id: string) {
    await api.delete(`/trips/${id}`)
    runInAction(() => {
      this.trips = this.trips.filter(t => t.id !== id)
      if (this.currentTrip?.id === id) this.currentTrip = null
    })
  }

  // Takes tripId (from the preview fetched by fetchTripByCode)
  async joinTrip(tripId: string) {
    try {
      const { data } = await api.post<Trip>(`/trips/${tripId}/join`)
      runInAction(() => {
        const idx = this.trips.findIndex(t => t.id === data.id)
        if (idx >= 0) this.trips[idx] = data
        else this.trips.push(data)
      })
      return data
    } catch (e: any) {
      throw e
    }
  }

}
