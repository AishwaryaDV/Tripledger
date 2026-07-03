# QA Sweep Bugs

Found during a 20-flow code-level audit run after Phase 2 fixes were applied.
Each bug was traced through the actual code path, not just the spec.

---

## CRITICAL

### C1. Splits store original-currency amounts — balances wrong for all multi-currency trips
**Files:** `frontend/src/components/expense/SplitEditor.tsx`, `frontend/src/pages/AddExpense.tsx`, `backend/app/services/balances.py`
**What:** `SplitEditor.computeSplits()` uses `totalAmount` (the expense's original currency amount, e.g. 500 THB) to calculate each member's `amountOwed`. The resulting split array has values in the original currency (e.g. 166.67 THB per person). `AddExpense.onSubmit` then sends these splits as-is to the backend. The balance service reads `split.amount_owed` and subtracts it from balances as if it were in the base currency. So a 500 THB dinner on a USD trip records a $166.67 debt per person instead of ~$4.97.
**Root cause:** The `AddExpense` form correctly converts `amountBase` for the expense total, but never applied the same conversion factor to the individual split amounts before sending.
**Fix:** Before building the payload in `onSubmit`, compute `scalingFactor = amountBase / originalAmount` and multiply each split's `amountOwed` by it.
**Status:** ✅ Fixed

---

### C2. `expenseDate` not validated on backend — bad date string → unhandled 500
**File:** `backend/app/services/expenses.py`
**What:** `create_expense` and `update_expense` call `date.fromisoformat(data.expenseDate)` directly. If `expenseDate` is not a valid ISO date string (e.g. `"25/06/2026"`, `"yesterday"`, empty string), Python raises `ValueError` which is not caught, propagating as a 500 Internal Server Error instead of a clean 422 Unprocessable Entity.
**Root cause:** `ExpenseCreate` schema had no `expenseDate` validator — only the `amount` field was validated.
**Fix:** Add `@field_validator('expenseDate')` in the schema that calls `date.fromisoformat(v)` and raises `ValueError` with a clear message on failure.
**Status:** ✅ Fixed

---

### C3. `category` and `splitType` are unvalidated plain strings — invalid values hit DB IntegrityError → 500
**File:** `backend/app/schemas/expense.py`
**What:** `ExpenseCreate.category` is `str = "other"` and `splitType` is `str = "equal"` with no enum constraint. Any string value passes Pydantic. The DB has an ENUM constraint on these columns, so an invalid value (e.g. `category: "snacks"`) reaches SQLAlchemy and raises an `IntegrityError` which FastAPI returns as a 500, not a 422.
**Root cause:** Backend schema relied on frontend to enforce the enum; there was no server-side enum validation.
**Fix:** Add `@field_validator('category')` and `@field_validator('splitType')` checking against `VALID_CATEGORIES` and `VALID_SPLIT_TYPES` sets.
**Status:** ✅ Fixed

---

## HIGH

### H1. Join code collision → unhandled IntegrityError → 500 + hex-only codes
**File:** `backend/app/services/trips.py`
**What (collision):** `_generate_join_code()` used `secrets.token_hex(3).upper()` which produces a 6-character hex string (only characters 0-9 and A-F, giving 16^6 = ~16.7M combinations). If the generated code already exists in the DB, `db.flush()` raises an `IntegrityError` on the UNIQUE constraint with no retry — resulting in a 500.
**What (hex-only):** The UI placeholder showed `GOA26X` as an example code, but G, O, and X are not valid hex characters. Users copying that example or entering codes with non-hex letters would always get "code not found".
**Root cause:** Both issues stem from using `token_hex` instead of a proper alphanumeric generator.
**Fix:** Changed alphabet to `A-Z + 0-9` (36^6 = ~2.2B combos), added a 5-attempt retry loop catching `IntegrityError` on flush.
**Status:** ✅ Fixed

---

### H2. `fetchBalances` wipes existing data before new fetch completes — "No balances yet" flash
**File:** `frontend/src/stores/BalanceStore.ts`
**What:** At the start of `fetchBalances`, the store immediately sets `this.balances = []` and `this.suggestions = []`. Any component reading `balances.balances` during the in-flight request sees an empty array and renders the "No balances yet — add some expenses first" empty state. After the response arrives, the correct data appears. This flash happens on every tab switch or page refresh.
**Root cause:** The pattern of clearing data optimistically before a fetch is harmful for read operations (correct for mutations, not for fetches). Existing data should stay visible until new data arrives.
**Fix:** Remove the pre-clear; only update `balances` and `suggestions` on successful response. `error` is still cleared at the start of the fetch.
**Status:** ✅ Fixed

---

### H3. Display name update doesn't propagate to TripMember rows — stale name in trips
**File:** `backend/app/routers/auth.py`
**What:** `PATCH /auth/me` updates `User.display_name` in the users table. But `TripMember.display_name` is a denormalised copy set when the user joins a trip, and the `_build_trip_response` function reads from `TripMember.display_name`, not `User.display_name`. After updating their name, the user continues to appear under their old name in all trips they joined.
**Root cause:** No cascade from user profile update to the denormalised member display name.
**Fix:** After updating the user row, also `UPDATE TripMember SET display_name = new_name WHERE user_id = user.id`.
**Status:** ✅ Fixed

---

### H4. Daily chart scroll-to-right fires before chart is mounted — never actually scrolls
**File:** `frontend/src/pages/TripSummary.tsx`
**What:** `useEffect(() => { dailyScrollRef.current.scrollLeft = ... }, [])` has an empty dependency array, so it runs once on component mount. At mount time, expenses haven't loaded yet (they're fetched asynchronously), so the daily chart section (`{dailyData.length > 0 && ...}`) hasn't rendered and `dailyScrollRef.current` is `null`. The `scrollLeft` assignment is a no-op. The chart never scrolls to the most recent day.
**Root cause:** The scroll effect must run after the chart renders, not on component mount.
**Fix:** Change dep array to `[dailyData.length]` so the effect re-runs after the chart data loads and the chart is mounted.
**Status:** ✅ Fixed

