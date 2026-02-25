// src/pages/CreateTrip.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useStore } from '@/hooks/useStore'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import type { Trip } from '@/types'

const CreateTrip = observer(() => {
  const navigate = useNavigate()
  const { trips } = useStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(['INR'])
  const [baseCurrency, setBaseCurrency] = useState('INR')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null)
  const [copied, setCopied] = useState(false)

  const toggleCurrency = (code: string) => {
    setSelectedCurrencies(prev => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev // must keep at least one
        const next = prev.filter(c => c !== code)
        if (baseCurrency === code) setBaseCurrency(next[0])
        return next
      }
      if (prev.length >= 3) return prev // max 3
      return [...prev, code]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Trip name is required'); return }
    setIsSubmitting(true)
    setError(null)
    try {
      const trip = await trips.createTrip({
        name: title.trim(),
        description: description.trim() || undefined,
        currencies: selectedCurrencies,
        baseCurrency,
      })
      setCreatedTrip(trip)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (!createdTrip) return
    navigator.clipboard.writeText(createdTrip.joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (createdTrip) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="rounded-xl border bg-card p-8 text-center space-y-6">
          <div>
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl mx-auto mb-4">
              ✓
            </div>
            <h2 className="text-2xl font-bold mb-1">Trip created!</h2>
            <p className="text-muted-foreground text-sm">
              Share this code so others can join <span className="font-medium text-foreground">{createdTrip.name}</span>
            </p>
          </div>

          {/* Join code display */}
          <div className="bg-muted rounded-xl p-6 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Join Code
            </p>
            <div className="flex items-center justify-center gap-4">
              <span className="text-4xl font-mono font-bold tracking-widest text-foreground">
                {createdTrip.joinCode}
              </span>
              <button
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  copied
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'hover:bg-muted-foreground/10'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this code can join using the <span className="font-medium">Connect</span> button on the dashboard
            </p>
          </div>

          {/* Trip summary */}
          <div className="text-left rounded-lg border bg-background p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currencies</span>
              <span className="font-medium">{createdTrip.currencies.join(' · ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base currency</span>
              <span className="font-medium">{createdTrip.baseCurrency}</span>
            </div>
          </div>

          <button
            onClick={() => navigate(`/trips/${createdTrip.id}`)}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go to Trip →
          </button>
        </div>
      </div>
    )
  }

  // ── Create form ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-3xl mx-auto">

      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back to trips
      </button>

      <h2 className="text-3xl font-bold mb-8">Create New Trip</h2>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Trip name</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Goa 2026"
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Beach trip with the squad"
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Currency picker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Currencies</label>
            <span className="text-xs text-muted-foreground">
              {selectedCurrencies.length}/3 selected
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Pick up to 3 currencies your group will use on this trip.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SUPPORTED_CURRENCIES.map(c => {
              const isSelected = selectedCurrencies.includes(c.code)
              const isDisabled = !isSelected && selectedCurrencies.length >= 3
              return (
                <button
                  key={c.code}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => toggleCurrency(c.code)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all text-sm ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : isDisabled
                      ? 'border-border/40 text-muted-foreground/40 cursor-not-allowed'
                      : 'border-border hover:border-primary/50 hover:bg-muted/40'
                  }`}
                >
                  <span className="font-mono text-base w-5 text-center">{c.symbol}</span>
                  <div className="min-w-0">
                    <p className="font-medium leading-none">{c.code}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.name}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Base currency */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Base currency</label>
          <p className="text-xs text-muted-foreground mb-3">
            All balances and totals will be shown in this currency.
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCurrencies.map(code => {
              const c = SUPPORTED_CURRENCIES.find(sc => sc.code === code)
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setBaseCurrency(code)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    baseCurrency === code
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {c?.symbol} {code}
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Trip'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  )
})

export default CreateTrip
