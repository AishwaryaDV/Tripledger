// src/components/trip/SettleSuggestions.tsx
import { PartyPopper } from 'lucide-react'
import type { SettlementSuggestion, TripMember } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface SettleSuggestionsProps {
  suggestions: SettlementSuggestion[]
  members: TripMember[]
}

const SettleSuggestions = ({ suggestions, members }: SettleSuggestionsProps) => {
  if (suggestions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
        <PartyPopper size={24} className="mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">Everyone is settled up!</p>
      </div>
    )
  }

  const getName = (userId: string) =>
    members.find(m => m.userId === userId)?.displayName ?? userId

  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="text-sm">
            <span className="font-medium">{getName(s.fromUserId)}</span>
            <span className="text-muted-foreground mx-2">→</span>
            <span className="font-medium">{getName(s.toUserId)}</span>
          </div>
          <span className="text-sm font-semibold">
            {formatCurrency(s.amount, s.currency)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default SettleSuggestions
