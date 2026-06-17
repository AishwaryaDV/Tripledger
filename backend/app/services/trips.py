import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from fastapi import HTTPException

from app.models.trip import Trip, TripMember
from app.models.user import User
from app.schemas.trip import TripCreate, TripResponse, MemberResponse


def _generate_join_code() -> str:
    """Generate a unique 6-char uppercase alphanumeric join code."""
    return secrets.token_hex(3).upper()


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
    await db.flush()  # get trip.id before adding member

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


async def get_trip_by_code(db: AsyncSession, join_code: str) -> TripResponse:
    result = await db.execute(select(Trip).where(Trip.join_code == join_code.upper()))
    trip = result.scalar_one_or_none()

    if not trip:
        raise HTTPException(status_code=404, detail="Invalid join code")

    user_ids = [m.user_id for m in trip.members]
    avatars = await _get_user_avatars(db, user_ids)
    return _build_trip_response(trip, avatars)


async def join_trip(db: AsyncSession, trip_id: str, current_user: User) -> TripResponse:
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Check already a member
    existing = await db.execute(
        select(TripMember).where(
            TripMember.trip_id == trip_id,
            TripMember.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already a member of this trip")

    member = TripMember(
        trip_id=trip_id,
        user_id=current_user.id,
        display_name=current_user.display_name or current_user.email,
        role="member",
    )
    db.add(member)
    await db.commit()
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

    await db.execute(
        delete(TripMember).where(
            TripMember.trip_id == trip_id,
            TripMember.user_id == current_user.id,
        )
    )
    await db.commit()


async def patch_trip(db: AsyncSession, trip_id: str, current_user: User, is_settled: bool) -> TripResponse:
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
