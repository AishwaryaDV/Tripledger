// src/pages/Landing.tsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

// ── Onboarding slides ────────────────────────────────────────────────────────
const SLIDES = [
  {
    headline: 'Welcome to\nTripLedger',
    sub: 'Split expenses with anyone — fairly, instantly, without the awkward follow-ups.',
    accent: 'from-orange-200 to-amber-100',
    bg: 'linear-gradient(180deg, hsl(25,70%,84%) 0%, hsl(35,50%,93%) 55%, hsl(40,25%,99%) 100%)',
  },
  {
    headline: 'Track every\nshared expense',
    sub: 'Add an expense in seconds and we calculate exactly what everyone owes in real time.',
    accent: 'from-teal-200 to-emerald-100',
    bg: 'linear-gradient(180deg, hsl(172,45%,82%) 0%, hsl(165,32%,92%) 55%, hsl(160,18%,99%) 100%)',
  },
  {
    headline: 'Any currency,\nno confusion',
    sub: 'Set a base currency and log in any currency — live rates handle the conversion automatically.',
    accent: 'from-blue-200 to-sky-100',
    bg: 'linear-gradient(180deg, hsl(210,60%,82%) 0%, hsl(205,40%,92%) 55%, hsl(200,20%,99%) 100%)',
  },
  {
    headline: 'Settle up\nfairly, fast',
    sub: 'We calculate the minimum transfers needed so nobody is chasing anyone. Clean slate, every time.',
    accent: 'from-emerald-200 to-teal-100',
    bg: 'linear-gradient(180deg, hsl(145,45%,80%) 0%, hsl(152,32%,91%) 55%, hsl(155,18%,99%) 100%)',
  },
]

// Box position + animation per slide — all positioning inside cls
const BOX_CONFIG = [
  {
    cls: 'absolute top-1/2 left-1/2 w-72 h-52',  // centered via keyframe translate
    enterAnim: 'fadeScaleIn 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.6s forwards',
    floatAnim: 'floatCenter 3s ease-in-out 1.4s infinite',
  },
  {
    cls: 'absolute top-[15%] left-[8%] w-48 h-32',
    enterAnim: 'slideFromLeft 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.6s forwards',
    floatAnim: 'float 3s ease-in-out 1.4s infinite',
  },
  {
    cls: 'absolute bottom-[18%] right-[6%] w-48 h-32',
    enterAnim: 'slideFromRight 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.6s forwards',
    floatAnim: 'float 3s ease-in-out 1.4s infinite',
  },
  {
    cls: 'absolute top-[20%] right-[10%] w-48 h-32',
    enterAnim: 'slideFromRight 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.6s forwards',
    floatAnim: 'float 3s ease-in-out 1.4s infinite',
  },
]

// ── Mobile onboarding carousel ───────────────────────────────────────────────
const MobileOnboarding = () => {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX.current
    if (diff > 50) setCurrent(c => Math.min(c + 1, SLIDES.length - 1))
    else if (diff < -50) setCurrent(c => Math.max(c - 1, 0))
  }

  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  return (
    <div
      className="fixed inset-0 flex flex-col select-none px-8 transition-all duration-700 overflow-y-auto relative"
      style={{ background: slide.bg }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Theme toggle — top right */}
      <button
        type="button"
        onClick={toggle}
        className="absolute top-4 right-4 p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-black/10 transition-colors focus:outline-none z-10"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Text — top, left justified */}
      <div key={`text-${current}`} className="pt-16 pb-6">
        <h1
          className="text-4xl font-extrabold leading-tight mb-3 whitespace-pre-line"
          style={{ opacity: 0, animation: 'fadeSlideUp 0.7s ease 0.1s forwards' }}
        >
          {slide.headline}
        </h1>
        <p
          className="text-foreground/70 text-lg font-semibold leading-snug"
          style={{ opacity: 0, animation: 'fadeSlideUp 0.7s ease 0.4s forwards' }}
        >
          {slide.sub}
        </p>
      </div>

      {/* Animation area */}
      <div className="flex-1 relative">
        {(() => {
          const box = BOX_CONFIG[current]
          return (
            <div
              key={`box-${current}`}
              className={`bg-white rounded-2xl border border-white/80 ${box.cls}`}
              style={{ opacity: 0, animation: `${box.enterAnim}, ${box.floatAnim}` }}
            />
          )
        })()}
      </div>

      {/* Bottom — dots + skip */}
      <div className="pb-14 flex flex-col items-center gap-4">
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {isLast ? (
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => navigate('/login', { state: { tab: 'signup', hint: 'trip' } })}
              className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity"
            >
              Add a group trip
            </button>
            <button
              onClick={() => navigate('/login', { state: { tab: 'signup', hint: 'household' } })}
              className="w-full py-3.5 rounded-lg border border-primary text-primary font-semibold text-base hover:bg-primary/5 transition-colors bg-white/60"
            >
              Add your household
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="text-base font-bold text-primary"
          >
            Skip tour
          </button>
        )}
      </div>
    </div>
  )
}

// ── Desktop landing ──────────────────────────────────────────────────────────
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
        <div className="flex border-b mb-8 overflow-x-auto scrollbar-none">
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

// ── Entry point — mobile vs desktop ─────────────────────────────────────────
const Landing = () => (
  <>
    <div className="sm:hidden"><MobileOnboarding /></div>
    <div className="hidden sm:block"><DesktopLanding /></div>
  </>
)

export default Landing
