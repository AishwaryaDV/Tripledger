# New Features — Phase 2

Post-launch feature backlog. Items here are deliberate product improvements, not bug fixes —
they were consciously deferred during the FINAL_AUDIT_BUGS fix phases to keep those batches
small and testable.

---

## F1. Full currency conversion in AI chat expenses

**Context:** During the N3 fix (Batch 1), AI-chat expense creation was restricted to the trip's
base currency — non-base amounts ("add lunch €12" on a USD trip) are politely rejected and the
user is pointed to the Add Expense form. This was Option A: correct-but-limited, chosen because
the backend has no exchange-rate source and adding one mid-fix would have expanded the blast
radius of the money-math batch.

**Feature:** Let the AI chat add expenses in any of the trip's currencies, with the backend
performing the conversion server-side.

**What it needs:**
1. **A backend FX source.** Wire up exchangerate-api.com (or similar) in the backend. Note:
   `EXCHANGE_RATE_API_KEY` already exists in `backend/app/config.py` but is unused — either use
   it or swap to the keyless v4 endpoint the frontend already uses
   (`https://api.exchangerate-api.com/v4/latest/{base}`).
2. **Caching + failure handling.** Cache rates per base currency (frontend uses a 4-hour TTL —
   mirror that). On fetch failure, the chat should reject the add with a friendly "couldn't get
   exchange rates right now" rather than guessing.
3. **Rate consistency.** Frontend (AddExpense form) and backend (AI chat) will each have their
   own rate snapshot; they can disagree slightly. Decide whether that's acceptable (probably
   yes — rates drift anyway) or whether the backend should become the single rate source the
   frontend also queries (bigger change, cleaner long-term).
4. **Correct `amount_base` math.** Apply the same direction as the fixed frontend
   (`CurrencyStore` post-N1): rates from `v4/latest/{base}` are base→foreign, so
   `amount_base = amount / rates[expense_currency]`. Store `exchange_rate` consistently with
   what the REST path stores.
5. **Validation parity.** The converted expense must flow through the same expense-service path
   as everything else (membership, settled-check, member validation, splits-sum — the N3 fix),
   so conversion happens *before* the service call, not inside a parallel code path.
6. **Tests.** Unit test the conversion direction (base USD, THB=36 → 500 THB ≈ $13.89), plus a
   chat-level test: "add 500 THB dinner" on a USD trip produces the right `amount_base`.

**Out of scope for this feature:** changing which currencies a trip supports, or historical
rate lookups (expenses dated in the past still convert at today's rate, same as the form).

---

*Add further Phase 2 feature candidates below as they come up.*
