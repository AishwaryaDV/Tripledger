# Phase 2 Bugs

Found during second audit pass after Phase 1 (20-bug) fixes were applied.
All 22 issues documented below. None are blocking for a first deploy but should be resolved before wide user traffic.

---

## CRITICAL

### C1. No React ErrorBoundary in the app tree
**File:** `frontend/src/main.tsx`, `frontend/src/App.tsx`
**What:** The entire React tree renders with no ErrorBoundary. Any uncaught synchronous throw in any component (malformed API response, undefined property on a null object, Recharts crash) produces a permanent blank white screen with no recovery path.
**User impact:** App becomes completely unusable until the user manually refreshes.
**Fix:** Wrap `<App />` in a top-level `<ErrorBoundary fallback={<ErrorScreen />}>`. Add a nested boundary around TripSummary's charts as a high-risk island.
**Status:** 🔴 Pending

---

### C2. ConfirmModal has no loading/disabled state — double-submit is trivially reproducible
**File:** `frontend/src/components/shared/ConfirmModal.tsx`
**What:** The Confirm button has no `disabled` or loading state. `onConfirm` is typed `() => void` so async operations are fire-and-forget from the modal's perspective. A user who double-clicks sends two identical API requests.
**User impact:** Double-deleting an expense or double-recording a settlement. The second request either 404s or creates a duplicate depending on the endpoint's idempotency.
**Fix:** Add `isConfirming` state inside the modal, set it during `onConfirm`, disable the button while true. Change `onConfirm` type to `() => Promise<void>`.
**Status:** 🔴 Pending

---

### C3. `deleteExpense` swallows the error — callers cannot detect failure
**File:** `frontend/src/stores/ExpenseStore.ts` (line ~90)
**What:** The catch block sets `this.error` and rolls back state but does not `throw e`. The modal in TripDetail calls `setDeleteExpenseId(null)` unconditionally after the await, so it always closes. The expense reappears from the rollback but no toast or error is shown.
**User impact:** User thinks deletion succeeded. Expense silently reappears with no explanation.
**Fix:** Add `throw e` at end of catch block. Wrap the TripDetail `onConfirm` in try/catch with `toast.error(...)`.
**Status:** 🔴 Pending

---

### C4. Reopen trip button has no try/catch and no feedback
**File:** `frontend/src/pages/TripDetail.tsx` (lines ~288–293)
**What:** The "Reopen" confirm modal's `onConfirm` calls `await trips.reopenTrip(id!)` with no try/catch. `reopenTrip` now throws on failure (fixed in Phase 1), but there is no catch at the call site to surface it.
**User impact:** On any failure (network error, 403, 500) the app throws an unhandled rejection. The modal may or may not close depending on where the throw interrupts execution. No error is ever shown.
**Fix:** Wrap in try/catch, call `toast.error(...)` in catch, only call `setConfirmReopen(null)` on success.
**Status:** 🔴 Pending

---

## HIGH

### H5. `Settle.tsx` never displays `balances.error`
**File:** `frontend/src/pages/Settle.tsx`
**What:** The page checks `trips.error` for an error screen but never checks `balances.error`. If `fetchBalances` or `fetchSettlements` fail, the page renders with an empty Balance Overview and "Everyone is settled up!" in the suggestions section.
**User impact:** User believes the trip has no outstanding balances when in fact the data failed to load.
**Fix:** Add `if (balances.error) { return <ErrorCard message={balances.error} onRetry={...} /> }` after the `trips.error` guard.
**Status:** 🔴 Pending

---

### H6. `leaveTrip` and `deleteTrip` have no try/catch — unhandled rejection on failure
**File:** `frontend/src/stores/TripStore.ts` (lines ~103–117)
**What:** Both methods call `api.delete(...)` with no try/catch. If the API returns an error the promise rejects, the `runInAction` never runs (state is not mutated), and the rejection propagates to the caller with no handling — no toast, no recovery.
**User impact:** Leave/delete failures appear as a frozen UI with no message.
**Fix:** Add try/catch in both, re-throw after setting `this.error`. Callers in MoreOptionsSheet already have try/catch with `toast.error` so this would wire through.
**Status:** 🔴 Pending

---

### H7. `NoteStore.fetchNotes` has no catch and no error state
**File:** `frontend/src/stores/NoteStore.ts`
**What:** `fetchNotes` has a `finally` but no `catch`. Network failure on the Notes tab produces an unhandled rejection. The tab shows the "No notes yet" empty state with no indicator that something went wrong.
**Fix:** Add `error: string | null = null` field. Add catch block that sets it. Render error banner in Notes tab when `notes.error` is set.
**Status:** 🔴 Pending

---

