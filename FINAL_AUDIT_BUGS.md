# Final Audit Bugs

Found during the full-codebase verification sweep run after all three prior phases
(LAST_STAGE_BUGS → PHASE2_BUGS → QA_BUGS) were fixed. Every file in `backend/app` and
`frontend/src` was read end-to-end; every documented fix from the three prior docs was
traced through the actual code.

**Verification result for prior phases:** all 60 documented fixes are genuinely in place,
with two exceptions that regressed into new bugs:
- Phase 2 **L22** (ProfileDrawer null guard) introduced a Rules-of-Hooks crash → see **N7**.
- QA **H2** (BalanceStore pre-clear removal) traded an empty-flash for a stale-data flash → see **N8**.

Numbering: N1–N27, ordered by severity. Fix plan at the bottom.

---

## 🔴 CRITICAL

### N1. Currency conversion is inverted — all cross-currency math is wrong
**File:** `frontend/src/stores/CurrencyStore.ts` (lines 56–67)
**What:** `fetchRates` calls `api.exchangerate-api.com/v4/latest/{baseCurrency}`, which returns
**base→foreign** rates (base USD → `rates.THB ≈ 36`, i.e. 1 USD = 36 THB). But `getRate()`'s
documented contract (its own comment: "getRate('USD') when base is INR → 83.02") is
**foreign→base**, and `convert()` **multiplies**. A 500 THB dinner on a USD trip is recorded as
**$18,250** instead of ~$13.70.
**Blast radius:** poisons `amountBase`, the split `scalingFactor` (the QA C1 fix scaled splits
consistently — but by the wrong factor), the `exchangeRate` column sent to the backend, and the
inline "1 THB = $36.00" conversion hint in AddExpense.
**Why it survived 3 QA phases:** nobody has run a real cross-currency trip against a spreadsheet
(pending test #4). Same-currency trips hit the `fromCurrency === this.base → return amount` short
circuit and are unaffected.
**Fix:** invert the math in one place — `getRate(from)` should return `1 / rates[from]` (or
`convert` should divide). Keep the stored `rates` as fetched; fix the accessor. Update the
AddExpense hint (`1 {currency} = …`) which currently formats the raw rate. Add a unit test:
base USD, THB=36 → `convert(500,'THB') ≈ 13.89`.
**Status:** ✅ Fixed (Batch 1 — getRate now returns the reciprocal; unit tests added in `CurrencyStore.test.ts`, vitest wired up)

---

### N2. AI chat endpoints have no membership check — cross-tenant read/write
**File:** `backend/app/services/ai_chat.py` (`send_message`, `_build_context`, `get_history`, `clear_history`)
**What:** Unlike every other service, ai_chat never calls `_check_membership`. Any authenticated
user who posts to `/trips/{any-trip-id}/ai-chat` receives the full expense context of that trip
(member names, user IDs, amounts, notes) embedded in the AI response, and can trigger
`add_expense` / `edit_expense` / `delete_expense` actions on trips they are not a member of.
**Fix:** add the same `_check_membership(db, trip_id, current_user.id)` guard at the top of
`send_message`, `get_history` (router passes `current_user.id` only — change signature to take
the User), and `clear_history`.
**Status:** ✅ Fixed (Batch 2 — membership check on send_message/get_history/clear_history; router passes User)

---

### N3. AI chat actions bypass every business rule
**File:** `backend/app/services/ai_chat.py` → `_execute_action` (lines 199–282)
**What (four separate holes):**
1. `add_expense` sets `amount_base = amount` with **no currency conversion** — the original QA C1
   bug reintroduced via the chat path. "add lunch €12" on a USD trip records €12 as $12.
2. `is_settled` is never checked — add/edit/delete all work on settled trips (the REST endpoints
   block this with 409).
3. `paid_by` and split `userId`s are not validated as trip members — bad LLM output reaches the
   FK constraint → IntegrityError → 500, and the chat messages for that turn are lost (they're
   saved in the same transaction).
4. Splits are never validated to sum to the amount.
**Fix:** reuse the expense service instead of hand-rolling: build an `ExpenseCreate` payload from
`action_data` and call `expense_service.create_expense/update_expense/delete_expense`, catching
`HTTPException` and returning its detail as the `action_result` string. That inherits membership,
settled-check, member validation, and schema validation in one move. For currency: either restrict
AI adds to base currency (reject with a friendly message) or pass a rate — decide before implementing.
**Status:** ✅ Fixed (Batch 1: non-base currency rejected with friendly message — Option A, full conversion deferred to NEW_FEATS_PHASE2.md F1. Batch 2: add/edit/delete now delegate to the expense service, inheriting settled-check, member validation, and splits-sum; service 4xx becomes a friendly chat reply instead of a 500)

---

### N4. Account deletion half-deletes users, then 500s
**File:** `backend/app/routers/auth.py` (`delete_account`, lines 63–79), plus FK definitions in
`models/expense.py`, `models/settlement.py`, `models/note.py`, `models/trip.py`
**What:** `DELETE /auth/me` deletes the **Supabase auth user first**, then `db.delete(current_user)`.
But `expenses.paid_by`, `expense_splits.user_id`, `settlements.from_user_id/to_user_id`,
`notes.author_id`, and `trips.created_by` all FK to `users.id` with **no `ondelete` behaviour**.
For any user with activity the DB delete raises IntegrityError → 500 — *after* their login is
already destroyed. Result: an orphaned account that can't log in and can't be re-deleted.
**Fix (two parts):**
1. Reverse the order — delete the DB row (and dependent data) first, Supabase auth last.
2. Decide the data policy and enforce it: either block deletion while the user owns trips /
   has expenses ("settle and leave your circles first"), or explicitly cascade/anonymise
   (e.g. keep expenses but null the FK to a "deleted user" sentinel). Blocking is the smaller,
   safer change for now.
**Status:** ✅ Fixed (Batch 2 — 409 while user has memberships or expense/settlement/note/trip history; DB row deleted first, Supabase auth last, best-effort)

---

## 🟠 HIGH

### N5. Leaving a trip corrupts balances silently
**File:** `backend/app/services/trips.py` (`leave_trip`, lines 177–198), `backend/app/services/balances.py` (`_compute_net_balances`)
**What:** `leave_trip` has no balance check. `_compute_net_balances` only includes **current**
members, so a departed member's paid credits and owed splits simply vanish from the math — the
remaining members' nets no longer sum to zero and settlement suggestions become wrong.
**Fix:** in `leave_trip`, compute the member's net balance and count their expense involvement;
raise 409 "Settle your balance before leaving" if net ≠ 0 (within EPS) or they have splits/expenses.
Frontend MoreOptionsSheet already toasts API errors, so the message wires through.
**Status:** ✅ Fixed (Batch 2 — 409 on leave when net ≠ 0 or the member has paid expenses / splits on the trip)

---

### N6. Editing a cross-currency exact-split expense is broken
**Files:** `frontend/src/pages/AddExpense.tsx` (prefill effect lines 80–101, validation lines 178–183), `frontend/src/components/expense/SplitEditor.tsx` (initialSplits handling)
**What:** Stored splits are in **base** currency (post-C1 fix), but edit mode loads them raw into
SplitEditor, which displays them labeled with the **original** currency, and submit validation
compares their sum against the original-currency amount. A 500 THB expense with exact splits fails
validation on save ("splits must add up to 500.00 THB (currently 13.70)") — and if it passed, the
scaling factor would apply a **second** time. Equal/percentage/shares modes survive because they
recompute from `totalAmount`; exact mode does not.
**Fix:** when prefilling edit mode, convert stored split `amountOwed` back to the original currency
(`amountOwed * (expense.amount / expense.amountBase)`) before handing to SplitEditor, so the whole
form operates in original currency and the existing save-time scaling stays correct. Depends on N1
being fixed first (it changes what the stored values mean).
**Status:** ✅ Fixed (Batch 1 — prefill converts splits back to original currency via amount/amountBase)

---

### N7. ProfileDrawer crashes on session expiry — the hooks version of L22
**File:** `frontend/src/components/shared/UserMenu.tsx` (lines 24–29)
**What:** The Phase 2 L22 fix placed `if (!auth.currentUser) return null` **above** the `useState`
calls. If the session expires while the drawer is open (currentUser → null on a mounted component),
the early return changes the hook count mid-lifecycle → React throws "Rendered fewer hooks than
expected" → full-screen ErrorBoundary. This is exactly the scenario L22 was meant to fix.
**Fix:** move the guard below all hook declarations; derive `user`-dependent initial state lazily
or with fallbacks (`auth.currentUser?.displayName ?? ''`).
**Status:** ✅ Fixed (Batch 3 — guard moved below all hooks; user-derived state uses optional chaining)

---

### N8. Switching trips shows the previous trip's balances/notes
**Files:** `frontend/src/stores/BalanceStore.ts`, `frontend/src/stores/NoteStore.ts`
**What:** Neither store tracks which trip its data belongs to (ExpenseStore does). After the QA H2
fix removed the pre-clear, navigating trip A → trip B renders **trip A's** balances, suggestions,
settlements, and notes under trip B until the new fetch resolves. Visible in the Balances/
Suggestions tabs, the member-row net amounts, the Settle page, and MemberProfileSheet.
**Fix:** add `private currentTripId` to both stores; at the start of a fetch for a *different*
trip, clear the data arrays (keeping the H2 behaviour of not clearing on same-trip refetch).
**Status:** ✅ Fixed (Batch 3 — both stores clear on trip switch, keep data on same-trip refetch)

---

### N9. `ExpenseStore.error` is never cleared
**File:** `frontend/src/stores/ExpenseStore.ts` (line 39 sets it; nothing resets it)
**What:** One transient `fetchExpenses` failure → the Expenses tab shows the error banner
**forever**, even after successful refetches, and the error leaks across trips. (Phase 2 H8 fixed
this pattern in TripStore only.)
**Fix:** `this.error = null` at the start of `fetchExpenses` (and on success in add/edit/delete).
**Status:** ✅ Fixed (Batch 3)

---

### N10. Settle page: infinite skeleton on trip-load failure
**File:** `frontend/src/pages/Settle.tsx` (line 78)
**What:** `if (!trip || balances.isLoading) return <skeleton>` runs **before** the error check at
line 86. If `fetchTrip` fails with no cached trip (fresh session + bad ID or network error),
`trip` stays null with `isLoading` false → the error screen is unreachable → permanent skeleton.
TripDetail and TripSummary order their guards correctly; Settle doesn't.
**Fix:** check `trips.error || balances.error` *before* the loading/skeleton return, mirroring
TripSummary's guard order.
**Status:** ✅ Fixed (Batch 3)

---

### N11. Remaining backend validation gaps → raw 500s (same class as fixed C2/C3)
**Files:** `backend/app/schemas/trip.py`, `backend/app/schemas/expense.py`, `backend/app/schemas/balance.py`, `backend/app/schemas/note.py`, `backend/app/schemas/user.py`, `backend/app/services/trips.py`
**What (itemised):**
- `TripCreate.circleType` is a plain string but the DB column is an ENUM → invalid value = 500
  (exactly the C3 pattern, missed for trips).
- `TripCreate.startDate/endDate` are raw strings passed straight into `Date` columns
  (`services/trips.py:69-70`) → `"banana"` = 500. No `endDate >= startDate` check.
- `TripCreate.name` has no max length (trip-name version of L1); `currencies` list is unvalidated
  (empty list, >3 entries, or non-3-letter codes all pass); `baseCurrency` not required to be in
  `currencies`.
- `ExpenseCreate.amountBase` and `exchangeRate` are **not** validated positive (M13 only covered
  `amount`) — a negative `amountBase` via direct API silently corrupts balances. No server-side
  check that splits sum ≈ `amountBase`. `currency` unvalidated against the `String(3)` column →
  4+ chars = 500. No max length on `title`/`notes`. `Numeric(12,4)` overflows above ~100M → 500.
- `SettlementCreate.currency` unvalidated and never forced to the trip's base currency (the
  balance math assumes base). **`fromUserId == toUserId` is allowed** (self-settlement). No
  server-side upper bound — a direct API call can over-settle and flip balances negative.
