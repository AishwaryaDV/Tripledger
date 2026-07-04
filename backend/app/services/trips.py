import secrets
import string
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.expense import Expense, ExpenseSplit
from app.models.trip import Trip, TripMember
from app.models.user import User
from app.schemas.trip import TripCreate, TripResponse, TripPreviewResponse, MemberResponse
from app.services.balances import _load_net_balances, _minimum_transactions


_CODE_ALPHABET = string.ascii_uppercase + string.digits


def _generate_join_code() -> str:
    """Generate a random 6-char uppercase alphanumeric join code."""
    return ''.join(secrets.choice(_CODE_ALPHABET) for _ in range(6))


async def _get_user_avatars(db: AsyncSession, user_ids: list[str]) -> dict[str, str | None]:
    if not user_ids:
        return {}
    result = await db.execute(select(User.id, User.avatar_url).where(User.id.in_(user_ids)))
    return {row.id: row.avatar_url for row in result}


def _build_trip_response(trip: Trip, user_avatars: dict[str, str | None] | None = None) -> TripResponse:
    avatars = user_avatars or {}
    members = [
        MemberResponse(
            userId=m.user_id,
            displayName=m.display_name or m.user_id,
            role=m.role,
            avatarUrl=avatars.get(m.user_id),
        )
        for m in trip.members
    ]
    return TripResponse(
        id=trip.id,
        name=trip.name,
        description=trip.description,
        circleType=trip.circle_type,
        currencies=trip.currencies or [],
        baseCurrency=trip.base_currency,
        joinCode=trip.join_code,
        isSettled=trip.is_settled,
        startDate=str(trip.start_date) if trip.start_date else None,
        endDate=str(trip.end_date) if trip.end_date else None,
        createdBy=trip.created_by,
        createdAt=str(trip.created_at) if trip.created_at else None,
        members=members,
    )


async def create_trip(db: AsyncSession, current_user: User, data: TripCreate) -> TripResponse:
    import uuid
    for attempt in range(5):
        join_code = _generate_join_code()
        trip = Trip(
            id=str(uuid.uuid4()),
            name=data.name,
            description=data.description,
            circle_type=data.circleType,
            currencies=data.currencies,
            base_currency=data.baseCurrency,
            join_code=join_code,
            is_settled=False,
            start_date=data.startDate,
            end_date=data.endDate,
            created_by=current_user.id,
        )
        db.add(trip)
        try:
            await db.flush()
            break
        except IntegrityError:
            await db.rollback()
            if attempt == 4:
                raise HTTPException(status_code=500, detail="Could not generate a unique join code — please try again")
    else:
        raise HTTPException(status_code=500, detail="Could not generate a unique join code — please try again")

    # Auto-add creator as owner
    member = TripMember(
        trip_id=trip.id,
        user_id=current_user.id,
        display_name=current_user.display_name or current_user.email,
        role="owner",
    )
    db.add(member)
    await db.commit()
    await db.refresh(trip)
    user_ids = [m.user_id for m in trip.members]
    avatars = await _get_user_avatars(db, user_ids)
    return _build_trip_response(trip, avatars)


async def list_trips(db: AsyncSession, current_user: User) -> list[TripResponse]:
    result = await db.execute(
        select(Trip)
        .join(TripMember, TripMember.trip_id == Trip.id)
        .where(TripMember.user_id == current_user.id)
        .order_by(Trip.created_at.desc())
    )
    trips = result.scalars().all()
    all_user_ids = list({m.user_id for t in trips for m in t.members})
    avatars = await _get_user_avatars(db, all_user_ids)
    return [_build_trip_response(t, avatars) for t in trips]


async def get_trip(db: AsyncSession, trip_id: str, current_user: User) -> TripResponse:
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Check membership
    member_result = await db.execute(
        select(TripMember).where(
            TripMember.trip_id == trip_id,
            TripMember.user_id == current_user.id,
        )
    )
    if not member_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this trip")

    user_ids = [m.user_id for m in trip.members]
    avatars = await _get_user_avatars(db, user_ids)
    return _build_trip_response(trip, avatars)


