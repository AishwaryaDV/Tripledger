"""Automated backend gate tests for TripLedger — runs against the real local API,
real Supabase auth, and the real (test) database. No mocks.

Covers the API-verifiable parts of GATE_TESTS.md batches 1, 2, and 4.
Frontend-only checks (UI display, dialogs, clipboard) remain manual.
"""
import httpx, json, sys

API = "http://localhost:8000"
env = dict(l.strip().split("=", 1) for l in open(".env") if "=" in l and not l.startswith("#"))
SB_URL, SB_KEY = env["SUPABASE_URL"], env["SUPABASE_ANON_KEY"]

PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(f"  {'✓' if cond else '✗ FAIL'} {name}" + (f" — {detail}" if detail and not cond else ""))


def auth_user(email):
    """Sign up (or sign in) and return a bearer token."""
    r = httpx.post(f"{SB_URL}/auth/v1/signup", json={"email": email, "password": "GateTest!2026"},
                   headers={"apikey": SB_KEY})
    if r.status_code != 200 or not r.json().get("access_token"):
        r = httpx.post(f"{SB_URL}/auth/v1/token?grant_type=password",
                       json={"email": email, "password": "GateTest!2026"}, headers={"apikey": SB_KEY})
    tok = r.json()["access_token"]
    return tok


def client(tok):
    return httpx.Client(base_url=API, headers={"Authorization": f"Bearer {tok}"}, timeout=30)


print("== Setup: two real accounts ==")
tok_a = auth_user("gatetest.a.20260704@tripledger.test")
tok_b = auth_user("gatetest.b.20260704@tripledger.test")
A, B = client(tok_a), client(tok_b)
ra = A.post("/auth/me", json={"display_name": 'Alice "Gate, Tester"'})  # comma+quotes for CSV test data
rb = B.post("/auth/me", json={"display_name": "Bob Gate"})
check("auth/me works for both accounts", ra.status_code == 200 and rb.status_code == 200)
uid_a, uid_b = ra.json()["id"], rb.json()["id"]

print("\n== Live FX rates (same source as the frontend) ==")
rates = httpx.get("https://api.exchangerate-api.com/v4/latest/USD").json()["rates"]
THB, EUR = rates["THB"], rates["EUR"]
print(f"  THB={THB}  EUR={EUR}")
rate_thb, rate_eur = 1 / THB, 1 / EUR  # foreign→base, as the fixed CurrencyStore computes

print("\n== Batch 4: trip validation rejects garbage ==")
r = A.post("/trips", json={"name": "x", "circleType": "banana", "currencies": ["USD"], "baseCurrency": "USD"})
check("invalid circleType → 422 (was 500)", r.status_code == 422)
r = A.post("/trips", json={"name": "x", "currencies": ["USD"], "baseCurrency": "USD", "startDate": "banana"})
check("garbage startDate → 422 (was 500)", r.status_code == 422)
r = A.post("/trips", json={"name": "x", "currencies": ["USD"], "baseCurrency": "USD",
                           "startDate": "2026-07-10", "endDate": "2026-07-01"})
check("endDate before startDate → 422", r.status_code == 422)
r = A.post("/trips", json={"name": "x", "currencies": ["USD", "EUR"], "baseCurrency": "THB"})
check("baseCurrency not in currencies → 422", r.status_code == 422)
r = A.post("/trips", json={"name": "y" * 200, "currencies": ["USD"], "baseCurrency": "USD"})
check("200-char name → 422", r.status_code == 422)

print("\n== Gate Test 1: cross-currency trip ==")
r = A.post("/trips", json={"name": "FX Gate Test", "circleType": "trip",
                           "currencies": ["USD", "THB", "EUR"], "baseCurrency": "USD"})
check("create trip", r.status_code == 201, r.text[:200])
trip = r.json(); trip_id, code = trip["id"], trip["joinCode"]

print("\n== Batch 2: join flow ==")
r = B.post("/trips/join", json={"joinCode": "ZZZZ99"})
check("bad join code → 404", r.status_code == 404)
r = B.post(f"/trips/{trip_id}/join")
check("old UUID-join endpoint is gone", r.status_code in (404, 405))
r = B.post("/trips/join", json={"joinCode": code})
check("join by code works", r.status_code == 200)
r = B.post("/trips/join", json={"joinCode": code})
check("rejoin → 409 Already a member", r.status_code == 409)
r = httpx.get(f"{API}/trips/by-code/{code}")  # unauthenticated
pv = r.json()
check("public by-code preview is slim (no member IDs)",
      r.status_code == 200 and "members" not in pv and pv.get("memberCount") == 2
      and "memberNames" in pv and "createdBy" not in pv, json.dumps(pv)[:200])