- `NoteCreate` accepts empty/whitespace content. `AuthMeRequest` accepts whitespace-only
  display names (and stores the unstripped value).
**Fix:** one validator pass across the four schemas: enum check for `circleType`; ISO-date
validators for trip dates + range check; `min_length`/`max_length` on names/titles/notes;
`> 0` and sane upper bound (≤ 99,999,999) on all amounts; 3-letter uppercase pattern on all
currency fields; `fromUserId != toUserId` model validator on SettlementCreate; splits-sum-≈-amountBase
check in the expense service; settlement currency forced to `trip.base_currency` server-side.
**Status:** ✅ Fixed (Batch 1: amount validations, splits-sum check, settlement over-settle guard + base-currency enforcement. Batch 4: circleType enum, ISO date + range validation, name/description/title/notes lengths, currency-code patterns + baseCurrency-in-currencies, self-settlement block, empty-note block, display-name strip)

---

## 🟡 MEDIUM

### N12. `delete_expense` ignores `is_settled`
**File:** `backend/app/services/expenses.py` (line 169)
**What:** Create/update are blocked on settled trips (409), delete isn't — settled-trip history is
still mutable via the delete button (which the UI shows on settled trips) or direct API.
**Fix:** add the same `trip.is_settled → 409` guard to `delete_expense`.
**Status:** ✅ Fixed (Batch 2 — guard added; AI chat delete inherits it via service reuse)

