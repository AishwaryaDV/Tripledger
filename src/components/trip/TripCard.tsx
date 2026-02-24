// src/components/trip/TripCard.tsx
import { useNavigate } from 'react-router-dom'
import type { Trip } from '@/types'
import { formatDate } from '@/lib/utils'

interface TripCardProps {
  trip: Trip
}

const TripCard = ({ trip }: TripCardProps) => {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/trips/${trip.id}`)}
      className={`p-5 rounded-xl border text-card-foreground shadow-sm cursor-pointer transition-all ${
        trip.isSettled
          ? 'bg-muted/40 border-border/50 hover:border-border'
          : 'bg-card hover:shadow-md hover:border-primary/40'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: trip info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold text-lg truncate ${trip.isSettled ? 'text-muted-foreground' : ''}`}>
              {trip.name}
            </h3>
            {trip.isSettled && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                Settled
              </span>
            )}
          </div>

          {trip.description && (
            <p className="text-sm text-muted-foreground truncate mb-2">{trip.description}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {/* Members */}
            <span>{trip.members.length} member{trip.members.length !== 1 ? 's' : ''}</span>

            <span>·</span>

            {/* Currencies */}
            <span>{trip.currencies.join(' · ')}</span>

            <span>·</span>

            {/* Date */}
            <span>{formatDate(trip.createdAt)}</span>
          </div>
        </div>

        {/* Right: member initials stack */}
        <div className="flex -space-x-2 shrink-0">
          {trip.members.slice(0, 3).map((member) => (
            <div
              key={member.userId}
              title={member.displayName}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 border-background ${
                trip.isSettled
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {member.displayName.charAt(0).toUpperCase()}
            </div>
          ))}
          {trip.members.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold border-2 border-background">
              +{trip.members.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TripCard