---

### H5. "Reopen Circle" and "Mark Settled" shown to non-owner members
**Files:** `frontend/src/pages/TripDetail.tsx`, `frontend/src/pages/Settle.tsx`
**What:** The "Reopen Circle" button in TripDetail and "Mark Settled" button in Settle.tsx render for all trip members regardless of role. Only the trip owner (role = "owner") is permitted to perform these actions — the backend returns 403 for non-owners. Non-owner members see these buttons, click them expecting something to happen, and get a confusing "403 Forbidden" toast with no explanation.
**Root cause:** No role check before rendering the action buttons.
**Fix:** Derive `isOwner = trip.members.find(m => m.userId === currentUserId)?.role === 'owner'` and conditionally render both buttons only when `isOwner` is true.
**Status:** ✅ Fixed

---

## MEDIUM

### M1. Already logged-in user visiting `/login` is not redirected to dashboard
**File:** `frontend/src/pages/Login.tsx`
**What:** The Login page has no guard for authenticated users. If a logged-in user navigates to `/login` (via back button, bookmark, or direct URL), they see the full login form instead of being redirected to `/dashboard`. The `ProtectedRoute` guards protect internal pages but doesn't redirect away from public pages when authenticated.
**Root cause:** No `auth.isLoggedIn` check or `<Navigate>` in the Login component.
**Fix:** Add a `useEffect` that navigates to `redirectTo` (or `/dashboard`) when `auth.isLoggedIn` is true and auth is not loading.
**Status:** ✅ Fixed

---