---

### N13. Owner can "Mark settled" with outstanding balances, no warning
**Files:** `frontend/src/components/trip/MoreOptionsSheet.tsx` (lines 93–107), `backend/app/services/trips.py` (`patch_trip`)
**What:** The Settle page gates "Mark Settled" behind zero outstanding suggestions;
MoreOptionsSheet offers it unconditionally and `patch_trip` doesn't check either. One tap freezes
a trip with unpaid debts and no confirmation.
**Fix:** minimum — confirmation step in MoreOptionsSheet showing outstanding count. Better —
`patch_trip` returns 409 with "X payments still outstanding" unless a `force` flag is passed;
frontend surfaces it as a confirm dialog.
**Status:** ✅ Fixed (Batch 3 — did the "better" version: 409 + force flag server-side, amber confirm panel in MoreOptionsSheet)

---

### N14. First-login and join races → 500
**Files:** `backend/app/dependencies.py` (lines 55–59), `backend/app/services/trips.py` (`join_trip`)
**What:** Two concurrent first requests from a brand-new user both attempt the user-row insert;
the loser hits the unique constraint → unhandled IntegrityError → 500. Same pattern in `join_trip`
(double-click → composite-PK violation). Directly relevant to pending auth edge-case testing
(same user on two devices).
**Fix:** wrap both inserts in try/except IntegrityError → rollback → re-select (get-or-create),
and for `join_trip` treat the race as the existing 409 "Already a member".
**Status:** ✅ Fixed (Batch 2 — get-or-create race re-selects; join race returns 409)

