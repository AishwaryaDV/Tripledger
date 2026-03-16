// src/components/trip/TripCard.tsx
import { useNavigate } from 'react-router-dom'
import { Plane, User, Home, PartyPopper } from 'lucide-react'
import type { Trip, CircleType } from '@/types'
import { formatDate } from '@/lib/utils'

const CIRCLE_TYPE_CONFIG: Record<CircleType, { label: string; icon: React.ElementType; style: string }> = {
  trip:      { label: 'Trip',      icon: Plane,        style: 'bg-blue-100 text-blue-700' },
  personal:  { label: 'Personal',  icon: User,         style: 'bg-purple-100 text-purple-700' },
  household: { label: 'Household', icon: Home,         style: 'bg-green-100 text-green-700' },
  event:     { label: 'Event',     icon: PartyPopper,  style: 'bg-amber-100 text-amber-700' },
}

interface TripCardProps {
  trip: Trip
}

const TripCard = ({ trip }: TripCardProps) => {
  const navigate = useNavigate()
  const typeConfig = CIRCLE_TYPE_CONFIG[trip.circleType] ?? CIRCLE_TYPE_CONFIG.trip
  const TypeIcon = typeConfig.icon

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
        {/* Left: circle info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className={`font-semibold text-lg truncate ${trip.isSettled ? 'text-muted-foreground' : ''}`}>
              {trip.name}
            </h3>
            {/* Circle type pill */}
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${typeConfig.style}`}>
              <TypeIcon size={10} />
              {typeConfig.label}
            </span>
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
            <span>{trip.members.length} member{trip.members.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{trip.currencies.join(' · ')}</span>
            <span>·</span>
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
