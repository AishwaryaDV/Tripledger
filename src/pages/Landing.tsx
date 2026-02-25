// src/pages/Landing.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type FeatureTab = 'split' | 'currencies' | 'settle' | 'trips'

const FEATURE_TABS: { key: FeatureTab; label: string }[] = [
  { key: 'split',      label: 'Split Expenses' },
  { key: 'currencies', label: 'Multi-Currency' },
  { key: 'settle',     label: 'Settle Up' },
  { key: 'trips',      label: 'Trip Tools' },
]

const FEATURES: Record<FeatureTab, { heading: string; description: string; points: string[] }> = {
  split: {
    heading: 'Split any way you want',
    description: 'Four flexible split modes so every scenario is covered — from a simple dinner to a complex trip with uneven shares.',
    points: [
      'Equal — divide evenly among everyone (or just a subset)',
      'Exact — enter each person\'s precise amount',
      'Percentage — assign custom percentages that must total 100%',
      'Shares — give people different share weights (2 shares vs 1 share)',
    ],
  },
  currencies: {
    heading: 'Travel across currencies, not spreadsheets',
    description: 'Pick up to 3 currencies per trip and designate one as your base. Live rates keep everything accurate.',
    points: [
      'Choose from 15 common travel currencies per trip',
      'Live exchange rates via exchangerate-api — refreshes every 4 hours',
      'Inline conversion hint as you type (e.g. $40 = ₹3,320)',
      'All balances calculated in base currency automatically',
    ],
  },
  settle: {
    heading: 'Smart, minimal settlements',
    description: 'TripLedger minimises the number of transfers needed to settle a trip — no back-and-forth.',
    points: [
      'Suggested payments optimised to fewest transactions',
      'Record full or partial payments with method (Cash, UPI, Bank)',
      'Activity log shows every settlement with date and method',
      'Partial payments highlighted separately so nothing is forgotten',
    ],
  },
  trips: {
    heading: 'Everything to run a trip',
    description: 'From the moment you create a trip to the final settle-up, all the tools you need in one place.',
    points: [
      'Create trips with a shareable 6-character join code',
      'Others join instantly by entering the code — no signup needed',
      'Per-trip notes visible to all members, editable only by the author',
      'Built-in calculator for quick on-the-go math',
    ],
  },
}

const Landing = () => {
  const navigate = useNavigate()
  const [activeFeature, setActiveFeature] = useState<FeatureTab>('split')
  const feature = FEATURES[activeFeature]

  return (
    <div className="min-h-screen bg-background">

      {/* Nav */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">TripLedger</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Open App
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center max-w-2xl">
        <h2 className="text-5xl font-bold tracking-tight mb-4">
          Split trips,<br />not friendships
        </h2>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          TripLedger makes group travel expenses effortless — track what everyone spends,
          handle multiple currencies, and settle up with the fewest transfers possible.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/about')}
            className="px-8 py-3 rounded-lg border font-medium hover:bg-muted transition-colors"
          >
            Know More
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-20 max-w-3xl">
        <h3 className="text-2xl font-bold text-center mb-8">Everything you need</h3>

        {/* Feature tabs */}
        <div className="flex border-b mb-8 overflow-x-auto scrollbar-none">
          {FEATURE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFeature(tab.key)}
              className={`flex-1 min-w-max py-2.5 px-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeFeature === tab.key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeFeature === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Feature content */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div>
            <h4 className="text-xl font-bold mb-2">{feature.heading}</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
          </div>
          <ul className="space-y-2.5">
            {feature.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="text-primary mt-0.5 shrink-0">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12 text-center max-w-lg">
          <h3 className="text-xl font-bold mb-2">Ready to start?</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Create your first trip in under a minute. No sign-up required to explore.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>
        </div>
      </section>

    </div>
  )
}

export default Landing