---

### N15. Signup with Supabase email-confirmation ON is unhandled
**Files:** `frontend/src/stores/AuthStore.ts` (`signUp`), `frontend/src/pages/Login.tsx` (lines 86–88)
**What:** When confirmation is required, `supabase.auth.signUp` returns a user with **null
session**. Nothing logs in, yet the UI toasts "Welcome to TripLedger!" and navigates —
ProtectedRoute bounces straight back to /login with zero explanation.
**Fix:** `signUp` returns a flag (e.g. `{ needsEmailConfirmation: true }`) when `data.session`
is null; Login shows a "Check your email to confirm your account" state instead of navigating.
**Status:** ✅ Fixed (Batch 3)

---

### N16. `parse_receipt` unwraps the CLI JSON envelope wrong
**File:** `backend/app/routers/ai.py` (lines 168–173)
**What:** It reads `result["result"]`, which in `--output-format json` is the **text** field
(a string) — `parsed.get(...)` on a string → AttributeError → 500. `suggest_category` correctly
uses `result.get("structured_output") or result`; receipt parsing uses the wrong key.
**Fix:** use the same `structured_output` unwrap as `suggest_category`, and guard
`isinstance(parsed, dict)` before `.get`.
**Status:** ✅ Fixed (Batch 3)

---

