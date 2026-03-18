from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.trip import TripCreate, TripResponse, TripPreview
from app.services import trips as trip_service

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


@router.get("/by-code/{join_code}", response_model=TripPreview)
async def get_trip_by_code(
    join_code: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no auth required. Returns preview for join screen."""
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