def add_expense(cl, payer, title, amount, currency, rate, splits_orig, split_type="exact", shares=None):
    """Build the payload exactly as the fixed frontend does: convert to base, scale splits."""
    amount_base = amount * rate
    scaling = amount_base / amount
    splits = [{"userId": uid, "amountOwed": owed * scaling,
               **({"shareValue": shares[i]} if shares else {})}
              for i, (uid, owed) in enumerate(splits_orig)]
    return cl.post(f"/trips/{trip_id}/expenses", json={
        "paidBy": payer, "title": title, "amount": amount, "currency": currency,
        "amountBase": amount_base, "exchangeRate": rate, "category": "food",
        "splitType": split_type, "splits": splits, "expenseDate": "2026-07-04"})


print("\n== Expenses: all four split modes, three currencies ==")
r1 = add_expense(A, uid_a, "Dinner", 500, "THB", rate_thb, [(uid_a, 250), (uid_b, 250)], "equal")
check("E1 equal 500 THB", r1.status_code == 201, r1.text[:200])
e1 = r1.json()
check("E1 amountBase ≈ 500/THB", abs(e1["amountBase"] - 500 / THB) < 0.01, str(e1["amountBase"]))
r2 = add_expense(B, uid_b, "Taxi", 60, "EUR", rate_eur, [(uid_a, 25), (uid_b, 35)], "exact")
check("E2 exact 60 EUR", r2.status_code == 201, r2.text[:200])
e2_id = r2.json()["id"]
r3 = add_expense(A, uid_a, "Hotel", 100, "USD", 1.0, [(uid_a, 70), (uid_b, 30)], "percentage")
check("E3 percentage 100 USD", r3.status_code == 201, r3.text[:200])
r4 = add_expense(B, uid_b, "Snacks", 45, "USD", 1.0, [(uid_a, 30), (uid_b, 15)], "shares", shares=[2, 1])
check("E4 shares 45 USD", r4.status_code == 201, r4.text[:200])

print("\n== Batch 1/4: expense validation ==")
r = add_expense(A, uid_a, "Bad splits", 100, "USD", 1.0, [(uid_a, 10), (uid_b, 10)])
check("splits not summing to amount → 400", r.status_code == 400)
r = A.post(f"/trips/{trip_id}/expenses", json={
    "paidBy": uid_a, "title": "neg", "amount": 100, "currency": "USD", "amountBase": -5,
    "exchangeRate": 1, "category": "food", "splitType": "exact",
    "splits": [{"userId": uid_a, "amountOwed": -5}], "expenseDate": "2026-07-04"})
check("negative amountBase → 422", r.status_code == 422)
r = add_expense(A, uid_a, "Bad currency", 10, "DOLLARS", 1.0, [(uid_a, 10)])
check("4+ char currency → 422 (was 500)", r.status_code == 422)
r = add_expense(A, "not-a-member", "Ghost payer", 10, "USD", 1.0, [(uid_a, 10)])
check("non-member payer → 400", r.status_code == 400)

print("\n== Balance verification against independent math ==")
# Spreadsheet math, in base USD:
owed_a = 250 / THB + 25 / EUR + 70 + 30
owed_b = 250 / THB + 35 / EUR + 30 + 15
paid_a = 500 / THB + 100
paid_b = 60 / EUR + 45
exp_a, exp_b = paid_a - owed_a, paid_b - owed_b
bal = {b["userId"]: b["netAmount"] for b in A.get(f"/trips/{trip_id}/balances").json()}
print(f"  expected A={exp_a:+.2f} B={exp_b:+.2f} | actual A={bal[uid_a]:+.2f} B={bal[uid_b]:+.2f}")
check("A's net matches spreadsheet", abs(bal[uid_a] - exp_a) < 0.02)
check("B's net matches spreadsheet", abs(bal[uid_b] - exp_b) < 0.02)
check("balances sum to zero", abs(bal[uid_a] + bal[uid_b]) < 0.01)
sug = A.get(f"/trips/{trip_id}/settle").json()
check("exactly one suggestion", len(sug) == 1)
check("suggestion amount matches |net|", len(sug) == 1 and abs(sug[0]["amount"] - abs(exp_a)) < 0.02)

print("\n== Edit cross-currency exact-split expense (N6 path, API level) ==")
r = B.put(f"/trips/{trip_id}/expenses/{e2_id}", json={
    "paidBy": uid_b, "title": "Taxi", "amount": 66, "currency": "EUR",
    "amountBase": 66 / EUR, "exchangeRate": rate_eur, "category": "transport", "splitType": "exact",
    "splits": [{"userId": uid_a, "amountOwed": 30 / EUR}, {"userId": uid_b, "amountOwed": 36 / EUR}],
    "expenseDate": "2026-07-04"})
