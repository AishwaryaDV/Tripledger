// src/components/trip/BalanceSummary.tsx
import type { Balance } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface BalanceSummaryProps {
  balances: Balance[]
  baseCurrency: string
}

const BalanceSummary = ({ balances, baseCurrency }: BalanceSummaryProps) => {
  if (balances.length === 0) return (
    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
      No balances yet. Add an expense to get started.
    </div>
  )

  return (
    <div className="space-y-2">
      {balances.map(balance => (
        <div key={balance.userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-sm font-medium">{balance.displayName}</span>
          <div className="text-right">
            {balance.netAmount === 0 ? (
              <span className="text-sm text-muted-foreground">Settled up</span>
            ) : balance.netAmount > 0 ? (
              <span className="text-sm font-semibold text-green-600">
                gets back {formatCurrency(balance.netAmount, baseCurrency)}
              </span>
            ) : (
              <span className="text-sm font-semibold text-red-500">
                owes {formatCurrency(Math.abs(balance.netAmount), baseCurrency)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default BalanceSummary