### M2. FX rate hint says "will use 1:1" but submit actually blocks — contradictory UX
**File:** `frontend/src/pages/AddExpense.tsx`
**What:** When the selected currency differs from the base currency and rates haven't loaded, the inline conversion hint displays "Rate not available — will use 1:1". However, the submit handler added in Phase 2 (M18 fix) now blocks submission with a toast error when rates are unavailable. The hint implies the form will proceed with a 1:1 fallback but the submit code refuses. Users read the hint, assume the form will work, attempt to submit, and get a confusing error.
**Root cause:** Phase 2 M18 fix changed the submit path but the UI hint string was not updated to match.
**Fix:** Change the hint to "Rate not available — save disabled until rates load" to reflect the actual behaviour.
**Status:** ✅ Fixed

---

### M3. Settle page has no payment history section
**File:** `frontend/src/pages/Settle.tsx`
**What:** After recording a settlement, the suggestion disappears but there's no visible record of what was paid on the Settle page itself. Payment history is only visible in TripSummary (Settlement Status section). If a user navigates away and comes back to the Settle page, there's no indication that any payments have been recorded.
**Root cause:** Settlement history was never added to the Settle page — it was only implemented in TripSummary.
**Fix:** Add a "Recorded Payments" section below the suggestions list, driven by `balances.settlements`, showing from/to names, amount, date, and partial badge.
**Status:** ✅ Fixed

---

### M5. Pydantic 422 `detail` is a list — toasts show `[object Object]`
**File:** All frontend toast call sites, `frontend/src/lib/utils.ts`
**What:** When FastAPI returns a 422 Unprocessable Entity (Pydantic validation failure), `err.response.data.detail` is an array: `[{ loc: ["body", "amount"], msg: "Value error, ...", type: "value_error" }]`. All toast calls use `err?.response?.data?.detail ?? err?.message ?? 'fallback'`. When `detail` is an array, JavaScript coerces it via `.toString()` giving `[object Object]` in the toast.
**Root cause:** Frontend assumed `detail` is always a string; Pydantic returns a list for validation errors.
**Fix:** Add a `getApiError(err)` utility that checks if `detail` is an array, extracts `.msg` from each entry, joins them, and falls back to `err.message`. Replace all toast error call sites with this helper.
**Status:** ✅ Fixed

---

### M6. Daily and per-person BarCharts in TripSummary not wrapped in ErrorBoundary
**File:** `frontend/src/pages/TripSummary.tsx`
**What:** Phase 2 C1 fix added an `ErrorBoundary` around only the PieChart (Category Breakdown) section. The daily spending BarChart and per-person horizontal BarChart are outside any nested boundary. A crash in Recharts for those charts (e.g., malformed daily data or zero-member edge case) propagates all the way to the root `ErrorBoundary`, showing the full-page reload screen instead of a localised "Chart failed to render" fallback.
**Root cause:** The nested boundary was only added for the chart that was specifically mentioned in the bug spec; the other two charts were overlooked.
**Fix:** Wrap the daily spending chart and per-person chart sections each in their own `<ErrorBoundary fallback={...}>`.
**Status:** ✅ Fixed

---

## LOW

### L1. Display name has no maximum length — frontend or backend
**Files:** `frontend/src/pages/Login.tsx`, `backend/app/schemas/user.py`
**What:** The signup display name input has no `maxLength` attribute. The backend `AuthMeRequest` (used for profile updates) also has no `max_length` validator. A user can submit a 1,000-character display name which gets stored and rendered in tight UI spaces (member avatars, balance rows, expense cards), breaking layouts.
**Root cause:** No length constraint was ever added — only content was validated (non-empty), not length.
**Fix:** Add `maxLength={50}` to the display name input in signup form and profile editor; add `max_length=50` Pydantic validator to `AuthMeRequest`.
**Status:** ✅ Fixed

---

### L2. Trip name allows empty string via direct API — backend has no `min_length`
**File:** `backend/app/schemas/trip.py`
**What:** `TripCreate.name` is declared as `name: str` with no minimum length constraint. The frontend validates that name is non-empty before submitting, but a direct API call with `name: ""` creates a trip with an empty name, which then appears in the dashboard list with no label.
**Root cause:** Backend schema relied on frontend validation without a server-side safety net.
**Fix:** Add `@field_validator('name')` checking `v.strip()` is non-empty, or use Pydantic `min_length=1`.
**Status:** ✅ Fixed

