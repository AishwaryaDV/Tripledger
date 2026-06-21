# Alternative: Selective Retention (Sliding Window) for AI Chat History

## When to use this instead

Swap the rolling summary out for this if you notice a latency spike every ~40 messages.
That spike is caused by the summary compression — it fires a full Claude call synchronously
during the same request that crosses the threshold. Under load or on a slow server it's
noticeable. This approach never makes that extra call.

---

## The core insight for TripLedger

Every message already injects the full live trip state from the database: all expenses
(title, amount, currency, date, category, paid_by, splits), all members. The AI never
needs conversation history to know what expenses exist — it reads them fresh every time.

History is only load-bearing for:
- "yes, do that" / "I meant the other one" — conversational back-and-forth
- Preferences expressed in chat that aren't stored anywhere ("always split food equally")
- Multi-step clarifications within a single task

For everything else (totals, balances, duplicates, category breakdowns) the DB context
already provides the answer. This means you can afford a much shorter window than a
general-purpose assistant.

---

## The simplest possible alternative: Pure cut

Before implementing selective retention, try this first — it's one function change:

```python
HARD_WINDOW = 15

def _hard_window(history: list[dict]) -> list[dict]:
    non_summary = [m for m in history if m["role"] != "summary"]
    return non_summary[-HARD_WINDOW:]
```

Replace the `_maybe_compress_history` call in `send_message` with `_hard_window(history_msgs)`.
No await, no subprocess, no DB writes, no tagging. Just keep the last 15 messages and drop
everything older.

This works well for TripLedger because the DB context (all expenses, all members) already
covers all factual state. The only thing lost is reference to actions from more than 15
messages ago ("that dinner you added earlier") — rare in practice. Start here and only
move to selective retention if users actually hit that edge case.

---

## The approach: Selective Retention

Keep two categories of messages, drop everything else:

1. **Action messages** — any exchange where `action_type` was non-null (expense added,
   edited, or deleted). These are the only messages where history changes future context
   in a meaningful way ("the expense you just added" / "undo that deletion").

2. **Recent conversational tail** — the last N message pairs regardless of type, so
   the AI has enough thread to follow "yes", "no", "change that", etc.

Everything else — pure Q&A, analytical queries, chitchat — is dropped. The live DB
context already covers it.

---

## Parameters

```python
MAX_ACTION_MESSAGES = 20   # keep at most this many action-related exchanges
RECENT_TAIL = 10           # always keep the last N messages verbatim (regardless of type)
```

Tune RECENT_TAIL based on feel. 10 covers roughly 5 back-and-forth exchanges which is
enough for any in-progress task. Action messages cap at 20 so the history of what was
done stays bounded.

---

## Implementation

Replace `_maybe_compress_history` in `ai_chat.py` with this function.
No DB writes required — pure in-memory filtering before building the prompt.

```python
MAX_ACTION_MESSAGES = 20
RECENT_TAIL = 10

# IDs of messages that are part of an action exchange.
# Store these when saving messages — see note below.

def _selective_retain(history: list[dict]) -> list[dict]:
    """
    Filter history to: action-tagged exchanges + recent tail.
    No extra Claude call. No DB writes. Pure in-memory.
    """
    non_summary = [m for m in history if m["role"] != "summary"]

    # The recent tail always stays
    tail = non_summary[-RECENT_TAIL:]
    tail_ids = {m["id"] for m in tail}

    # Action messages: kept outside the tail, capped at MAX_ACTION_MESSAGES
    action_msgs = [
        m for m in non_summary[:-RECENT_TAIL]
        if m.get("is_action")  # see tagging note below
    ][-MAX_ACTION_MESSAGES:]

    # Merge, preserve chronological order, deduplicate
    seen = set()
    merged = []
    for m in action_msgs + tail:
        if m["id"] not in seen:
            seen.add(m["id"])
            merged.append(m)

    return merged
```

Then in `send_message`, replace:
```python
history_msgs = await _maybe_compress_history(db, trip_id, current_user.id, claude, history_msgs)
```
with:
```python
history_msgs = _selective_retain(history_msgs)
```

No `await`, no extra subprocess call, no latency spike.

---

## Tagging action messages

The filtering above relies on `m.get("is_action")` to identify action exchanges.
Two options for this:

**Option A — tag in DB (requires migration):**
Add a boolean column `is_action` to the `ai_messages` table. In `send_message`, when
saving the AI response, set `is_action = True` if `action_type` is non-null.

```python
# In _save_message, add is_action param:
db.add(AiMessage(
    ...
    is_action=action_type is not None,
))
```

**Option B — infer from content (no migration):**
Store the action type in the assistant message content with a prefix, or just scan the
message content for action-result language ("Added expense:", "Deleted expense:",
"Updated expense:"). Messier but zero schema change.

```python
ACTION_MARKERS = ("Added expense:", "Deleted expense:", "Updated expense:")

def _selective_retain(history: list[dict]) -> list[dict]:
    def is_action(msg):
        return msg["role"] == "assistant" and any(
            marker in msg["content"] for marker in ACTION_MARKERS
        )
    ...
```

Option B works with the current DB schema today — no migration needed.

---

## Prompt structure (unchanged)

Since there's no summary message, the history section stays the same as today:

```
RECENT MESSAGES:
User: ...
Assistant: ...
```

If you want to signal to Claude that some messages were dropped, add a note:

```
CONVERSATION (recent and action-relevant messages shown; earlier Q&A omitted):
```

---

## Tradeoffs vs rolling summary

| | Rolling summary (current) | Selective retention (this) |
|---|---|---|
| Latency spike at threshold | Yes (~1-3s extra) | No |
| Preserves preferences stated in chat | Yes (compressed into summary) | Only if within tail |
| Implementation complexity | Medium | Low |
| Extra DB writes | Yes (summary row) | No |
| Memory of "I said X 60 messages ago" | Yes | No (unless X was an action) |

The only real loss is preferences stated in old conversational messages ("always split
equally for food"). In practice users rarely state preferences that far back and forget
they did. If that matters, add a dedicated "preferences" field to the Trip model and
let the AI write to it explicitly — then it's in the DB and always injected, not lost.

---

## When to actually swap

Switch if you observe:
- A noticeable pause every ~40 messages when the threshold hits
- The backend server is slow enough that a second subprocess call is painful
- You're handling enough concurrent users that the extra subprocess per-compression
  is a resource concern

Keep the rolling summary if you want the AI to remember things users said conversationally
(not just actions), and the latency is acceptable.
