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
  // The API returns base→foreign rates (base USD → rates.THB ≈ 36, i.e. 1 USD = 36 THB),
  // so the foreign→base rate is the reciprocal.
  // Pass `expectedBase` (the trip's base currency) so stale rates fetched for a
  // DIFFERENT base can never silently produce wrong conversions — mismatch → null,
  // and callers already treat null as "rate unavailable".
  getRate(from: string, expectedBase?: string): number | null {
    if (expectedBase && this.base !== expectedBase) return from === expectedBase ? 1 : null
    if (from === this.base) return 1
    const baseToForeign = this.rates[from]
    if (baseToForeign == null || baseToForeign <= 0) return null
    return 1 / baseToForeign
  }

  // Convert an amount from `fromCurrency` to the base currency
  convert(amount: number, fromCurrency: string, expectedBase?: string): number | null {
    const rate = this.getRate(fromCurrency, expectedBase)
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
      runInAction(() => {
        this.error = e.message
        this.updatedAt = null  // force retry next call
      })
    } finally {
      runInAction(() => { this.isLoading = false })
    }
  }
}
