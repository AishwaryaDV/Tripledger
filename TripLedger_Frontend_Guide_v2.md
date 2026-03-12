# TripLedger — Frontend Developer Guide v2
**Last updated:** March 2026
**Stack:** React 18 · TypeScript · Vite · MobX 6 · Tailwind CSS v3 · shadcn/ui · FastAPI (backend)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [TypeScript Types](#4-typescript-types)
5. [Routing](#5-routing)
6. [State Management — MobX Stores](#6-state-management--mobx-stores)
7. [Pages](#7-pages)
8. [Components](#8-components)
9. [Mock Layer](#9-mock-layer)
10. [Utility & Lib Layer](#10-utility--lib-layer)
11. [Patterns & Conventions](#11-patterns--conventions)
12. [Backend API Contract (FastAPI)](#12-backend-api-contract-fastapi)
13. [Moving to Production](#13-moving-to-production)

---

## 1. Project Overview

TripLedger is a shared expense tracker built around **circles** — shared spaces for splitting costs together. A circle can be a trip, a household, an event, or personal expense tracking. The app handles multi-currency expenses, flexible split modes, debt simplification for settlement, and per-circle shared notes.

**Key user flows:**
- Create or join a circle via a 6-character join code
- Add expenses with flexible split modes (equal, exact, percentage, shares)
- Self-expenses: personal items that don't affect others' balances
- View balances per member and get minimised settlement suggestions
- Record full or partial payments in the Settle flow
- View a circle summary with charts (donut + bar) and per-person breakdown
- Add/edit/delete shared circle notes

---

## 2. Tech Stack

| Layer | Library | Version |
|---|---|---|
| UI Framework | React | 18 |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| State | MobX + mobx-react-lite | 6.x |
| Routing | React Router | v6 |
| UI Components | shadcn/ui + Tailwind CSS | v3 |
| Icons | lucide-react | latest |
| Forms | React Hook Form | 7.x |
| Charts | Recharts | 2.x |
| Auth/DB (prod) | Supabase | 2.x |
| HTTP Client | Axios (via `src/lib/api.ts`) | — |
| Exchange Rates | ExchangeRate-API v4 (free tier) | — |

---

## 3. Folder Structure

```
src/
├── App.tsx                    # Route definitions
├── main.tsx                   # React root, StrictMode
├── index.css                  # Tailwind directives + CSS vars
│
├── types/
│   └── index.ts               # All shared TypeScript interfaces/types
│
├── stores/
│   ├── RootStore.ts           # Singleton root, instantiates all stores
│   ├── AuthStore.ts           # Current user, login/logout
│   ├── TripStore.ts           # Circles list, current circle, CRUD
│   ├── ExpenseStore.ts        # Expenses per circle, CRUD
│   ├── BalanceStore.ts        # Balances, suggestions, settlements
│   ├── CurrencyStore.ts       # Exchange rates, localStorage cache
│   └── NoteStore.ts           # Circle notes, CRUD
│
├── pages/
│   ├── Landing.tsx            # Public marketing/landing page
│   ├── About.tsx              # Public about/features page
│   ├── Login.tsx              # Supabase auth (Google + email)
│   ├── Dashboard.tsx          # Circle list with type filter tabs
│   ├── CreateTrip.tsx         # New circle creation form
│   ├── TripDetail.tsx         # Main circle view (5 tabs)
│   ├── AddExpense.tsx         # Add/edit expense form
│   ├── Settle.tsx             # Settlement flow (suggestions + activity)
│   ├── TripSummary.tsx        # Visual summary (charts + export)
│   └── InviteJoin.tsx         # Join circle via invite link
│
├── components/
│   ├── expense/
│   │   ├── ExpenseCard.tsx    # Individual expense row card
│   │   ├── SplitEditor.tsx    # Split mode UI (equal/exact/pct/shares)
│   │   └── CategoryBadge.tsx  # Coloured category pill
│   ├── trip/
│   │   ├── TripCard.tsx       # Circle card on dashboard
│   │   ├── BalanceSummary.tsx # Balance rows (Balances tab)
│   │   ├── SettleSuggestions.tsx # Suggested payments (Balances tab)
│   │   └── ActivityFeed.tsx   # Recent activity feed
│   └── shared/
│       ├── Layout.tsx         # App shell: sidebar/header + <Outlet>
│       ├── ProtectedRoute.tsx # Redirects to /login if not authed
│       ├── Skeleton.tsx       # Loading skeleton components
│       ├── Calculator.tsx     # Inline number calculator
│       ├── CurrencySelector.tsx # Currency dropdown
│       └── CustomSelect.tsx   # Styled select/dropdown primitive
│
├── hooks/
│   ├── useStore.ts            # Returns rootStore (context alternative)
│   └── useRealtime.ts         # Supabase realtime subscription hook
│
├── lib/
│   ├── api.ts                 # Axios instance with base URL + auth header
│   ├── utils.ts               # formatCurrency, formatDate, cn()
│   ├── currencies.ts          # SUPPORTED_CURRENCIES list with symbols
│   └── supabase.ts            # Supabase client init
│
└── mocks/
    ├── data.ts                # Static mock data (trips, expenses, users)
    └── handlers.ts            # Mock API handlers (replaces real API calls)
```

---

## 4. TypeScript Types

All types live in `src/types/index.ts`.

### Core Types

```typescript
type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'AUD' | 'JPY' | string

type CircleType = 'trip' | 'personal' | 'household' | 'event'

type SplitType = 'equal' | 'exact' | 'percentage' | 'shares'

type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'activities' | 'other'
```

### Interfaces

```typescript
interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  defaultCurrency: Currency
}

interface TripMember {
  userId: string
  displayName: string
  avatarUrl?: string
  role: 'owner' | 'member' | 'viewer'
}

interface Trip {
  id: string
  name: string
  description?: string
  circleType: CircleType       // 'trip' | 'personal' | 'household' | 'event'
  currencies: Currency[]       // up to 3
  baseCurrency: Currency       // all balances in this currency
  members: TripMember[]
  isSettled: boolean
  createdAt: string            // ISO
  joinCode: string             // 6-character alphanumeric
  startDate?: string           // optional ISO date string
  endDate?: string             // optional ISO date string
}

interface ExpenseSplit {
  userId: string
  amountOwed: number           // in base currency
  shareValue?: number          // percentage or share count (for pct/shares modes)
  isSettled: boolean
}

interface Expense {
  id: string
  tripId: string
  paidBy: string               // userId
  title: string
  amount: number               // original currency amount
  currency: Currency
  amountBase: number           // converted to base currency
  exchangeRate: number
  category: ExpenseCategory
  splitType: SplitType
  splits: ExpenseSplit[]
  receiptUrl?: string
  expenseDate: string          // ISO
  notes?: string
}

interface Balance {
  userId: string
  displayName: string
  netAmount: number            // positive = gets back money, negative = owes
}

interface SettlementSuggestion {
  fromUserId: string
  toUserId: string
  amount: number
  currency: Currency
}

interface Settlement {
  id: string
  tripId: string
  fromUserId: string
  toUserId: string
  amount: number
  currency: Currency
  method?: string
  confirmedAt?: string
  isPartial: boolean
}

interface Note {
  id: string
  tripId: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
  updatedAt?: string
}
```

---

## 5. Routing

Defined in `src/App.tsx`:

```
/                          Landing (public)
/about                     About page (public)
/login                     Login (public)

Protected (wrapped in ProtectedRoute + Layout):
/dashboard                 Circle list
/trips/new                 Create circle
/trips/:id                 Circle detail (5 tabs)
/trips/:id/add             Add expense
/trips/:id/expenses/:expenseId/edit   Edit expense
/trips/:id/settle          Settle up flow
/trips/:id/summary         Visual summary + export

*  → redirect to /dashboard
```

`ProtectedRoute` checks `auth.isLoggedIn`. If false, navigates to `/login`.
`Layout` renders the app shell (header + sidebar) with `<Outlet>` for page content.

---

## 6. State Management — MobX Stores

### RootStore

`src/stores/RootStore.ts` — singleton, instantiated once and exported as `rootStore`.

```typescript
class RootStore {
  auth     = new AuthStore(this)
  trips    = new TripStore(this)
  expenses = new ExpenseStore(this)
  balances = new BalanceStore(this)
  currency = new CurrencyStore()   // no root dependency
  notes    = new NoteStore(this)
}

export const rootStore = new RootStore()
```

Accessed via `useStore()` hook:
```typescript
// src/hooks/useStore.ts
export const useStore = () => rootStore
```

All components use `observer()` from `mobx-react-lite` to auto-subscribe to observables.

---

### AuthStore

**File:** `src/stores/AuthStore.ts`

| Observable | Type | Description |
|---|---|---|
| `currentUser` | `User \| null` | Logged-in user |
| `isLoading` | `boolean` | True during session check on app start |
| `error` | `string \| null` | Auth error message |

**Computed:**
- `isLoggedIn` → `!!currentUser`

**Actions:**
- `loginWithGoogle()` — Supabase OAuth
- `loginWithEmail(email, password)` — Supabase email auth
- `logout()` — Supabase signOut + clear user

**Mock mode:** Auto logs in as `MOCK_USERS[0]` ("You") on init.

---

### TripStore

**File:** `src/stores/TripStore.ts`

| Observable | Type | Description |
|---|---|---|
| `trips` | `Trip[]` | All trips the user is in |
| `currentTrip` | `Trip \| null` | Trip currently being viewed |
| `isLoading` | `boolean` | Fetch in progress |
| `error` | `string \| null` | Last error |

**Computed:**
- `myTrips` → filtered by `currentUser.id`
- `activeTrips` → not settled
- `settledTrips` → settled

**Actions:**
- `fetchTrips(force?)` — stale after 60s, skips if recent
- `fetchTrip(id)` — loads single trip into `currentTrip`
- `createTrip(payload)` — creates and pushes to `trips[]`
- `joinTrip(code)` — joins by 6-char code
- `settleTrip(id)` — marks `isSettled: true`
- `reopenTrip(id)` — marks `isSettled: false`

**Create payload:**
```typescript
{
  name: string
  description?: string
  circleType: CircleType
  currencies: string[]
  baseCurrency: string
  startDate?: string       // ISO date (optional)
  endDate?: string         // ISO date (optional)
}
```

---

### ExpenseStore

**File:** `src/stores/ExpenseStore.ts`

| Observable | Type | Description |
|---|---|---|
| `expenses` | `Expense[]` | Current trip's expenses |
| `isLoading` | `boolean` | Fetch in progress |
| `error` | `string \| null` | Last error |

**Computed:**
- `totalAmount` → sum of `amountBase`
- `byCategory` → `Record<string, number>` totals per category

**Actions (all optimistic):**
- `fetchExpenses(tripId, force?)` — skips if same tripId unless forced
- `addExpense(tripId, payload)` — temp ID, replace on confirmation, rollback on error
- `editExpense(expenseId, payload)` — snapshot + update, rollback on error
- `deleteExpense(id)` — remove immediately, restore on error

---

### BalanceStore

**File:** `src/stores/BalanceStore.ts`

| Observable | Type | Description |
|---|---|---|
| `balances` | `Balance[]` | Net amounts per member |
| `suggestions` | `SettlementSuggestion[]` | Minimised payment suggestions |
| `settlements` | `Settlement[]` | Recorded payments |
| `isLoading` | `boolean` | Fetch in progress |

**Computed:**
- `myOwed` → current user's net amount (negative = owes)
- `myPendingPayments` → suggestions where `fromUserId === currentUser.id`

**Actions:**
- `fetchBalances(tripId)` — clears state first (avoids stale display), fetches balances + suggestions
- `fetchSettlements(tripId)` — fetches settlement history
- `recordSettlement(tripId, payload)` — optimistic add, replace on confirm, rollback on error
- `updateFromRealtime(tripId)` — called by realtime hook to refresh

**Important:** `fetchBalances` immediately clears `balances` and `suggestions` before fetching. This prevents old trip data from briefly flashing when switching circles.

---

### CurrencyStore

**File:** `src/stores/CurrencyStore.ts`

Manages live exchange rates with 4-hour localStorage cache.

| Observable | Type | Description |
|---|---|---|
| `rates` | `Record<string, number>` | Rates keyed by currency code |
| `base` | `string` | Base currency of current rates |
| `updatedAt` | `string \| null` | ISO timestamp of last fetch |
| `isLoading` | `boolean` | Fetching in progress |

**Methods:**
- `fetchRates(baseCurrency, force?)` — uses `https://api.exchangerate-api.com/v4/latest/{base}`
- `getRate(from)` → rate for 1 unit of `from` in base currency
- `convert(amount, fromCurrency)` → converted amount or `null` if rate missing
- `isStale(baseCurrency)` → true if >4h old or different base

**Cache key:** `tl_currency_rates` in localStorage.

---

### NoteStore

**File:** `src/stores/NoteStore.ts`

| Observable | Type | Description |
|---|---|---|
| `notes` | `Note[]` | Current trip's notes |
| `isLoading` | `boolean` | Fetch in progress |

**Actions (all optimistic):**
- `fetchNotes(tripId)`
- `addNote(tripId, content)` — prepends optimistic note
- `editNote(noteId, content)` — inline update with rollback
- `deleteNote(noteId)` — remove with rollback

---

## 7. Pages

### Landing (`/`)
Public marketing page. Features hero, feature list, CTA buttons. No auth required.

### About (`/about`)
Public page covering: product overview, 8 feature cards, architecture stack table. Uses circles terminology throughout.

### Login (`/login`)
Supabase auth — Google OAuth button + email/password form.

### Dashboard (`/dashboard`)
Lists all circles the user is a member of.

- **Tabs:** Active / Settled
- **Type filter pills:** All · Trips · Personal · Household · Events (icons via lucide-react)
- **Connect modal:** Input for 6-char join code → `trips.joinTrip(code)`
- **New Circle button** → `/trips/new`
- Shows `TripCardSkeleton` during load, error state with retry button

### CreateTrip (`/trips/new`)
Multi-step form for creating a new circle.

**Fields:**
- Circle type selector (4 cards: Trip / Personal / Household / Event)
- Name (placeholder adapts to circle type)
- Description (optional)
- Start date / End date (optional, end date min = start date)
- Currency picker (up to 3, grid of buttons)
- Base currency selector (buttons for selected currencies)

**On success:** Shows join code display with copy button + circle summary card.

### TripDetail (`/trips/:id`)
Main circle view. Five tabs:

| Tab | Content |
|---|---|
| Expenses | Filtered/sorted expense list with `ExpenseCard` per item |
| Balances | `BalanceSummary` + `SettleSuggestions` components |
| Spending | Category donut chart + per-person contribution bars (Recharts) |
| Activity | `ActivityFeed` component |
| Notes | Shared notes with add/edit/delete per-author |

**Header elements:**
- Circle name + description
- Circle type badge (icon + label, styled per type)
- Date range if `startDate` is set: `· 15 Mar – 20 Mar 2026`
- Member avatars: up to 3 on mobile, up to 5 on desktop, coloured per MEMBER_COLORS, +N overflow chip
- Join code with copy button
- Settled banner + Reopen Circle / "Add Expense" button

**Settled state copy:**
- Banner: "This circle is settled"
- Note on Expenses tab: "This circle is settled. Adding an expense will reopen it."

**Notes tab features:**
- Sorted by newest first
- Only author can edit/delete their note
- Delete icon always red (`text-destructive`)
- Loading skeleton while fetching
- Empty state with icon

### AddExpense (`/trips/:id/add` and `/trips/:id/expenses/:expenseId/edit`)
Combined add/edit expense form.

**Edit mode:** Detected via `expenseId` param. Pre-fills all fields. Title shows "Edit Expense".

**Fields:**
- Title
- Amount + Currency selector (shows conversion hint if not base currency)
- Category (select)
- Date
- Paid By (member select)
- Self-expense toggle: "Just for me — personal expense"
  - When on: hides SplitEditor, Paid By locked to current user
- SplitEditor (hidden when self-expense)
- Notes (optional text)

**Split key pattern:** `splitKey` counter increments after edit data loads to force SplitEditor remount with correct initial values.

### Settle (`/trips/:id/settle`)
Settlement flow.

**Balance Overview:** All members with net amount (green = gets back, red = owes). Per-member colours, highlights current user with primary-tinted background.

**Mark Settled banner:** Shown when no outstanding suggestions. "Mark Settled" button calls `trips.settleTrip`.

**Tabs:**
- **Suggested Payments:** Debt-minimised transfer list. Current user's rows show "Record Payment" button → inline form with amount field + partial checkbox.
- **Activity:** Settlement history sorted by newest first. Per-member coloured avatars, Partial/Paid badges, date.

### TripSummary (`/trips/:id/summary`)
Visual financial overview.

**Sections:**
- Stats row: Total spent, Members count, date range (or created date), top category
- Category breakdown: Recharts `PieChart` (donut) + legend list with icons and amounts
- Daily spending: Recharts `BarChart` grouped by date, coloured by category
- Per-person contribution: horizontal bars per member with % and amount
- Export: CSV download + plain text copy

**Important:** Uses `toJS(expenses.expenses)` before passing to Recharts to strip MobX proxy.

### InviteJoin
Handles invite link flow (join code from URL param).

---

## 8. Components

### ExpenseCard

**Props:**
```typescript
{
  expense: Expense
  baseCurrency: Currency
  members: TripMember[]
  onEdit: () => void
  onDelete: () => void
}
```

**Layout:**
- Top row: category icon + title · edit (Pencil) + delete (Trash2) icon buttons
- Meta row: Paid by · date · category badge
- Split pills row: horizontally scrollable row of `Name −₹amount` pills

**Split pills:**
- `flex flex-nowrap overflow-x-auto` — single row, scrollable
- Each pill: `shrink-0 whitespace-nowrap bg-muted rounded-full px-2 py-0.5 text-xs`
- Shows up to 3 pills then `+N more` chip

**Delete confirmation:** Inline "Sure?" state with Confirm/Cancel — auto-dismisses after 3s.

**Category labels:**
```
food → Food, transport → Transport, accommodation → Stay,
activities → Activities, other → Other
```

### SplitEditor

**Props:**
```typescript
{
  members: TripMember[]
  totalAmount: number
  baseCurrency: Currency
  onChange: (splits: ExpenseSplit[]) => void
  initialSplits?: ExpenseSplit[]       // for edit mode pre-fill
  initialSplitType?: SplitType         // for edit mode pre-fill
}
```

**Modes:**
- **Equal:** Divides totalAmount evenly. Read-only display.
- **Exact:** Input per member. Shows remaining unallocated amount.
- **Percentage:** Input per member (%). Must sum to 100%.
- **Shares:** Input per member (share count). Allocates proportionally.

**Cross-mode conversion:** Switching modes converts existing values intelligently (e.g. percentage → exact uses current total).

**Auto-fill (exact mode):** When `totalAmount` transitions from 0 → positive and all values are 0, auto-fills equal split. Tracked via `prevTotalRef`.

**Edit pre-fill:** Controlled via `key={splitKey}` in parent — remount forces lazy state initializers to re-run with `initialSplits`.

### BalanceSummary

Shows per-member balance rows. Per-member coloured avatars (MEMBER_COLORS). Empty state: Scale icon + "All square!" message.

### SettleSuggestions

Shows debt-minimised payment suggestions. Empty state: PartyPopper icon + "Everyone's settled up!" bordered box.

### TripCard

Circle card on Dashboard. Shows name, type badge, member count, currency, and balance summary.

### ActivityFeed

Chronological list of expense additions and settlements. Shows actor, action, and amount.

### Skeleton Components (`src/components/shared/Skeleton.tsx`)

- `TripCardSkeleton` — dashboard card placeholder
- `BalanceRowSkeleton` — balance/note row placeholder
- `ExpenseCardSkeleton` — expense list item placeholder

All use `animate-pulse bg-muted` pattern.

### Calculator (`src/components/shared/Calculator.tsx`)

Floating calculator panel for inline arithmetic. Toggle button uses lucide `Calculator` icon.

### CustomSelect

Accessible styled select dropdown. Used in Settle flow for payment method selection.

---

## 9. Mock Layer

All stores have `const USE_MOCK = true` at the top. When true, they call `mockHandlers` instead of the real API.

### Mock Data (`src/mocks/data.ts`)

**Users:** 5 mock users (MOCK_USERS). `user-1` is "You" (current user).

**Trips:**
- `trip-1`: Goa 2026 (trip, INR+USD+EUR, startDate/endDate set)
- `trip-2`: Splitwise Test (trip, USD+EUR+GBP)
- `trip-3`: Dubai May 2026 (trip, AED+USD+INR, startDate/endDate set)
- `trip-4`: Flat Expenses (household, INR)

**Balances/Suggestions:** Keyed by tripId in `MOCK_BALANCES_BY_TRIP` / `MOCK_SUGGESTIONS_BY_TRIP`.

**Expenses:** Mutable in-session store (`mutableExpenses`) so edits/deletes persist during the session.

### Mock Handlers (`src/mocks/handlers.ts`)

```typescript
mockHandlers.getTrips()
mockHandlers.getTrip(id)
mockHandlers.createTrip(payload, creatorMember)
mockHandlers.joinTrip(code, joiner)
mockHandlers.settleTrip(id)
mockHandlers.reopenTrip(id)

mockHandlers.getExpenses(tripId)
mockHandlers.addExpense(tripId, payload)
mockHandlers.editExpense(expenseId, payload)
mockHandlers.deleteExpense(id)

mockHandlers.getBalances(tripId)        // returns { balances, suggestions }
mockHandlers.getSettlements(tripId)
mockHandlers.recordSettlement(tripId, payload)

mockHandlers.getNotes(tripId)
mockHandlers.addNote(tripId, authorId, authorName, content)
mockHandlers.editNote(noteId, content)
mockHandlers.deleteNote(noteId)
```

---

## 10. Utility & Lib Layer

### `src/lib/utils.ts`

```typescript
// Tailwind class merging (clsx + tailwind-merge)
cn(...inputs: ClassValue[]): string

// Format a number as currency string
// e.g. formatCurrency(1234.5, 'INR') → '₹1,234.50'
formatCurrency(amount: number, currency: string): string

// Format ISO date string to readable
// e.g. formatDate('2026-03-15') → '15 Mar 2026'
formatDate(dateStr: string): string
```

### `src/lib/currencies.ts`

```typescript
const SUPPORTED_CURRENCIES: { code: string; name: string; symbol: string }[]
```

Includes: USD, EUR, GBP, INR, AED, AUD, JPY, CAD, SGD, CHF.

### `src/lib/api.ts`

Axios instance with:
- `baseURL` from `import.meta.env.VITE_API_URL`
- Request interceptor adds Supabase JWT as `Authorization: Bearer <token>`

### `src/lib/supabase.ts`

Supabase JS v2 client using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

---

## 11. Patterns & Conventions

### Observer components
All page and data-display components are wrapped with `observer()`:
```tsx
const MyPage = observer(() => { ... })
```

### Optimistic updates
All mutations (add/edit/delete expense, add/edit/delete note, record settlement):
1. Apply change immediately to observable
2. Call API / mock handler
3. Replace optimistic item with server response
4. On error: rollback to snapshot

### toJS() for Recharts
MobX observable arrays are not plain arrays. Always call `toJS()` before passing to Recharts:
```tsx
const allExpenses = toJS(expenses.expenses)
```

### MEMBER_COLORS palette
Consistent colour assignment for member avatars throughout the app:
```typescript
const MEMBER_COLORS = [
  '#818cf8', '#f472b6', '#34d399', '#fb923c',
  '#60a5fa', '#a78bfa', '#facc15', '#2dd4bf'
]
// Usage: MEMBER_COLORS[memberIndex % MEMBER_COLORS.length]
// memberIndex = trip.members.findIndex(m => m.userId === targetUserId)
```

Used in: TripDetail header, TripDetail Spending tab, Settle Balance Overview, Settle Activity log, TripSummary per-person chart.

### Stale trip guard
In pages that use `trips.currentTrip`, guard against showing stale data from a previous navigation:
```tsx
if (trips.isLoading || !trip || trip.id !== id) {
  return <LoadingSkeleton />
}
```

### Per-trip balance clearing
`BalanceStore.fetchBalances` clears state before fetching:
```typescript
runInAction(() => { this.isLoading = true; this.balances = []; this.suggestions = [] })
```
This prevents briefly showing old circle's data when switching circles.

### Icon imports (lucide-react)
```tsx
import { Plus, ArrowLeft, Pencil, Trash2, Copy, Check, ... } from 'lucide-react'
// Usage: <Plus size={16} className="..." />
```

Category icons mapping:
```typescript
food → UtensilsCrossed
transport → Car
accommodation → BedDouble
activities → Ticket
other → Package
```

Circle type icons:
```typescript
trip → Plane
personal → User
household → Home
event → PartyPopper
```

### Self-expense pattern
```typescript
// When isSelfExpense:
splits = [{ userId: currentUserId, amountOwed: amountBase, isSettled: false }]
// paidBy is locked to currentUserId
// SplitEditor is hidden
```

### Edit mode via URL
```
/trips/:id/expenses/:expenseId/edit
```
`AddExpense` reads `expenseId` from params. If present, finds expense in `expenses.expenses`, pre-fills all RHF fields, uses `splitKey` counter to force SplitEditor remount.

---

## 12. Backend API Contract (FastAPI)

The frontend switches between mock and real via `USE_MOCK = true/false` in each store.

### Auth
Supabase handles auth. All protected endpoints expect:
```
Authorization: Bearer <supabase_jwt>
```

### Endpoints

#### Trips / Circles
```
GET    /trips                          → Trip[]
GET    /trips/:id                      → Trip
POST   /trips                          → Trip
  body: { name, description?, circleType, currencies, baseCurrency, startDate?, endDate? }
PATCH  /trips/:id                      → Trip
  body: { isSettled: boolean }
POST   /trips/join                     → Trip
  body: { code: string }
```

#### Expenses
```
GET    /trips/:id/expenses             → Expense[]
POST   /trips/:id/expenses             → Expense
  body: Partial<Expense>
PUT    /expenses/:id                   → Expense
  body: Partial<Expense>
DELETE /expenses/:id                   → 204
```

#### Balances & Settlement
```
GET    /trips/:id/balances             → Balance[]
GET    /trips/:id/settle               → SettlementSuggestion[]
GET    /trips/:id/settlements          → Settlement[]
POST   /trips/:id/settlements          → Settlement
  body: { fromUserId, toUserId, amount, currency, isPartial }
```

#### Notes
```
GET    /trips/:id/notes                → Note[]
POST   /trips/:id/notes                → Note
  body: { content: string }
PATCH  /notes/:id                      → Note
  body: { content: string }
DELETE /notes/:id                      → 204
```

#### Exchange Rates
Fetched directly from ExchangeRate-API (client-side, not via FastAPI backend):
```
GET https://api.exchangerate-api.com/v4/latest/{baseCurrency}
```
Cached in localStorage under key `tl_currency_rates`. Stale after 4 hours.

---

## 13. Moving to Production

### Step 1: Environment variables
Create `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-fastapi-backend.com
```

### Step 2: Disable mock mode
In each store, change:
```typescript
const USE_MOCK = false
```
Stores: `AuthStore`, `TripStore`, `ExpenseStore`, `BalanceStore`, `NoteStore`.

### Step 3: Supabase setup
- Enable Google OAuth in Supabase Auth settings
- Create tables: `trips`, `trip_members`, `expenses`, `expense_splits`, `settlements`, `notes`
- Enable Row Level Security — users can only read/write their own trips

### Step 4: FastAPI backend
Implement endpoints listed in §12. Use Supabase service key for server-side DB access. Return JSON matching the TypeScript interfaces in §4.

### Step 5: Realtime (optional)
`src/hooks/useRealtime.ts` subscribes to Supabase realtime channels. On expense or settlement changes, calls `balances.updateFromRealtime(tripId)`.

### Step 6: Deploy
- Frontend: Vercel / Netlify (Vite build: `npm run build` → `dist/`)
- Backend: Railway / Render / Fly.io for FastAPI

---

## Appendix: Circle Type Feature Matrix

| Feature | Trip | Household | Event | Personal |
|---|---|---|---|---|
| Multi-currency | ✓ | ✓ | ✓ | ✓ |
| Date range | ✓ | — | ✓ | — |
| Join code sharing | ✓ | ✓ | ✓ | — |
| Settlement | ✓ | ✓ | ✓ | — |
| Self-expenses | ✓ | ✓ | ✓ | ✓ (all) |
| Notes | ✓ | ✓ | ✓ | ✓ |
| Summary/charts | ✓ | ✓ | ✓ | ✓ |

---

*End of TripLedger Frontend Developer Guide v2*