---

### L3. CreateTrip shows intermediate success screen before navigating to trip detail
**File:** `frontend/src/pages/CreateTrip.tsx`
**What:** After `createTrip` succeeds, the page renders a "Circle created!" success screen showing the 6-character join code with an "Open Circle →" button. The user must click the button to navigate to the trip. The original spec said "redirect to trip detail page" immediately. The intermediate screen is intentional UX (to show the join code so the creator can share it) but deviates from the spec and adds an extra step.
**Root cause:** Intentional design choice — the join code display was added as a convenience feature.
**Note:** Low priority; no crash or data bug. Keeping the intermediate screen as-is; it provides value by surfacing the join code. Not fixing.
**Status:** 🟢 Won't Fix (intentional)

---

### L4. Join code used hex-only chars — placeholder showed non-hex letters
**File:** `backend/app/services/trips.py`
**What:** `secrets.token_hex(3).upper()` produces codes using only 0-9 and A-F. The UI join code input placeholder showed `GOA26X` as an example. G, O, and X are not valid hex characters, so users copying or using that format would always get "code not found".
**Root cause:** `token_hex` chosen for simplicity; the limited alphabet wasn't noticed until a user tried to enter a code that looked like the placeholder.
**Fix:** Resolved as part of H1 fix — alphabet changed to full A-Z + 0-9.
**Status:** ✅ Fixed (as part of H1)

---

### L5. Settlement reminder message says "you are owed 0.00" when net balance is zero
**File:** `backend/app/routers/trips.py` (`remind_member` or notification logic)
**What:** When generating a balance summary for a member notification (e.g. the settle-up reminder), the message logic checks `if net >= 0: balance_line = "you are owed..."`. A member with net = 0 (exactly settled) gets a message saying "you are owed 0.00" instead of "you are fully settled up".
**Root cause:** The condition uses `>= 0` instead of `> 0`, conflating zero and positive balances.
**Fix:** Add an explicit `net == 0` branch that returns a "settled up" message.
**Status:** ✅ Fixed

---

## Summary Table

| # | Severity | File | Issue |
|---|----------|------|-------|
| C1 | Critical | `AddExpense.tsx`, `SplitEditor.tsx` | Splits in original currency → wrong balances |
| C2 | Critical | `schemas/expense.py` | `expenseDate` unvalidated → 500 on bad date |
| C3 | Critical | `schemas/expense.py` | `category`/`splitType` unvalidated → DB 500 |
| H1 | High | `services/trips.py` | Join code collision → 500 + hex-only codes |
| H2 | High | `BalanceStore.ts` | Wipes data before fetch → "No balances" flash |
| H3 | High | `routers/auth.py` | Display name not propagated to TripMember rows |
| H4 | High | `TripSummary.tsx` | Daily chart scroll fires before chart mounts |
| H5 | High | `TripDetail.tsx`, `Settle.tsx` | Non-owners see owner-only action buttons |
| M1 | Medium | `Login.tsx` | Logged-in user not redirected from `/login` |
| M2 | Medium | `AddExpense.tsx` | FX hint says "1:1" but submit blocks |
| M3 | Medium | `Settle.tsx` | No payment history on Settle page |
| M5 | Medium | all toast sites, `utils.ts` | Pydantic 422 list renders as `[object Object]` |
| M6 | Medium | `TripSummary.tsx` | Daily/per-person charts missing ErrorBoundary |
| L1 | Low | `Login.tsx`, `schemas/user.py` | No max length on display name |
| L2 | Low | `schemas/trip.py` | Trip name allows empty string via API |
| L3 | Low | `CreateTrip.tsx` | Intermediate success screen (won't fix) |
| L4 | Low | `services/trips.py` | Hex-only join codes vs alphanumeric placeholder |
| L5 | Low | `routers/trips.py` | Reminder says "owed 0.00" when net = 0 |
