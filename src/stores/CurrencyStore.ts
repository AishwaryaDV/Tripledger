// src/stores/CurrencyStore.ts
import { makeAutoObservable, runInAction } from 'mobx'

const CACHE_KEY = 'tl_currency_rates'
const STALE_MS = 4 * 60 * 60 * 1000 // 4 hours

interface RateCache {
  base: string
  rates: Record<string, number>
  updatedAt: string // ISO string
}

export class CurrencyStore {
  rates: Record<string, number> = {}
  base: string = ''
  updatedAt: string | null = null
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
    this.loadFromCache()
  }

  private loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return
      const cache: RateCache = JSON.parse(raw)
      runInAction(() => {
        this.base = cache.base
        this.rates = cache.rates
        this.updatedAt = cache.updatedAt
      })
    } catch {
      // cache corrupt — ignore, will refetch
    }
  }

  private saveToCache() {
    const cache: RateCache = {
      base: this.base,
      rates: this.rates,
      updatedAt: this.updatedAt!,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  }

  isStale(baseCurrency: string): boolean {
    if (!this.updatedAt || this.base !== baseCurrency) return true
    return Date.now() - new Date(this.updatedAt).getTime() > STALE_MS
  }

  // Returns the rate for converting 1 unit of `from` into `baseCurrency`
  // e.g. getRate('USD') when base is INR → 83.02
  getRate(from: string): number | null {
    if (from === this.base) return 1
    return this.rates[from] ?? null
  }

  // Convert an amount from `fromCurrency` to the base currency
  convert(amount: number, fromCurrency: string): number | null {
    if (fromCurrency === this.base) return amount
    const rate = this.getRate(fromCurrency)
    if (rate === null) return null
    return amount * rate
  }

  async fetchRates(baseCurrency: string, force = false) {
    if (!force && !this.isStale(baseCurrency)) return

    runInAction(() => { this.isLoading = true; this.error = null })
    try {
      const res = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
      )
      if (!res.ok) throw new Error(`Rate fetch failed: ${res.status}`)
      const json = await res.json()
      runInAction(() => {
        this.base = baseCurrency
        this.rates = json.rates as Record<string, number>
        this.updatedAt = new Date().toISOString()
      })
      this.saveToCache()
    } catch (e: any) {
      runInAction(() => { this.error = e.message })
    } finally {
      runInAction(() => { this.isLoading = false })
    }
  }
}
