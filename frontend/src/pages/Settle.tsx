// src/pages/Settle.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { ArrowLeft, CheckCircle2, AlertTriangle, PartyPopper } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/hooks/useStore'
import { formatCurrency, getApiError } from '@/lib/utils'
import { BalanceRowSkeleton } from '@/components/shared/Skeleton'
import type { SettlementSuggestion } from '@/types'

const MEMBER_COLORS = ['#818cf8','#f472b6','#34d399','#fb923c','#60a5fa','#a78bfa','#facc15','#2dd4bf']


const Settle = observer(() => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { trips, balances, auth } = useStore()


  const [openFormIndex, setOpenFormIndex] = useState<number | null>(null)
  const [formAmount, setFormAmount] = useState('')
  const [formIsPartial, setFormIsPartial] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ msg: string; isPartial: boolean } | null>(null)

  useEffect(() => {
    if (!id) return
    trips.fetchTrip(id)
    balances.fetchBalances(id)
    balances.fetchSettlements(id)
  }, [id, trips, balances])

  const trip = trips.currentTrip
  const currentUserId = auth.currentUser?.id
  const isOwner = trip?.members.find(m => m.userId === currentUserId)?.role === 'owner'

  const getName = (userId: string) =>
    trip?.members.find(m => m.userId === userId)?.displayName ?? userId

  const openForm = (suggestion: SettlementSuggestion, index: number) => {
    setOpenFormIndex(index)
    setFormAmount(suggestion.amount.toFixed(2))
    setFormIsPartial(false)
  }

  const closeForm = () => setOpenFormIndex(null)

  const handleRecord = async (suggestion: SettlementSuggestion) => {
    if (!id) return
    setIsSubmitting(true)
    const amount = parseFloat(formAmount) || 0
    const isPartial = formIsPartial || amount < suggestion.amount

    try {
      await balances.recordSettlement(id, {
        fromUserId: suggestion.fromUserId,
        toUserId: suggestion.toUserId,
        amount,
        currency: suggestion.currency,
        isPartial,
      })
      setOpenFormIndex(null)
      setNotification({
        msg: isPartial
          ? `Partial payment of ${formatCurrency(amount, suggestion.currency)} recorded — ${formatCurrency(suggestion.amount - amount, suggestion.currency)} still outstanding`
          : `Full payment of ${formatCurrency(amount, suggestion.currency)} recorded`,
        isPartial,
      })
      setTimeout(() => setNotification(null), 5000)
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to record payment'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Error check must come before the skeleton: if the trip fetch failed with no
  // cached trip, `trip` stays null with isLoading false — skeleton-first would
  // spin forever with the error screen unreachable.
  if (trips.error || balances.error) {
    return (
      <div className="w-full max-w-3xl mx-auto pt-8 space-y-3">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{trips.error ?? balances.error}</span>
          </div>
          <button
            onClick={() => { trips.fetchTrip(id!); balances.fetchBalances(id!); balances.fetchSettlements(id!) }}
            className="text-xs font-medium text-primary hover:opacity-70 shrink-0 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!trip || balances.isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-3 pt-4">
        {[1, 2, 3].map(i => <BalanceRowSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(`/trips/${id}`)}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to {trip.name}
      </button>

      <h2 className="text-3xl font-bold mb-8">Settle Up</h2>

      {/* Notification banner */}
      {notification && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium border flex items-start gap-2.5 ${
          notification.isPartial
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {notification.isPartial
            ? <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            : <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          }
          {notification.msg}
        </div>
      )}

      {/* Balance Overview */}
      <div className="rounded-xl border bg-card p-4 mb-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Balance Overview
        </h3>
        <div className="space-y-2">
          {balances.balances.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No balances yet — add some expenses first.</p>
          )}
          {balances.balances.map(b => {
            const isMe = b.userId === currentUserId
            return (
              <div
                key={b.userId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isMe
                    ? 'bg-primary/5 border border-primary/20'
                    : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    style={{ backgroundColor: MEMBER_COLORS[(trip?.members.findIndex(m => m.userId === b.userId) ?? 0) % MEMBER_COLORS.length] }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 text-white"
                  >
                    {b.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-sm font-medium ${isMe ? 'text-primary' : ''}`}>
                    {b.displayName}
                    {isMe && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
                    )}
                  </span>
                </div>
                <span className={`text-sm font-semibold ${
                  b.netAmount > 0
                    ? 'text-green-600'
                    : b.netAmount < 0
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}>
                  {b.netAmount > 0
                    ? `gets back ${formatCurrency(b.netAmount, trip.baseCurrency)}`
                    : b.netAmount < 0
                    ? `owes ${formatCurrency(Math.abs(b.netAmount), trip.baseCurrency)}`
                    : 'settled up'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mark as Settled banner — shown when no outstanding suggestions */}
      {!trip.isSettled && balances.suggestions.length === 0 && balances.balances.length > 0 && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PartyPopper size={20} className="text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Everyone is settled up!</p>
              <p className="text-xs text-green-700 mt-0.5">
                {isOwner ? 'You can now mark this circle as settled.' : 'Only the owner can mark this circle as settled.'}
              </p>
            </div>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await trips.settleTrip(id!)
                  navigate(`/trips/${id}`)
                } catch (err: any) {
                  toast.error(getApiError(err, 'Failed to settle circle'))
                }
              }}
              className="shrink-0 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Mark Settled
            </button>
          )}
        </div>
      )}

      {/* Suggested Payments */}
      <div className="space-y-3">
        {balances.suggestions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
              Everyone is settled up!
            </div>
          ) : (
            balances.suggestions.map((s, i) => (
              <div key={i} className="rounded-lg border bg-card overflow-hidden">
                {/* Suggestion row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 gap-2">
                  <div className="text-sm">
                    <span className="font-medium">{getName(s.fromUserId)}</span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span className="font-medium">{getName(s.toUserId)}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="text-sm font-semibold">
                      {formatCurrency(s.amount, s.currency)}
                    </span>
                    {s.fromUserId === currentUserId ? (
                      openFormIndex === i ? (
                        <button
                          type="button"
                          onClick={closeForm}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openForm(s, i)}
                          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
                        >
                          Record Payment
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground italic">awaiting payment</span>
                    )}
                  </div>
                </div>

                {/* Inline payment form */}
                {openFormIndex === i && (
                  <div className="border-t bg-muted/20 p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Amount ({s.currency})
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        max={s.amount}
                        step="0.01"
                        value={formAmount}
                        onChange={e => {
                          const val = e.target.value
                          if (parseFloat(val) > s.amount) setFormAmount(s.amount.toFixed(2))
                          else setFormAmount(val)
                        }}
                        className="w-full border rounded-md px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {parseFloat(formAmount) > 0 && parseFloat(formAmount) < s.amount && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Partial — {formatCurrency(s.amount - parseFloat(formAmount), s.currency)} still outstanding
                        </p>
                      )}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formIsPartial}
                        onChange={e => setFormIsPartial(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm">Mark as partial payment</span>
                    </label>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRecord(s)}
                        disabled={isSubmitting || !formAmount || parseFloat(formAmount) <= 0}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isSubmitting ? 'Recording...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      {/* Recorded Payments */}
      {balances.settlements.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recorded Payments</h3>
          <div className="space-y-2">
            {[...balances.settlements]
              .sort((a, b) => new Date(b.confirmedAt ?? '').getTime() - new Date(a.confirmedAt ?? '').getTime())
              .map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-medium">{getName(s.fromUserId)}</span>
                    <span className="text-muted-foreground">paid</span>
                    <span className="font-medium">{getName(s.toUserId)}</span>
                    {s.isPartial && (
                      <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Partial</span>
                    )}
                    {s.confirmedAt && (
                      <span className="text-xs text-muted-foreground ml-1">{new Date(s.confirmedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <span className={`font-semibold shrink-0 ${s.isPartial ? 'text-yellow-700' : 'text-green-600'}`}>
                    {formatCurrency(s.amount, s.currency)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  )
})

export default Settle