### N17. CurrencyStore can silently serve wrong-base rates
**File:** `frontend/src/stores/CurrencyStore.ts`
**What:** `getRate`/`convert` never verify `this.base` matches the trip's base currency. After
switching to a trip with a different base while the refetch fails, stale rates from the old base
pass the `rateAvailable` gate in AddExpense and produce silently wrong conversions.
**Fix:** `getRate`/`convert` take (or check against) an expected base and return null on mismatch;
AddExpense already blocks submit on null rate, so the existing guard then does the right thing.
**Status:** ✅ Fixed (Batch 3 — optional expectedBase param, all AddExpense call sites pass trip.baseCurrency; unit tests added)

---

### N18. Edit-expense URL bounce race with another trip's cache
**File:** `frontend/src/pages/AddExpense.tsx` (prefill effect, lines 80–87)
**What:** If another trip's expenses are cached (`expenses.length > 0`), the prefill effect runs
before the correct trip's fetch resolves, fails to find `expenseId` in the stale list, and
immediately toasts "Expense not found" + navigates away — even though the expense exists.
**Fix:** gate the "not found" bounce on the store's data belonging to this trip (expose
`currentTripId` from ExpenseStore, or check `expenses.expenses[0]?.tripId === id`), and only
bounce when the fetch for *this* trip has completed.
**Status:** ✅ Fixed (Batch 3 — ExpenseStore exposes loadedTripId; prefill waits for this trip's data; also fixes never-bouncing on an empty trip)

---

### N19. ProtectedRoute drops deep links
**File:** `frontend/src/components/shared/ProtectedRoute.tsx`
**What:** The redirect to `/login` passes no state, so an expired-session user on
`/trips/X/settle` lands on /dashboard after re-login instead of back where they were.
(InviteJoin passes `redirectTo` manually; nothing else does. Login already honours it.)
**Fix:** `<Navigate to="/login" state={{ redirectTo: location.pathname + location.search }} replace />`.
**Status:** ✅ Fixed (Batch 3)

---

## 🟢 LOW

### N20. Settle page currency-symbol hack breaks for zero-decimal currencies
**File:** `frontend/src/pages/Settle.tsx` (line 334)
**What:** `formatCurrency(0, s.currency).replace('0.00', '')` extracts the symbol — but JPY/VND
format as "¥0" (no decimals), so the replace no-ops and the date renders as "¥0 7/3/2026".
**Fix:** use `getCurrencySymbol(code)` from `lib/currencies.ts` (already exists), or drop the
symbol from the date label entirely.
**Status:** ✅ Fixed (Batch 4 — dropped the symbol; the amount on the same row already shows currency)

---

### N21. CSV export: unquoted `Paid By` column breaks on commas
**File:** `frontend/src/pages/TripSummary.tsx` (`downloadCSV`, lines 263–283)
**What:** Display names containing a comma (e.g. "Doe, John") shift every subsequent column.
Title and Split are quoted; Paid By and Category are not.
**Fix:** add a `csvCell()` helper that quotes + escapes every field; apply to all columns.
**Status:** ✅ Fixed (Batch 4)

---

### N22. Dead code inventory
**Files:** `frontend/src/pages/MemberProfile.tsx` (route removed in L19, file kept),
`frontend/src/components/trip/ActivityFeed.tsx` (0 bytes), `frontend/src/components/expense/CategoryBadge.tsx` (0 bytes),
`frontend/src/components/shared/CurrencySelector.tsx` (0 bytes), `frontend/src/hooks/useRealtime.ts` (empty —
so `BalanceStore.updateFromRealtime` is never called and realtime updates **do not exist** despite
the store method), `frontend/src/mocks/` (MSW never wired into main.tsx).
**Fix:** delete the dead files and the orphaned `updateFromRealtime` method (or actually implement
realtime — decide; the visibilitychange refetch currently papers over it).
**Status:** ✅ Fixed (Batch 4 — all dead files + mocks/ deleted, updateFromRealtime removed; realtime remains a non-feature, visibilitychange refetch is the mechanism)

---

### N23. Error-message regressions: raw `err.message` instead of `getApiError`
**Files:** `frontend/src/stores/TripStore.ts` (fetchTrips/fetchTrip), `frontend/src/pages/CreateTrip.tsx`,
`frontend/src/pages/InviteJoin.tsx`, `frontend/src/components/trip/MoreOptionsSheet.tsx` (leave/delete),
`frontend/src/components/shared/UserMenu.tsx` (all handlers), `frontend/src/components/trip/MemberProfileSheet.tsx`
**What:** These call sites show "Request failed with status code 409" instead of the server's
detail message — a partial regression of QA M5's intent (M5 fixed the array case, not raw messages).
**Fix:** sweep all catch blocks to use `getApiError(err, fallback)`.
**Status:** ✅ Fixed (Batch 4 — swept all listed sites plus every store error assignment)

---

### N24. Join-by-UUID and public by-code endpoint expose more than intended
**Files:** `backend/app/routers/trips.py` (`join_trip`, `get_trip_by_code`)
**What:** `POST /trips/{uuid}/join` requires only the UUID, not the join code — anyone who ever
obtains a trip UUID can join. `GET /trips/by-code/{code}` is unauthenticated and returns the full
member list + join code (intentional for the invite screen, but it's a conscious-decision item).
**Fix:** change join to `POST /trips/join` with the code in the body (resolve server-side), or
require the code alongside the UUID. Slim the by-code response to name/type/member-count/avatars.
**Status:** ✅ Fixed (Batch 2 — POST /trips/join with joinCode in body replaces UUID join; by-code returns slim TripPreviewResponse without member IDs; InviteJoin/JoinCircleModal/TripStore updated)

---

### N25. `get_current_user` hardening
**File:** `backend/app/dependencies.py`
**What:** A token missing `sub` → `User(id=None)` insert crash (500 instead of 401). JWKS fetch
(`get_signing_key_from_jwt`) is a blocking network call inside an async handler — event-loop stall
on cold cache/key rotation.
**Fix:** `if not user_id: raise 401`. Run the JWKS lookup via `asyncio.to_thread` (cache makes
this rare, but the stall hits every request while it happens).
**Status:** ✅ Fixed (Batch 4)

---

### N26. Clipboard writes have no failure handling
**Files:** `frontend/src/pages/TripDetail.tsx` (`copyJoinCode`), `frontend/src/pages/TripSummary.tsx` (`copyAsText`),
`frontend/src/pages/CreateTrip.tsx` (`handleCopy`), `frontend/src/components/trip/MoreOptionsSheet.tsx` (`copyCode`)
**What:** `navigator.clipboard.writeText` rejects when permission is denied / insecure context —
unhandled rejection, and the UI still shows "Copied!".
**Fix:** `.then(...set copied...).catch(() => toast.error('Could not copy'))`.
**Status:** ✅ Fixed (Batch 4 — all four call sites)

---

### N27. Minor backend cosmetics
**File:** `backend/app/main.py`
**What:** Deprecated `@app.on_event("startup")` (FastAPI lifespan is the current API). No global
exception handler, so any residual 500 returns a bare body without CORS headers in some paths
(browser shows a CORS error instead of the real 500).
**Fix:** migrate to lifespan context; add a catch-all exception handler that returns JSON 500
with CORS intact.
**Status:** ✅ Fixed (Batch 4 — lifespan context + logged catch-all 500 handler that echoes allowed origins)

---

## Summary Table

| # | Severity | Area | Issue |
|----|----------|------|-------|
| N1 | Critical | `CurrencyStore.ts` | FX conversion inverted — multiplies instead of divides |
| N2 | Critical | `ai_chat.py` | No membership check — cross-tenant read/write |
| N3 | Critical | `ai_chat.py` | AI actions skip conversion, settled-check, member validation |
| N4 | Critical | `routers/auth.py` + models | Account deletion: Supabase first, then FK 500 → half-deleted user |
| N5 | High | `services/trips.py` | Leave trip with non-zero balance corrupts balance math |
| N6 | High | `AddExpense.tsx`, `SplitEditor.tsx` | Cross-currency exact-split edit blocked/double-scaled |
| N7 | High | `UserMenu.tsx` | Hooks-order crash on session expiry (L22 regression) |
| N8 | High | `BalanceStore.ts`, `NoteStore.ts` | Stale previous-trip data shown on trip switch (H2 regression) |
| N9 | High | `ExpenseStore.ts` | `error` never cleared — permanent error banner |
| N10 | High | `Settle.tsx` | Infinite skeleton on trip-load failure |
| N11 | High | backend schemas | Validation gaps: circleType enum, dates, amountBase, currency len, self-settlement, note/name lengths |
| N12 | Medium | `services/expenses.py` | Delete allowed on settled trips |
| N13 | Medium | `MoreOptionsSheet.tsx`, `patch_trip` | Mark settled with outstanding balances, no warning |
| N14 | Medium | `dependencies.py`, `join_trip` | Concurrent insert races → 500 |
| N15 | Medium | `AuthStore.ts`, `Login.tsx` | Email-confirmation signup: false welcome + silent bounce |
| N16 | Medium | `routers/ai.py` | parse_receipt unwraps wrong envelope key → 500 |
| N17 | Medium | `CurrencyStore.ts` | Stale wrong-base rates pass the availability gate |
| N18 | Medium | `AddExpense.tsx` | Edit URL bounces on another trip's cached expenses |
| N19 | Medium | `ProtectedRoute.tsx` | Deep link lost on auth redirect |
| N20 | Low | `Settle.tsx` | Symbol hack breaks for JPY/VND |
| N21 | Low | `TripSummary.tsx` | CSV: unquoted Paid By column |
| N22 | Low | multiple | Dead files: MemberProfile, 3 empty components, useRealtime, mocks |
| N23 | Low | multiple | Raw err.message instead of getApiError |
| N24 | Low | `routers/trips.py` | Join-by-UUID without code; chatty public by-code response |
| N25 | Low | `dependencies.py` | Missing-sub token → 500; blocking JWKS fetch |
| N26 | Low | multiple | Clipboard writes unhandled |
| N27 | Low | `main.py` | Deprecated startup hook; no global exception handler |

---

## Load-testing note (pending test #1)

Balance endpoints load every expense + split per request with no pagination, but at
20 members / 500 expenses that's ~2,500 rows — Postgres and the greedy min-transactions
algorithm handle that trivially. First real pain points will be: (a) TripDetail refetching
everything on every `visibilitychange`, (b) the daily BarChart's DOM width at hundreds of days
(64px × days), (c) `_build_context` in ai_chat serialising every expense into the prompt
(token cost grows linearly — 500 expenses ≈ a very large prompt). Nothing structural to fix
before launch; run a synthetic-data pass (seed script: 20 members, 500 expenses) after the
fix phases below.

---

# Plan of Attack

Fixes land in four batches, ordered so that each batch's "definition of correct" is stable
before the next depends on it. All batches get committed separately so any regression bisects
cleanly.

## Batch 1 — Money math (N1, N6, N3-currency, N11-amounts)
The FX inversion changes what every stored `amountBase` means, so it goes first.
1. Fix `CurrencyStore.getRate/convert` direction + AddExpense hint (N1). Add unit test.
2. Fix cross-currency edit prefill back-conversion (N6) — depends on N1.
3. Route AI `add_expense` through the expense service / restrict to base currency (currency part of N3).
4. Backend: validate `amountBase`/`exchangeRate` > 0, splits-sum check, settlement upper bound +
   base-currency enforcement (amount items from N11).
5. **Gate:** run pending test #4 — full cross-currency trip (USD base + THB and EUR expenses),
   verify every balance against a spreadsheet. This is the acceptance test for the whole batch.
   ⚠️ Any existing multi-currency test data in the DB was written with inverted rates and must be
   wiped or recomputed before verifying.

## Batch 2 — Security & data integrity (N2, N3-rest, N4, N5, N12, N14, N24)
1. Membership checks on all ai_chat endpoints (N2).
2. Remaining N3 items: settled-check + member validation via service reuse.
3. Account deletion: reorder Supabase/DB, block-while-active policy (N4).
4. Block leave-with-balance (N5).
5. Settled-trip delete guard (N12).
6. Get-or-create races (N14).
7. Join-by-code endpoint rework (N24) — last, it touches the invite flow UX.
**Gate:** manual pass on join/leave/delete/settle flows with two accounts.

## Batch 3 — Error handling & UX correctness (N7–N10, N13, N15–N19)
1. Store fixes first (N8 trip-keying, N9 error clearing) since pages read them.
2. Page guards: Settle skeleton order (N10), AddExpense edit race (N18).
3. ProfileDrawer hooks fix (N7).
4. Auth flows: email-confirmation branch (N15), ProtectedRoute redirectTo (N19).
5. Mark-settled confirmation (N13), CurrencyStore base check (N17), parse_receipt unwrap (N16).
**Gate:** re-run testing flows F1–F3 from TESTING_FLOWS.md plus trip-switching and
error-recovery scenarios.

## Batch 4 — Cleanup (N11-rest, N20–N23, N25–N27)
Remaining schema validators (enum/dates/lengths), symbol + CSV fixes, dead-file deletion,
getApiError sweep, clipboard catches, dependencies hardening, lifespan migration.
**Gate:** full lint/typecheck/build + smoke pass.

## After all four batches — pending test plan (#2–#5)
Run in this order:
1. **#4 Cross-currency end-to-end** — already executed as Batch 1's gate; re-verify once more on
   the final build.
2. **#2 Auth edge cases** — N14/N15 make this partly code-fixed; then manual: same user on two
   devices, 6-hour idle tab (token refresh), logout-all-devices while a second tab is open,
   email-confirmation timing.
3. **#3 Mobile/responsive** — 375px pass over Settle, SplitEditor (all four modes), and
   MemberProfileSheet; fix overflow/tap-target issues found.
4. **#5 Accessibility** — aria-labels on all form inputs and icon-only buttons, focus traps +
   focus restoration in ConfirmModal / JoinCircleModal / ProfileDrawer / MoreOptionsSheet /
   MemberProfileSheet, Escape handling (ConfirmModal has none), keyboard-only walkthrough of
   add-expense and settle flows.
5. **#1 Load/stress** — seed script (20 members / 500 expenses / 3 currencies), measure balance
   endpoint latency, chart render, CSV export, and AI-chat prompt size; decide on pagination only
   if numbers demand it.
