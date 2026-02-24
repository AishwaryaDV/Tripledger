// src/pages/AddExpense.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { observer } from 'mobx-react-lite'
import { useStore } from '@/hooks/useStore'
import SplitEditor from '@/components/expense/SplitEditor'
import type { ExpenseSplit, SplitType, ExpenseCategory } from '@/types'

interface ExpenseFormValues {
  title: string
  amount: number
  currency: string
  expenseDate: string
  category: ExpenseCategory
  paidBy: string
  notes: string
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'food',          label: 'Food & Drink' },
  { value: 'transport',     label: 'Transport' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'activities',    label: 'Activities' },
  { value: 'other',         label: 'Other' },
]

const AddExpense = observer(() => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { trips, expenses, auth, currency } = useStore()

  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trip = trips.currentTrip

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ExpenseFormValues>({
    defaultValues: {
      currency: trip?.baseCurrency ?? 'INR',
      expenseDate: new Date().toISOString().split('T')[0],
      category: 'food',
      paidBy: auth.currentUser?.id ?? '',
    }
  })

  const watchedAmount = watch('amount')
  const watchedCurrency = watch('currency')

  // Fetch trip if not already loaded
  useEffect(() => {
    if (!id) return
    if (!trips.currentTrip) trips.fetchTrip(id)
  }, [id, trips])

  // Fetch rates when trip is known
  useEffect(() => {
    if (trip) currency.fetchRates(trip.baseCurrency)
  }, [trip?.baseCurrency, currency])

  const onSplitChange = (newSplits: ExpenseSplit[], newSplitType: SplitType) => {
    setSplits(newSplits)
    setSplitType(newSplitType)
  }

  const onSubmit = async (data: ExpenseFormValues) => {
    if (!id) return
    setIsSubmitting(true)

    const rate = currency.getRate(data.currency) ?? 1
    const amountBase = currency.convert(Number(data.amount), data.currency) ?? Number(data.amount)

    await expenses.addExpense(id, {
      title: data.title,
      amount: Number(data.amount),
      currency: data.currency,
      amountBase,
      exchangeRate: rate,
      category: data.category,
      splitType,
      splits,
      paidBy: data.paidBy,
      expenseDate: data.expenseDate,
      notes: data.notes || undefined,
      tripId: id,
    })

    setIsSubmitting(false)
    navigate(`/trips/${id}`)
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(`/trips/${id}`)}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back to {trip.name}
      </button>

      <h2 className="text-3xl font-bold mb-8">Add Expense</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1.5">What was it for?</label>
          <input
            {...register('title', { required: 'Title is required' })}
            placeholder="e.g. Beach Shack Dinner"
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
        </div>

        {/* Amount + Currency */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5">Amount</label>
            <input
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 0.01, message: 'Must be greater than 0' }
              })}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
          </div>

          <div className="w-32">
            <label className="block text-sm font-medium mb-1.5">Currency</label>
            <select
              {...register('currency')}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {trip.currencies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Inline base currency conversion hint */}
        {watchedCurrency && watchedCurrency !== trip.baseCurrency && Number(watchedAmount) > 0 && (() => {
          const converted = currency.convert(Number(watchedAmount), watchedCurrency)
          const rate = currency.getRate(watchedCurrency)
          return converted !== null ? (
            <p className="text-xs text-muted-foreground -mt-3">
              = {new Intl.NumberFormat('en-US', { style: 'currency', currency: trip.baseCurrency }).format(converted)}
              <span className="ml-2 opacity-70">
                (1 {watchedCurrency} = {new Intl.NumberFormat('en-US', { style: 'currency', currency: trip.baseCurrency }).format(rate!)})
              </span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground -mt-3">Rate not available — will use 1:1</p>
          )
        })()}

        {/* Category + Date */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5">Category</label>
            <select
              {...register('category')}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5">Date</label>
            <input
              {...register('expenseDate', { required: 'Date is required' })}
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Paid by */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Paid by</label>
          <select
            {...register('paidBy', { required: true })}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {trip.members.map(m => (
              <option key={m.userId} value={m.userId}>{m.displayName}</option>
            ))}
          </select>
        </div>

        {/* Split Editor */}
        <div>
          <label className="block text-sm font-medium mb-3">Split</label>
          <SplitEditor
            members={trip.members}
            totalAmount={Number(watchedAmount) || 0}
            currency={watchedCurrency || trip.baseCurrency}
            onChange={onSplitChange}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            {...register('notes')}
            placeholder="Any extra details..."
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Expense'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/trips/${id}`)}
            className="px-6 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  )
})

export default AddExpense
