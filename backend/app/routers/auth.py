from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
import httpx

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.trip import TripMember
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
    if settings.SUPABASE_SERVICE_ROLE_KEY:
        async with httpx.AsyncClient() as client:
            await client.delete(
                f"{settings.SUPABASE_URL}/auth/v1/admin/users/{current_user.id}",
                headers={
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                },
            )
    await db.delete(current_user)
    await db.commit()
    return Response(status_code=204)
