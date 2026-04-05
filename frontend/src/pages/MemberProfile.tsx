// src/pages/MemberProfile.tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { ArrowLeft, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/hooks/useStore'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'

const MEMBER_COLORS = ['#818cf8','#f472b6','#34d399','#fb923c','#60a5fa','#a78bfa','#facc15','#2dd4bf']

const MemberProfile = observer(() => {
  const { id: tripId, memberId } = useParams<{ id: string; memberId: string }>()
  const navigate = useNavigate()
  const { trips, auth } = useStore()
  const [reminding, setReminding] = useState(false)

  useEffect(() => {
    if (tripId && !trips.currentTrip) trips.fetchTrip(tripId)
  }, [tripId])

  const trip = trips.currentTrip
  if (!trip) return null

  const memberIndex = trip.members.findIndex(m => m.userId === memberId)
  const member = trip.members[memberIndex]
  if (!member) {
    navigate(`/trips/${tripId}`, { replace: true })
    return null
  }

  const isMe = member.userId === auth.currentUser?.id
  const color = MEMBER_COLORS[memberIndex % MEMBER_COLORS.length]
  const initial = member.displayName.charAt(0).toUpperCase()

  const handleRemind = async () => {
    setReminding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await api.post(
        `/trips/${tripId}/members/${memberId}/remind`,
        {},
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      )
      toast.success(`Reminder sent to ${member.displayName}.`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Failed to send reminder.')
    } finally {
      setReminding(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(`/trips/${tripId}`)}
        className="text-sm text-muted-foreground hover:text-foreground mb-8 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to {trip.name}
      </button>

      {/* Member card */}
      <div className="flex flex-col items-center text-center gap-4 py-10">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt={member.displayName} className="w-24 h-24 rounded-full object-cover" />
        ) : (
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {initial}
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold">
            {member.displayName}
            {isMe && <span className="ml-2 text-base font-normal text-muted-foreground">(you)</span>}
          </h2>
          <span className={`inline-block mt-2 text-sm px-3 py-1 rounded-full font-medium ${
            member.role === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
          }`}>
            {member.role}
          </span>
        </div>
      </div>

      {/* Remind button — only for others */}
      {!isMe && (
        <div className="mt-4">
          <button
            onClick={handleRemind}
            disabled={reminding}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Bell size={16} />
            {reminding ? 'Sending reminder...' : `Remind ${member.displayName} via email`}
          </button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Sends a balance summary to their registered email
          </p>
        </div>
      )}
    </div>
  )
})

export default MemberProfile
