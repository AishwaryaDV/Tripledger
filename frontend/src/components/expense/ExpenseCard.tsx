// src/components/expense/ExpenseCard.tsx
import { Pencil, Trash2, UtensilsCrossed, Car, BedDouble, Ticket, Package } from 'lucide-react'
import type { Expense, TripMember } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

const MEMBER_COLORS = ['#818cf8','#f472b6','#34d399','#fb923c','#60a5fa','#a78bfa','#facc15','#2dd4bf']

const CATEGORY_STYLES: Record<string, string> = {
  food:          'bg-orange-100 text-orange-700',
  transport:     'bg-blue-100 text-blue-700',
  accommodation: 'bg-purple-100 text-purple-700',
  activities:    'bg-green-100 text-green-700',
  other:         'bg-gray-100 text-gray-600',
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  food:          UtensilsCrossed,
  transport:     Car,
  accommodation: BedDouble,
  activities:    Ticket,
  other:         Package,
}

const CATEGORY_LABELS: Record<string, string> = {
  food:          'Food',
  transport:     'Transport',
  accommodation: 'Stay',
  activities:    'Activities',
  other:         'Other',
}


interface ExpenseCardProps {
  expense: Expense
  members: TripMember[]
  baseCurrency: string
  onEdit: () => void
  onDelete: () => void
}

const ExpenseCard = ({ expense, members, baseCurrency, onEdit, onDelete }: ExpenseCardProps) => {
  const paidByMember = members.find(m => m.userId === expense.paidBy)
  const paidByName = paidByMember?.displayName ?? 'Unknown'
  const categoryStyle = CATEGORY_STYLES[expense.category] ?? CATEGORY_STYLES.other
  const CategoryIcon = CATEGORY_ICONS[expense.category] ?? Package

  const getMemberName = (userId: string) =>
    members.find(m => m.userId === userId)?.displayName ?? userId

  const getMemberColor = (userId: string) =>
    MEMBER_COLORS[members.findIndex(m => m.userId === userId) % MEMBER_COLORS.length] ?? MEMBER_COLORS[0]

  const visibleSplits = expense.splits.slice(0, 3)
  const extraCount = expense.splits.length - 3

  return (
    <div className="p-4 rounded-xl border bg-card text-card-foreground">
      <div className="flex items-start gap-3">

        {/* Category badge with icon */}
        <div className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 mt-0.5 ${categoryStyle}`}>
          <CategoryIcon size={11} />
          <span>{CATEGORY_LABELS[expense.category] ?? expense.category}</span>
        </div>

        {/* Middle: title + meta + pills */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{expense.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paid by <span className="font-medium text-foreground">{paidByName}</span>
            {' · '}{formatDate(expense.expenseDate)}
          </p>

          {/* Split pills */}
          {expense.splits.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {visibleSplits.map(s => {
                const color = getMemberColor(s.userId)
                return (
                  <span
                    key={s.userId}
                    className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}50` }}
                  >
                    {getMemberName(s.userId)}
                    <span style={{ opacity: 0.75 }}>−{formatCurrency(s.amountOwed, baseCurrency)}</span>
                  </span>
                )
              })}
              {extraCount > 0 && (
                <span className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                  +{extraCount} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: amount + edit/delete */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className="font-semibold">{formatCurrency(expense.amountBase, baseCurrency)}</p>
          {expense.currency !== baseCurrency && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(expense.amount, expense.currency)}
            </p>
          )}

          <div className="flex items-center gap-0.5 mt-1">
            <button
              onClick={onEdit}
              title="Edit expense"
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={onDelete}
              title="Delete expense"
              className="p-1 rounded hover:bg-muted text-destructive transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ExpenseCard
