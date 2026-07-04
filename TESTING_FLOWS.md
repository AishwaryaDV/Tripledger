# TripLedger — Testing Flows & Scenarios

Each flow is broken into steps with expected behaviour, edge cases, and things to watch for.
The goal is to simulate what a real user would do and catch anything that breaks silently,
shows wrong data, or handles errors poorly.

---

## F1 — Signup & first-time onboarding

**Steps:**
1. Visit `/` (landing page) → click "Get started"
2. Fill in name, email, password → submit
3. Expect: welcome toast fires, redirect to `/dashboard`
4. Dashboard should show empty state (no trips)

**Edge cases:**
- Duplicate email → expect inline error, not crash
- Weak password (< 6 chars) → Supabase returns error, should surface
- Very long display name (> 100 chars)
- Submit with empty fields

**Watch for:**
- `redirectTo` logic — if user arrived from `/join/ABC123`, they should land there after signup
- Welcome toast fires exactly once

---

## F2 — Login & session management

**Steps:**
1. Visit `/login` → enter credentials → submit
2. Expect: "Welcome back!" toast, redirect to `redirectTo` or `/dashboard`
3. Close tab, reopen → session should persist (Supabase JWT)
4. Let token expire → next API call should redirect to `/login` with "Your session expired" toast

**Edge cases:**
- Wrong password → inline error message shown
- Non-existent account → inline error
- Network failure during login → error shown, not crash
- Already logged in visiting `/login` → should redirect to dashboard

