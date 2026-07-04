// Unit tests for the FX conversion direction (FINAL_AUDIT N1).
// The exchangerate-api v4 endpoint returns base→foreign rates
// (base USD → rates.THB ≈ 36, meaning 1 USD = 36 THB), so converting a
// foreign amount into base must DIVIDE by the fetched rate.
import { describe, it, expect, beforeEach } from 'vitest'
import { runInAction } from 'mobx'
import { CurrencyStore } from './CurrencyStore'

// CurrencyStore touches localStorage in its constructor/cache path
const storage = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
} as Storage

describe('CurrencyStore conversion direction', () => {
  let store: CurrencyStore

  beforeEach(() => {
    storage.clear()
    store = new CurrencyStore()
    runInAction(() => {
      store.base = 'USD'
      store.rates = { THB: 36, EUR: 0.92, INR: 83.02 }
      store.updatedAt = new Date().toISOString()
    })
  })

  it('getRate returns the foreign→base rate (reciprocal of the fetched rate)', () => {
    expect(store.getRate('THB')).toBeCloseTo(1 / 36, 6)
    expect(store.getRate('EUR')).toBeCloseTo(1 / 0.92, 6)
  })

  it('getRate returns 1 for the base currency itself', () => {
    expect(store.getRate('USD')).toBe(1)
  })

  it('getRate returns null for unknown or invalid rates', () => {
    expect(store.getRate('XYZ')).toBeNull()
    runInAction(() => { store.rates = { ...store.rates, BAD: 0 } })
    expect(store.getRate('BAD')).toBeNull()
  })

  it('convert(500, THB) on a USD-base trip ≈ $13.89, not $18,000', () => {
    expect(store.convert(500, 'THB')).toBeCloseTo(13.89, 2)
  })

  it('convert(92, EUR) on a USD-base trip ≈ $100', () => {
    expect(store.convert(92, 'EUR')).toBeCloseTo(100, 2)
  })

  it('convert is identity for the base currency', () => {
    expect(store.convert(100, 'USD')).toBe(100)
  })

  it('convert returns null when no rate is available', () => {
    expect(store.convert(50, 'XYZ')).toBeNull()
  })

  // FINAL_AUDIT N17: stale rates fetched for a different base must never be used
  it('returns null when the store base does not match the expected base', () => {
    expect(store.getRate('THB', 'EUR')).toBeNull()
    expect(store.convert(500, 'THB', 'EUR')).toBeNull()
  })

  it('same-currency conversion still works during a base mismatch', () => {
    expect(store.getRate('EUR', 'EUR')).toBe(1)
    expect(store.convert(42, 'EUR', 'EUR')).toBe(42)
  })

  it('expectedBase matching the store base behaves normally', () => {
    expect(store.convert(500, 'THB', 'USD')).toBeCloseTo(13.89, 2)
  })
})
