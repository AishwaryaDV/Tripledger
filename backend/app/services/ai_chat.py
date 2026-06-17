import asyncio
import json
import uuid
from datetime import date

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_message import AiMessage
from app.models.expense import Expense, ExpenseSplit
from app.models.trip import Trip, TripMember
from app.models.user import User
from app.routers.ai import _claude_path

VALID_CATEGORIES = {"food", "transport", "accommodation", "activities", "other"}

CHAT_SCHEMA = json.dumps({
    "type": "object",
    "properties": {
        "message": {"type": "string"},
        "action_type": {
            "type": ["string", "null"],
            "enum": ["add_expense", "edit_expense", "delete_expense", None],
        },
        "action_data": {"type": ["object", "null"]},
    },
    "required": ["message", "action_type", "action_data"],
})


async def get_history(db: AsyncSession, trip_id: str, user_id: str) -> list[dict]:
    result = await db.execute(
        select(AiMessage)
        .where(AiMessage.trip_id == trip_id, AiMessage.user_id == user_id)
        .order_by(AiMessage.created_at.asc())
    )
    msgs = result.scalars().all()
    return [{"role": m.role, "content": m.content, "id": m.id, "createdAt": str(m.created_at)} for m in msgs]


async def clear_history(db: AsyncSession, trip_id: str, user_id: str) -> None:
    await db.execute(
        delete(AiMessage).where(AiMessage.trip_id == trip_id, AiMessage.user_id == user_id)
    )
    await db.commit()


async def _build_context(db: AsyncSession, trip_id: str) -> tuple[str, dict[str, str], list[dict]]:
    trip_res = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = trip_res.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    members_res = await db.execute(
        select(TripMember, User)
        .join(User, User.id == TripMember.user_id)
        .where(TripMember.trip_id == trip_id)
    )
    rows = members_res.all()
    member_map: dict[str, str] = {}
    member_lines: list[str] = []
    member_ids: list[str] = []
    for tm, u in rows:
        name = tm.display_name or u.display_name or u.email
        member_map[u.id] = name
        member_lines.append(f"  - {name} (id: {u.id})")
        member_ids.append(u.id)

    exp_res = await db.execute(
        select(Expense)
        .where(Expense.trip_id == trip_id)
        .order_by(Expense.expense_date.desc(), Expense.created_at.desc())
    )
    expenses = list(exp_res.scalars().all())
    expense_dicts: list[dict] = []
    expense_lines: list[str] = []
    for e in expenses:
        paid_name = member_map.get(e.paid_by, e.paid_by)
        splits_text = ", ".join(
            f"{member_map.get(s.user_id, s.user_id)} owes {float(s.amount_owed):.2f}"
            for s in e.splits
        )
        line = (
            f"  [{e.id}] {e.expense_date} | {e.title} | "
            f"{float(e.amount):.2f} {e.currency} "
            f"(base: {float(e.amount_base):.2f} {trip.base_currency}) | "
            f"category: {e.category} | paid by: {paid_name} | splits: {splits_text}"
        )
        if e.notes:
            line += f" | notes: {e.notes}"
        expense_lines.append(line)
        expense_dicts.append({
            "id": e.id,
            "title": e.title,
            "amount": float(e.amount),
            "currency": e.currency,
            "amount_base": float(e.amount_base),
            "category": e.category,
            "expense_date": str(e.expense_date),
            "paid_by": e.paid_by,
            "splits": [{"userId": s.user_id, "amountOwed": float(s.amount_owed)} for s in e.splits],
        })

    ctx = (
        f"TRIP: {trip.name}\n"
        f"BASE CURRENCY: {trip.base_currency}\n"
        f"MEMBERS:\n" + "\n".join(member_lines) + "\n\n"
        f"EXPENSES ({len(expenses)} total):\n"
        + ("\n".join(expense_lines) if expense_lines else "  (no expenses yet)")
    )
    return ctx, member_map, expense_dicts


async def _save_message(db: AsyncSession, trip_id: str, user_id: str, role: str, content: str) -> None:
    db.add(AiMessage(
        id=str(uuid.uuid4()),
        trip_id=trip_id,
        user_id=user_id,
        role=role,
        content=content,
    ))


