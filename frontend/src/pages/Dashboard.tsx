// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { Plus, Link2, Plane, User, Home, PartyPopper, X } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import TripCard from '@/components/trip/TripCard'
import { TripCardSkeleton } from '@/components/shared/Skeleton'
import JoinCircleModal from '@/components/shared/JoinCircleModal'
import type { CircleType } from '@/types'

type Tab = 'active' | 'settled'

const CIRCLE_FILTERS: { value: CircleType; label: string; icon: React.ElementType }[] = [
  { value: 'trip',      label: 'Trips',      icon: Plane },
  { value: 'personal',  label: 'Personal',   icon: User },
  { value: 'household', label: 'Household',  icon: Home },
  { value: 'event',     label: 'Events',     icon: PartyPopper },
]

const Dashboard = observer(() => {
  const { trips, auth } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<Tab>('active')
  const [typeFilter, setTypeFilter] = useState<CircleType | 'all'>('all')
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !!(location.state as any)?.welcome)
  const welcomeName = (location.state as any)?.name ?? auth.currentUser?.displayName ?? 'there'

  useEffect(() => {
    trips.fetchTrips()
  }, [trips])

  if (trips.isLoading && trips.trips.length === 0) {
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

  const tabTrips = activeTab === 'active' ? trips.activeTrips : trips.settledTrips
  const displayedTrips = typeFilter === 'all' ? tabTrips : tabTrips.filter(t => t.circleType === typeFilter)

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Welcome banner — new signups only */}
      {showWelcome && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-primary">Welcome to TripLedger, {welcomeName}! 👋</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create your first circle to start tracking expenses, or join one with an invite code.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate('/trips/new')}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Create a circle
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              >
                Join with code
              </button>
            </div>
          </div>
          <button onClick={() => setShowWelcome(false)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground mb-0.5">
            Hey, {auth.currentUser?.displayName?.split(' ')[0] ?? 'there'} 👋
          </p>
          <h2 className="text-3xl font-bold">My Circles</h2>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowJoinModal(true)}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
          >
            <Link2 size={15} />
            Connect
          </button>
          <button
            onClick={() => navigate('/trips/new')}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus size={15} />
            New Circle
          </button>
        </div>
      </div>

      {/* Join modal */}
      <JoinCircleModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => { setActiveTab('active'); setTypeFilter('all') }}
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
          onClick={() => { setActiveTab('settled'); setTypeFilter('all') }}
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

      {/* Type filter chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Filters</span>
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            typeFilter === 'all'
              ? 'bg-foreground text-background border-foreground'
              : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
        {CIRCLE_FILTERS.map(f => {
          const Icon = f.icon
          const isActive = typeFilter === f.value
          return (
            <button
              key={f.value}
              onClick={() => setTypeFilter(isActive ? 'all' : f.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              <Icon size={11} />
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Circle List */}
      {displayedTrips.length === 0 ? (
        typeFilter === 'all' && activeTab === 'active' && trips.activeTrips.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center space-y-4">
            <p className="text-lg font-semibold">No circles yet</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              A circle is a group where you track expenses together — for a trip, household, event, or anything else.
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => navigate('/trips/new')}
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                <Plus size={14} />
                Create a circle
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-5 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
              >
                <Link2 size={14} />
                Join with code
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
            {typeFilter !== 'all'
              ? `No ${CIRCLE_FILTERS.find(f => f.value === typeFilter)?.label.toLowerCase()} circles here.`
              : 'No settled circles yet.'}
          </div>
        )
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
