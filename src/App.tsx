import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStore } from './hooks/useStore'

const App = observer(() => {
  const { trips, auth } = useStore()

  useEffect(() => {
    trips.fetchTrips()
  }, [trips])

  if (auth.isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (trips.isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading trips...</div>
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">TripLedger</h1>

      <div className="mb-6">
        <p className="text-lg">Logged in as: <span className="font-semibold">{auth.currentUser?.displayName}</span></p>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">My Trips ({trips.myTrips.length})</h2>
        {trips.myTrips.length === 0 ? (
          <p className="text-gray-500">No trips found</p>
        ) : (
          <ul className="space-y-2">
            {trips.myTrips.map(trip => (
              <li key={trip.id} className="p-4 border rounded-lg">
                <div className="font-semibold">{trip.name}</div>
                <div className="text-sm text-gray-600">
                  {trip.description} • {trip.members.length} members • {trip.isSettled ? '✓ Settled' : 'Active'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
})

export default App