**Watch for:**
- `sessionStorage` `auth_expired` flag cleared after showing toast (don't show twice)
- `redirectTo` from `location.state` preserved through login

---

## F3 — Forgot password & reset flow

**Steps:**
1. `/login` → "Forgot password?" → enter email → submit
2. Check email → click reset link
3. Land on `/reset-password` → enter new password → confirm

**Edge cases:**
- Expired reset link (> 1 hour old) → 8-second timeout shows "This link has expired" with back link
- Non-existent email → Supabase sends no email but shows success (by design, prevents enumeration)
- Already used reset link → should show expired state

**Watch for:**
- `PASSWORD_RECOVERY` Supabase event fires → clears the 8-second timeout
- If timeout fires before event → expired UI shown, not spinning forever

---

## F4 — Create a trip

**Steps:**
1. Dashboard → "New Circle" button → fill name, type, base currency, currencies
2. Submit → redirected to trip detail page
3. Confirm trip appears on dashboard under active trips

**Edge cases:**
- No name entered → form validation blocks submit
- Single currency (base = only currency) → should be valid
- Multiple currencies selected (e.g. USD + THB + EUR)
- Default currency pre-selected from profile settings (not hardcoded INR/USD)

**Watch for:**
- `auth.currentUser.defaultCurrency` used as the initial selectedCurrencies value
- Trip created with correct `circleType` (trip/personal/household/event)

---

## F5 — Add expense (equal split)

**Steps:**
1. Inside a trip → "Add Expense" → fill title, amount, currency, date, paid-by
2. Split type: Equal, select all members → submit
3. Expenses tab updates, balance tab shows new balances

**Edge cases:**
- Amount = 0 → blocked by frontend validation and backend `amount > 0` validator
- Amount = negative → same
- No members selected → "Select at least one person" toast, submit blocked
- Non-base currency → FX rate applied; if rate unavailable → blocked with clear error
- FX rate not loaded yet (slow network) → error toast, not silent 1:1
- Expense on settled trip → "reopen" prompt shown inline

**Watch for:**
- Success toast "Expense added" fires before navigation
- Splits sum equals amountBase (within 0.02 tolerance)
- `paidBy` defaults to current user

---

## F6 — Add expense (exact / percentage / shares split)

**Steps:**
- Exact: manually enter each person's amount → must sum to total
- Percentage: enter % per person → must sum to 100%
- Shares: assign share ratios → any non-zero share config valid

**Edge cases:**
- Exact: amounts don't sum to total → blocked with toast
- Percentage: doesn't sum to 100% → blocked with toast
- Shares: all zeros → blocked ("Select at least one person")
- One person trip with exact split → only that person selected

**Watch for:**
- Validation fires before the API call, not after
- `amountOwed` per split serialised correctly (base currency, not original currency)

---

## F7 — Edit expense

**Steps:**
1. Open expense → pencil icon → edit form pre-filled
2. Change amount / category / split → save

**Edge cases:**
- Refresh browser on `/trips/X/expenses/Y/edit` before expenses load → should wait, not blank form
- Expense ID doesn't exist (deleted from another session) → redirect to trip with "Expense not found" toast
- Editing expense on settled trip → blocked (reopen first)
- Network failure on save → stays on edit page, shows toast error

**Watch for:**
- Form pre-fills correctly for all split types
- `isEditing` flag correctly derived from URL params
- Success toast "Expense updated" fires before navigating back

---

## F8 — Delete expense

**Steps:**
1. Expense row → trash icon → ConfirmModal appears
2. Click "Delete" → expense removed, balances recalculated

**Edge cases:**
- Double-click "Delete" button → second click disabled (isConfirming state)
- Network failure mid-delete → optimistic removal rolled back, expense reappears, toast shown, modal stays open
- Deleting last expense in trip → balances tab shows "No balances yet"

**Watch for:**
- Modal only closes on success (`setDeleteExpenseId(null)` only in try block)
- Rollback restores the exact expense (snapshot captured before optimistic remove)

---

## F9 — Settle up flow

**Steps:**
1. Trip with outstanding balances → "Settle Up" tab
2. "Record Payment" on a suggestion → enter amount → Confirm
3. Suggestion updates or disappears; recorded payment appears in history

**Edge cases:**
- Partial payment: amount < suggestion amount → marked isPartial, remaining shown
- Over-payment attempt: amount > suggestion amount → capped at suggestion amount (max attr)
- Settlement on already-settled trip → backend returns 409, toast shown
- fromUserId or toUserId not in trip → backend 400, toast shown
- Network failure on record → toast error, form stays open

**Watch for:**
- After successful settlement, `fetchBalances` is called so suggestions refresh
- `balances.error` shown as full error card (not silent empty state)

---

## F10 — Mark trip as settled / reopen

**Steps:**
1. Settle page shows "Everyone is settled up!" banner → "Mark Settled" button
2. Trip moves to "Settled" tab on dashboard
3. TripDetail shows "Settled" badge + "Reopen" option
4. Reopen → trip active again

**Edge cases:**
- Reopen fails (network error) → toast error, modal stays open (not closed)
- Adding expense to settled trip → inline reopen prompt appears
- "Reopen & Add Expense" → reopens then navigates to add expense

**Watch for:**
- `settleTrip` and `reopenTrip` both have try/catch at call sites
- Toast fires on both success and failure paths

---

## F11 — Notes

**Steps:**
1. Notes tab → type a note → Add
2. Edit your own note → save
3. Delete your own note

**Edge cases:**
- Note over 250 chars → blocked by character counter going red + maxLength
- Backend rejects > 250 chars → 422 with clear message
- Add/edit/delete network failure → optimistic rollback + toast error
- Viewing someone else's note → edit/delete buttons not shown
- Notes fail to load (fetchNotes error) → error banner with Retry shown (not "No notes yet")

**Watch for:**
- `notes.error` triggers error banner in the Notes tab
- Character counter turns red at 240+

---

## F12 — Members & member profile

**Steps:**
1. Members tab → tap a member row → MemberProfileSheet slides up
2. Sheet shows balance, spending breakdown, settlement history for that member

**Edge cases:**
- Trip with only one member (self) → members tab shows just self
- Member with no expenses → spending breakdown is empty/zero
- Offline — member data already loaded, sheet should still open

**Watch for:**
- MemberProfileSheet (rich sheet) used, NOT the old MemberProfile page (dead route removed)
- No navigation to `/trips/:id/members/:memberId` — that route is gone

---

## F13 — Join a trip via code

**Steps:**
1. Dashboard → "Join with code" → enter 6-char code → Join
2. Trip appears in active trips list

**Edge cases:**
- Code shorter than 6 chars → Join button disabled (< 6 guard)
- Invalid/expired code → API returns 404, toast error shown
- Already a member → API returns conflict, toast shown
- Code resolves to UUID then `joinTrip(uuid)` called (not `joinTrip(code)`)

**Watch for:**
- `fetchTripByCode(code)` called first to resolve UUID
- Button disabled until exactly 6 chars entered

---

## F14 — Join via invite link

**Steps:**
1. Trip member copies invite link → `/join/ABC123`
2. Non-member (logged in) visits link → sees trip preview → clicks "Join"
3. Non-member (not logged in) → sees login prompt → logs in → redirected to `/join/ABC123`

**Edge cases:**
- Logged-out user → Login.tsx signup branch → `redirectTo` = `/join/ABC123` preserved
- Already a member visiting invite link → should handle gracefully
- Invalid invite code → 404 shown

**Watch for:**
- `auth.isLoading` spinner shown before rendering action buttons (no flash of "Log in to Join")
- After login/signup, `redirectTo` used (not hardcoded `/dashboard`)

---

## F15 — Trip Summary page

**Steps:**
1. TripDetail → "Summary" icon → TripSummary page
2. Financial overview, category breakdown, daily chart, per-person chart, settlements all render

**Edge cases:**
- Trip with zero expenses → "No expenses yet" empty state
- Trip with one currency → no FX issues
- Trip with many currencies → base amounts used in all charts
- Recharts crashes (bad data) → ErrorBoundary catches, shows "Chart failed to render"
- Copy as text → clipboard updated, "Copied!" feedback shown
- Download CSV → file downloads

**Watch for:**
- Daily chart scrolls to most recent day on mount (useEffect `[]` dep)
- ErrorBoundary wraps PieChart and BarChart area

---

## F16 — Profile settings

**Steps:**
1. User menu → Profile → edit display name → save
2. Change pronouns → save
3. Change default currency → save

**Edge cases:**
- Name left empty → should block or restore
- Network failure saving name → toast error shown
- Default currency change reflected in new trip creation (CreateTrip pre-selects it)

**Watch for:**
- `auth.updateDefaultCurrency(currency)` calls PATCH `/auth/me/currency`
- ProfileDrawer null-guards `auth.currentUser` — if session expires while drawer is open, it returns null rather than crashing

---

## F17 — ErrorBoundary and crash recovery

**Steps:**
1. Simulate component crash (e.g. malformed data from API)
2. ErrorBoundary shows "Something went wrong" + "Reload page" button
3. Click Reload → app recovers

**Edge cases:**
- Crash in TripSummary charts → nested ErrorBoundary catches, only chart section falls back (rest of page intact... actually the nested one is inside the charts section)
- Crash in root tree → top-level ErrorBoundary catches, full reload screen shown
- Toaster still visible? (It's outside ErrorBoundary in main.tsx)

**Watch for:**
- `componentDidCatch` logs to console with stack trace
- Fallback shows error message from `getDerivedStateFromError`

---

## F18 — Empty states and loading states

**Steps:**
- New user with no trips → Dashboard shows empty state with "New Circle" CTA
- Trip with no expenses → Expenses tab shows dashed empty state
- Trip with no notes → Notes tab shows "No notes yet"
- Trip with no balances → Balance Overview shows "No balances yet — add some expenses first"
- All tabs show skeleton loaders while data is in-flight

**Edge cases:**
- Balances load error → full error card shown (not "No balances yet")
- Expenses load error → error banner shown in expenses tab
- Notes load error → error banner shown in notes tab

---

## F19 — Backend validation (direct API abuse)

**Steps (API-level):**
- POST `/trips/:id/expenses` with `amount: 0` → 422 with field error
- POST `/trips/:id/expenses` with `amount: -50` → 422
- POST `/trips/:id/expenses` with split `userId` not in trip → 400
- POST `/trips/:id/expenses` on settled trip → 409
- POST `/trips/:id/balances/settlements` on settled trip → 409
- POST `/trips/:id/balances/settlements` with `amount: 0` → 422
- POST `/trips/:id/notes` with content > 250 chars → 422

**Watch for:**
- All validators run server-side regardless of frontend state
- Error details propagate to frontend toasts via `err?.response?.data?.detail`

---

## F20 — Receipt scanning (AI)

**Steps:**
1. Add Expense → camera icon → upload receipt photo
2. AI parses → pre-fills title, amount, currency, date, category

**Edge cases:**
- Claude CLI not available in production → 501 "AI receipt parsing is not available on this server"
- File > 10MB → 413 error shown
- Blurry/unreadable receipt → 502 "Could not read the receipt — try a clearer photo"
- Parsing timeout → 504 shown
- Successful parse but category not in valid set → defaults to "other"

**Watch for:**
- Frontend shows scan loading state while request is in flight
- Scan error shown inline (not crash)
- Parsed fields only pre-fill if non-null

---

## Summary table

| Flow | Area | Risk Level |
|------|------|------------|
| F1 | Auth / Signup | High |
| F2 | Auth / Login + session | High |
| F3 | Auth / Password reset | Medium |
| F4 | Trip creation | High |
| F5 | Add expense (equal) | Critical |
| F6 | Add expense (complex splits) | Critical |
| F7 | Edit expense | High |
| F8 | Delete expense | High |
| F9 | Settle up | Critical |
| F10 | Mark settled / reopen | High |
| F11 | Notes | Medium |
| F12 | Members / profile sheet | Medium |
| F13 | Join via code | High |
| F14 | Join via invite link | High |
| F15 | Trip Summary | Medium |
| F16 | Profile settings | Low |
| F17 | ErrorBoundary | Medium |
| F18 | Empty + loading states | Medium |
| F19 | Backend API validation | High |
| F20 | Receipt scanning (AI) | Low |
