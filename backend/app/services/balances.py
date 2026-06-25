import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.expense import Expense, ExpenseSplit
from app.models.settlement import Settlement
from app.models.trip import Trip, TripMember
from app.models.user import User
from app.schemas.balance import (
    BalanceResponse,
    SettlementSuggestionResponse,
    SettlementCreate,
    SettlementResponse,
)


async def _check_membership(db: AsyncSession, trip_id: str, user_id: str) -> None:
    result = await db.execute(
        select(TripMember).where(
            TripMember.trip_id == trip_id,
            TripMember.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this trip")


async def _get_trip(db: AsyncSession, trip_id: str) -> Trip:
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


def _compute_net_balances(
    members: list[TripMember],
    splits: list[ExpenseSplit],
    expenses: list[Expense],
    past_settlements: list[Settlement],
) -> dict[str, float]:
    """
    Net balance per user in base currency.
    Positive  = others owe them money.
    Negative  = they owe others money.
    """
    net: dict[str, float] = {m.user_id: 0.0 for m in members}

    for expense in expenses:
        payer = expense.paid_by
        if payer in net:
            net[payer] += float(expense.amount_base)

    for split in splits:
        uid = split.user_id
        if uid in net:
            net[uid] -= float(split.amount_owed)

    # Subtract already-recorded settlements
    for s in past_settlements:
        if s.from_user_id in net:
            net[s.from_user_id] += float(s.amount)
        if s.to_user_id in net:
            net[s.to_user_id] -= float(s.amount)

    return net


def _minimum_transactions(
    net: dict[str, float],
    currency: str,
) -> list[SettlementSuggestionResponse]:
    """
    Greedy minimum-transactions algorithm.
    Creditors (net > 0) receive from debtors (net < 0).
    """
    EPS = 0.005  # ignore sub-cent balances
    creditors = sorted(
        [(uid, amt) for uid, amt in net.items() if amt > EPS],
        key=lambda x: -x[1],
    )
    debtors = sorted(
        [(uid, -amt) for uid, amt in net.items() if amt < -EPS],
        key=lambda x: -x[1],
    )

    suggestions: list[SettlementSuggestionResponse] = []
    ci, di = 0, 0

    while ci < len(creditors) and di < len(debtors):
        cuid, camt = creditors[ci]
        duid, damt = debtors[di]
        transfer = min(camt, damt)

        suggestions.append(SettlementSuggestionResponse(
            fromUserId=duid,
            toUserId=cuid,
            amount=round(transfer, 2),
            currency=currency,
        ))

        creditors[ci] = (cuid, camt - transfer)
        debtors[di] = (duid, damt - transfer)

        if creditors[ci][1] < EPS:
            ci += 1
        if debtors[di][1] < EPS:
            di += 1

    return suggestions


async def get_balances(
    db: AsyncSession, trip_id: str, current_user: User
) -> list[BalanceResponse]:
    await _check_membership(db, trip_id, current_user.id)
    trip = await _get_trip(db, trip_id)

    # Fetch all expenses for the trip
    exp_result = await db.execute(select(Expense).where(Expense.trip_id == trip_id))
    expenses = exp_result.scalars().all()

    expense_ids = [e.id for e in expenses]
    splits: list[ExpenseSplit] = []
    if expense_ids:
        split_result = await db.execute(
            select(ExpenseSplit).where(ExpenseSplit.expense_id.in_(expense_ids))
        )
        splits = split_result.scalars().all()

    sett_result = await db.execute(select(Settlement).where(Settlement.trip_id == trip_id))
    past_settlements = sett_result.scalars().all()

    net = _compute_net_balances(trip.members, splits, list(expenses), list(past_settlements))

    return [
        BalanceResponse(
            userId=m.user_id,
            displayName=m.display_name or m.user_id,
            netAmount=round(net.get(m.user_id, 0.0), 2),
        )
        for m in trip.members
    ]


async def get_suggestions(
    db: AsyncSession, trip_id: str, current_user: User
) -> list[SettlementSuggestionResponse]:
    await _check_membership(db, trip_id, current_user.id)
    trip = await _get_trip(db, trip_id)

    exp_result = await db.execute(select(Expense).where(Expense.trip_id == trip_id))
    expenses = exp_result.scalars().all()

    expense_ids = [e.id for e in expenses]
    splits: list[ExpenseSplit] = []
    if expense_ids:
        split_result = await db.execute(
            select(ExpenseSplit).where(ExpenseSplit.expense_id.in_(expense_ids))
        )
        splits = split_result.scalars().all()

    sett_result = await db.execute(select(Settlement).where(Settlement.trip_id == trip_id))
    past_settlements = sett_result.scalars().all()

    net = _compute_net_balances(trip.members, splits, list(expenses), list(past_settlements))
    return _minimum_transactions(net, trip.base_currency)


async def get_settlements(
    db: AsyncSession, trip_id: str, current_user: User
) -> list[SettlementResponse]:
    await _check_membership(db, trip_id, current_user.id)

    result = await db.execute(
        select(Settlement)
        .where(Settlement.trip_id == trip_id)
        .order_by(Settlement.confirmed_at.desc())
    )
    settlements = result.scalars().all()

    return [
        SettlementResponse(
            id=s.id,
            tripId=s.trip_id,
            fromUserId=s.from_user_id,
            toUserId=s.to_user_id,
            amount=float(s.amount),
            currency=s.currency,
            method=s.method,
            isPartial=s.is_partial,
            confirmedAt=str(s.confirmed_at) if s.confirmed_at else None,
        )
        for s in settlements
    ]


async def create_settlement(
    db: AsyncSession, trip_id: str, current_user: User, data: SettlementCreate
) -> SettlementResponse:
    await _check_membership(db, trip_id, current_user.id)

    trip = await _get_trip(db, trip_id)
    if trip.is_settled:
        raise HTTPException(status_code=409, detail="This trip is already settled — reopen it before recording payments")

    member_result = await db.execute(select(TripMember).where(TripMember.trip_id == trip_id))
    member_ids = {m.user_id for m in member_result.scalars().all()}
    if data.fromUserId not in member_ids or data.toUserId not in member_ids:
        raise HTTPException(status_code=400, detail="Both payer and recipient must be members of this trip")

    settlement = Settlement(
        id=str(uuid.uuid4()),
        trip_id=trip_id,
        from_user_id=data.fromUserId,
        to_user_id=data.toUserId,
        amount=data.amount,
        currency=data.currency,
        method=data.method,
        is_partial=data.isPartial,
    )
    db.add(settlement)
    await db.commit()
    await db.refresh(settlement)

    return SettlementResponse(
        id=settlement.id,
        tripId=settlement.trip_id,
        fromUserId=settlement.from_user_id,
        toUserId=settlement.to_user_id,
        amount=float(settlement.amount),
        currency=settlement.currency,
        method=settlement.method,
        isPartial=settlement.is_partial,
        confirmedAt=str(settlement.confirmed_at) if settlement.confirmed_at else None,
    )