### H8. `TripStore.error` is never cleared before a new fetch — stale errors persist across trips
**File:** `frontend/src/stores/TripStore.ts`
**What:** `fetchTrip` and `fetchTrips` do not reset `this.error = null` at the start. If trip A's fetch fails, then the user navigates to trip B (which loads fine), `trips.error` still holds the old message. Settle.tsx uses `trips.error` to render a full error screen, so trip B's Settle page shows trip A's error.
**Fix:** Add `runInAction(() => { this.error = null })` at the top of both fetch methods.
**Status:** 🔴 Pending

---

### H9. No success toast after adding or editing an expense
**File:** `frontend/src/pages/AddExpense.tsx`
**What:** The error path shows `toast.error(...)`. The success path navigates silently. On slow networks there is no feedback between "tap Add" and the page changing, increasing the chance of double-submission.
**Fix:** Add `toast.success(isEditing ? 'Expense updated' : 'Expense added')` before `navigate(...)`.
**Status:** 🔴 Pending

---

### H10. Delete expense confirm: modal closes and shows nothing on failure
**File:** `frontend/src/pages/TripDetail.tsx` (ConfirmModal `onConfirm`)
**What:** Directly caused by C3 — `deleteExpense` does not throw so the caller never enters a catch. After the await, `setDeleteExpenseId(null)` always runs, closing the modal. The expense reappears from the optimistic rollback with no explanation.
**Fix:** Resolves automatically when C3 is fixed. Then add try/catch at the call site with `toast.error(...)`.
**Status:** 🔴 Pending (blocked by C3)

---

### H11. Signup ignores `redirectTo` state — breaks the invite-then-signup flow
**File:** `frontend/src/pages/Login.tsx` (signup branch, line ~73)
**What:** The login branch correctly reads `location.state?.redirectTo` and navigates there after sign-in. The signup branch always navigates to `/dashboard`. A user who arrives from `/join/ABC123`, is not logged in, chooses "Create account" and signs up — gets dropped on the dashboard. The invite link is lost.
**Fix:** Apply the same `redirectTo` logic to the signup success branch.
**Status:** 🔴 Pending

---

### H12. No welcome feedback after signup
**File:** `frontend/src/pages/Login.tsx`
**What:** After signup the app navigates to `/dashboard` with `state: { welcome: true }` but nothing reads that state to show a toast or banner. Users get no confirmation that account creation worked before landing on an empty dashboard.
**Fix:** Either add `toast.success('Welcome to TripLedger!')` immediately after `auth.signUp(...)`, or add a `useEffect` in Dashboard that reads `location.state?.welcome` and fires a toast.
**Status:** 🔴 Pending

---

## MEDIUM

### M13. Backend: No `amount > 0` validation on expenses or settlements
**File:** `backend/app/schemas/expense.py`, `backend/app/schemas/balance.py`
**What:** `ExpenseCreate` and `SettlementCreate` accept `amount: 0` or negative values. Frontend form validation catches this for normal users but there is no server-side defense.
**Fix:** Add `@field_validator('amount')` on both schemas enforcing `v > 0`.
**Status:** 🟡 Pending

---

### M14. Backend: Expense split `userId` values not validated as trip members
**File:** `backend/app/services/expenses.py`
**What:** `paidBy` is validated against trip membership, but the individual split `userId` values inside the splits array are not. Arbitrary user IDs can be persisted as split participants.
**Fix:** Inside the splits creation loop, validate each `split.user_id` is in `member_ids`. Raise `HTTPException(400)` if not.
**Status:** 🟡 Pending

---

### M15. Backend: Settlements can be recorded on already-settled trips
**File:** `backend/app/services/balances.py`
**What:** `create_settlement` does not check `trip.is_settled`. Expenses are blocked on settled trips (fixed in Phase 1) but settlements are not, allowing the balance history of a closed trip to change.
**Fix:** Fetch the trip in `create_settlement` and raise `HTTPException(409)` if `trip.is_settled`.
**Status:** 🟡 Pending

---

### M16. JoinCircleModal enables Join button at 1 character instead of 6
**File:** `frontend/src/components/shared/JoinCircleModal.tsx` (line 103)
**What:** `disabled={isJoining || code.trim().length < 1}` — codes are always 6 characters. Submitting with fewer characters makes an unnecessary API call that always fails.
**Fix:** Change to `code.trim().length < 6`. Optionally show inline "Code must be 6 characters" hint.
**Status:** 🟡 Pending

---

### M17. Edit expense: missing expense on page refresh shows silent blank form
**File:** `frontend/src/pages/AddExpense.tsx` (line ~81)
**What:** If a user refreshes the browser on `/trips/X/expenses/Y/edit`, expenses may not be loaded yet or the expense may not exist. `if (!expense) return` silently exits, leaving a blank form. Submitting it creates a new expense instead of editing.
**Fix:** Replace silent `return` with `navigate(\`/trips/${tripId}\`, { replace: true })` plus `toast.error('Expense not found')`.
**Status:** 🟡 Pending

