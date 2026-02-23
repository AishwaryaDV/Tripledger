// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from '@/hooks/useStore'
import TripCard from '@/components/trip/TripCard'

type Tab = 'active' | 'settled'

const Dashboard = observer(() => {
  const { trips } = useStore()
  const [activeTab, setActiveTab] = useState<Tab>('active')

  useEffect(() => {
    trips.fetchTrips()
  }, [trips])

  if (trips.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading trips...</p>
      </div>
    )
  }

  if (trips.error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">{trips.error}</p>
      </div>
    )
  }

  const displayedTrips = activeTab === 'active' ? trips.activeTrips : trips.settledTrips

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">My Trips</h2>
        <button
          disabled
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium opacity-50 cursor-not-allowed"
          title="Coming soon"
        >
          + New Trip
        </button>
      </div>

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
