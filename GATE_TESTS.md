# Gate Tests — manual verification before deployment

Running checklist of manual tests to do after the FINAL_AUDIT fix batches are complete.
Items get added here as each batch lands. Do these on the final build, in order.

## From Batch 1 — Money math (N1, N6, N3-currency, N11-amounts)

- [ ] **Wipe or re-enter existing multi-currency test data.** Any cross-currency expense
      saved before Batch 1 was stored with an inverted exchange rate (e.g. 500 THB dinner
      on a USD trip stored as ~$18,000). Balances will look wrong even with correct code
      until that data is deleted or re-entered. Same-currency expenses are unaffected.
- [ ] **Cross-currency end-to-end trip against a spreadsheet** (pending test #4). Create a
      USD-base trip with 3+ members, add THB and EUR expenses across all four split modes
      (equal / exact / percentage / shares), edit a cross-currency exact-split expense,
      then verify every member's balance and the settle suggestions against a hand-computed
      spreadsheet. Also check the inline "1 THB = $…" hint shows a sane rate.

## From Batch 2 — Security & data integrity

Needs **two accounts** (e.g. a second browser profile).

- [ ] **Join flows.** Join a circle via the invite link (`/join/CODE`) and via the
      "Join a Circle" modal — both now hit the new `POST /trips/join` endpoint. Verify the
      invite preview page still renders (member count + avatar initials), the
      "already a member" banner shows for a circle you're in, and a wrong code shows
      "Invalid join code".
- [ ] **Leave protection.** With account B owing money on a trip: try to leave → should be
      blocked with "Settle your balance…". Settle up, try again → still blocked if B has
      expenses/splits ("You still have expenses…"). Only a member with zero involvement can leave.
- [ ] **Account deletion.** Try deleting account B while it's in a circle → 409 with a clear
      message. Leave all circles, delete again → account gone, login rejected, no orphaned rows.
- [ ] **AI chat isolation.** From account B, attempt AI chat on a trip ID that only A belongs
      to (direct API call) → 403, no expense data leaked.
- [ ] **AI chat guardrails.** Ask the chat to add an expense in a foreign currency → friendly
      rejection. Ask it to add/delete on a settled trip → friendly rejection mirroring the 409.
- [ ] **Settled-trip delete.** Delete an expense on a settled trip via UI/API → 409.
- [ ] **Over-settlement.** Record a payment larger than what's owed → 400 with the cap amount.

## From Batch 3 — Error handling & UX

- [ ] **Trip switching.** Open trip A's Balances tab, then navigate to trip B — B must show
      its own (or empty/loading) balances, suggestions, settlements, and notes, never A's.
- [ ] **Error recovery.** Kill the network, open the Expenses tab (error banner appears),
      restore the network, refetch — the banner must clear. Same for the Settle page: with a
      bad trip ID or offline, it must show the error + Retry screen, not an endless skeleton.
- [ ] **Session expiry with drawer open.** Open the profile drawer, force sign-out in another
      tab (or wait for expiry) — the app must not crash to the error boundary.
- [ ] **Email-confirmation signup.** With Supabase email confirmation ON: sign up → should show
      "Check your email", not a false "Welcome!" + bounce. Confirm the link, log in normally.
- [ ] **Deep-link after expiry.** While logged out, open `/trips/<id>/settle` directly → after
      logging in you must land back on that settle page, not the dashboard.
- [ ] **Mark settled with debts.** As owner with outstanding suggestions, tap "Mark settled" in
      More options → amber confirm panel with the outstanding count; "Settle anyway" works;
      the Settle page's zero-balance settle path still works without the prompt.
- [ ] **Receipt scan.** Scan a real receipt photo — fields prefill (this was 500-ing before).
- [ ] **Edit deep-link across trips.** Open trip A, then paste an edit-expense URL for trip B —
      the form must load B's expense instead of bouncing "Expense not found".

## From Batch 4 — Cleanup

- [ ] **Create-circle validation.** Try creating a circle with a 200-char name, an end date
      before the start date, and a currency the base isn't part of — each should show a clean
      validation message, not a raw 500.
- [ ] **CSV export with tricky names.** Rename a member to `Doe, John "JD"`, export the CSV,
      open in a spreadsheet — columns must stay aligned.
- [ ] **JPY/VND payment history.** Record a payment on a zero-decimal-currency trip and check
      the Recorded Payments date label renders cleanly.
- [ ] **Clipboard denial.** Deny clipboard permission (or use a non-HTTPS context) and tap any
      "Copy" button — should toast "Could not copy", never a false "Copied!".
- [ ] **Error message quality.** Trigger a few 4xx errors (join a full/settled circle, leave
      with debts) — toasts must show the server's message, never
      "Request failed with status code 409".
- [ ] **Build sanity.** `npm run build` and `npm test` pass; backend boots with no
      deprecation warning for on_event. (Note: `npm run lint` still reports pre-existing
      `catch (e: any)` style errors across the codebase — not introduced by the fix batches.)

## Full pre-launch pass (from FINAL_AUDIT_BUGS.md "pending tests")

- [ ] #2 Auth edge cases — same user on two devices, 6-hour idle tab, logout-all while a
      second tab is open, email-confirmation timing
- [ ] #3 Mobile/responsive — 375px pass over Settle, SplitEditor (all four modes),
      MemberProfileSheet
- [ ] #5 Accessibility — aria-labels, focus traps, Escape handling, keyboard-only
      add-expense and settle flows
- [ ] #1 Load/stress — seed 20 members / 500 expenses / 3 currencies; measure balance
      endpoint latency, chart render, CSV export, AI-chat prompt size