---

### M18. FX rate fallback silently uses 1:1 — can produce large balance errors
**File:** `frontend/src/pages/AddExpense.tsx` (lines ~181–182)
**What:** `currency.getRate(data.currency) ?? 1` — if rates failed to load, all non-base-currency expenses are recorded as 1:1. A 500 THB expense on a USD trip becomes 500 USD silently.
**Fix:** Check `currency.error` or whether the rate is actually available before submission. Show a warning banner: "Exchange rates unavailable — this expense will use 1:1 until rates load."
**Status:** 🟡 Pending

---

## LOW

### L19. Dead route: `/trips/:id/members/:memberId` is never navigated to
**File:** `frontend/src/App.tsx`
**What:** The `MemberProfile` page is still registered as a route but nothing in the app links to it now that MemberProfileSheet is used. It will silently drift out of sync with the rest of the app.
**Fix:** Remove the route and the `MemberProfile.tsx` page, or add a "View full profile" link from the sheet if the standalone page provides value.
**Status:** 🟢 Pending

---

### L20. Auth 401 interceptor redirects to login with no "session expired" message
**File:** `frontend/src/lib/api.ts`
**What:** `window.location.href = '/login'` is called with no explanation. The user loses any unsaved form state and does not know why they were redirected.
**Fix:** Before redirecting, `sessionStorage.setItem('auth_expired', '1')`. On the Login page read it and show `toast.info('Your session expired — please sign in again.')`.
**Status:** 🟢 Pending

---

### L21. Claude CLI not available in production — receipt parsing silently 503s
**File:** `backend/app/routers/ai.py`
**What:** AI endpoints use `asyncio.create_subprocess_exec('claude', ...)`. The `claude` binary is only present locally. Receipt parsing in production returns 503 with no informative message.
**Fix:** Return a clear 501 "AI parsing not available on this server" or migrate to the Anthropic Python SDK (`pip install anthropic`) which installs normally.
**Status:** 🟢 Pending

---

### L22. `auth.currentUser!` non-null assertion in ProfileDrawer can crash on session expiry
**File:** `frontend/src/components/shared/UserMenu.tsx` (line 24)
**What:** `const user = auth.currentUser!` — if the session expires while the ProfileDrawer is open (Supabase fires `onAuthStateChange` with null, setting `currentUser = null`), the component crashes trying to access `.displayName`, `.email`, etc. on null.
**Fix:** Add `if (!auth.currentUser) return null` inside `ProfileDrawer`, or remove the non-null assertion and guard all accesses.
**Status:** 🟢 Pending

---

## Summary

| # | Severity | File | Issue |
|---|----------|------|-------|
| C1 | Critical | `main.tsx` | No ErrorBoundary — any throw = blank screen |
| C2 | Critical | `ConfirmModal.tsx` | No loading state — double-submit risk |
| C3 | Critical | `ExpenseStore.ts` | `deleteExpense` swallows error silently |
| C4 | Critical | `TripDetail.tsx` | Reopen trip: no try/catch or toast |
| H5 | High | `Settle.tsx` | `balances.error` never shown |
| H6 | High | `TripStore.ts` | `leaveTrip`/`deleteTrip`: no try/catch |
| H7 | High | `NoteStore.ts` | `fetchNotes`: no catch, no error state |
| H8 | High | `TripStore.ts` | Stale error persists across trips |
| H9 | High | `AddExpense.tsx` | No success toast on add/edit |
| H10 | High | `TripDetail.tsx` | Delete expense: no error shown (blocked by C3) |
| H11 | High | `Login.tsx` | Signup ignores `redirectTo` — breaks invite flow |
| H12 | High | `Login.tsx` | No welcome toast/message after signup |
| M13 | Medium | `schemas/` | No `amount > 0` backend validation |
| M14 | Medium | `services/expenses.py` | Split userIds not validated as members |
| M15 | Medium | `services/balances.py` | Settlements allowed on settled trips |
| M16 | Medium | `JoinCircleModal.tsx` | Join button active at 1 char, not 6 |
| M17 | Medium | `AddExpense.tsx` | Edit mode: missing expense = silent blank form |
| M18 | Medium | `AddExpense.tsx` | FX rate 1:1 fallback with no warning |
| L19 | Low | `App.tsx` | Dead `MemberProfile` route |
| L20 | Low | `lib/api.ts` | 401 redirect: no "session expired" message |
| L21 | Low | `routers/ai.py` | Claude CLI missing in production |
| L22 | Low | `UserMenu.tsx` | `currentUser!` assertion crashes on expiry |
