// src/pages/TripSummary.tsx
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import {
  ArrowLeft, Copy, Check, Download,
  Plane, User, Home, PartyPopper,
  UtensilsCrossed, Car, BedDouble, Ticket, Package,
  Wallet, Users, CalendarDays, TrendingUp, Tag,
  Clock, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { toJS } from 'mobx'
import { useStore } from '@/hooks/useStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Skeleton, SpendingRowSkeleton } from '@/components/shared/Skeleton'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import type { CircleType, ExpenseCategory } from '@/types'

// ── Config ───────────────────────────────────────────────────────────────────

const CIRCLE_TYPE_CONFIG: Record<CircleType, { label: string; icon: React.ElementType; style: string }> = {
  trip:      { label: 'Trip',      icon: Plane,       style: 'bg-blue-100 text-blue-700' },
  personal:  { label: 'Personal',  icon: User,        style: 'bg-purple-100 text-purple-700' },
  household: { label: 'Household', icon: Home,        style: 'bg-green-100 text-green-700' },
  event:     { label: 'Event',     icon: PartyPopper, style: 'bg-amber-100 text-amber-700' },
}

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: React.ElementType; color: string }> = {
  food:          { label: 'Food',        icon: UtensilsCrossed, color: '#fb923c' },
  transport:     { label: 'Transport',   icon: Car,             color: '#60a5fa' },
  accommodation: { label: 'Stay',        icon: BedDouble,       color: '#c084fc' },
  activities:    { label: 'Activities',  icon: Ticket,          color: '#4ade80' },
  other:         { label: 'Other',       icon: Package,         color: '#9ca3af' },
}

const CATEGORY_ORDER: ExpenseCategory[] = ['food', 'transport', 'accommodation', 'activities', 'other']

const MEMBER_COLORS = ['#818cf8', '#f472b6', '#34d399', '#fb923c', '#60a5fa', '#a78bfa', '#facc15', '#2dd4bf']

// ── Tooltip shared style ──────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

// ── Component ─────────────────────────────────────────────────────────────────