check("edit E2 60→66 EUR", r.status_code == 200, r.text[:200])
owed_a2 = owed_a - 25 / EUR + 30 / EUR
paid_b2 = paid_b - 60 / EUR + 66 / EUR
exp_a2 = paid_a - owed_a2
bal = {b["userId"]: b["netAmount"] for b in A.get(f"/trips/{trip_id}/balances").json()}
check("post-edit balances match", abs(bal[uid_a] - exp_a2) < 0.02, f"exp {exp_a2:+.2f} got {bal[uid_a]:+.2f}")

print("\n== Batch 2: AI chat tenancy + guards ==")
r2trip = A.post("/trips", json={"name": "A Private", "currencies": ["USD"], "baseCurrency": "USD"})
priv_id = r2trip.json()["id"]
r = B.get(f"/trips/{priv_id}/ai-chat")
check("B reading A's private trip chat → 403", r.status_code == 403)
r = B.get(f"/trips/{priv_id}/expenses")
check("B reading A's private trip expenses → 403", r.status_code == 403)
r = B.delete(f"/trips/{priv_id}/ai-chat")
check("B clearing A's private trip chat → 403", r.status_code == 403)

print("\n== Batch 1/2: settlements ==")
debtor, creditor = (uid_a, uid_b) if exp_a2 < 0 else (uid_b, uid_a)
owed_amt = abs(exp_a2)
r = A.post(f"/trips/{trip_id}/settlements", json={
    "fromUserId": debtor, "toUserId": creditor, "amount": owed_amt + 50, "currency": "USD"})
check("over-settle → 400", r.status_code == 400, r.text[:200])
r = A.post(f"/trips/{trip_id}/settlements", json={
    "fromUserId": uid_a, "toUserId": uid_a, "amount": 5, "currency": "USD"})
check("self-settlement → 422", r.status_code == 422)
r = A.post(f"/trips/{trip_id}/settlements", json={
    "fromUserId": debtor, "toUserId": creditor, "amount": round(owed_amt, 2), "currency": "EUR"})
check("settle exact amount works", r.status_code == 201, r.text[:200])
check("settlement currency forced to base USD", r.status_code == 201 and r.json()["currency"] == "USD")
bal = {b["userId"]: b["netAmount"] for b in A.get(f"/trips/{trip_id}/balances").json()}
check("balances zero after settling", abs(bal[uid_a]) < 0.02 and abs(bal[uid_b]) < 0.02)

print("\n== Batch 3 (API side): mark settled ==")
r = A.post(f"/trips/{trip_id}/expenses", json={
    "paidBy": uid_a, "title": "Late coffee", "amount": 10, "currency": "USD", "amountBase": 10,
    "exchangeRate": 1, "category": "food", "splitType": "equal",
    "splits": [{"userId": uid_a, "amountOwed": 5}, {"userId": uid_b, "amountOwed": 5}],
    "expenseDate": "2026-07-04"})
exp_late = r.json()["id"]
r = A.patch(f"/trips/{trip_id}", json={"isSettled": True})
check("mark settled with outstanding → 409", r.status_code == 409, r.text[:200])
r = B.patch(f"/trips/{trip_id}", json={"isSettled": True, "force": True})
check("non-owner cannot settle → 403", r.status_code == 403)
r = A.patch(f"/trips/{trip_id}", json={"isSettled": True, "force": True})
check("owner force-settle works", r.status_code == 200)
r = A.delete(f"/trips/{trip_id}/expenses/{exp_late}")
check("delete expense on settled trip → 409 (N12)", r.status_code == 409)
r = A.patch(f"/trips/{trip_id}", json={"isSettled": False})
check("reopen works", r.status_code == 200)

print("\n== Batch 2: leave protection ==")
r = B.delete(f"/trips/{trip_id}/members/me")
check("B leaving with expense involvement → 409", r.status_code == 409, r.text[:200])
r = A.delete(f"/trips/{trip_id}/members/me")
check("owner cannot leave → 400", r.status_code == 400)

print("\n== Batch 2: account deletion protection ==")
r = B.delete("/auth/me")
check("delete account while in circles → 409", r.status_code == 409, r.text[:200])

print("\n== Notes validation ==")
r = A.post(f"/trips/{trip_id}/notes", json={"content": "   "})
check("whitespace-only note → 422", r.status_code == 422)

print("\n== Cleanup: delete test trips ==")
r = B.delete(f"/trips/{trip_id}")
check("non-owner cannot delete trip → 403", r.status_code == 403)
ok1 = A.delete(f"/trips/{trip_id}").status_code == 204
ok2 = A.delete(f"/trips/{priv_id}").status_code == 204
check("owner deletes both test trips", ok1 and ok2)

print(f"\n{'='*50}\nRESULT: {len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    print("Failed:", *[f"  - {f}" for f in FAIL], sep="\n")
    sys.exit(1)
