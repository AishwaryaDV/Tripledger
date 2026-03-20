from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.balance import (
    BalanceResponse,
    SettlementSuggestionResponse,
    SettlementCreate,
    SettlementResponse,
)
from app.services import balances as balance_service

router = APIRouter(prefix="/trips/{trip_id}", tags=["balances"])


@router.get("/balances", response_model=list[BalanceResponse])
async def get_balances(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await balance_service.get_balances(db, trip_id, current_user)


@router.get("/settle", response_model=list[SettlementSuggestionResponse])
async def get_suggestions(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await balance_service.get_suggestions(db, trip_id, current_user)


@router.get("/settlements", response_model=list[SettlementResponse])
async def get_settlements(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await balance_service.get_settlements(db, trip_id, current_user)


@router.post("/settlements", response_model=SettlementResponse, status_code=201)
async def create_settlement(
    trip_id: str,
    data: SettlementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await balance_service.create_settlement(db, trip_id, current_user, data)
