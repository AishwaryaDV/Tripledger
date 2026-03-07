// src/pages/TripSummary.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import {
  ArrowLeft, Copy, Check, Download,
  Plane, User, Home, PartyPopper,
  UtensilsCrossed, Car, BedDouble, Ticket, Package,
} from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CircleType, ExpenseCategory } from '@/types'

const CIRCLE_TYPE_CONFIG: Record<CircleType, { label: string; icon: React.ElementType; style: string }> = {
  trip:      { label: 'Trip',      icon: Plane,        style: 'bg-blue-100 text-blue-700' },
  personal:  { label: 'Personal',  icon: User,         style: 'bg-purple-100 text-purple-700' },
  household: { label: 'Household', icon: Home,         style: 'bg-green-100 text-green-700' },
  event:     { label: 'Event',     icon: PartyPopper,  style: 'bg-amber-100 text-amber-700' },
}

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: React.ElementType; barColor: string }> = {
  food:          { label: 'Food',          icon: UtensilsCrossed, barColor: 'bg-orange-400' },
  transport:     { label: 'Transport',     icon: Car,             barColor: 'bg-blue-400' },
  accommodation: { label: 'Stay',          icon: BedDouble,       barColor: 'bg-purple-400' },
  activities:    { label: 'Activities',    icon: Ticket,          barColor: 'bg-green-400' },
  other:         { label: 'Other',         icon: Package,         barColor: 'bg-gray-400' },
}

const CATEGORY_ORDER: ExpenseCategory[] = ['food', 'transport', 'accommodation', 'activities', 'other']

