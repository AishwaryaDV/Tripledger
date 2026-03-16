// src/pages/About.tsx
import { useNavigate } from 'react-router-dom'

const About = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">

      {/* Nav */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-2xl font-bold text-primary">
            TripLedger
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Open App
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-3xl space-y-12">

        {/* Overview */}
        <section>
          <h2 className="text-3xl font-bold mb-4">About TripLedger</h2>
          <p className="text-muted-foreground leading-relaxed">
            TripLedger is a shared expense tracker built around the concept of <span className="font-medium text-foreground">circles</span> — groups of people splitting costs together.
            Whether it's a trip abroad, a shared household, a one-off event, or personal expense tracking,
            TripLedger handles the maths, the currencies, and the settlements so you don't have to.
          </p>
        </section>

        {/* Features */}
        <section>
          <h3 className="text-xl font-bold mb-4">Features</h3>
          <div className="space-y-3">
            {[
              ['Circle Types', 'Four circle types — Trip, Household, Event, and Personal — each with its own context. Create one in under a minute and share a 6-character join code for instant member onboarding.'],
              ['Expense Splitting', 'Four split modes: equal, exact, percentage, and shares — with smart cross-mode value conversion when you switch. Self expenses let you log personal items without affecting anyone else\'s balance.'],
              ['Multi-Currency', 'Up to 3 currencies per circle with a designated base currency for all balance calculations. Live rates via ExchangeRate API refresh every 4 hours, with inline conversion hints as you type.'],
              ['Settlement Engine', 'Debt-simplification algorithm minimises the number of transfers needed to fully settle a circle. Record full or partial payments, with outstanding amounts tracked separately in the activity log.'],
              ['Trip Summary', 'Per-circle financial overview with a category donut chart, daily spend bar chart, and per-person contribution breakdown. Export as CSV or plain text for record-keeping.'],
              ['Filters & Sorting', 'Multi-select category filters, paid-by filter, self-expense filter, and sort by date or amount — all combinable to find any expense instantly.'],
              ['Circle Notes', 'Shared notes visible to all members. Only the author can edit or delete their own notes, keeping the record honest.'],
              ['Settled Circle Handling', 'Settled circles are clearly marked. Reopen at any time to add expenses or re-settle — balances recalculate automatically.'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-lg border bg-card p-4">
                <p className="font-semibold text-sm mb-1">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section>
          <h3 className="text-xl font-bold mb-4">Architecture</h3>
          <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
            {[
              ['Frontend', 'React 18 + TypeScript + Vite'],
              ['State', 'MobX 6 — class-based stores with makeAutoObservable'],
              ['UI', 'shadcn/ui + Tailwind CSS v3'],
              ['Routing', 'React Router v6 with protected routes'],
              ['Forms', 'React Hook Form'],
              ['Charts', 'Recharts — donut, bar, and per-person visualisations'],
              ['Backend', 'FastAPI (Python)'],
              ['Exchange Rates', 'ExchangeRate API v4 free tier, cached in localStorage'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4">
                <span className="text-muted-foreground w-36 shrink-0">{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="pt-4">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </button>
        </div>

      </div>
    </div>
  )
}

export default About
