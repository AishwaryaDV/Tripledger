# Last Stage Bugs

Identified during pre-launch audit. Listed in priority order.

---

## 🔴 Critical — Broken flows

### #1 JoinCircleModal passes join code instead of trip UUID
**File:** `frontend/src/components/shared/JoinCircleModal.tsx`
**What:** The "Join with code" modal on the Dashboard called `trips.joinTrip(code)` with the 6-char join code. The API expects a UUID. Every join attempt via the modal would 404.
**Fix:** Call `fetchTripByCode(code)` first to resolve the UUID, then `joinTrip(uuid)`.
**Status:** ✅ Fixed

### #2 Settle page suggestions stay stale after recording a payment
**File:** `frontend/src/stores/BalanceStore.ts`
**What:** After `recordSettlement` succeeded, the suggestions list was not refreshed. Users saw outdated "pay X" items until they navigated away.
**Fix:** Call `fetchBalances(tripId)` after a successful settlement POST.
**Status:** ✅ Fixed

### #3 Expense edit failure is silent — navigates away anyway
**File:** `frontend/src/stores/ExpenseStore.ts`, `frontend/src/pages/AddExpense.tsx`
**What:** If `editExpense` or `addExpense` API call failed, the store rolled back state but the UI still navigated to the trip page. No error shown.
**Fix:** Make both methods throw on failure; catch in AddExpense and show a toast error, stay on the page.
**Status:** ✅ Fixed

### #4 Split Editor allows submitting invalid splits
**File:** `frontend/src/pages/AddExpense.tsx`
**What:** No validation before submit: equal mode with zero members selected sends empty splits; exact/percentage modes can submit splits that don't sum to the expense amount; shares mode accepts all-zero shares.
**Fix:** Validate `splits.length > 0` and `sum(amountOwed) ≈ amount` before calling the API.
**Status:** ✅ Fixed

---

## 🟠 High — Data integrity / silent failures

### #5 Note content >250 chars causes a raw DB error
**Files:** `backend/app/schemas/note.py`, `frontend/src/pages/TripDetail.tsx`
**What:** The DB `Note.content` column is `String(250)` but the Pydantic schema had no length constraint. Submitting >250 chars hit a database error instead of a clean 422.
**Fix:** Added `max_length=250` validator to `NoteCreate`/`NoteUpdate` schemas; added `maxLength` attribute and character counter to both note textareas.
**Status:** ✅ Fixed

### #6 BalanceStore.fetchBalances has no error handling
**File:** `frontend/src/stores/BalanceStore.ts`, `frontend/src/pages/TripDetail.tsx`
**What:** `fetchBalances` had no try/catch and no `error` field. API failures were silent — balances and suggestions tabs showed nothing with no explanation.
**Fix:** Added `error` field, try/catch in `fetchBalances`, and error display in balances/suggestions tabs.
**Status:** ✅ Fixed

### #7 ExpenseStore.error is never displayed in the UI
**File:** `frontend/src/pages/TripDetail.tsx`
**What:** `ExpenseStore.error` is set on `fetchExpenses` failure but no component read it. The expenses tab showed an empty state instead of an error.
**Fix:** Added error check in the expenses tab IIFE to display the error message.
**Status:** ✅ Fixed

### #8 NoteStore failures are silent
**File:** `frontend/src/stores/NoteStore.ts`, `frontend/src/pages/TripDetail.tsx`
**What:** add/edit/delete note failures rolled back state but showed no user feedback.
**Fix:** Made each note action throw on failure; added try/catch with `toast.error()` in TripDetail handlers.
**Status:** ✅ Fixed

### #9 ResetPassword page spins forever on expired/invalid links
**File:** `frontend/src/pages/ResetPassword.tsx`
**What:** If the `PASSWORD_RECOVERY` Supabase event never fired (expired link), the page showed "Verifying reset link…" indefinitely with no feedback.
**Fix:** Added an 8-second timeout; shows "This link has expired" with a link back to the forgot-password flow.
**Status:** ✅ Fixed

### #10 Settle payment amount has no upper bound
**File:** `frontend/src/pages/Settle.tsx`
**What:** The payment amount input accepted values larger than the suggested amount, allowing users to over-record a payment.
**Fix:** Added `max={s.amount}` to the input and capped the onChange value to `s.amount`.
**Status:** ✅ Fixed