const TripSummary = observer(() => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { trips, expenses, balances } = useStore()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    trips.fetchTrip(id)
    expenses.fetchExpenses(id)
    balances.fetchBalances(id)
    balances.fetchSettlements(id)
  }, [id, trips, expenses, balances])

  const trip = trips.currentTrip
  const allExpenses = expenses.expenses

  if (trips.isLoading || expenses.isLoading || !trip) {
    return (
      <div className="w-full max-w-3xl mx-auto pt-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  // ── Computed values ─────────────────────────────────────────────────

  const sortedDates = allExpenses.map(e => e.expenseDate).sort()
  const firstDate = sortedDates[0]
  const lastDate  = sortedDates[sortedDates.length - 1]
  const dayCount  = firstDate && lastDate
    ? Math.max(1, Math.round(
        (new Date(lastDate).getTime() - new Date(firstDate).getTime()) / 86_400_000
      ) + 1)
    : 0

  const totalSpend   = expenses.totalAmount
  const avgPerPerson = trip.members.length > 0 ? totalSpend / trip.members.length : 0
  const avgPerDay    = dayCount > 0 ? totalSpend / dayCount : 0

  const largestExpense = allExpenses.reduce<typeof allExpenses[0] | null>(
    (max, e) => (!max || e.amountBase > max.amountBase) ? e : max, null
  )

  // Category breakdown
  const categoryData = CATEGORY_ORDER
    .map(cat => {
      const catExp = allExpenses.filter(e => e.category === cat)
      const total  = catExp.reduce((s, e) => s + e.amountBase, 0)
      return { cat, total, count: catExp.length, pct: totalSpend > 0 ? (total / totalSpend) * 100 : 0 }
    })
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total)

  const topCategory = categoryData[0]

  // Per-person contribution
  const memberContributions = trip.members
    .map(member => {
      const paid     = allExpenses.filter(e => e.paidBy === member.userId).reduce((s, e) => s + e.amountBase, 0)
      const fairShare = trip.members.length > 0 ? totalSpend / trip.members.length : 0
      const net      = balances.balances.find(b => b.userId === member.userId)?.netAmount ?? 0
      return { member, paid, fairShare, net }
    })
    .sort((a, b) => b.paid - a.paid)

  const getName = (userId: string) =>
    trip.members.find(m => m.userId === userId)?.displayName ?? userId

  // ── Export helpers ───────────────────────────────────────────────────

  const copyAsText = () => {
    const pad = (s: string, n: number) => s.padEnd(n)
    const lines: string[] = [
      `=== ${trip.name} · Summary ===`,
      firstDate
        ? `${formatDate(firstDate)} – ${formatDate(lastDate)} · ${dayCount} day${dayCount !== 1 ? 's' : ''} · ${trip.members.length} member${trip.members.length !== 1 ? 's' : ''}`
        : `${trip.members.length} member${trip.members.length !== 1 ? 's' : ''}`,
      '',
      `TOTAL SPEND: ${formatCurrency(totalSpend, trip.baseCurrency)}`,
      `Avg per person: ${formatCurrency(avgPerPerson, trip.baseCurrency)}${dayCount > 1 ? `  ·  Avg per day: ${formatCurrency(avgPerDay, trip.baseCurrency)}` : ''}`,
      '',
      'CATEGORIES',
      ...categoryData.map(d =>
        `${pad(CATEGORY_CONFIG[d.cat].label, 14)} ${pad(formatCurrency(d.total, trip.baseCurrency), 14)} ${d.pct.toFixed(0)}%  (${d.count} expense${d.count !== 1 ? 's' : ''})`
      ),
      '',
      'WHO PAID WHAT',
      ...memberContributions.map(({ member, paid, net }) =>
        `${pad(member.displayName, 12)} paid ${pad(formatCurrency(paid, trip.baseCurrency), 14)} → ${
          net > 0 ? `gets back ${formatCurrency(net, trip.baseCurrency)}`
          : net < 0 ? `owes ${formatCurrency(Math.abs(net), trip.baseCurrency)}`
          : 'settled up'
        }`
      ),
    ]

    if (balances.suggestions.length > 0) {
      lines.push('', 'OUTSTANDING')
      balances.suggestions.forEach(s => {
        lines.push(`${getName(s.fromUserId)} → ${getName(s.toUserId)}: ${formatCurrency(s.amount, s.currency)}`)
      })
    }

    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadCSV = () => {
    const headers = [
      'Date', 'Title', 'Category',
      `Amount`, 'Currency',
      `Base Amount (${trip.baseCurrency})`,
      'Paid By', 'Split',
    ]
    const rows = allExpenses
      .slice()
      .sort((a, b) => a.expenseDate.localeCompare(b.expenseDate))
      .map(e => [
        e.expenseDate,
        `"${e.title.replace(/"/g, '""')}"`,
        CATEGORY_CONFIG[e.category]?.label ?? e.category,
        e.amount,
        e.currency,
        e.amountBase.toFixed(2),
        getName(e.paidBy),
        `"${e.splits.map(s => `${getName(s.userId)} ${formatCurrency(s.amountOwed, trip.baseCurrency)}`).join(', ')}"`,
      ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${trip.name.replace(/\s+/g, '-')}-summary.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ───────────────────────────────────────────────────────────

  const typeConfig = CIRCLE_TYPE_CONFIG[trip.circleType] ?? CIRCLE_TYPE_CONFIG.trip
  const TypeIcon   = typeConfig.icon

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Back */}
      <button
        onClick={() => navigate(`/trips/${id}`)}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to {trip.name}
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h2 className="text-3xl font-bold">{trip.name}</h2>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeConfig.style}`}>
            <TypeIcon size={11} />{typeConfig.label}
          </span>
          {trip.isSettled && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Settled</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
          {firstDate && (
            <span>{formatDate(firstDate)} – {formatDate(lastDate)} · {dayCount} day{dayCount !== 1 ? 's' : ''}</span>
          )}
          <span>·</span>
          <span>{trip.members.length} member{trip.members.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{allExpenses.length} expense{allExpenses.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>Base: {trip.baseCurrency}</span>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={copyAsText}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy as text'}
        </button>
        <button
          onClick={downloadCSV}
          disabled={allExpenses.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          Download CSV
        </button>
      </div>

      {allExpenses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground text-sm">
          No expenses yet — add some to generate a summary.
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Section 2: Financial Overview ── */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Financial Overview</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Total spend</p>
                <p className="text-xl font-bold">{formatCurrency(totalSpend, trip.baseCurrency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Per person</p>
                <p className="text-xl font-bold">{formatCurrency(avgPerPerson, trip.baseCurrency)}</p>
              </div>
              {dayCount > 1 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Per day</p>
                  <p className="text-xl font-bold">{formatCurrency(avgPerDay, trip.baseCurrency)}</p>
                </div>
              )}
            </div>
            {(largestExpense || topCategory) && (
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
                {largestExpense && (
                  <span>
                    Largest: <span className="font-medium text-foreground">{largestExpense.title}</span>
                    {' '}({formatCurrency(largestExpense.amountBase, trip.baseCurrency)})
                  </span>
                )}
                {topCategory && (
                  <span>
                    Most spent: <span className="font-medium text-foreground">{CATEGORY_CONFIG[topCategory.cat].label}</span>
                    {' '}({topCategory.pct.toFixed(0)}%)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Section 3: Category Breakdown ── */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Spending by Category</h3>
            <div className="space-y-3">
              {categoryData.map(({ cat, total, count, pct }) => {
                const cfg  = CATEGORY_CONFIG[cat]
                const Icon = cfg.icon
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Icon size={13} className="text-muted-foreground" />
                        {cfg.label}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          {count} expense{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-right text-sm">
                        <span className="font-semibold">{formatCurrency(total, trip.baseCurrency)}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Section 4: Per-Person Contribution ── */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Per Person</h3>
            <div className="space-y-3">
              {memberContributions.map(({ member, paid, fairShare, net }) => {
                const pct    = totalSpend > 0 ? (paid / totalSpend) * 100 : 0
                const isOwed = net > 0
                const owes   = net < 0
                return (
                  <div key={member.userId} className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          {member.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{member.displayName}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isOwed ? 'bg-green-100 text-green-700'
                        : owes ? 'bg-red-100 text-red-600'
                        : 'bg-muted text-muted-foreground'
                      }`}>
                        {isOwed ? `gets back ${formatCurrency(net, trip.baseCurrency)}`
                        : owes  ? `owes ${formatCurrency(Math.abs(net), trip.baseCurrency)}`
                        : 'settled up'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div>
                        <p className="text-muted-foreground">Paid out</p>
                        <p className="font-semibold mt-0.5">{formatCurrency(paid, trip.baseCurrency)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fair share</p>
                        <p className="font-semibold mt-0.5">{formatCurrency(fairShare, trip.baseCurrency)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">% of total</p>
                        <p className="font-semibold mt-0.5">{pct.toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Section 6: Settlement Status ── */}
          {(balances.suggestions.length > 0 || balances.settlements.length > 0) && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Settlement Status</h3>

              {balances.suggestions.length > 0 ? (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Outstanding</p>
                  <div className="space-y-2">
                    {balances.suggestions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                        <span>
                          <span className="font-medium">{getName(s.fromUserId)}</span>
                          <span className="text-muted-foreground mx-2">→</span>
                          <span className="font-medium">{getName(s.toUserId)}</span>
                        </span>
                        <span className="font-semibold text-amber-700">{formatCurrency(s.amount, s.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-green-600 font-medium mb-4">✓ All payments settled</p>
              )}

              {balances.settlements.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recorded payments</p>
                  <div className="space-y-2">
                    {[...balances.settlements]
                      .sort((a, b) => new Date(b.confirmedAt ?? '').getTime() - new Date(a.confirmedAt ?? '').getTime())
                      .map(s => (
                        <div key={s.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-muted/30">
                          <div>
                            <span className="font-medium">{getName(s.fromUserId)}</span>
                            <span className="text-muted-foreground mx-2">paid</span>
                            <span className="font-medium">{getName(s.toUserId)}</span>
                            {s.isPartial && (
                              <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Partial</span>
                            )}
                            {s.confirmedAt && (
                              <span className="ml-2 text-xs text-muted-foreground">{formatDate(s.confirmedAt)}</span>
                            )}
                          </div>
                          <span className={`font-semibold ${s.isPartial ? 'text-yellow-700' : 'text-green-600'}`}>
                            {formatCurrency(s.amount, s.currency)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
})

export default TripSummary
