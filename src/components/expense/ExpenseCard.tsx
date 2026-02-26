// src/components/expense/ExpenseCard.tsx
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Trash2, UtensilsCrossed, Car, BedDouble, Ticket, Package, AlertTriangle } from 'lucide-react'
import type { Expense, TripMember } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

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

interface DeleteModalProps {
  expense: Expense
  baseCurrency: string
  onConfirm: () => void
  onCancel: () => void
}

const DeleteModal = ({ expense, baseCurrency, onConfirm, onCancel }: DeleteModalProps) => {
  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      <div
        className="bg-card border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Delete expense?</h3>
            <p className="text-sm text-muted-foreground mt-0.5">This can't be undone.</p>
          </div>
        </div>

        {/* Expense summary */}
        <div className="rounded-lg bg-muted/50 border px-4 py-3 space-y-1">
          <p className="font-medium text-sm">{expense.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(expense.amount, expense.currency)}
            {expense.currency !== baseCurrency && (
              <span className="ml-1 opacity-70">
                · {formatCurrency(expense.amountBase, baseCurrency)}
              </span>
            )}
            {' · '}{formatDate(expense.expenseDate)}
          </p>
          <p className="text-xs text-muted-foreground">
            {expense.splits.length} participant{expense.splits.length !== 1 ? 's' : ''} affected
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

interface ExpenseCardProps {
  expense: Expense
  members: TripMember[]
  baseCurrency: string
  onEdit: () => void
  onDelete: () => void
}

const ExpenseCard = ({ expense, members, baseCurrency, onEdit, onDelete }: ExpenseCardProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const paidByMember = members.find(m => m.userId === expense.paidBy)
  const paidByName = paidByMember?.displayName ?? 'Unknown'
  const categoryStyle = CATEGORY_STYLES[expense.category] ?? CATEGORY_STYLES.other
  const CategoryIcon = CATEGORY_ICONS[expense.category] ?? Package

  const getMemberName = (userId: string) =>
    members.find(m => m.userId === userId)?.displayName ?? userId

  const visibleSplits = expense.splits.slice(0, 3)
  const extraCount = expense.splits.length - 3

  const handleConfirmDelete = () => {
    setShowDeleteModal(false)
    onDelete()
  }

  return (
    <>
      <div className="p-4 rounded-xl border bg-card text-card-foreground">
        <div className="flex items-start gap-3">

          {/* Category badge with icon */}
          <div className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 capitalize mt-0.5 ${categoryStyle}`}>
            <CategoryIcon size={11} />
            <span>{expense.category}</span>
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
              <div className="flex flex-wrap gap-1 mt-2">
                {visibleSplits.map(s => (
                  <span
                    key={s.userId}
                    className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium"
                  >
                    {getMemberName(s.userId)} −{formatCurrency(s.amountOwed, baseCurrency)}
                  </span>
                ))}
                {extraCount > 0 && (
                  <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                    +{extraCount} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: amount + edit/delete */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="font-semibold">{formatCurrency(expense.amount, expense.currency)}</p>
            {expense.currency !== baseCurrency && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(expense.amountBase, baseCurrency)}
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
                onClick={() => setShowDeleteModal(true)}
                title="Delete expense"
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

        </div>
      </div>

      {showDeleteModal && (
        <DeleteModal
          expense={expense}
          baseCurrency={baseCurrency}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  )
}

export default ExpenseCard
