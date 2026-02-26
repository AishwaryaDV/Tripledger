// src/pages/TripDetail.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { ArrowLeft, Plus, Copy, Check, RefreshCw, CreditCard, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import ExpenseCard from '@/components/expense/ExpenseCard'
import BalanceSummary from '@/components/trip/BalanceSummary'
import SettleSuggestions from '@/components/trip/SettleSuggestions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ExpenseCardSkeleton, BalanceRowSkeleton } from '@/components/shared/Skeleton'

type Tab = 'expenses' | 'balances' | 'suggestions' | 'spending' | 'notes'

const TABS: { key: Tab; label: string }[] = [
  { key: 'expenses',    label: 'Expenses' },
  { key: 'balances',    label: 'Balances' },
  { key: 'suggestions', label: 'Suggested Payments' },
  { key: 'spending',    label: 'Spending' },
  { key: 'notes',       label: 'Notes' },
]

const TripDetail = observer(() => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { trips, expenses, balances, auth, currency, notes } = useStore()
  const [activeTab, setActiveTab] = useState<Tab>('expenses')
  const [confirmReopen, setConfirmReopen] = useState<'reopen' | 'add' | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  useEffect(() => {
    if (!id) return
    trips.fetchTrip(id)
    expenses.fetchExpenses(id)
    balances.fetchBalances(id)
    notes.fetchNotes(id)
  }, [id, trips, expenses, balances, notes])

  // Auto-fetch rates once trip is loaded (if stale or base changed)
  useEffect(() => {
    if (trips.currentTrip) {
      currency.fetchRates(trips.currentTrip.baseCurrency)
    }
  }, [trips.currentTrip?.baseCurrency, currency])

  if (trips.isLoading || expenses.isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-3 pt-4">
        <BalanceRowSkeleton />
        {[1, 2, 3].map(i => <ExpenseCardSkeleton key={i} />)}
      </div>
    )
  }

  if (trips.error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-destructive text-sm">{trips.error}</p>
        <button
          onClick={() => { trips.fetchTrip(id!); expenses.fetchExpenses(id!) }}
          className="text-sm text-primary hover:opacity-70 font-medium transition-opacity"
        >
          Retry
        </button>
      </div>
    )
  }

  const trip = trips.currentTrip
  if (!trip) return null

  return (
    <div className="w-full max-w-3xl mx-auto">

      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to trips
      </button>

      {/* Trip Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-3xl font-bold">{trip.name}</h2>
              {trip.isSettled && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Settled
                </span>
              )}
            </div>
            {trip.description && (
              <p className="text-muted-foreground mb-3">{trip.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{trip.members.length} members</span>
              <span>·</span>
              <span>{trip.currencies.join(' · ')}</span>
              <span>·</span>
              <span>Base: {trip.baseCurrency}</span>
            </div>

            {/* Join code */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-muted-foreground">Invite code:</span>
              <span className="text-xs font-mono font-semibold tracking-widest bg-muted px-2 py-0.5 rounded">
                {trip.joinCode}
              </span>
              <button
                onClick={() => copyJoinCode(trip.joinCode)}
                className="text-xs text-primary hover:opacity-70 transition-opacity font-medium flex items-center gap-1"
              >
                {codeCopied ? <><Check size={12} />Copied!</> : <><Copy size={12} />Copy</>}
              </button>
            </div>
          </div>

          {/* Member avatars */}
          <div className="flex -space-x-2 shrink-0">
            {trip.members.slice(0, 4).map(member => (
              <div
                key={member.userId}
                title={member.displayName}
                className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold border-2 border-background"
              >
                {member.displayName.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        {trip.isSettled ? (
          <div className="mt-5 space-y-3">
            {/* Settled banner */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-sm text-amber-700">
                This trip is settled. You can reopen it to make changes.
              </p>
              <button
                onClick={() => setConfirmReopen('reopen')}
                className="text-sm font-medium text-amber-700 hover:text-amber-900 shrink-0 transition-colors"
              >
                Reopen Trip
              </button>
            </div>
            <button
              onClick={() => setConfirmReopen('add')}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <Plus size={15} />
              Add Expense
            </button>

            {/* Inline confirmation */}
            {confirmReopen && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <p className="text-sm">
                  {confirmReopen === 'add'
                    ? 'This trip is settled. Adding an expense will reopen it — balances will update. Continue?'
                    : 'Reopening this trip will mark it as active again. Continue?'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await trips.reopenTrip(id!)
                      setConfirmReopen(null)
                      if (confirmReopen === 'add') navigate(`/trips/${id}/add`)
                    }}
                    className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {confirmReopen === 'add' ? 'Reopen & Add Expense' : 'Yes, Reopen'}
                  </button>
                  <button
                    onClick={() => setConfirmReopen(null)}
                    className="px-4 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => navigate(`/trips/${id}/add`)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <Plus size={15} />
              Add Expense
            </button>
            <button
              onClick={() => navigate(`/trips/${id}/settle`)}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
            >
              <CreditCard size={15} />
              Settle Up
            </button>
          </div>
        )}
      </div>

      {/* Total spend + currency rate bar */}
      <div className="rounded-xl bg-muted/50 p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total spend</span>
          <span className="text-xl font-bold">
            {formatCurrency(expenses.totalAmount, trip.baseCurrency)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            {currency.error
              ? <span className="text-destructive">Couldn't fetch rates</span>
              : currency.updatedAt
              ? `Rates as of ${new Date(currency.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${new Date(currency.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
              : currency.isLoading ? 'Fetching rates...' : 'Rates not loaded'}
          </div>
          <button
            onClick={() => currency.fetchRates(trip.baseCurrency, true)}
            disabled={currency.isLoading}
            className="text-xs text-primary hover:opacity-70 disabled:opacity-40 transition-opacity font-medium flex items-center gap-1"
          >
            <RefreshCw size={11} className={currency.isLoading ? 'animate-spin' : ''} />
            {currency.isLoading ? 'Refreshing...' : 'Refresh rates'}
          </button>
        </div>
      </div>

      {/* Tabs — equally distributed, scroll on mobile */}
      <div className="flex border-b mb-6 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 min-w-max py-2 px-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.key === 'expenses' && (
              <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {expenses.expenses.length}
              </span>
            )}
            {tab.key === 'notes' && notes.notes.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {notes.notes.length}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'expenses' && (
        expenses.expenses.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
            <p className="text-muted-foreground text-sm">No expenses yet.</p>
            {!trip.isSettled && (
              <button
                onClick={() => navigate(`/trips/${id}/add`)}
                className="text-sm text-primary font-medium hover:opacity-70 transition-opacity"
              >
                + Add the first expense
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.expenses.map(expense => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                members={trip.members}
                baseCurrency={trip.baseCurrency}
                onEdit={() => navigate(`/trips/${id}/expenses/${expense.id}/edit`)}
                onDelete={() => expenses.deleteExpense(expense.id)}
              />
            ))}
          </div>
        )
      )}

      {activeTab === 'balances' && (
        <BalanceSummary balances={balances.balances} baseCurrency={trip.baseCurrency} />
      )}

      {activeTab === 'suggestions' && (
        <SettleSuggestions suggestions={balances.suggestions} members={trip.members} />
      )}

      {activeTab === 'spending' && (() => {
        const currentUserId = auth.currentUser?.id
        const totalSpend = expenses.totalAmount

        if (expenses.expenses.length === 0) return (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
            No expenses yet — spending breakdown will appear here.
          </div>
        )

        const rows = trip.members
          .map(member => ({
            member,
            total: expenses.expenses
              .filter(e => e.paidBy === member.userId)
              .reduce((sum, e) => sum + e.amountBase, 0),
          }))
          .sort((a, b) => b.total - a.total)

        return (
          <div className="space-y-3">
            {rows.map(({ member, total }) => {
              const isMe = member.userId === currentUserId
              const pct = totalSpend > 0 ? (total / totalSpend) * 100 : 0
              return (
                <div
                  key={member.userId}
                  className={`p-4 rounded-lg border ${isMe ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className={`text-sm font-medium ${isMe ? 'text-primary' : ''}`}>
                        {member.displayName}
                        {isMe && <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">
                        {formatCurrency(total, trip.baseCurrency)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isMe ? 'bg-primary' : 'bg-muted-foreground/40'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground text-right pt-1">
              Total trip spend: {formatCurrency(totalSpend, trip.baseCurrency)}
            </p>
          </div>
        )
      })()}

      {/* Notes tab */}
      {activeTab === 'notes' && (() => {
        const currentUserId = auth.currentUser?.id

        const handleAddNote = async () => {
          if (!newNote.trim() || !id) return
          setIsAddingNote(true)
          await notes.addNote(id, newNote.trim())
          setNewNote('')
          setIsAddingNote(false)
        }

        const startEdit = (noteId: string, content: string) => {
          setEditingNoteId(noteId)
          setEditingContent(content)
        }

        const saveEdit = async () => {
          if (!editingNoteId || !editingContent.trim()) return
          await notes.editNote(editingNoteId, editingContent.trim())
          setEditingNoteId(null)
          setEditingContent('')
        }

        const sorted = [...notes.notes].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        return (
          <div className="space-y-4">
            {/* Add note */}
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note for the group..."
                rows={2}
                className="w-full text-sm bg-background border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAddNote}
                  disabled={isAddingNote || !newNote.trim()}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isAddingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>

            {/* Notes list */}
            {sorted.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
                No notes yet. Add one above.
              </div>
            ) : sorted.map(note => {
              const isOwner = note.authorId === currentUserId
              const isEditing = editingNoteId === note.id
              return (
                <div key={note.id} className={`rounded-lg border bg-card p-4 space-y-2 ${isOwner ? 'border-primary/20' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${isOwner ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {note.authorName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{note.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(note.createdAt)}
                        {note.updatedAt && ' · edited'}
                      </span>
                    </div>
                    {isOwner && !isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(note.id, note.content)}
                          title="Edit note"
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => notes.deleteNote(note.id)}
                          title="Delete note"
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        rows={2}
                        className="w-full text-sm bg-background border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={saveEdit}
                          disabled={!editingContent.trim()}
                          className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="px-3 py-1 rounded-md border text-xs hover:bg-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/90 leading-relaxed">{note.content}</p>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

    </div>
  )
})

export default TripDetail
