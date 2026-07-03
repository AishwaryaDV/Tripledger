from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip, TripMember
from app.schemas.trip import TripCreate, TripPatch, TripResponse
from app.services import trips as trip_service
from app.services import balances as balance_service
from app.config import settings

router = APIRouter(prefix="/trips", tags=["trips"])


@router.post("", response_model=TripResponse, status_code=201)
async def create_trip(
    data: TripCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await trip_service.create_trip(db, current_user, data)


@router.get("", response_model=list[TripResponse])
async def list_trips(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await trip_service.list_trips(db, current_user)


@router.get("/by-code/{join_code}", response_model=TripResponse)
async def get_trip_by_code(
    join_code: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no auth required. Returns trip for join screen."""
    return await trip_service.get_trip_by_code(db, join_code)


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await trip_service.get_trip(db, trip_id, current_user)


@router.post("/{trip_id}/join", response_model=TripResponse)
async def join_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await trip_service.join_trip(db, trip_id, current_user)


@router.patch("/{trip_id}", response_model=TripResponse)
async def patch_trip(
    trip_id: str,
    data: TripPatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.isSettled is None:
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(status_code=400, detail="Nothing to update")
    return await trip_service.patch_trip(db, trip_id, current_user, data.isSettled)


@router.delete("/{trip_id}/members/me", status_code=204)
async def leave_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await trip_service.leave_trip(db, trip_id, current_user)


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await trip_service.delete_trip(db, trip_id, current_user)


@router.post("/{trip_id}/members/{member_id}/remind", status_code=204)
async def remind_member(
    trip_id: str,
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a balance reminder email to a trip member."""
    # Verify requester is a member of the trip
    trip = await trip_service.get_trip(db, trip_id, current_user)

    # Verify target is also a member
    target_member = next((m for m in trip.members if m.userId == member_id), None)
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found in trip")

    # Don't allow reminding yourself
    if member_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remind yourself")

    # Get target user's email
    result = await db.execute(select(User).where(User.id == member_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get their balance
    balances = await balance_service.get_balances(db, trip_id, current_user)
    member_balance = next((b for b in balances if b.userId == member_id), None)
    net = member_balance.netAmount if member_balance else 0

    if not settings.RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Email service not configured")

    if net > 0:
        balance_line = f"you are owed {trip.base_currency} {abs(net):.2f}"
    elif net < 0:
        balance_line = f"you owe {trip.base_currency} {abs(net):.2f}"
    else:
        balance_line = "you are fully settled up"

    html = f"""
    <p>Hi {target_member.displayName},</p>
    <p><b>{current_user.display_name or current_user.email}</b> sent you a reminder about
    the circle <b>{trip.name}</b>.</p>
    <p>Your current balance: <b>{balance_line}</b>.</p>
    <p>Open TripLedger to view your expenses and settle up.</p>
    """

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": settings.RESEND_FROM_EMAIL,
                "to": [target_user.email],
                "subject": f"Reminder: {trip.name} — balance update",
                "html": html,
            },
        )
        if res.status_code >= 400:
            raise HTTPException(status_code=502, detail="Failed to send email")

    return Response(status_code=204)
