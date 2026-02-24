// src/pages/Settle.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useStore } from '@/hooks/useStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { SettlementSuggestion } from '@/types'

type Tab = 'suggestions' | 'activity'

const TABS: { key: Tab; label: string }[] = [
  { key: 'suggestions', label: 'Suggested Payments' },
  { key: 'activity',    label: 'Activity' },
]

const METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Other']

const Settle = observer(() => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { trips, balances, auth } = useStore()

  const [activeTab, setActiveTab] = useState<Tab>('suggestions')
  const [openFormIndex, setOpenFormIndex] = useState<number | null>(null)
  const [formAmount, setFormAmount] = useState('')
  const [formMethod, setFormMethod] = useState('Cash')
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

  const getName = (userId: string) =>
    trip?.members.find(m => m.userId === userId)?.displayName ?? userId

  const openForm = (suggestion: SettlementSuggestion, index: number) => {
    setOpenFormIndex(index)
    setFormAmount(suggestion.amount.toFixed(2))
    setFormMethod('Cash')
    setFormIsPartial(false)
  }

  const closeForm = () => setOpenFormIndex(null)

  const handleRecord = async (suggestion: SettlementSuggestion) => {
    if (!id) return
    setIsSubmitting(true)
    const amount = parseFloat(formAmount) || 0
    const isPartial = formIsPartial || amount < suggestion.amount

    await balances.recordSettlement(id, {
      fromUserId: suggestion.fromUserId,
      toUserId: suggestion.toUserId,
      amount,
      currency: suggestion.currency,
      method: formMethod,
      isPartial,
    })

    setIsSubmitting(false)
    setOpenFormIndex(null)

    setNotification({
      msg: isPartial
        ? `Partial payment of ${formatCurrency(amount, suggestion.currency)} recorded — ${formatCurrency(suggestion.amount - amount, suggestion.currency)} still outstanding`
        : `Full payment of ${formatCurrency(amount, suggestion.currency)} recorded`,
      isPartial,
    })
    setTimeout(() => setNotification(null), 5000)
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(`/trips/${id}`)}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back to {trip.name}
      </button>

      <h2 className="text-3xl font-bold mb-8">Settle Up</h2>

      {/* Notification banner */}
      {notification && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium border ${
          notification.isPartial
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {notification.isPartial ? '⚡ ' : '✓ '}
          {notification.msg}
        </div>
      )}

      {/* Balance Overview */}
      <div className="rounded-xl border bg-card p-4 mb-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Balance Overview
        </h3>
        <div className="space-y-2">
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
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                    isMe
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
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

      {/* Tabs */}
      <div className="flex border-b mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.key === 'activity' && balances.settlements.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {balances.settlements.length}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Suggested Payments tab */}
      {activeTab === 'suggestions' && (
        <div className="space-y-3">
          {balances.suggestions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
              Everyone is settled up!
            </div>
          ) : (
            balances.suggestions.map((s, i) => (
              <div key={i} className="rounded-lg border bg-card overflow-hidden">
                {/* Suggestion row */}
                <div className="flex items-center justify-between p-3">
                  <div className="text-sm">
                    <span className="font-medium">{getName(s.fromUserId)}</span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span className="font-medium">{getName(s.toUserId)}</span>
                  </div>
                  <div className="flex items-center gap-3">
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
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium mb-1">
                          Amount ({s.currency})
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={formAmount}
                          onChange={e => setFormAmount(e.target.value)}
                          className="w-full border rounded-md px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {parseFloat(formAmount) > 0 && parseFloat(formAmount) < s.amount && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Partial — {formatCurrency(s.amount - parseFloat(formAmount), s.currency)} still outstanding
                          </p>
                        )}
                      </div>
                      <div className="w-36">
                        <label className="block text-xs font-medium mb-1">Method</label>
                        <select
                          value={formMethod}
                          onChange={e => setFormMethod(e.target.value)}
                          className="w-full border rounded-md px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {METHODS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
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
      )}

      {/* Activity tab */}
      {activeTab === 'activity' && (
        <div className="space-y-2">
          {balances.settlements.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
              No payments recorded yet.
            </div>
          ) : (
            [...balances.settlements]
              .sort((a, b) =>
                new Date(b.confirmedAt ?? '').getTime() - new Date(a.confirmedAt ?? '').getTime()
              )
              .map(s => (
                <div
                  key={s.id}
                  className={`flex items-start justify-between p-3 rounded-lg border ${
                    s.isPartial ? 'bg-yellow-50/50 border-yellow-100' : 'bg-card'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{getName(s.fromUserId)}</span>
                      <span className="text-xs text-muted-foreground">paid</span>
                      <span className="text-sm font-medium">{getName(s.toUserId)}</span>
                      {s.isPartial && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium border border-yellow-200">
                          Partial
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {s.method && <span>{s.method}</span>}
                      {s.confirmedAt && (
                        <>
                          <span>·</span>
                          <span>{formatDate(s.confirmedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className={`text-sm font-semibold ${
                      s.isPartial ? 'text-yellow-700' : 'text-green-600'
                    }`}>
                      {formatCurrency(s.amount, s.currency)}
                    </span>
                    {s.isPartial && (
                      <p className="text-xs text-yellow-600 mt-0.5">partial</p>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      )}

    </div>
  )
})

export default Settle
