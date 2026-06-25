import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from fastapi import HTTPException

from app.models.expense import Expense, ExpenseSplit
from app.models.trip import Trip, TripMember
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseSplitResponse


def _build_expense_response(expense: Expense) -> ExpenseResponse:
    splits = [
        ExpenseSplitResponse(
            userId=s.user_id,
            amountOwed=float(s.amount_owed),
            shareValue=float(s.share_value) if s.share_value is not None else None,
            isSettled=s.is_settled,
        )
        for s in expense.splits
    ]
    return ExpenseResponse(
        id=expense.id,
        tripId=expense.trip_id,
        paidBy=expense.paid_by,
        title=expense.title,
        amount=float(expense.amount),
        currency=expense.currency,
        amountBase=float(expense.amount_base),
        exchangeRate=float(expense.exchange_rate),
        category=expense.category,
        splitType=expense.split_type,
        splits=splits,
        receiptUrl=expense.receipt_url,
        expenseDate=str(expense.expense_date),
        notes=expense.notes,
        createdAt=str(expense.created_at) if expense.created_at else None,
    )


async def _get_trip(db: AsyncSession, trip_id: str) -> Trip:
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


async def _get_member_ids(db: AsyncSession, trip_id: str) -> set[str]:
    result = await db.execute(select(TripMember).where(TripMember.trip_id == trip_id))
    return {m.user_id for m in result.scalars().all()}


async def _check_membership(db: AsyncSession, trip_id: str, user_id: str) -> None:
    result = await db.execute(
        select(TripMember).where(
            TripMember.trip_id == trip_id,
            TripMember.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this trip")


async def get_expenses(db: AsyncSession, trip_id: str, current_user: User) -> list[ExpenseResponse]:
    await _check_membership(db, trip_id, current_user.id)

    result = await db.execute(
        select(Expense)
        .where(Expense.trip_id == trip_id)
        .order_by(Expense.expense_date.desc(), Expense.created_at.desc())
    )
    expenses = result.scalars().all()
    return [_build_expense_response(e) for e in expenses]


async def create_expense(db: AsyncSession, trip_id: str, current_user: User, data: ExpenseCreate) -> ExpenseResponse:
    await _check_membership(db, trip_id, current_user.id)
    trip = await _get_trip(db, trip_id)
    if trip.is_settled:
        raise HTTPException(status_code=409, detail="This trip is already settled — reopen it before adding expenses")
    member_ids = await _get_member_ids(db, trip_id)
    if data.paidBy not in member_ids:
        raise HTTPException(status_code=400, detail="The selected payer is not a member of this trip")
    for s in data.splits:
        if s.userId not in member_ids:
            raise HTTPException(status_code=400, detail=f"Split user {s.userId} is not a member of this trip")

    expense = Expense(
        id=str(uuid.uuid4()),
        trip_id=trip_id,
        paid_by=data.paidBy,
        title=data.title,
        amount=data.amount,
        currency=data.currency,
        amount_base=data.amountBase,
        exchange_rate=data.exchangeRate,
        category=data.category,
        split_type=data.splitType,
        expense_date=date.fromisoformat(data.expenseDate),
        notes=data.notes,
    )
    db.add(expense)
    await db.flush()

    for s in data.splits:
        split = ExpenseSplit(
            id=str(uuid.uuid4()),
            expense_id=expense.id,
            user_id=s.userId,
            amount_owed=s.amountOwed,
            share_value=s.shareValue,
            is_settled=False,
        )
        db.add(split)

    await db.commit()
    await db.refresh(expense)
    return _build_expense_response(expense)


async def update_expense(db: AsyncSession, trip_id: str, expense_id: str, current_user: User, data: ExpenseCreate) -> ExpenseResponse:
    await _check_membership(db, trip_id, current_user.id)
    trip = await _get_trip(db, trip_id)
    if trip.is_settled:
        raise HTTPException(status_code=409, detail="This trip is already settled — reopen it before editing expenses")
    member_ids = await _get_member_ids(db, trip_id)
    if data.paidBy not in member_ids:
        raise HTTPException(status_code=400, detail="The selected payer is not a member of this trip")
    for s in data.splits:
        if s.userId not in member_ids:
            raise HTTPException(status_code=400, detail=f"Split user {s.userId} is not a member of this trip")

    result = await db.execute(select(Expense).where(Expense.id == expense_id, Expense.trip_id == trip_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    expense.paid_by = data.paidBy
    expense.title = data.title
    expense.amount = data.amount
    expense.currency = data.currency
    expense.amount_base = data.amountBase
    expense.exchange_rate = data.exchangeRate
    expense.category = data.category
    expense.split_type = data.splitType
    expense.expense_date = date.fromisoformat(data.expenseDate)
    expense.notes = data.notes

    # Replace splits
    await db.execute(delete(ExpenseSplit).where(ExpenseSplit.expense_id == expense_id))
    for s in data.splits:
        split = ExpenseSplit(
            id=str(uuid.uuid4()),
            expense_id=expense.id,
            user_id=s.userId,
            amount_owed=s.amountOwed,
            share_value=s.shareValue,
            is_settled=False,
        )
        db.add(split)

    await db.commit()
    await db.refresh(expense)
    return _build_expense_response(expense)


async def delete_expense(db: AsyncSession, trip_id: str, expense_id: str, current_user: User) -> None:
    await _check_membership(db, trip_id, current_user.id)

    result = await db.execute(select(Expense).where(Expense.id == expense_id, Expense.trip_id == trip_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    await db.execute(delete(Expense).where(Expense.id == expense_id))
    await db.commit()
