// src/components/expense/ExpenseCard.tsx
import type { Expense, TripMember } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

const CATEGORY_STYLES: Record<string, string> = {
  food:          'bg-orange-100 text-orange-700',
  transport:     'bg-blue-100 text-blue-700',
  accommodation: 'bg-purple-100 text-purple-700',
  activities:    'bg-green-100 text-green-700',
  other:         'bg-gray-100 text-gray-600',
}

interface ExpenseCardProps {
  expense: Expense
  members: TripMember[]
}

const ExpenseCard = ({ expense, members }: ExpenseCardProps) => {
  const paidByMember = members.find(m => m.userId === expense.paidBy)
  const paidByName = paidByMember?.displayName ?? 'Unknown'
  const categoryStyle = CATEGORY_STYLES[expense.category] ?? CATEGORY_STYLES.other

  return (
    <div className="p-4 rounded-xl border bg-card text-card-foreground flex items-center gap-4">

      {/* Category badge */}
      <div className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 capitalize ${categoryStyle}`}>
        {expense.category}
      </div>

      {/* Middle: title + meta */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{expense.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Paid by <span className="font-medium text-foreground">{paidByName}</span>
          {' · '}{formatDate(expense.expenseDate)}
          {' · '}<span className="capitalize">{expense.splitType} split</span>
        </p>
      </div>

      {/* Right: amounts */}
      <div className="text-right shrink-0">
        <p className="font-semibold">{formatCurrency(expense.amount, expense.currency)}</p>
        {expense.currency !== 'INR' && (
          <p className="text-xs text-muted-foreground">
            {formatCurrency(expense.amountBase, 'INR')}
          </p>
        )}
      </div>

    </div>
  )
}

export default ExpenseCard
