// src/components/expense/SplitEditor.tsx
import { useState, useEffect } from 'react'
import type { TripMember, ExpenseSplit, SplitType } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface SplitEditorProps {
  members: TripMember[]
  totalAmount: number
  currency: string
  onChange: (splits: ExpenseSplit[], splitType: SplitType) => void
}

type ModeValues = Record<string, number>

const MODES: { key: SplitType; label: string }[] = [
  { key: 'equal',      label: 'Equal' },
  { key: 'exact',      label: 'Exact' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'shares',     label: 'Shares' },
]

const SplitEditor = ({ members, totalAmount, currency, onChange }: SplitEditorProps) => {
  const [mode, setMode] = useState<SplitType>('equal')

  // Equal mode — track who's included
  const [included, setIncluded] = useState<Set<string>>(
    new Set(members.map(m => m.userId))
  )

  // Exact / Percentage / Shares — per-member numeric values
  const [values, setValues] = useState<ModeValues>(
    Object.fromEntries(members.map(m => [m.userId, 0]))
  )

  // Recompute and notify parent whenever inputs change
  useEffect(() => {
    const splits = computeSplits()
    onChange(splits, mode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, included, values, totalAmount])

  const computeSplits = (): ExpenseSplit[] => {
    if (mode === 'equal') {
      const includedIds = [...included]
      if (includedIds.length === 0) return []
      const share = totalAmount / includedIds.length
      return members.map(m => ({
        userId: m.userId,
        amountOwed: included.has(m.userId) ? share : 0,
        isSettled: false,
      }))
    }

    if (mode === 'exact') {
      return members.map(m => ({
        userId: m.userId,
        amountOwed: values[m.userId] ?? 0,
        isSettled: false,
      }))
    }

    if (mode === 'percentage') {
      return members.map(m => ({
        userId: m.userId,
        amountOwed: ((values[m.userId] ?? 0) / 100) * totalAmount,
        shareValue: values[m.userId] ?? 0,
        isSettled: false,
      }))
    }

    if (mode === 'shares') {
      const totalShares = members.reduce((sum, m) => sum + (values[m.userId] ?? 0), 0)
      return members.map(m => ({
        userId: m.userId,
        amountOwed: totalShares > 0
          ? ((values[m.userId] ?? 0) / totalShares) * totalAmount
          : 0,
        shareValue: values[m.userId] ?? 0,
        isSettled: false,
      }))
    }

    return []
  }

  // ── Cross-mode conversion ─────────────────────────────────────────────────

  const convertValues = (from: SplitType, to: SplitType): ModeValues => {
    const result: ModeValues = Object.fromEntries(members.map(m => [m.userId, 0]))

    if (from === 'equal') {
      const count = included.size
      if (count === 0) return result

      if (to === 'percentage') {
        const pct = parseFloat((100 / count).toFixed(4))
        members.forEach(m => { result[m.userId] = included.has(m.userId) ? pct : 0 })
      } else if (to === 'exact') {
        const share = totalAmount > 0 ? parseFloat((totalAmount / count).toFixed(2)) : 0
        members.forEach(m => { result[m.userId] = included.has(m.userId) ? share : 0 })
      } else if (to === 'shares') {
        members.forEach(m => { result[m.userId] = included.has(m.userId) ? 1 : 0 })
      }

    } else if (from === 'exact') {
      if (to === 'percentage') {
        members.forEach(m => {
          result[m.userId] = totalAmount > 0
            ? parseFloat(((values[m.userId] ?? 0) / totalAmount * 100).toFixed(2))
            : 0
        })
      } else if (to === 'shares') {
        // Use exact amounts directly as proportional share values
        members.forEach(m => { result[m.userId] = parseFloat((values[m.userId] ?? 0).toFixed(2)) })
      }

    } else if (from === 'percentage') {
      if (to === 'exact') {
        members.forEach(m => {
          result[m.userId] = parseFloat(((values[m.userId] ?? 0) / 100 * totalAmount).toFixed(2))
        })
      } else if (to === 'shares') {
        // Round percentages to nearest integer share
        members.forEach(m => { result[m.userId] = Math.round(values[m.userId] ?? 0) })
      }

    } else if (from === 'shares') {
      const totalShares = members.reduce((s, m) => s + (values[m.userId] ?? 0), 0)
      if (to === 'percentage') {
        members.forEach(m => {
          result[m.userId] = totalShares > 0
            ? parseFloat(((values[m.userId] ?? 0) / totalShares * 100).toFixed(2))
            : 0
        })
      } else if (to === 'exact') {
        members.forEach(m => {
          result[m.userId] = totalShares > 0
            ? parseFloat(((values[m.userId] ?? 0) / totalShares * totalAmount).toFixed(2))
            : 0
        })
      }
    }

    return result
  }

  const switchMode = (newMode: SplitType) => {
    if (newMode === mode) return

    if (newMode === 'equal') {
      // Include whoever had a non-zero value in the previous mode
      if (mode !== 'equal') {
        const hasAnyValue = members.some(m => (values[m.userId] ?? 0) > 0)
        if (hasAnyValue) {
          setIncluded(new Set(members.filter(m => (values[m.userId] ?? 0) > 0).map(m => m.userId)))
        }
        // if all values were 0, keep current included set as-is
      }
      setMode(newMode)
      return
    }

    setValues(convertValues(mode, newMode))
    setMode(newMode)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const setValue = (userId: string, val: number) => {
    setValues(prev => ({ ...prev, [userId]: val }))
  }

  const toggleIncluded = (userId: string) => {
    setIncluded(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  // Validation helpers
  const exactSum = members.reduce((s, m) => s + (values[m.userId] ?? 0), 0)
  const exactRemaining = totalAmount - exactSum

  const pctSum = members.reduce((s, m) => s + (values[m.userId] ?? 0), 0)
  const pctRemaining = 100 - pctSum

  const totalShares = members.reduce((s, m) => s + (values[m.userId] ?? 0), 0)

  return (
    <div>
      {/* Mode tabs */}
      <div className="flex border-b mb-4">
        {MODES.map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() => switchMode(m.key)}
            className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
              mode === m.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m.label}
            {mode === m.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Equal mode */}
      {mode === 'equal' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            {included.size > 0
              ? `${formatCurrency(totalAmount / included.size, currency)} per person · ${included.size} of ${members.length} included`
              : 'Select at least one person'}
          </p>
          {members.map(m => (
            <label
              key={m.userId}
              className="flex items-center justify-between p-3 rounded-lg border bg-card cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={included.has(m.userId)}
                  onChange={() => toggleIncluded(m.userId)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium">{m.displayName}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {included.has(m.userId)
                  ? formatCurrency(totalAmount / included.size, currency)
                  : '—'}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Exact mode */}
      {mode === 'exact' && (
        <div className="space-y-2">
          <div className={`text-xs mb-3 font-medium ${
            Math.abs(exactRemaining) < 0.01
              ? 'text-green-600'
              : exactRemaining < 0
              ? 'text-destructive'
              : 'text-muted-foreground'
          }`}>
            {Math.abs(exactRemaining) < 0.01
              ? '✓ Splits balance perfectly'
              : exactRemaining > 0
              ? `${formatCurrency(exactRemaining, currency)} remaining`
              : `${formatCurrency(Math.abs(exactRemaining), currency)} over budget`}
          </div>
          {members.map(m => (
            <div key={m.userId} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <span className="text-sm font-medium flex-1">{m.displayName}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values[m.userId] ?? 0}
                onChange={e => setValue(m.userId, parseFloat(e.target.value) || 0)}
                className="w-28 text-right text-sm border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      )}

      {/* Percentage mode */}
      {mode === 'percentage' && (
        <div className="space-y-2">
          <div className={`text-xs mb-3 font-medium ${
            Math.abs(pctRemaining) < 0.01
              ? 'text-green-600'
              : pctRemaining < 0
              ? 'text-destructive'
              : 'text-muted-foreground'
          }`}>
            {Math.abs(pctRemaining) < 0.01
              ? '✓ 100% allocated'
              : pctRemaining > 0
              ? `${pctRemaining.toFixed(1)}% remaining`
              : `${Math.abs(pctRemaining).toFixed(1)}% over`}
          </div>
          {members.map(m => (
            <div key={m.userId} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="flex-1">
                <span className="text-sm font-medium">{m.displayName}</span>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(((values[m.userId] ?? 0) / 100) * totalAmount, currency)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={values[m.userId] ?? 0}
                  onChange={e => setValue(m.userId, parseFloat(e.target.value) || 0)}
                  className="w-20 text-right text-sm border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shares mode */}
      {mode === 'shares' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            {totalShares > 0
              ? `${totalShares} total shares · ${formatCurrency(totalAmount / totalShares, currency)} per share`
              : 'Assign shares to each person'}
          </p>
          {members.map(m => {
            const share = values[m.userId] ?? 0
            const amount = totalShares > 0 ? (share / totalShares) * totalAmount : 0
            return (
              <div key={m.userId} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <span className="text-sm font-medium">{m.displayName}</span>
                  <p className="text-xs text-muted-foreground">
                    {totalShares > 0 ? formatCurrency(amount, currency) : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={share}
                    onChange={e => setValue(m.userId, parseInt(e.target.value) || 0)}
                    className="w-20 text-right text-sm border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">shares</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SplitEditor