async def _execute_action(
    db: AsyncSession,
    trip_id: str,
    current_user: User,
    action_type: str,
    action_data: dict,
) -> str:
    if action_type == "delete_expense":
        expense_id = action_data.get("expense_id")
        if not expense_id:
            return "No expense ID provided for deletion."
        res = await db.execute(select(Expense).where(Expense.id == expense_id, Expense.trip_id == trip_id))
        expense = res.scalar_one_or_none()
        if not expense:
            return f"Expense {expense_id} not found."
        await db.execute(delete(Expense).where(Expense.id == expense_id))
        return f"Deleted expense: {expense.title}"

    if action_type == "add_expense":
        try:
            amount = float(action_data["amount"])
            currency = str(action_data["currency"])[:3].upper()
            title = str(action_data["title"])
            category = action_data.get("category", "other")
            if category not in VALID_CATEGORIES:
                category = "other"
            expense_date = date.fromisoformat(action_data["expense_date"])
            paid_by = str(action_data["paid_by"])
            notes = action_data.get("notes")
            splits_raw = action_data.get("splits", [])

            expense = Expense(
                id=str(uuid.uuid4()),
                trip_id=trip_id,
                paid_by=paid_by,
                title=title,
                amount=amount,
                currency=currency,
                amount_base=amount,
                exchange_rate=1.0,
                category=category,
                split_type="equal",
                expense_date=expense_date,
                notes=notes,
            )
            db.add(expense)
            await db.flush()

            for s in splits_raw:
                db.add(ExpenseSplit(
                    id=str(uuid.uuid4()),
                    expense_id=expense.id,
                    user_id=s["userId"],
                    amount_owed=float(s["amountOwed"]),
                    is_settled=False,
                ))
            return f"Added expense: {title} ({amount:.2f} {currency})"
        except (KeyError, ValueError) as e:
            return f"Could not add expense: {e}"

    if action_type == "edit_expense":
        expense_id = action_data.get("expense_id")
        if not expense_id:
            return "No expense ID provided for edit."
        res = await db.execute(select(Expense).where(Expense.id == expense_id, Expense.trip_id == trip_id))
        expense = res.scalar_one_or_none()
        if not expense:
            return f"Expense {expense_id} not found."
        if "title" in action_data:
            expense.title = action_data["title"]
        if "amount" in action_data:
            expense.amount = float(action_data["amount"])
            expense.amount_base = float(action_data["amount"])
        if "currency" in action_data:
            expense.currency = str(action_data["currency"])[:3].upper()
        if "category" in action_data and action_data["category"] in VALID_CATEGORIES:
            expense.category = action_data["category"]
        if "expense_date" in action_data:
            expense.expense_date = date.fromisoformat(action_data["expense_date"])
        if "notes" in action_data:
            expense.notes = action_data["notes"]
        return f"Updated expense: {expense.title}"

    return "Unknown action."


async def send_message(
    db: AsyncSession,
    trip_id: str,
    current_user: User,
    user_message: str,
) -> dict:
    context, member_map, _ = await _build_context(db, trip_id)

    history_msgs = await get_history(db, trip_id, current_user.id)
    recent = history_msgs[-20:]

    history_text = ""
    if recent:
        lines = []
        for m in recent:
            label = "User" if m["role"] == "user" else "Assistant"
            lines.append(f"{label}: {m['content']}")
        history_text = "\nPRIOR CONVERSATION:\n" + "\n".join(lines) + "\n"

    user_name = current_user.display_name or current_user.email

    prompt = (
        f"You are TripLedger's AI assistant helping {user_name} manage shared trip expenses. "
        f"Be concise and friendly. Only perform an action when explicitly asked.\n\n"
        f"{context}\n"
        f"{history_text}\n"
        f"USER: {user_message}\n\n"
        f"Respond with a JSON object containing:\n"
        f'- "message": your text reply (required)\n'
        f'- "action_type": one of "add_expense", "edit_expense", "delete_expense", or null\n'
        f'- "action_data": the action payload or null\n\n'
        f"For add_expense, action_data fields: title(str), amount(float), currency(3-letter str), "
        f"category(food|transport|accommodation|activities|other), expense_date(YYYY-MM-DD), "
        f'paid_by(user id from MEMBERS), notes(str or null), splits([{{userId, amountOwed}}]). '
        f"For equal splits divide amount among all members. "
        f"For edit_expense: expense_id(required) + any fields to change. "
        f"For delete_expense: expense_id(required)."
    )

    try:
        claude = _claude_path()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    proc = await asyncio.create_subprocess_exec(
        claude, "--print",
        "--model", "haiku",
        "--output-format", "json",
        "--json-schema", CHAT_SCHEMA,
        "--prompt", prompt,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
    except asyncio.TimeoutError:
        proc.kill()
        raise HTTPException(status_code=504, detail="AI response timed out — try again")

    if proc.returncode != 0:
        raise HTTPException(status_code=502, detail="AI assistant unavailable")

    try:
        result = json.loads(stdout.decode())
        parsed = result.get("structured_output") or result
        ai_text = str(parsed.get("message", ""))
        action_type = parsed.get("action_type")
        action_data = parsed.get("action_data")
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=502, detail="AI returned an unexpected response")

    action_result: str | None = None
    if action_type and action_data:
        action_result = await _execute_action(db, trip_id, current_user, action_type, action_data)

    await _save_message(db, trip_id, current_user.id, "user", user_message)
    await _save_message(db, trip_id, current_user.id, "assistant", ai_text)
    await db.commit()

    return {"message": ai_text, "action_type": action_type, "action_result": action_result}
