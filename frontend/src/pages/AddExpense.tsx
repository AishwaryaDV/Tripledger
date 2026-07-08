// src/pages/AddExpense.tsx
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { observer } from 'mobx-react-lite'
import { ArrowLeft, Camera, Sparkles, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/hooks/useStore'
import SplitEditor from '@/components/expense/SplitEditor'
import CustomSelect from '@/components/shared/CustomSelect'
import { Skeleton } from '@/components/shared/Skeleton'
import { api } from '@/lib/api'
import { getApiError } from '@/lib/utils'
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
  const { id, expenseId } = useParams<{ id: string; expenseId?: string }>()
  const isEditing = !!expenseId
  const navigate = useNavigate()
  const { trips, expenses, auth, currency } = useStore()

  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [splitKey, setSplitKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSelfExpense, setIsSelfExpense] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [wasScanned, setWasScanned] = useState(false)
  const [aiCategory, setAiCategory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const categoryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trip = trips.currentTrip
  const currentUserId = auth.currentUser?.id ?? ''

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<ExpenseFormValues>({
    defaultValues: {
      currency: trip?.baseCurrency ?? 'INR',
      expenseDate: new Date().toISOString().split('T')[0],
      category: 'food',
      paidBy: currentUserId,
    }
  })

  const watchedAmount = watch('amount')
  const watchedCurrency = watch('currency')

  // Fetch trip + expenses if not already loaded
  useEffect(() => {
    if (!id) return
    if (!trips.currentTrip) trips.fetchTrip(id)
    if (isEditing) expenses.fetchExpenses(id)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch rates when trip is known
  useEffect(() => {
    if (trip) currency.fetchRates(trip.baseCurrency)
  }, [trip?.baseCurrency]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill form for edit mode once expenses are loaded
  useEffect(() => {
    if (!isEditing || !expenseId) return
    // Only trust the store once it holds THIS trip's expenses — another trip's
    // cached list would make a perfectly valid expense look "not found".
    if (expenses.loadedTripId !== id) return
    const expense = expenses.expenses.find(e => e.id === expenseId)
    if (!expense) {
      toast.error('Expense not found')
      navigate(`/trips/${id}`, { replace: true })
      return
    }
    reset({
      title: expense.title,
      amount: expense.amount,
      currency: expense.currency,
      expenseDate: expense.expenseDate,
      category: expense.category,
      paidBy: expense.paidBy,
      notes: expense.notes ?? '',
    })
    setSplitType(expense.splitType)
    // Stored split amounts are in the trip's base currency; the form (and SplitEditor)
    // operate in the expense's original currency, so convert them back before prefilling.
    const toOriginal = expense.amountBase > 0 ? expense.amount / expense.amountBase : 1
    setSplits(expense.splits.map(s => ({
      ...s,
      amountOwed: Math.round(s.amountOwed * toOriginal * 100) / 100,
    })))
    setIsSelfExpense(expense.splits.length === 1 && expense.splits[0].userId === expense.paidBy)
    setSplitKey(k => k + 1) // remount SplitEditor with pre-filled data
  }, [isEditing, expenseId, expenses.loadedTripId, expenses.expenses.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const watchedTitle = watch('title')

  useEffect(() => {
    if (isEditing) return
    if (!watchedTitle || watchedTitle.trim().length < 3) return

    if (categoryDebounceRef.current) clearTimeout(categoryDebounceRef.current)

    categoryDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.post('/ai/suggest-category', { title: watchedTitle.trim() })
        if (data.category) {
          setValue('category', data.category)
          setAiCategory(true)
        }
      } catch {
        // fail silently — user keeps whatever category is selected
      }
    }, 500)

    return () => {
      if (categoryDebounceRef.current) clearTimeout(categoryDebounceRef.current)
    }
  }, [watchedTitle]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSplitChange = (newSplits: ExpenseSplit[], newSplitType: SplitType) => {
    setSplits(newSplits)
    setSplitType(newSplitType)
  }

  const onReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setScanError(null)
    setIsScanning(true)
    setWasScanned(false)

    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/ai/parse-receipt', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (data.title)    setValue('title', data.title)
      if (data.amount)   setValue('amount', data.amount)
      if (data.date)     setValue('expenseDate', data.date)
      if (data.category) setValue('category', data.category)
      if (data.notes)    setValue('notes', data.notes)

      // Only set currency if it's one of the trip's currencies
      if (data.currency && trip?.currencies.includes(data.currency)) {
        setValue('currency', data.currency)
      }

      setWasScanned(true)
    } catch (err: any) {
      setScanError(getApiError(err, 'Could not read the receipt — try a clearer photo'))
    } finally {
      setIsScanning(false)
    }
  }

  const onSubmit = async (data: ExpenseFormValues) => {
    if (!id) return
    setIsSubmitting(true)

    if (!isSelfExpense) {
      if (splits.length === 0) {
        toast.error('Select at least one person to split with')
        setIsSubmitting(false)
        return
      }
      const splitTotal = splits.reduce((sum, s) => sum + s.amountOwed, 0)
      if (Math.abs(splitTotal - Number(data.amount)) > 0.02) {
        toast.error(`Splits must add up to ${Number(data.amount).toFixed(2)} ${data.currency} (currently ${splitTotal.toFixed(2)})`)
        setIsSubmitting(false)
        return
      }
    }

    const rateAvailable = data.currency === trip!.baseCurrency || currency.getRate(data.currency, trip!.baseCurrency) != null
    if (!rateAvailable) {
      toast.error(`Exchange rate for ${data.currency} is unavailable — rates haven't loaded yet. Try again in a moment.`)
      setIsSubmitting(false)
      return
    }
    const rate = currency.getRate(data.currency, trip!.baseCurrency) ?? 1
    const amountBase = currency.convert(Number(data.amount), data.currency, trip!.baseCurrency) ?? Number(data.amount)

    // Convert split amountOwed values from original currency to base currency.
    // SplitEditor works in the expense's original currency for display; the backend
    // balance service expects every amountOwed to be in the trip's base currency.
    const scalingFactor = Number(data.amount) > 0 ? amountBase / Number(data.amount) : 1
    const finalSplits: ExpenseSplit[] = isSelfExpense
      ? [{ userId: currentUserId, amountOwed: amountBase, isSettled: false }]
      : splits.map(s => ({ ...s, amountOwed: s.amountOwed > 0 ? s.amountOwed * scalingFactor : 0 }))

    const payload = {
      title: data.title,
      amount: Number(data.amount),
      currency: data.currency,
      amountBase,
      exchangeRate: rate,
      category: data.category,
      splitType: isSelfExpense ? ('exact' as SplitType) : splitType,
      splits: finalSplits,
      paidBy: isSelfExpense ? currentUserId : data.paidBy,
      expenseDate: data.expenseDate,
      notes: data.notes || undefined,
      tripId: id,
    }

    try {
      if (isEditing && expenseId) {
        await expenses.editExpense(id, expenseId, payload)
      } else {
        await expenses.addExpense(id, payload)
      }
      toast.success(isEditing ? 'Expense updated' : 'Expense added')
      navigate(`/trips/${id}`)
    } catch (err: any) {
      toast.error(getApiError(err, 'Failed to save expense'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!trip) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <Skeleton className="h-4 w-24 mb-6" />
        <Skeleton className="h-8 w-40 mb-8" />
        <div className="space-y-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 flex-1 rounded-lg" />
          </div>
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(`/trips/${id}`)}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to {trip.name}
      </button>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">{isEditing ? 'Edit Expense' : 'Add Expense'}</h2>

        {!isEditing && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onReceiptFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Camera size={15} />
              {isScanning ? 'Reading...' : 'Scan Receipt'}
            </button>
          </>
        )}
      </div>

      {wasScanned && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 mb-4">
          <Sparkles size={13} />
          Filled from receipt — review and adjust before saving
        </div>
      )}

      {scanError && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4">
          {scanError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Self expense toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={isSelfExpense}
            onChange={e => setIsSelfExpense(e.target.checked)}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-sm flex items-center gap-1.5 text-muted-foreground">
            <UserRound size={14} />
            Personal expense — just for me
          </span>
        </label>

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
            <CustomSelect
              value={watchedCurrency || trip.baseCurrency}
              onChange={v => setValue('currency', v)}
              options={trip.currencies.map(c => ({ value: c, label: c }))}
              className="w-full"
              buttonClassName="py-2"
            />
          </div>
        </div>

        {/* Inline base currency conversion hint */}
        {watchedCurrency && watchedCurrency !== trip.baseCurrency && Number(watchedAmount) > 0 && (() => {
          const converted = currency.convert(Number(watchedAmount), watchedCurrency, trip.baseCurrency)
          const rate = currency.getRate(watchedCurrency, trip.baseCurrency)
          return converted !== null ? (
            <p className="text-xs text-muted-foreground -mt-3">
              = {new Intl.NumberFormat('en-US', { style: 'currency', currency: trip.baseCurrency }).format(converted)}
              <span className="ml-2 opacity-70">
                (1 {watchedCurrency} = {new Intl.NumberFormat('en-US', { style: 'currency', currency: trip.baseCurrency, maximumSignificantDigits: 4 }).format(rate!)})
              </span>
            </p>
          ) : (
            <p className="text-xs text-amber-600 -mt-3">Rate not available — saving disabled until rates load</p>
          )
        })()}

        {/* Category + Date */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
              Category
              {aiCategory && (
                <span className="flex items-center gap-0.5 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                  <Sparkles size={11} />
                  AI
                </span>
              )}
            </label>
            <CustomSelect
              value={watch('category')}
              onChange={v => { setValue('category', v as ExpenseCategory); setAiCategory(false) }}
              options={CATEGORIES}
              className="w-full"
              buttonClassName="py-2"
            />
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

        {/* Paid by — hidden when self expense */}
        {!isSelfExpense && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Paid by</label>
            <CustomSelect
              value={watch('paidBy')}
              onChange={v => setValue('paidBy', v, { shouldValidate: true })}
              options={trip.members.map(m => ({ value: m.userId, label: m.displayName }))}
              className="w-full"
            />
          </div>
        )}

        {/* Split section */}
        <div>
          <label className="block text-sm font-medium mb-3">Split</label>
          {isSelfExpense ? (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <UserRound size={15} />
              Only you — this won't affect anyone else's balance.
            </div>
          ) : (
            <SplitEditor
              key={splitKey}
              members={trip.members}
              totalAmount={Number(watchedAmount) || 0}
              currency={watchedCurrency || trip.baseCurrency}
              onChange={onSplitChange}
              initialSplits={isEditing ? splits : undefined}
              initialSplitType={isEditing ? splitType : undefined}
            />
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Notes <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
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
            disabled={isSubmitting || (!!watchedCurrency && watchedCurrency !== trip.baseCurrency && currency.getRate(watchedCurrency, trip.baseCurrency) == null)}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting
              ? (isEditing ? 'Saving...' : 'Adding...')
              : (isEditing ? 'Save Changes' : 'Add Expense')}
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
