# TripLedger — Backend Developer Guide v2
**FastAPI · PostgreSQL · Supabase Auth · Redis · Python 3.12**
*Drop this doc at the start of every backend session in Claude Code*

---

## How to Use This Document

At the start of every backend session in Claude Code, paste this document in and say:

> "Here is the backend architecture doc for TripLedger. I want to build [specific feature/endpoint]. Follow the folder structure, patterns, and naming conventions exactly as described."

This doc contains everything Claude Code needs: folder structure, how auth works, the full DB schema, all API endpoints, and beginner explanations of backend concepts you'll encounter.

> Keep the frontend doc separate. Never mix frontend and backend in the same Claude Code session.

---

## Table of Contents

1. [Backend Concepts Explained](#1-backend-concepts-explained)
2. [Tech Stack](#2-tech-stack)
3. [Folder Structure](#3-folder-structure)
4. [Authentication — How It Works](#4-authentication--how-it-works)
5. [Database Schema](#5-database-schema)
6. [API Endpoints](#6-api-endpoints)
7. [Split Engine Logic](#7-split-engine-logic)
8. [Environment Variables](#8-environment-variables)
9. [Row Level Security (RLS)](#9-row-level-security-rls)
10. [Local Development Setup](#10-local-development-setup)

---

## 1. Backend Concepts Explained

If you're new to backend development, read this section first. These are the core ideas you'll encounter constantly.

### 1.1 What FastAPI does

FastAPI is a Python framework that turns your Python functions into HTTP endpoints. You write a function, decorate it with `@app.get('/path')` or `@app.post('/path')`, and FastAPI handles receiving HTTP requests, validating the data, calling your function, and sending back a response.

It auto-generates interactive API docs at `/docs` (Swagger UI). When you run the server locally, visit `http://localhost:8000/docs` to see and test every endpoint.

### 1.2 What Supabase Auth does

Supabase Auth handles the hard parts of authentication: storing passwords securely, managing sessions, handling OAuth (Google login), and issuing JWTs. You never store passwords yourself.

When a user logs in via the React frontend, Supabase issues them a JWT (JSON Web Token) — essentially a signed string that proves who they are. The frontend attaches this JWT to every API request. Your FastAPI backend verifies the JWT on every request to confirm the caller's identity.

> JWT = a base64-encoded string containing `{ user_id, email, expiry, signature }`. FastAPI decodes it using your Supabase JWT secret to confirm it hasn't been tampered with.

### 1.3 What PostgreSQL and Supabase do

PostgreSQL is your database — it stores all your data in tables with rows and columns. Supabase hosts PostgreSQL for you with a dashboard so you can see your data, run queries, and manage tables visually.

Supabase also provides Row Level Security (RLS) — database-level rules that say "user X can only read rows where user_id = X". This is a safety net on top of your API auth.

### 1.4 What Redis does

Redis is an in-memory key-value store — like a very fast dictionary. We use it to cache exchange rates so we don't hit the currency API on every request (rates are valid for 30 minutes). We also use it for rate limiting (preventing someone from hammering the API with 1000 requests).

### 1.5 What SQLAlchemy does

SQLAlchemy is an ORM (Object Relational Mapper). Instead of writing raw SQL like `SELECT * FROM trips WHERE id = '...'`, you write Python: `session.query(Trip).filter(Trip.id == id).first()`. It translates Python to SQL and SQL results back to Python objects.

### 1.6 What Alembic does

Alembic manages database migrations — changes to your database structure over time. When you add a new column or table, you create a migration file that describes the change. Alembic applies it to the DB. This keeps your DB structure in version control alongside your code.

---

## 2. Tech Stack

| Layer | Technology | What it does in this project |
|---|---|---|
| Framework | FastAPI 0.115 | HTTP endpoints, request validation, auto API docs |
| Language | Python 3.12 | Runtime language |
| Validation | Pydantic v2 | Request/response data models with automatic type checking |
| Database | PostgreSQL 16 | All persistent data — hosted on Supabase free tier |
| ORM | SQLAlchemy 2 (async) | Python-to-SQL translation. Async so requests don't block each other |
| Migrations | Alembic | Database schema version control |
| Auth | Supabase Auth + PyJWT | Supabase issues JWTs; PyJWT verifies them in FastAPI |
| Cache | Redis (Upstash) | Exchange rate cache, rate limiting |
| Email | Resend | Settlement reminders |
| Deploy | Railway | Docker-based hosting, auto-deploy from GitHub |

---

## 3. Folder Structure

Every file has a single job. Follow this structure exactly — Claude Code uses it to know where to put new files.

```
backend/
├── app/
│   ├── main.py              # Creates the FastAPI app, registers all routers
│   ├── config.py            # Reads .env variables using Pydantic Settings
│   ├── database.py          # Creates DB connection pool (async SQLAlchemy)
│   ├── dependencies.py      # Shared FastAPI dependencies (auth, DB session)
│   │
│   ├── models/              # SQLAlchemy ORM classes (map to DB tables)
│   │   ├── __init__.py
│   │   ├── user.py          # users table
│   │   ├── trip.py          # trips + trip_members tables
│   │   ├── expense.py       # expenses + expense_splits tables
│   │   ├── settlement.py    # settlements table
│   │   └── note.py          # notes table
│   │
│   ├── schemas/             # Pydantic models for request/response validation
│   │   ├── trip.py          # TripCreate, TripResponse, TripUpdate
│   │   ├── expense.py       # ExpenseCreate, ExpenseResponse
│   │   ├── settlement.py    # SettlementCreate, SettlementResponse
│   │   ├── note.py          # NoteCreate, NoteUpdate, NoteResponse
│   │   └── user.py          # UserResponse
│   │
│   ├── routers/             # HTTP route handlers — one file per resource
│   │   ├── auth.py          # POST /auth/me (verify token, upsert user)
│   │   ├── trips.py         # CRUD for trips + members + join by code
│   │   ├── expenses.py      # CRUD for expenses
│   │   ├── settlements.py   # POST /trips/{id}/settlements, GET /trips/{id}/settlements
│   │   ├── balances.py      # GET /trips/{id}/balances + /settle suggestions
│   │   ├── notes.py         # CRUD for circle notes
│   │   └── currencies.py    # GET /currencies/rates (cached)
│   │
│   └── services/            # Business logic — called by routers
│       ├── split_engine.py  # Calculates splits (equal/exact/percentage/shares)
│       ├── balance.py       # Aggregates balances + minimum-tx solver
│       ├── currency.py      # Fetches rates from ExchangeRate API, caches in Redis
│       └── notifications.py # Sends emails via Resend
│
├── alembic/                 # DB migration files (auto-generated by Alembic)
│   └── versions/            # One .py file per migration
│
├── tests/                   # pytest test files
├── .env                     # Local env vars (never commit)
├── .env.example             # Template — commit this, not .env
├── Dockerfile               # Container definition for Railway deploy
├── requirements.txt         # Python dependencies
└── alembic.ini              # Alembic config
```

---

## 4. Authentication — How It Works

Understanding this flow is important. It explains what happens every time a user makes a request.

### 4.1 The full flow step by step

There are two sign-in paths — Google OAuth and email/password. Both end up at the same place: a Supabase JWT in the frontend, which the backend verifies on every request.

**Path A — Google OAuth:**

| # | Where | What happens |
|---|---|---|
| 1 | Browser (React) | User clicks 'Continue with Google'. Supabase JS SDK opens Google OAuth popup. |
| 2 | Supabase Auth | Google confirms identity. Supabase creates a user record and issues a JWT. |
| 3 | Browser (React) | Supabase JS SDK stores the JWT. `AuthStore.currentUser` is set. Frontend calls `POST /auth/me` to upsert the user in the local DB. |
| 4 | FastAPI (`POST /auth/me`) | Verifies JWT, upserts user into `users` table with `email` and `display_name` from Google profile. |

**Path B — Email + Password signup (new user):**

| # | Where | What happens |
|---|---|---|
| 1 | Browser (React) | User fills out signup form: display_name, email, password, confirm password. |
| 2 | Browser (React) | Frontend calls `supabase.auth.signUp({ email, password })` — Supabase creates the auth record and issues a JWT. No custom backend endpoint for signup itself. |
| 3 | Browser (React) | Frontend immediately calls `POST /auth/me` with the JWT **and** `{ display_name }` in the body — this is how the backend saves their chosen display name. |
| 4 | FastAPI (`POST /auth/me`) | Verifies JWT, upserts user into `users` table. If new user, also saves `display_name` from the request body. |

**Path C — Email + Password login (returning user):**

| # | Where | What happens |
|---|---|---|
| 1 | Browser (React) | User enters email + password. Frontend calls `supabase.auth.signInWithPassword({ email, password })`. |
| 2 | Supabase Auth | Validates credentials. Issues a JWT. |
| 3 | Browser (React) | JWT stored. `AuthStore.currentUser` set. Frontend calls `POST /auth/me` to confirm user exists in local DB. |
| 4 | FastAPI | Normal protected requests proceed from here. |

**Shared: every protected request after login:**

| # | Where | What happens |
|---|---|---|
| 1 | Browser (React) | User does something (e.g. loads circles). Axios interceptor grabs JWT from Supabase, adds `Authorization: Bearer <jwt>` header to every request. |
| 2 | FastAPI | Request arrives. `get_current_user` dependency extracts the JWT from the header. |
| 3 | FastAPI | PyJWT verifies the JWT signature using `SUPABASE_JWT_SECRET`. If valid, extracts `user_id` and `email`. |
| 4 | FastAPI | Route handler runs with verified `current_user`. Returns data. If JWT is invalid or missing → 401 Unauthorized. |

**POST /auth/me** — called by the frontend after every login/signup to upsert the user:

```json
// Request body (display_name only required on first signup — optional on login)
{ "display_name": "Rishav" }

// Response
{
  "id": "uuid",
  "email": "rishav@example.com",
  "display_name": "Rishav",
  "avatar_url": null,
  "default_currency": "INR"
}
```

> On Google signup, `display_name` comes from the Google profile — pass it from `session.user.user_metadata.full_name`. On email signup, it comes from the form field the user filled in.

### 4.2 The auth dependency in code

This is the core of how every protected route gets the current user. You never call this manually — FastAPI injects it automatically via `Depends()`.

```python
# app/dependencies.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt  # PyJWT library
from app.config import settings
from app.database import get_db
from app import models

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
) -> models.User:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=['HS256'],
            options={'verify_aud': False}  # Supabase doesn't set aud
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')

    user_id = payload.get('sub')  # 'sub' = user's UUID from Supabase
    email   = payload.get('email')

    user = await db.get(models.User, user_id)
    if not user:
        user = models.User(id=user_id, email=email)
        db.add(user)
        await db.commit()
    return user

# How to use in a route:
# @router.get('/trips')
# async def get_trips(current_user = Depends(get_current_user)):
#     # current_user is now a verified User object
```

---

## 5. Database Schema

All tables are in PostgreSQL hosted on Supabase. UUIDs are used as primary keys throughout. Every table has `created_at` and `updated_at` timestamps.

> A foreign key (FK) means a column in one table references the primary key of another table. For example, `expenses.trip_id` is a FK to `trips.id` — you can't create an expense for a trip that doesn't exist.

> Always use `NUMERIC(12,4)` for money — never `FLOAT`. Floats have rounding errors (`0.1 + 0.2 = 0.30000000000000004` in floating point).

### 5.1 users

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Mirrors `auth.users.id` from Supabase — same UUID |
| email | TEXT UNIQUE | |
| display_name | TEXT | |
| avatar_url | TEXT | Supabase Storage URL |
| default_currency | VARCHAR(3) | ISO 4217 e.g. `USD`, `INR`, `EUR` |
| created_at | TIMESTAMPTZ | Auto-set on insert |

### 5.2 trips

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Auto-generated |
| name | TEXT | e.g. `'Goa 2026'` |
| description | TEXT | Optional (nullable) |
| circle_type | ENUM | `trip \| personal \| household \| event` |
| currencies | VARCHAR(3)[] | Array of up to 3 ISO codes e.g. `['USD','INR']` |
| base_currency | VARCHAR(3) | The primary currency for balance calculations |
| join_code | VARCHAR(6) UNIQUE | 6-character alphanumeric code, uppercase. Used to join the circle. |
| is_settled | BOOLEAN | `true` = circle is fully settled |
| start_date | DATE | Optional. When the circle's activity starts. |
| end_date | DATE | Optional. When the circle's activity ends. |
| created_by | UUID FK users | Circle owner |
| created_at | TIMESTAMPTZ | |

> `join_code` is generated on circle creation — random 6-char alphanumeric string (e.g. `XK9F2A`). It is unique across all circles. Use `secrets.token_hex(3).upper()` or similar to generate.

### 5.3 trip_members

| Column | Type | Notes |
|---|---|---|
| trip_id | UUID FK trips | Which circle |
| user_id | UUID FK users | Registered user |
| display_name | TEXT | Denormalised name for display — mirrors `users.display_name` at join time |
| role | ENUM | `owner \| member \| viewer` |
| joined_at | TIMESTAMPTZ | |

> PK on `(trip_id, user_id)` — a user can only be a member of a circle once.

### 5.4 expenses

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| trip_id | UUID FK trips | |
| paid_by | UUID FK users | Who paid upfront |
| title | TEXT | e.g. `'Dinner at Thalassa'` |
| amount | NUMERIC(12,4) | Amount in the original transaction currency |
| currency | VARCHAR(3) | ISO code of the transaction e.g. `EUR` |
| amount_base | NUMERIC(12,4) | Amount converted to circle's `base_currency` at time of entry |
| exchange_rate | NUMERIC(18,8) | Snapshot of rate used — stored so recalculation is consistent |
| category | ENUM | `food \| transport \| accommodation \| activities \| other` |
| split_type | ENUM | `equal \| exact \| percentage \| shares` |
| receipt_url | TEXT | Supabase Storage path for receipt photo (nullable) |
| expense_date | DATE | When the expense occurred (not when it was entered) |
| notes | TEXT | Optional memo (nullable) |
| created_at | TIMESTAMPTZ | |

### 5.5 expense_splits

One row per person per expense. If an expense has 4 members, there are 4 rows here.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| expense_id | UUID FK expenses | Which expense this split belongs to |
| user_id | UUID FK users | Who owes this amount |
| amount_owed | NUMERIC(12,4) | In `base_currency`. This is what gets aggregated for balances. |
| share_value | NUMERIC(8,4) | Percentage or share count, depending on `split_type` |
| is_settled | BOOLEAN | Has this individual split been paid off |

### 5.6 settlements

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| trip_id | UUID FK trips | |
| from_user_id | UUID FK users | Who is paying |
| to_user_id | UUID FK users | Who is receiving payment |
| amount | NUMERIC(12,4) | Amount paid |
| currency | VARCHAR(3) | Actual payment currency (may differ from base) |
| method | TEXT | UPI, Venmo, cash, bank transfer, etc. (nullable) |
| confirmed_at | TIMESTAMPTZ | When the payment was recorded |
| is_partial | BOOLEAN | `true` = paying off only part of the debt |

### 5.7 notes

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| trip_id | UUID FK trips | Which circle this note belongs to |
| author_id | UUID FK users | Who wrote the note |
| content | VARCHAR(250) | Note text — max 250 characters |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Nullable — set when note is edited |

> Only the author can edit or delete their own note. Enforce this in the router: `if note.author_id != current_user.id: raise HTTPException(403)`.

---

## 6. API Endpoints

All endpoints require `Authorization: Bearer <jwt>` header unless marked **public**. Base URL: `https://api.tripledger.com` (or `http://localhost:8000` locally).

### 6.0 Auth

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| POST | `/auth/me` | `{ display_name?: string }` | `UserResponse` |

> Called by the frontend immediately after any login or signup. Upserts the user into the local `users` table using the JWT. `display_name` is optional on login but should be sent on first signup (email/password flow). For Google login, extract the name from `session.user.user_metadata.full_name`.

### 6.1 Trips / Circles

| Method | Endpoint | Auth required | Body | Returns |
|---|---|---|---|---|
| GET | `/trips` | Yes | — | `Trip[]` |
| POST | `/trips` | Yes | See body below | `Trip` |
| GET | `/trips/{id}` | Yes | — | `Trip` (with members) |
| PATCH | `/trips/{id}` | Yes | `{ is_settled: bool }` | `Trip` |
| DELETE | `/trips/{id}` | Yes | — | 204 |
| POST | `/trips/join` | Yes | `{ code: string }` | `Trip` |
| GET | `/trips/by-code/{code}` | **No** | — | `TripPreview` |

**POST /trips body:**
```json
{
  "name": "Goa 2026",
  "description": "Beach trip",
  "circle_type": "trip",
  "currencies": ["INR", "USD"],
  "base_currency": "INR",
  "start_date": "2026-03-15",
  "end_date": "2026-03-20"
}
```

> `join_code` is auto-generated by the backend on creation. Do not accept it from the client.

> `POST /trips/join` looks up the circle by `join_code`, adds the current user as a member (role: `member`), and returns the full `Trip` object.

**GET /trips/by-code/{code} — PUBLIC endpoint:**

This endpoint powers the `/join/:code` deep-link page. It returns a lightweight circle preview so unauthenticated users can see what circle they've been invited to before they log in. No JWT required.

```python
# Example router implementation (trips.py)
# Note: no Depends(get_current_user) — this route is intentionally public
@router.get('/trips/by-code/{code}', response_model=TripPreview)
async def get_trip_by_code(code: str, db = Depends(get_db)):
    trip = await db.execute(
        select(Trip).where(func.upper(Trip.join_code) == code.upper())
    )
    trip = trip.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail='Invalid join code. Double-check and try again.')
    return trip
```

**TripPreview response schema** (what the public endpoint returns — no expenses, no balances):
```json
{
  "id": "uuid",
  "name": "Goa 2026",
  "description": "Beach trip",
  "circle_type": "trip",
  "currencies": ["INR", "USD"],
  "join_code": "XK9F2A",
  "is_settled": false,
  "members": [
    { "userId": "uuid", "displayName": "Rishav" },
    { "userId": "uuid", "displayName": "Priya" }
  ]
}
```

> `TripPreview` intentionally omits balances, expenses, `base_currency`, `created_by`, and timestamps — only what the join screen needs. Define a separate Pydantic `TripPreview` schema rather than reusing `TripResponse`.

> **Security note:** `GET /trips/by-code/{code}` skips the `get_current_user` dependency. RLS is bypassed here since you're using the service key on the backend. Only return the preview fields — never full member details or financial data.

### 6.2 Expenses

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| GET | `/trips/{id}/expenses` | `?page&limit` | `Expense[]` |
| POST | `/trips/{id}/expenses` | `ExpenseCreate` (see below) | `Expense` (with splits) |
| PUT | `/expenses/{id}` | Full `ExpenseCreate` payload | `Expense` (with splits) |
| DELETE | `/expenses/{id}` | — | 204 |

> Use `PUT` for expense edits — the frontend sends the full expense payload from the edit form. `PUT` replaces the record entirely (delete old splits, insert new ones).

**ExpenseCreate body:**
```json
{
  "title": "Dinner at Thalassa",
  "amount": 120.00,
  "currency": "EUR",
  "category": "food",
  "split_type": "equal",
  "expense_date": "2026-03-15",
  "paid_by": "<userId>",
  "splits": [
    { "user_id": "<userId>", "amount_owed": 40.00 },
    { "user_id": "<userId>", "amount_owed": 40.00 },
    { "user_id": "<userId>", "amount_owed": 40.00 }
  ],
  "notes": "optional memo"
}
```

> The split engine runs on the backend. For `equal` split you can pass just `participant_ids` and the backend calculates. For `exact`, `percentage`, and `shares` the client sends pre-calculated `splits`. The backend always validates that splits sum to `amount_base`.

### 6.3 Balances & Settlements

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| GET | `/trips/{id}/balances` | — | `Balance[]` |
| GET | `/trips/{id}/settle` | — | `SettlementSuggestion[]` |
| GET | `/trips/{id}/settlements` | — | `Settlement[]` |
| POST | `/trips/{id}/settlements` | See body below | `Settlement` |

> `GET /trips/{id}/settle` runs the minimum-transactions algorithm (see §7) and returns the suggested payment list. It does not modify any data.

**POST /trips/{id}/settlements body:**
```json
{
  "from_user_id": "<userId>",
  "to_user_id": "<userId>",
  "amount": 1200.00,
  "currency": "INR",
  "method": "UPI",
  "is_partial": false
}
```

### 6.4 Notes

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| GET | `/trips/{id}/notes` | — | `Note[]` |
| POST | `/trips/{id}/notes` | `{ content: string }` | `Note` |
| PATCH | `/notes/{id}` | `{ content: string }` | `Note` |
| DELETE | `/notes/{id}` | — | 204 |

> `content` max length: 250 characters. Validate with Pydantic: `content: str = Field(..., max_length=250)`.

> `PATCH /notes/{id}` and `DELETE /notes/{id}` must verify `note.author_id == current_user.id`. Return 403 if not.

### 6.5 Currencies

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| GET | `/currencies/rates` | `?base=USD&symbols=EUR,INR` | `{ EUR: 0.92, INR: 83.4 }` |

> Fetched from ExchangeRate-API, cached in Redis for 30 minutes. Key: `rates:{base_currency}`.

---

## 7. Split Engine Logic

The split engine is the most important business logic. It lives in `app/services/split_engine.py` and is called every time an expense is created or edited.

### 7.1 How each split type works

| Type | How it works | Example ($120, 3 people) |
|---|---|---|
| equal | Divide amount evenly. Remainder (from rounding) goes to first person. | Each owes $40.00 |
| exact | Client sends exact amount each person owes. Must sum to total. | A=$50, B=$40, C=$30 |
| percentage | Client sends % for each person. Must sum to 100. | 50%=$60, 30%=$36, 20%=$24 |
| shares | Client sends integer shares. Each person pays `(their_shares / total_shares) × total`. | 2+2+1=5 shares → $48/$48/$24 |

> Self-expense: when `splits` has exactly one entry and `splits[0].user_id == paid_by`, this is a personal expense — it does not affect anyone else's balance.

### 7.2 Minimum transactions algorithm (balance solver)

The goal: given a group of people who owe each other money, find the fewest payments needed to settle all debts. For example: if A owes B $10 and B owes C $10, the solver says "A pays C $10" — one payment instead of two.

```python
# app/services/balance.py

def calculate_min_transactions(balances: dict[str, float]) -> list[dict]:
    """
    balances = { user_id: net_amount }
    Positive = is owed money (creditor)
    Negative = owes money (debtor)
    Returns list of { from_user_id, to_user_id, amount }
    """
    creditors = [(uid, amt) for uid, amt in balances.items() if amt > 0]
    debtors   = [(uid, amt) for uid, amt in balances.items() if amt < 0]

    creditors.sort(key=lambda x: -x[1])
    debtors.sort(key=lambda x: x[1])  # most negative first

    transactions = []
    i, j = 0, 0

    while i < len(creditors) and j < len(debtors):
        cred_id, cred_amt = creditors[i]
        debt_id, debt_amt = debtors[j]

        amount = min(cred_amt, abs(debt_amt))
        transactions.append({
            'from_user_id': debt_id,
            'to_user_id':   cred_id,
            'amount':       round(amount, 2)
        })

        creditors[i] = (cred_id, cred_amt - amount)
        debtors[j]   = (debt_id, debt_amt + amount)

        if creditors[i][1] < 0.01: i += 1  # creditor fully paid
        if abs(debtors[j][1]) < 0.01: j += 1  # debtor fully settled

    return transactions
```

---

## 8. Environment Variables

Create a `.env` file in the backend root. Never commit this file — commit `.env.example` instead.

```bash
# .env

# PostgreSQL — from Supabase dashboard → Settings → Database → Connection string
DATABASE_URL=postgresql+asyncpg://postgres:[password]@db.[ref].supabase.co:5432/postgres

# From Supabase dashboard → Settings → API
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-dashboard
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # Service role key (admin access — keep secret!)

# Redis — from Upstash dashboard
REDIS_URL=rediss://default:[password]@[host].upstash.io:6379

# Exchange rate API — free tier at exchangerate-api.com
EXCHANGE_RATE_API_KEY=your-key-here

# Resend — for emails, from resend.com dashboard
RESEND_API_KEY=re_xxxxxxxxxxxx

# App settings
ENVIRONMENT=development  # or: production
CORS_ORIGINS=http://localhost:5173,https://tripledger.vercel.app
```

> `SUPABASE_SERVICE_KEY` has admin DB access. Never expose it in frontend code or public repos. It belongs only in the backend `.env` file.

---

## 9. Row Level Security (RLS)

RLS is a Postgres feature that adds access rules directly in the database. Even if someone bypasses your FastAPI auth somehow, they still can't read data that isn't theirs. Think of it as a second lock on the DB door.

Enable RLS on each table in Supabase dashboard → Table Editor → RLS → Enable. Then add these policies:

```sql
-- Users can only read/write their own user record
CREATE POLICY users_own ON users
  USING (id = auth.uid());

-- Users can only see circles they are a member of
CREATE POLICY trips_member ON trips
  USING (id IN (
    SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
  ));

-- Users can only see expenses for circles they belong to
CREATE POLICY expenses_member ON expenses
  USING (trip_id IN (
    SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
  ));

-- Users can only see settlements for circles they belong to
CREATE POLICY settlements_member ON settlements
  USING (trip_id IN (
    SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
  ));

-- Users can only see notes for circles they belong to
CREATE POLICY notes_member ON notes
  USING (trip_id IN (
    SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
  ));

-- Only the note author can update or delete their note
CREATE POLICY notes_author_update ON notes
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY notes_author_delete ON notes
  FOR DELETE USING (author_id = auth.uid());
```

---

## 10. Local Development Setup

Follow these steps in order the first time you set up the project.

```bash
# 1. Create Python virtual environment
python3 -m venv venv
source venv/bin/activate   # Mac/Linux
# venv\Scripts\activate    # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy env file and fill in your values
cp .env.example .env

# 4. Run database migrations (creates all tables)
alembic upgrade head

# 5. Start the dev server
uvicorn app.main:app --reload --port 8000

# Visit http://localhost:8000/docs for interactive API explorer
```

> Run `alembic upgrade head` every time you pull new code — there may be new migrations that add columns or tables.

---

*Backend Guide v2 — update this doc whenever a new endpoint, DB table, or service is added so future Claude Code sessions stay consistent.*
