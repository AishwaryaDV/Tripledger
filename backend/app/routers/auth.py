from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, AuthMeRequest

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
    if body.display_name and not current_user.display_name:
        current_user.display_name = body.display_name
        await db.commit()
        await db.refresh(current_user)

    return current_user
