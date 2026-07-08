// src/pages/Landing.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, ChevronDown } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

type FeatureTab = 'split' | 'currencies' | 'settle' | 'trips'

const FEATURE_TABS: { key: FeatureTab; label: string }[] = [
  { key: 'split',      label: 'Split Expenses' },
  { key: 'currencies', label: 'Multi-Currency' },
  { key: 'settle',     label: 'Settle Up' },
  { key: 'trips',      label: 'Circle Tools' },
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
    description: 'Pick up to 3 currencies per circle and designate one as your base. Live rates keep everything accurate.',
    points: [
      'Choose from 15 common travel currencies per circle',
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
    heading: 'Everything to run a circle',
    description: 'From the moment you create a circle to the final settle-up, all the tools you need in one place.',
    points: [
      'Create circles with a shareable 6-character join code',
      'Others join instantly by entering the code — no signup needed',
      'Per-circle notes visible to all members, editable only by the author',
      'Built-in calculator for quick on-the-go math',
    ],
  },
}

const DesktopLanding = () => {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [activeFeature, setActiveFeature] = useState<FeatureTab>('split')
  const feature = FEATURES[activeFeature]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">TripLedger</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Open App
            </button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-10 sm:py-20 text-center max-w-2xl">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
          Split trips,<br />not friendships
        </h2>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          TripLedger makes group travel expenses effortless — track what everyone spends,
          handle multiple currencies, and settle up with the fewest transfers possible.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => navigate('/login')}
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

      <section className="container mx-auto px-4 pb-20 max-w-3xl">
        <h3 className="text-2xl font-bold text-center mb-8">Everything you need</h3>

        {/* Desktop: tabs */}
        <div className="hidden sm:block">
          <div className="flex border-b mb-8">
            {FEATURE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveFeature(tab.key)}
                className={`flex-1 min-w-max py-2.5 px-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  activeFeature === tab.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {activeFeature === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
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
        </div>

        {/* Mobile: stacked accordion cards */}
        <div className="sm:hidden space-y-3">
          {FEATURE_TABS.map(tab => {
            const f = FEATURES[tab.key]
            const isOpen = activeFeature === tab.key
            return (
              <div key={tab.key} className="rounded-xl border bg-card overflow-hidden">
                <button
                  onClick={() => setActiveFeature(isOpen ? (null as unknown as FeatureTab) : tab.key)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                >
                  <span className="font-semibold text-sm">{tab.label}</span>
                  <ChevronDown
                    size={16}
                    className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-3">
                      <div>
                        <h4 className="text-base font-bold mb-1">{f.heading}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
                      </div>
                      <ul className="space-y-2">
                        {f.points.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5 shrink-0">✓</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12 text-center max-w-lg">
          <h3 className="text-xl font-bold mb-2">Ready to start?</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Create your first circle in under a minute.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>
        </div>
      </section>
    </div>
  )
}

export default DesktopLanding
