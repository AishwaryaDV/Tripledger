// src/components/trip/MoreOptionsSheet.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import {
  X, Copy, Check, CreditCard, FileText, LogOut, Trash2, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/hooks/useStore'
import type { Trip } from '@/types'

interface Props {
  trip: Trip
  onClose: () => void
}

const MoreOptionsSheet = observer(({ trip, onClose }: Props) => {
  const { trips, auth } = useStore()
  const navigate = useNavigate()
  const [codeCopied, setCodeCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const isOwner = trip.members.find(m => m.userId === auth.currentUser?.id)?.role === 'owner'

  const copyCode = () => {
    navigator.clipboard.writeText(trip.joinCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const handleLeave = async () => {
    setLoading('leave')
    try {
      await trips.leaveTrip(trip.id)
      toast.success(`Left ${trip.name}.`)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to leave circle.')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async () => {
    setLoading('delete')
    try {
      await trips.deleteTrip(trip.id)
      toast.success(`${trip.name} deleted.`)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete circle.')
    } finally {
      setLoading(null)
    }
  }

  type Option = {
    icon: React.ElementType
    label: string
    color: string
    bg: string
    action: () => void
    ownerOnly?: boolean
    danger?: boolean
  }

  const options: Option[] = [
    {
      icon: codeCopied ? Check : Copy,
      label: codeCopied ? 'Copied!' : 'Share code',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      action: copyCode,
    },
    {
      icon: CreditCard,
      label: 'Settle up',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      action: () => { onClose(); navigate(`/trips/${trip.id}/settle`) },
    },
    {
      icon: FileText,
      label: 'Summary',
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      action: () => { onClose(); navigate(`/trips/${trip.id}/summary`) },
    },
    {
      icon: RefreshCw,
      label: trip.isSettled ? 'Reopen' : 'Mark settled',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      action: async () => {
        setLoading('settle')
        try {
          if (trip.isSettled) await trips.reopenTrip(trip.id)
          else await trips.settleTrip(trip.id)
          toast.success(trip.isSettled ? 'Circle reopened.' : 'Circle settled.')
          onClose()
        } catch { toast.error('Failed.') }
        finally { setLoading(null) }
      },
      ownerOnly: true,
    },
    ...(!isOwner ? [{
      icon: LogOut,
      label: 'Leave circle',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      action: () => setConfirmLeave(true),
      danger: true,
    } as Option] : []),
    {
      icon: Trash2,
      label: 'Delete circle',
      color: 'text-red-600',
      bg: 'bg-red-50',
      action: () => setConfirmDelete(true),
      ownerOnly: true,
      danger: true,
    },
  ]

  const visibleOptions = options.filter(o => {
    if (o.ownerOnly && !isOwner) return false
    return true
  })

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-xl"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) forwards' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <p className="font-semibold text-base">{trip.name}</p>
            <p className="text-xs text-muted-foreground">More options</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Option grid */}
        <div className="p-5 pb-8">
          {(confirmDelete || confirmLeave) ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm font-medium text-destructive">
                {confirmDelete ? `Delete "${trip.name}"?` : `Leave "${trip.name}"?`}
              </p>
              <p className="text-xs text-muted-foreground">
                {confirmDelete
                  ? 'This will permanently delete the circle and all its expenses. This cannot be undone.'
                  : 'You will be removed from this circle. You can rejoin with the invite code.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmDelete ? handleDelete : handleLeave}
                  disabled={!!loading}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Please wait...' : confirmDelete ? 'Yes, delete' : 'Yes, leave'}
                </button>
                <button
                  onClick={() => { setConfirmDelete(false); setConfirmLeave(false) }}
                  className="px-4 py-2.5 rounded-xl border text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {visibleOptions.map((opt) => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.label}
                    onClick={opt.action}
                    disabled={loading === 'settle'}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-opacity hover:opacity-80 disabled:opacity-50 ${opt.danger ? 'border-destructive/20' : 'border-border'} bg-card`}
                  >
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${opt.bg}`}>
                      <Icon size={20} className={opt.color} />
                    </div>
                    <span className={`text-xs font-medium text-center leading-tight ${opt.danger ? 'text-destructive' : 'text-foreground'}`}>
                      {opt.label}
                    </span>
                  </button>
                )
              })}
            </div>
            {isOwner && (
              <p className="text-xs text-muted-foreground text-center">
                You're the owner — to leave, delete the circle instead.
              </p>
            )}
            </div>
          )}
        </div>
      </div>
    </>
  )
})

export default MoreOptionsSheet