async def get_trip_by_code(db: AsyncSession, join_code: str) -> TripPreviewResponse:
    result = await db.execute(select(Trip).where(Trip.join_code == join_code.strip().upper()))
    trip = result.scalar_one_or_none()

    if not trip:
        raise HTTPException(status_code=404, detail="Invalid join code")

    return TripPreviewResponse(
        id=trip.id,
        name=trip.name,
        description=trip.description,
        circleType=trip.circle_type,
        currencies=trip.currencies or [],
        baseCurrency=trip.base_currency,
        joinCode=trip.join_code,
        isSettled=trip.is_settled,
        memberCount=len(trip.members),
        memberNames=[m.display_name or "Member" for m in trip.members[:5]],
    )


async def join_trip(db: AsyncSession, join_code: str, current_user: User) -> TripResponse:
    # Joining requires the join code — knowing a trip's UUID alone must not be enough.
    result = await db.execute(select(Trip).where(Trip.join_code == join_code.strip().upper()))
    trip = result.scalar_one_or_none()

    if not trip:
        raise HTTPException(status_code=404, detail="Invalid join code")

    # Check already a member
    existing = await db.execute(
        select(TripMember).where(
            TripMember.trip_id == trip.id,
            TripMember.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already a member of this trip")

    member = TripMember(
        trip_id=trip.id,
        user_id=current_user.id,
        display_name=current_user.display_name or current_user.email,
        role="member",
    )
    db.add(member)
    try:
        await db.commit()
    except IntegrityError:
        # Double-click / two-device race: the other insert won — same outcome
        await db.rollback()
        raise HTTPException(status_code=409, detail="Already a member of this trip")
    await db.refresh(trip)
    user_ids = [m.user_id for m in trip.members]
    avatars = await _get_user_avatars(db, user_ids)
    return _build_trip_response(trip, avatars)


async def leave_trip(db: AsyncSession, trip_id: str, current_user: User) -> None:
    # Owner cannot leave — they must delete or transfer
    member_result = await db.execute(
        select(TripMember).where(
            TripMember.trip_id == trip_id,
            TripMember.user_id == current_user.id,
        )
    )
    member = member_result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="Not a member of this trip")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Owner cannot leave — delete the trip instead")

    # Balance math only counts current members, so a member who leaves takes their
    # paid credits and owed splits out of the equation — corrupting everyone else's
    # balances. Block leaving while they're still woven into the trip's money.
    trip_result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = trip_result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    net = await _load_net_balances(db, trip)
    if abs(net.get(current_user.id, 0.0)) > 0.005:
        raise HTTPException(
            status_code=409,
            detail="Settle your balance before leaving this circle",
        )

    paid_result = await db.execute(
        select(Expense.id)
        .where(Expense.trip_id == trip_id, Expense.paid_by == current_user.id)
        .limit(1)
    )
    split_result = await db.execute(
        select(ExpenseSplit.id)
        .join(Expense, Expense.id == ExpenseSplit.expense_id)
        .where(Expense.trip_id == trip_id, ExpenseSplit.user_id == current_user.id)
        .limit(1)
    )
    if paid_result.first() or split_result.first():
        raise HTTPException(
            status_code=409,
            detail="You still have expenses on this circle — they must be removed or reassigned before you can leave",
        )

    await db.execute(
        delete(TripMember).where(
            TripMember.trip_id == trip_id,
            TripMember.user_id == current_user.id,
        )
    )
    await db.commit()


async def patch_trip(db: AsyncSession, trip_id: str, current_user: User, is_settled: bool, force: bool = False) -> TripResponse:
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    member_result = await db.execute(
        select(TripMember).where(TripMember.trip_id == trip_id, TripMember.user_id == current_user.id)
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this trip")
    if member.role != "owner":
        raise HTTPException(status_code=403, detail="Only the owner can settle or reopen this circle")

    # Settling freezes the trip — warn (409) if payments are still outstanding,
    # unless the owner explicitly confirmed with force=true.
    if is_settled and not trip.is_settled and not force:
        net = await _load_net_balances(db, trip)
        outstanding = _minimum_transactions(net, trip.base_currency)
        if outstanding:
            count = len(outstanding)
            raise HTTPException(
                status_code=409,
                detail=f"{count} payment{'s are' if count != 1 else ' is'} still outstanding on this circle",
            )

    trip.is_settled = is_settled
    await db.commit()
    await db.refresh(trip)
    user_ids = [m.user_id for m in trip.members]
    avatars = await _get_user_avatars(db, user_ids)
    return _build_trip_response(trip, avatars)


async def delete_trip(db: AsyncSession, trip_id: str, current_user: User) -> None:
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this trip")

    await db.execute(delete(Trip).where(Trip.id == trip_id))
    await db.commit()