---

## 🟡 Medium — UX / incorrect behaviour

### #11 InviteJoin page flashes "Log in to Join" while auth is loading
**File:** `frontend/src/pages/InviteJoin.tsx`
**What:** `auth.isLoading` wasn't checked. Already-logged-in users briefly saw "Log in to Join" before the auth state resolved.
**Fix:** Show a spinner while `auth.isLoading` is true before rendering any action button.
**Status:** ✅ Fixed

### #12 MemberProfile calls navigate() in render body
**File:** `frontend/src/pages/MemberProfile.tsx`
**What:** When a member ID wasn't found in the trip, `navigate()` was called directly in the render function. Side effects in render can cause issues in React Strict Mode.
**Fix:** Moved the redirect into a `useEffect` that fires when `memberIndex === -1`.
**Status:** ✅ Fixed

### #13 MemberProfileSheet component was dead code
**File:** `frontend/src/components/trip/MemberProfileSheet.tsx`, `frontend/src/pages/TripDetail.tsx`
**What:** MemberProfileSheet was fully built with rich stats (balance, spending breakdown, settlement details) but never imported or used. TripDetail navigated to the sparse MemberProfile page instead.
**Fix:** Imported and wired MemberProfileSheet into TripDetail's members tab. Member row clicks now open the sheet instead of navigating to a separate page.
**Status:** ✅ Fixed

### #14 CreateTrip defaults to hardcoded INR instead of user's defaultCurrency
**File:** `frontend/src/pages/CreateTrip.tsx`
**What:** The currencies pre-selection always initialised to `['INR']` regardless of the user's preferred currency.
**Fix:** Read `auth.currentUser.defaultCurrency` and use it as the initial value (falls back to USD).
**Status:** ✅ Fixed

### #15 No UI to change defaultCurrency in profile settings
**Files:** `frontend/src/components/shared/UserMenu.tsx`, `backend/app/routers/auth.py`
**What:** `defaultCurrency` exists in the DB and frontend User type but there's no UI to change it. The field is permanently locked to whatever the backend default is.
**Fix:** Add a currency dropdown in the ProfileDrawer and a PATCH endpoint to update it. Toast shown on save.
**Status:** ✅ Fixed

---

## 🟢 Low — Code quality / minor

### #16 TripSummary scrollIntoView useEffect has wrong dependency
**File:** `frontend/src/pages/TripSummary.tsx`
**What:** `useEffect([dailyScrollRef.current])` — changing a ref value doesn't trigger effects so the scroll-to-current-day animation may never fire.
**Fix:** Change dependency array to `[]` so it runs once on mount.
**Status:** ✅ Fixed

### #17 Duplicate MEMBER_COLORS declaration in TripDetail
**File:** `frontend/src/pages/TripDetail.tsx`
**What:** `MEMBER_COLORS` is declared twice — once at module scope and once inside a local block, shadowing the outer constant. Harmless but redundant.
**Fix:** Remove the inner re-declaration.
**Status:** ✅ Fixed

### #18 Backend: settled trip does not block new expenses via API
**File:** `backend/app/services/expenses.py`
**What:** The expense create/update endpoints had no check for `trip.is_settled`. A settled trip could receive new expenses via direct API calls, bypassing the frontend prompt. Frontend now shows a toast with the 409 error detail.
**Fix:** Check `trip.is_settled` in create/update expense service and return 409. Frontend catches and toasts the error.
**Status:** ✅ Fixed

### #19 Backend: paid_by user is not validated as a trip member
**File:** `backend/app/services/expenses.py`
**What:** Expense create/update accepted any `paid_by` user ID without verifying they are a member of the trip. Frontend now shows a toast with the 400 error detail.
**Fix:** Validate `paid_by` against trip membership list before creating/updating the expense. Frontend catches and toasts the error.
**Status:** ✅ Fixed

### #20 Backend: settlement fromUserId/toUserId not validated as trip members
**File:** `backend/app/services/balances.py`
**What:** `create_settlement` did not check that `fromUserId` and `toUserId` are members of the trip, allowing arbitrary user IDs to be recorded. Frontend now shows a toast with the 400 error detail.
**Fix:** Validate both user IDs against trip membership before creating the settlement. Frontend Settle page catches and toasts the error.
**Status:** ✅ Fixed
