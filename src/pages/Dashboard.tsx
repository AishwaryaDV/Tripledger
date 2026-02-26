// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { Plus, Link2 } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import TripCard from '@/components/trip/TripCard'
import { TripCardSkeleton } from '@/components/shared/Skeleton'

type Tab = 'active' | 'settled'

const Dashboard = observer(() => {
  const { trips } = useStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('active')
  const [showConnect, setShowConnect] = useState(false)
  const [connectCode, setConnectCode] = useState('')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    if (!connectCode.trim()) return
    setIsConnecting(true)
    setConnectError(null)
    try {
      const trip = await trips.joinTrip(connectCode.trim())
      navigate(`/trips/${trip.id}`)
    } catch (err: any) {
      setConnectError(err.message ?? 'Invalid code')
    } finally {
      setIsConnecting(false)
    }
  }

  useEffect(() => {
    trips.fetchTrips()
  }, [trips])

  if (trips.isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-3 pt-4">
        {[1, 2, 3].map(i => <TripCardSkeleton key={i} />)}
      </div>
    )
  }

  if (trips.error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-destructive text-sm">{trips.error}</p>
        <button
          onClick={() => trips.fetchTrips(true)}
          className="text-sm text-primary hover:opacity-70 font-medium transition-opacity"
        >
          Retry
        </button>
      </div>
    )
  }

  const displayedTrips = activeTab === 'active' ? trips.activeTrips : trips.settledTrips

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-3xl font-bold">My Trips</h2>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => { setShowConnect(v => !v); setConnectError(null); setConnectCode('') }}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-1.5 ${
              showConnect ? 'bg-muted' : 'hover:bg-muted'
            }`}
          >
            <Link2 size={15} />
            Connect
          </button>
          <button
            onClick={() => navigate('/trips/new')}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus size={15} />
            New Trip
          </button>
        </div>
      </div>

      {/* Connect inline panel */}
      {showConnect && (
        <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
          <p className="text-sm font-medium">Join a trip with a code</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={connectCode}
              onChange={e => setConnectCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              placeholder="e.g. GOA26X"
              maxLength={6}
              className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono uppercase bg-background focus:outline-none focus:ring-2 focus:ring-primary tracking-widest"
            />
            <button
              onClick={handleConnect}
              disabled={isConnecting || !connectCode.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isConnecting ? 'Joining...' : 'Join'}
            </button>
          </div>
          {connectError && <p className="text-xs text-destructive">{connectError}</p>}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'active'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active
          <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
            {trips.activeTrips.length}
          </span>
          {activeTab === 'active' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('settled')}
          className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'settled'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Settled
          <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
            {trips.settledTrips.length}
          </span>
          {activeTab === 'settled' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      </div>

      {/* Trip List */}
      {displayedTrips.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
          {activeTab === 'active'
            ? 'No active trips. Create one to get started!'
            : 'No settled trips yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTrips.map(trip => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

    </div>
  )
})

export default Dashboard
