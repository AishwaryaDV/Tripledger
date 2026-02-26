// src/pages/CreateTrip.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { ArrowLeft, Check, Copy, Plane, User, Home, PartyPopper } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import type { Trip, CircleType } from '@/types'

const CIRCLE_TYPES: { value: CircleType; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'trip',      label: 'Trip',      icon: Plane,       description: 'Group travel expenses' },
  { value: 'personal',  label: 'Personal',  icon: User,        description: 'Track your own spending' },
  { value: 'household', label: 'Household', icon: Home,        description: 'Shared home expenses' },
  { value: 'event',     label: 'Event',     icon: PartyPopper, description: 'One-off occasions' },
]

const CreateTrip = observer(() => {
  const navigate = useNavigate()
  const { trips } = useStore()

  const [circleType, setCircleType] = useState<CircleType>('trip')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(['INR'])
  const [baseCurrency, setBaseCurrency] = useState('INR')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null)
  const [copied, setCopied] = useState(false)

  const selectedType = CIRCLE_TYPES.find(t => t.value === circleType)!

  const toggleCurrency = (code: string) => {
    setSelectedCurrencies(prev => {
      if (prev.includes(code)) {
        if (prev.length === 1) return prev
        const next = prev.filter(c => c !== code)
        if (baseCurrency === code) setBaseCurrency(next[0])
        return next
      }
      if (prev.length >= 3) return prev
      return [...prev, code]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Name is required'); return }
    setIsSubmitting(true)
    setError(null)
    try {
      const trip = await trips.createTrip({
        name: title.trim(),
        description: description.trim() || undefined,
        circleType,
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
    const TypeIcon = CIRCLE_TYPES.find(t => t.value === createdTrip.circleType)?.icon ?? Plane
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="rounded-xl border bg-card p-8 text-center space-y-6">
          <div>
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-4">
              <Check size={28} />
            </div>
            <h2 className="text-2xl font-bold mb-1">Circle created!</h2>
            <p className="text-muted-foreground text-sm">
              Share this code so others can join{' '}
              <span className="font-medium text-foreground">{createdTrip.name}</span>
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  copied
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'hover:bg-muted-foreground/10'
                }`}
              >
                {copied ? <><Check size={14} />Copied!</> : <><Copy size={14} />Copy</>}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this code can join using the <span className="font-medium">Connect</span> button on your dashboard
            </p>
          </div>

          {/* Circle summary */}
          <div className="text-left rounded-lg border bg-background p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium flex items-center gap-1.5">
                <TypeIcon size={13} />
                {CIRCLE_TYPES.find(t => t.value === createdTrip.circleType)?.label}
              </span>
            </div>
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
            Open Circle →
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
        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to circles
      </button>

      <h2 className="text-3xl font-bold mb-2">New Circle</h2>
      <p className="text-muted-foreground text-sm mb-8">
        A circle is a shared space for tracking and splitting expenses.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Circle type selector */}
        <div>
          <label className="block text-sm font-medium mb-3">What kind of circle is this?</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CIRCLE_TYPES.map(type => {
              const Icon = type.icon
              const isSelected = circleType === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setCircleType(type.value)}
                  className={`flex flex-col items-center gap-2 px-3 py-4 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <Icon size={20} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
                  <div>
                    <p className="text-sm font-medium">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{type.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Name</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={
              circleType === 'trip' ? 'e.g. Goa 2026' :
              circleType === 'personal' ? 'e.g. My Expenses' :
              circleType === 'household' ? 'e.g. Flat Expenses' :
              'e.g. Rohan\'s Wedding'
            }
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
            placeholder={selectedType.description}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Currency picker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Currencies</label>
            <span className="text-xs text-muted-foreground">{selectedCurrencies.length}/3 selected</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Pick up to 3 currencies your circle will use.
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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Circle'}
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