const TripSummary = observer(() => {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const { trips, expenses, balances } = useStore()
  const [copied, setCopied] = useState(false)
  const dailyScrollRef = useRef<HTMLDivElement>(null)

  // Scroll daily chart to the right after data loads and chart renders
  useEffect(() => {
    if (dailyScrollRef.current) {
      dailyScrollRef.current.scrollLeft = dailyScrollRef.current.scrollWidth
    }
  }, [expenses.expenses.length])

  useEffect(() => {
    if (!id) return
    trips.fetchTrip(id)
    expenses.fetchExpenses(id)
    balances.fetchBalances(id)
    balances.fetchSettlements(id)
  }, [id, trips, expenses, balances])

  const trip        = trips.currentTrip
  const allExpenses = toJS(expenses.expenses)

  if (trips.isLoading || expenses.isLoading || !trip || trip.id !== id) {
    return (
      <div className="w-full max-w-3xl mx-auto pt-4 space-y-4">
        {/* Back + title */}
        <Skeleton className="h-4 w-28" />
        <div className="space-y-2 pb-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        {/* Export buttons */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        {/* Financial overview card */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <Skeleton className="h-3 w-36" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Category breakdown card */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <Skeleton className="h-3 w-40" />
          <div className="flex gap-6 items-center">
            <Skeleton className="w-[180px] h-[180px] rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Per-person card */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <Skeleton className="h-3 w-24" />
          <SpendingRowSkeleton />
          <SpendingRowSkeleton />
          <SpendingRowSkeleton />
        </div>
      </div>
    )
  }

  if (trips.error || expenses.error) {
    return (
      <div className="w-full max-w-3xl mx-auto pt-8 space-y-3">
        <button
          onClick={() => navigate(`/trips/${id}`)}
          className="text-sm text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{trips.error ?? expenses.error}</span>
          </div>
          <button
            onClick={() => { trips.fetchTrip(id!); expenses.fetchExpenses(id!) }}
            className="text-xs font-medium text-primary hover:opacity-70 shrink-0 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  const sortedDates = allExpenses.map(e => e.expenseDate).sort()
  const firstDate   = sortedDates[0]
  const lastDate    = sortedDates[sortedDates.length - 1]
  const dayCount    = firstDate && lastDate
    ? Math.max(1, Math.round((new Date(lastDate).getTime() - new Date(firstDate).getTime()) / 86_400_000) + 1)
    : 0

  const totalSpend   = expenses.totalAmount
  const avgPerPerson = trip.members.length > 0 ? totalSpend / trip.members.length : 0
  const avgPerDay    = dayCount > 0 ? totalSpend / dayCount : 0

  const largestExpense = allExpenses.reduce<typeof allExpenses[0] | null>(
    (max, e) => (!max || e.amountBase > max.amountBase) ? e : max, null
  )

  // Category chart data
  const categoryData = CATEGORY_ORDER
    .map(cat => {
      const catExp = allExpenses.filter(e => e.category === cat)
      const total  = catExp.reduce((s, e) => s + e.amountBase, 0)
      return { cat, label: CATEGORY_CONFIG[cat].label, total, count: catExp.length, pct: totalSpend > 0 ? (total / totalSpend) * 100 : 0 }
    })
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total)

  const topCategory = categoryData[0]

  // Daily spending chart data
  // Daily spending — zero-fill every day in the range, not just days with expenses
  const dailyData = (() => {
    if (!firstDate || !lastDate) return []
    const byDate: Record<string, number> = {}
    allExpenses.forEach(e => { byDate[e.expenseDate] = (byDate[e.expenseDate] ?? 0) + e.amountBase })
    const result: { date: string; total: number }[] = []
    const cur = new Date(firstDate + 'T12:00:00')
    const end = new Date(lastDate  + 'T12:00:00')
    while (cur <= end) {
      const key = cur.toISOString().split('T')[0]
      result.push({
        date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(cur),
        total: byDate[key] ?? 0,
      })
      cur.setDate(cur.getDate() + 1)
    }
    return result
  })()

  // Per-person chart data
  const memberContributions = toJS(trip.members)
    .map(member => {
      const paid      = allExpenses.filter(e => e.paidBy === member.userId).reduce((s, e) => s + e.amountBase, 0)
      const net       = toJS(balances.balances).find(b => b.userId === member.userId)?.netAmount ?? 0
      return { member, paid, fairShare: avgPerPerson, net, name: member.displayName }
    })
    .sort((a, b) => b.paid - a.paid)

  const getName = (uid: string) => trip.members.find(m => m.userId === uid)?.displayName ?? uid

  // ── Export helpers ────────────────────────────────────────────────────────

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
        `${pad(d.label, 14)} ${pad(formatCurrency(d.total, trip.baseCurrency), 14)} ${d.pct.toFixed(0)}%  (${d.count} expense${d.count !== 1 ? 's' : ''})`
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
    const headers = ['Date', 'Title', 'Category', 'Amount', 'Currency', `Base Amount (${trip.baseCurrency})`, 'Paid By', 'Split']
    const rows = allExpenses
      .slice().sort((a, b) => a.expenseDate.localeCompare(b.expenseDate))
      .map(e => [
        e.expenseDate,
        `"${e.title.replace(/"/g, '""')}"`,
        CATEGORY_CONFIG[e.category]?.label ?? e.category,
        e.amount, e.currency, e.amountBase.toFixed(2),
        getName(e.paidBy),
        `"${e.splits.map(s => `${getName(s.userId)} ${formatCurrency(s.amountOwed, trip.baseCurrency)}`).join(', ')}"`,
      ])
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${trip.name.replace(/\s+/g, '-')}-summary.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const typeConfig = CIRCLE_TYPE_CONFIG[trip.circleType] ?? CIRCLE_TYPE_CONFIG.trip
  const TypeIcon   = typeConfig.icon

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Back */}
      <button
        onClick={() => navigate(`/trips/${id}`)}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft size={15} />Back to {trip.name}
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
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground mt-1">
          {firstDate && <span>{formatDate(firstDate)} – {formatDate(lastDate)} · {dayCount} day{dayCount !== 1 ? 's' : ''}</span>}
          <span>·</span>
          <span>{trip.members.length} member{trip.members.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{allExpenses.length} expense{allExpenses.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>Base: {trip.baseCurrency}</span>
        </div>
      </div>

      {/* Export */}
      <div className="flex gap-2 mb-8">
        <button onClick={copyAsText} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy as text'}
        </button>
        <button onClick={downloadCSV} disabled={allExpenses.length === 0} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <Download size={14} />Download CSV
        </button>
      </div>

      {allExpenses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground text-sm">
          No expenses yet — add some to generate a summary.
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Financial Overview ── */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Financial Overview</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Wallet size={15} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total spend</p>
                  <p className="text-base font-bold mt-0.5 break-all leading-tight">{formatCurrency(totalSpend, trip.baseCurrency)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Users size={15} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Per person</p>
                  <p className="text-base font-bold mt-0.5 break-all leading-tight">{formatCurrency(avgPerPerson, trip.baseCurrency)}</p>
                </div>
              </div>
              {dayCount > 1 && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                    <CalendarDays size={15} className="text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Per day</p>
                    <p className="text-base font-bold mt-0.5 break-all leading-tight">{formatCurrency(avgPerDay, trip.baseCurrency)}</p>
                  </div>
                </div>
              )}
            </div>
            {(largestExpense || topCategory) && (
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
                {largestExpense && (
                  <span className="flex items-center gap-1.5">
                    <TrendingUp size={12} />
                    Largest: <span className="font-medium text-foreground">{largestExpense.title}</span>
                    ({formatCurrency(largestExpense.amountBase, trip.baseCurrency)})
                  </span>
                )}
                {topCategory && (
                  <span className="flex items-center gap-1.5">
                    <Tag size={12} />
                    Most spent: <span className="font-medium text-foreground">{topCategory.label}</span>
                    ({topCategory.pct.toFixed(0)}%)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Category Breakdown ── */}
          <ErrorBoundary fallback={<div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground text-center py-8">Chart failed to render</div>}>
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Spending by Category</h3>
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              {/* Donut chart */}
              <div className="shrink-0">
                <PieChart width={180} height={180}>
                  <Pie
                    data={categoryData}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    strokeWidth={2}
                    stroke="hsl(var(--card))"
                  >
                    {categoryData.map(d => (
                      <Cell key={d.cat} fill={CATEGORY_CONFIG[d.cat].color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number | undefined) => formatCurrency(v ?? 0, trip.baseCurrency)}
                  />
                </PieChart>
              </div>

              {/* Category list */}
              <div className="flex-1 w-full space-y-3">
                {categoryData.map(({ cat, label, total, count, pct }) => {
                  const cfg  = CATEGORY_CONFIG[cat]
                  const Icon = cfg.icon
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                          <Icon size={12} className="text-muted-foreground" />
                          {label}
                          <span className="text-xs font-normal text-muted-foreground">{count} exp{count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="text-sm text-right">
                          <span className="font-semibold">{formatCurrency(total, trip.baseCurrency)}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          </ErrorBoundary>

          {/* ── Daily Spending ── */}
          <ErrorBoundary fallback={<div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground text-center py-8">Chart failed to render</div>}>
          {dailyData.length > 0 && (() => {
            const BAR_W = window.innerWidth < 640 ? 64 : window.innerWidth < 1024 ? 52 : 44
            const chartW = Math.max(dailyData.length * BAR_W, 280)
            return (
              <div className="rounded-xl border bg-card p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Spending by Day</h3>
                <div
                  ref={dailyScrollRef}
                  className="overflow-x-auto"
                  style={{ scrollbarWidth: 'none' }}
                >
                  <div style={{ width: chartW }}>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={dailyData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                        <defs>
                          <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.5} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(v: number | undefined) => [formatCurrency(v ?? 0, trip.baseCurrency), 'Spend']}
                          cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                        />
                        <Bar dataKey="total" fill="url(#dailyGradient)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {dailyData.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">← scroll to see all days →</p>
                )}
              </div>
            )
          })()}

          </ErrorBoundary>

          {/* ── Per-Person Contribution ── */}
          <ErrorBoundary fallback={<div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground text-center py-8">Chart failed to render</div>}>
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Per Person</h3>

            {/* Horizontal bar chart */}
            {memberContributions.length > 1 && (
              <div className="mb-5">
                <ResponsiveContainer width="100%" height={memberContributions.length * 44 + 16}>
                  <BarChart
                    data={memberContributions}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={72}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number | undefined) => [formatCurrency(v ?? 0, trip.baseCurrency), 'Paid']}
                      cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                    />
                    <Bar dataKey="paid" name="Paid" radius={[0, 4, 4, 0]}>
                      {memberContributions.map((_, i) => (
                        <Cell key={i} fill={MEMBER_COLORS[i % MEMBER_COLORS.length]} />
                      ))}
                    </Bar>
                    {avgPerPerson > 0 && (
                      <ReferenceLine
                        x={avgPerPerson}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 3"
                        strokeWidth={1.5}
                        label={{ value: 'fair share', position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Per-person cards */}
            <div className="space-y-3">
              {memberContributions.map(({ member, paid, fairShare, net }, i) => {
                const pct    = totalSpend > 0 ? (paid / totalSpend) * 100 : 0
                const isOwed = net > 0
                const owes   = net < 0
                const color  = MEMBER_COLORS[i % MEMBER_COLORS.length]
                return (
                  <div key={member.userId} className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 text-white" style={{ backgroundColor: color }}>
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
                      <div className="h-full rounded-full opacity-70" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          </ErrorBoundary>

          {/* ── Settlement Status ── */}
          {(balances.suggestions.length > 0 || balances.settlements.length > 0) && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Settlement Status</h3>

              {balances.suggestions.length > 0 ? (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Clock size={12} />Outstanding
                  </p>
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
                <p className="text-sm text-green-600 font-medium mb-4 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />All payments settled
                </p>
              )}

              {balances.settlements.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={12} />Recorded payments
                  </p>
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
