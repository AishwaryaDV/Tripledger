// src/pages/TripDetail.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useStore } from '@/hooks/useStore'
import ExpenseCard from '@/components/expense/ExpenseCard'
import BalanceSummary from '@/components/trip/BalanceSummary'
import SettleSuggestions from '@/components/trip/SettleSuggestions'
import { formatCurrency } from '@/lib/utils'

type Tab = 'expenses' | 'balances' | 'suggestions' | 'spending'

const TABS: { key: Tab; label: string }[] = [
  { key: 'expenses',    label: 'Expenses' },
  { key: 'balances',    label: 'Balances' },
  { key: 'suggestions', label: 'Suggested Payments' },
  { key: 'spending',    label: 'Spending' },
]

const TripDetail = observer(() => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { trips, expenses, balances, auth } = useStore()
  const [activeTab, setActiveTab] = useState<Tab>('expenses')

  useEffect(() => {
    if (!id) return
    trips.fetchTrip(id)
    expenses.fetchExpenses(id)
    balances.fetchBalances(id)
  }, [id, trips, expenses, balances])

  if (trips.isLoading || expenses.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading trip...</p>
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

  const trip = trips.currentTrip
  if (!trip) return null

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back to trips
      </button>

      {/* Trip Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-3xl font-bold">{trip.name}</h2>
              {trip.isSettled && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Settled
                </span>
              )}
            </div>
            {trip.description && (
              <p className="text-muted-foreground mb-3">{trip.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{trip.members.length} members</span>
              <span>·</span>
              <span>{trip.currencies.join(' · ')}</span>
              <span>·</span>
              <span>Base: {trip.baseCurrency}</span>
            </div>
          </div>

          {/* Member avatars */}
          <div className="flex -space-x-2 shrink-0">
            {trip.members.slice(0, 4).map(member => (
              <div
                key={member.userId}
                title={member.displayName}
                className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold border-2 border-background"
              >
                {member.displayName.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        {!trip.isSettled && (
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => navigate(`/trips/${id}/add`)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + Add Expense
            </button>
            <button
              onClick={() => navigate(`/trips/${id}/settle`)}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              Settle Up
            </button>
          </div>
        )}
      </div>

      {/* Total spend */}
      <div className="rounded-xl bg-muted/50 p-4 mb-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total spend</span>
        <span className="text-xl font-bold">
          {formatCurrency(expenses.totalAmount, trip.baseCurrency)}
        </span>
      </div>

      {/* Tabs — equally distributed */}
      <div className="flex border-b mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.key === 'expenses' && (
              <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {expenses.expenses.length}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'expenses' && (
        expenses.expenses.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
            No expenses yet. Add the first one!
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.expenses.map(expense => (
              <ExpenseCard key={expense.id} expense={expense} members={trip.members} />
            ))}
          </div>
        )
      )}

      {activeTab === 'balances' && (
        <BalanceSummary balances={balances.balances} baseCurrency={trip.baseCurrency} />
      )}

      {activeTab === 'suggestions' && (
        <SettleSuggestions suggestions={balances.suggestions} members={trip.members} />
      )}

      {activeTab === 'spending' && (() => {
        const currentUserId = auth.currentUser?.id
        const totalSpend = expenses.totalAmount

        const rows = trip.members
          .map(member => ({
            member,
            total: expenses.expenses
              .filter(e => e.paidBy === member.userId)
              .reduce((sum, e) => sum + e.amountBase, 0),
          }))
          .sort((a, b) => b.total - a.total)

        return (
          <div className="space-y-3">
            {rows.map(({ member, total }) => {
              const isMe = member.userId === currentUserId
              const pct = totalSpend > 0 ? (total / totalSpend) * 100 : 0
              return (
                <div
                  key={member.userId}
                  className={`p-4 rounded-lg border ${isMe ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-sm font-medium ${isMe ? 'text-primary' : ''}`}>
                        {member.displayName}
                        {isMe && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">
                        {formatCurrency(total, trip.baseCurrency)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isMe ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground text-right pt-1">
              Total trip spend: {formatCurrency(totalSpend, trip.baseCurrency)}
            </p>
          </div>
        )
      })()}

    </div>
  )
})

export default TripDetail
