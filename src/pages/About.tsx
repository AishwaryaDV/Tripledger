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
            TripLedger is a group travel expense tracker built for trips where multiple people
            spend money on shared costs across different currencies. It handles the maths so
            you can focus on the trip.
          </p>
        </section>

        {/* Features */}
        <section>
          <h3 className="text-xl font-bold mb-4">Features</h3>
          <div className="space-y-3">
            {[
              ['Expense Splitting', 'Equal, exact, percentage, and shares — with cross-mode conversion when switching methods.'],
              ['Multi-Currency', 'Up to 3 currencies per trip with a base currency for all balance math. Live rates via exchangerate-api refreshed every 4 hours with a manual override.'],
              ['Settlement Engine', 'Minimum-transaction suggestions to settle the trip with as few transfers as possible. Partial payments tracked separately in the activity log.'],
              ['Join Codes', 'Each trip gets a 6-character alphanumeric code. Share it for instant joins — no email invites needed.'],
              ['Trip Notes', 'Per-trip notes visible to all members. Only the author can edit or delete their own notes.'],
              ['Settled Trip Handling', 'Settled trips are clearly marked and greyed out. You can reopen and add an expense or re-settle at any time.'],
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
              ['UI', 'shadcn/ui + Tailwind CSS v3 (slate base)'],
              ['Routing', 'React Router v6 with protected routes'],
              ['Forms', 'React Hook Form'],
              ['Backend (planned)', 'Supabase — Auth, Postgres, Realtime'],
              ['Exchange Rates', 'exchangerate-api.com v4 free tier, cached in localStorage'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4">
                <span className="text-muted-foreground w-36 shrink-0">{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Docs placeholder */}
        <section>
          <h3 className="text-xl font-bold mb-4">Documentation</h3>
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm space-y-2">
            <p className="font-medium">Full documentation coming soon.</p>
            <p>API references, data models, and integration guides will live here.</p>
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
