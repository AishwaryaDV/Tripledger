// src/components/shared/JoinCircleModal.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Link2 } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { getApiError } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const JoinCircleModal = ({ isOpen, onClose }: Props) => {
  const { trips } = useStore()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode('')
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleJoin = async () => {
    const trimmed = code.trim()
    if (!trimmed) return
    setIsJoining(true)
    setError(null)
    try {
      const trip = await trips.joinTrip(trimmed)
      onClose()
      navigate(`/trips/${trip.id}`)
    } catch (err: any) {
      setError(getApiError(err, 'Invalid code. Try again.'))
    } finally {
      setIsJoining(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card rounded-xl border shadow-lg w-full max-w-xs sm:max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Link2 size={16} className="text-primary" />
            <h3 className="text-base font-semibold">Join a Circle</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the 6-character code shared by the circle owner.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Join Code
            </label>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="e.g. GOA26X"
              maxLength={6}
              className="w-full border rounded-lg px-4 py-3 text-xl font-mono font-bold uppercase bg-background focus:outline-none focus:ring-2 focus:ring-primary tracking-[0.35em] text-center"
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleJoin}
              disabled={isJoining || code.trim().length < 6}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isJoining ? 'Joining...' : 'Join Circle'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JoinCircleModal
