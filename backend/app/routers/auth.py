from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, select, update
import httpx

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip, TripMember
from app.models.expense import Expense, ExpenseSplit
from app.models.settlement import Settlement
from app.models.note import Note
from app.schemas.user import UserResponse, AuthMeRequest, AvatarUpdateRequest, CurrencyUpdateRequest
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/me", response_model=UserResponse)
async def auth_me(
    body: AuthMeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Called by the frontend after every login/signup.
    Upserts the user and saves display_name if provided.
    """
    if body.display_name:
        current_user.display_name = body.display_name
        await db.execute(
            update(TripMember)
            .where(TripMember.user_id == current_user.id)
            .values(display_name=body.display_name)
        )
        await db.commit()
        await db.refresh(current_user)

    return current_user


@router.patch("/me/currency", response_model=UserResponse)
async def update_currency(
    body: CurrencyUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.default_currency = body.default_currency.upper()[:3]
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.patch("/me/avatar", response_model=UserResponse)
async def update_avatar(
    body: AvatarUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.avatar_url = body.avatar_url
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.delete("/me", status_code=204)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Block deletion while the user still has activity: expenses/settlements/notes
    # FK to users with no cascade, and removing a participant would corrupt the
    # other members' balances anyway.
    membership = await db.execute(
        select(TripMember.trip_id).where(TripMember.user_id == current_user.id).limit(1)
    )
    if membership.first():
        raise HTTPException(
            status_code=409,
            detail="You're still in one or more circles — settle up and leave (or delete) them before deleting your account",
        )

    residual_checks = [
        select(Trip.id).where(Trip.created_by == current_user.id),
        select(Expense.id).where(Expense.paid_by == current_user.id),
        select(ExpenseSplit.id).where(ExpenseSplit.user_id == current_user.id),
        select(Settlement.id).where(
            or_(
                Settlement.from_user_id == current_user.id,
                Settlement.to_user_id == current_user.id,
            )
        ),
        select(Note.id).where(Note.author_id == current_user.id),
    ]
    for query in residual_checks:
        if (await db.execute(query.limit(1))).first():
            raise HTTPException(
                status_code=409,
                detail="Your account still has expense or payment history in circles — it must be removed before deleting your account",
            )

    # Delete our data first, Supabase auth last: if the auth call fails the user
    # can still log in and retry, whereas the reverse order strands a login-less
    # half-deleted account.
    await db.delete(current_user)
    await db.commit()

    if settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            async with httpx.AsyncClient() as client:
                await client.delete(
                    f"{settings.SUPABASE_URL}/auth/v1/admin/users/{current_user.id}",
                    headers={
                        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    },
                )
        except httpx.HTTPError:
            # Best effort: app data is gone; if the auth user survives, logging in
            # auto-provisions a fresh empty row and deletion can be retried.
            pass
    return Response(status_code=204)
