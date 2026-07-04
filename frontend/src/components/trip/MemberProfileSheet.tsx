// src/components/trip/MemberProfileSheet.tsx
import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { X, Bell, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/hooks/useStore'
import { formatCurrency, getApiError } from '@/lib/utils'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import type { TripMember, Balance, SettlementSuggestion, Expense } from '@/types'

const MEMBER_COLORS = ['#818cf8','#f472b6','#34d399','#fb923c','#60a5fa','#a78bfa','#facc15','#2dd4bf']

interface Props {
  member: TripMember
  memberIndex: number
  allMembers: TripMember[]
  tripId: string
  baseCurrency: string
  balance: Balance | undefined
  suggestions: SettlementSuggestion[]
  expenses: Expense[]
  onClose: () => void
}

const MemberProfileSheet = observer(({
  member,
  memberIndex,
  allMembers,
  tripId,
  baseCurrency,
  balance,
  suggestions,
  expenses,
  onClose,
}: Props) => {
  const memberName = (uid: string) =>
    allMembers.find(m => m.userId === uid)?.displayName ?? uid.slice(0, 8) + '…'
  const { auth } = useStore()
  const [reminding, setReminding] = useState(false)

  const isMe = member.userId === auth.currentUser?.id
  const color = MEMBER_COLORS[memberIndex % MEMBER_COLORS.length]
  const initial = member.displayName.charAt(0).toUpperCase()

  const net = balance?.netAmount ?? 0
  const paidExpenses = expenses.filter(e => e.paidBy === member.userId)
  const totalPaid = paidExpenses.reduce((sum, e) => sum + e.amountBase, 0)
  const involvedExpenses = expenses.filter(e =>
    e.splits.some(s => s.userId === member.userId)
  )

  // Suggestions involving this member
  const owedToThem = suggestions.filter(s => s.toUserId === member.userId)
  const theyOwe = suggestions.filter(s => s.fromUserId === member.userId)

  const handleRemind = async () => {
    setReminding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await api.post(
        `/trips/${tripId}/members/${member.userId}/remind`,
        {},
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      )
      toast.success(`Reminder sent to ${member.displayName}.`)
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to send reminder.'))
    } finally {
      setReminding(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-xl"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) forwards' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            {member.avatarUrl ? (
              <img src={member.avatarUrl} alt={member.displayName} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ backgroundColor: color }}
              >
                {initial}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-base">{member.displayName}</p>
                {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                member.role === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
              }`}>
                {member.role}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-8 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Net balance card */}
          <div className={`rounded-xl p-4 flex items-center gap-3 ${
            net > 0 ? 'bg-green-50 border border-green-100' :
            net < 0 ? 'bg-red-50 border border-red-100' :
            'bg-muted/50 border'
          }`}>
            {net > 0 ? <TrendingUp size={20} className="text-green-600 shrink-0" /> :
             net < 0 ? <TrendingDown size={20} className="text-red-500 shrink-0" /> :
             <Minus size={20} className="text-muted-foreground shrink-0" />}
            <div>
              <p className="text-xs text-muted-foreground">
                {net > 0 ? 'Is owed' : net < 0 ? 'Owes' : 'All settled'}
              </p>
              <p className={`text-xl font-bold ${
                net > 0 ? 'text-green-700' : net < 0 ? 'text-red-600' : 'text-foreground'
              }`}>
                {net === 0 ? '–' : formatCurrency(Math.abs(net), baseCurrency)}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-background p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Total paid</p>
              <p className="text-sm font-semibold">{formatCurrency(totalPaid, baseCurrency)}</p>
            </div>
            <div className="rounded-xl border bg-background p-3">
              <p className="text-xs text-muted-foreground mb-0.5">In expenses</p>
              <p className="text-sm font-semibold">{involvedExpenses.length}</p>
            </div>
          </div>

          {/* Settlement obligations */}
          {(owedToThem.length > 0 || theyOwe.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suggested settlements</p>
              {owedToThem.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
                  <span className="text-muted-foreground truncate">
                    Receiving from <span className="font-medium text-foreground">{memberName(s.fromUserId)}</span>
                  </span>
                  <span className="font-semibold text-green-700 ml-2 shrink-0">{formatCurrency(s.amount, s.currency)}</span>
                </div>
              ))}
              {theyOwe.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
                  <span className="text-muted-foreground truncate">
                    Owes <span className="font-medium text-foreground">{memberName(s.toUserId)}</span>
                  </span>
                  <span className="font-semibold text-red-600 ml-2 shrink-0">{formatCurrency(s.amount, s.currency)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Remind button — only for others */}
          {!isMe && (
            <button
              onClick={handleRemind}
              disabled={reminding}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Bell size={15} />
              {reminding ? 'Sending...' : `Remind ${member.displayName}`}
            </button>
          )}

        </div>
      </div>
    </>
  )
})

export default MemberProfileSheet
