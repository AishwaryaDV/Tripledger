// src/pages/Dashboard.tsx
import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from '@/hooks/useStore'
import TripCard from '@/components/trip/TripCard'

const Dashboard = observer(() => {
  const { trips } = useStore()

  // Fetch trips on mount
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

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">My Trips</h2>
        <button
          disabled
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium opacity-50 cursor-not-allowed"
          title="Coming soon"
        >
          + New Trip
        </button>
      </div>

      {/* Active Trips */}
      <section className="mb-10">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Active · {trips.activeTrips.length}
        </h3>

        {trips.activeTrips.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
            No active trips. Create one to get started!
          </div>
        ) : (
          <div className="space-y-3">
            {trips.activeTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>

      {/* Settled Trips */}
      {trips.settledTrips.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Settled · {trips.settledTrips.length}
          </h3>
          <div className="space-y-3">
            {trips.settledTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}

    </div>
  )
})

export default Dashboard
