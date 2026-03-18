import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from fastapi import HTTPException

from app.models.trip import Trip, TripMember
from app.models.user import User
from app.schemas.trip import TripCreate, TripResponse, TripPreview, MemberResponse


def _generate_join_code() -> str:
    """Generate a unique 6-char uppercase alphanumeric join code."""
    return secrets.token_hex(3).upper()


def _build_trip_response(trip: Trip) -> TripResponse:
    members = [
        MemberResponse(
            userId=m.user_id,
            displayName=m.display_name or m.user_id,
            role=m.role,
        )
        for m in trip.members
    ]
    return TripResponse(
        id=trip.id,
        name=trip.name,
        description=trip.description,
        circle_type=trip.circle_type,
        currencies=trip.currencies or [],
        base_currency=trip.base_currency,
        join_code=trip.join_code,
        is_settled=trip.is_settled,
        start_date=str(trip.start_date) if trip.start_date else None,
        end_date=str(trip.end_date) if trip.end_date else None,
        created_by=trip.created_by,
        members=members,
    )


async def create_trip(db: AsyncSession, current_user: User, data: TripCreate) -> TripResponse:
    import uuid
    join_code = _generate_join_code()

    trip = Trip(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        circle_type=data.circle_type,
        currencies=data.currencies,
        base_currency=data.base_currency,
        join_code=join_code,
        is_settled=False,
        start_date=data.start_date,
        end_date=data.end_date,
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
    return _build_trip_response(trip)


async def list_trips(db: AsyncSession, current_user: User) -> list[TripResponse]:
    result = await db.execute(
        select(Trip)
        .join(TripMember, TripMember.trip_id == Trip.id)
        .where(TripMember.user_id == current_user.id)
        .order_by(Trip.created_at.desc())
    )
    trips = result.scalars().all()
    return [_build_trip_response(t) for t in trips]


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

    return _build_trip_response(trip)


async def get_trip_by_code(db: AsyncSession, join_code: str) -> TripPreview:
    result = await db.execute(select(Trip).where(Trip.join_code == join_code.upper()))
    trip = result.scalar_one_or_none()

    if not trip:
        raise HTTPException(status_code=404, detail="Invalid join code")

    return TripPreview(
        id=trip.id,
        name=trip.name,
        circle_type=trip.circle_type,
        member_count=len(trip.members),
    )


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
    return _build_trip_response(trip)


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


async def delete_trip(db: AsyncSession, trip_id: str, current_user: User) -> None:
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this trip")

    await db.execute(delete(Trip).where(Trip.id == trip_id))
    await db.commit()
