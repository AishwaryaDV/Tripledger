// src/pages/InviteJoin.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plane, User, Home, PartyPopper, Users, Coins, AlertTriangle, CheckCircle2, ArrowRight, LogIn } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import type { CircleType, Trip } from '@/types'

const CIRCLE_TYPE_CONFIG: Record<CircleType, { label: string; icon: React.ElementType; style: string }> = {
  trip:      { label: 'Trip',      icon: Plane,       style: 'bg-blue-100 text-blue-700' },
  personal:  { label: 'Personal',  icon: User,        style: 'bg-purple-100 text-purple-700' },
  household: { label: 'Household', icon: Home,        style: 'bg-green-100 text-green-700' },
  event:     { label: 'Event',     icon: PartyPopper, style: 'bg-amber-100 text-amber-700' },
}

const InviteJoin = () => {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { trips, auth } = useStore()

  const [preview, setPreview] = useState<Trip | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const isLoggedIn = auth.isLoggedIn
  const alreadyMember = preview?.members.some(m => m.userId === auth.currentUser?.id)

  useEffect(() => {
    if (!code) { setLoadError('No join code provided.'); setIsLoading(false); return }
    setIsLoading(true)
    trips.fetchTripByCode(code)
      .then(trip => { setPreview(trip); setIsLoading(false) })
      .catch(err => { setLoadError(err.message ?? 'Invalid join code.'); setIsLoading(false) })
  }, [code])

  const handleJoin = async () => {
    if (!code) return
    setIsJoining(true)
    setJoinError(null)
    try {
      const trip = await trips.joinTrip(preview!.id)
      navigate(`/trips/${trip.id}`)
    } catch (err: any) {
      setJoinError(err.message ?? 'Something went wrong.')
      setIsJoining(false)
    }
  }

  const pageBg: React.CSSProperties = { background: 'linear-gradient(180deg, hsl(152,45%,82%) 0%, hsl(165,32%,92%) 55%, hsl(160,18%,99%) 100%)' }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={pageBg}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Looking up circle...</p>
        </div>
      </div>
    )
  }

  // Invalid code
  if (loadError || !preview) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={pageBg}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} className="text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">Invalid Join Code</h2>
            <p className="text-sm text-muted-foreground">{loadError ?? 'This join code doesn\'t exist or has expired.'}</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const typeConfig = CIRCLE_TYPE_CONFIG[preview.circleType] ?? CIRCLE_TYPE_CONFIG.trip
  const TypeIcon = typeConfig.icon

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={pageBg}>
      <div className="w-full max-w-sm space-y-4">

        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">You've been invited to join</p>
          <h1 className="text-3xl font-bold text-primary">TripLedger</h1>
        </div>

        {/* Circle card */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          {/* Circle name + type */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-2xl font-bold">{preview.name}</h2>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.style}`}>
                <TypeIcon size={11} />{typeConfig.label}
              </span>
            </div>
            {preview.description && (
              <p className="text-sm text-muted-foreground">{preview.description}</p>
            )}
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users size={14} className="shrink-0" />
              <span>{preview.members.length} member{preview.members.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins size={14} className="shrink-0" />
              <span>{preview.currencies.join(' · ')}</span>
            </div>
          </div>

          {/* Member avatars */}
          {preview.members.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {preview.members.slice(0, 5).map((m, i) => (
                  <div
                    key={m.userId}
                    title={m.displayName}
                    style={{ backgroundColor: ['#818cf8','#f472b6','#34d399','#fb923c','#60a5fa'][i % 5] }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 border-card text-white"
                  >
                    {m.displayName.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {preview.members.slice(0, 3).map(m => m.displayName).join(', ')}
                {preview.members.length > 3 && ` +${preview.members.length - 3} more`}
              </span>
            </div>
          )}

          {/* Join code display */}
          <div className="bg-muted rounded-lg px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Join Code</p>
            <p className="text-lg font-mono font-bold tracking-[0.3em]">{preview.joinCode}</p>
          </div>
        </div>

        {/* Action */}
        {auth.isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !isLoggedIn ? (
          <div className="space-y-2">
            <button
              onClick={() => navigate('/login', { state: { redirectTo: `/join/${code}` } })}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              Log in to Join
            </button>
            <p className="text-xs text-center text-muted-foreground">You need an account to join a circle.</p>
          </div>
        ) : alreadyMember ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 size={15} className="shrink-0" />
              You're already a member of this circle.
            </div>
            <button
              onClick={() => navigate(`/trips/${preview.id}`)}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Open Circle
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {joinError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle size={13} className="shrink-0" />
                {joinError}
              </div>
            )}
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isJoining ? 'Joining...' : <>Join Circle <ArrowRight size={16} /></>}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Not now
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default InviteJoin
