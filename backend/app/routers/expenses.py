from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.services import expenses as expense_service

router = APIRouter(prefix="/trips/{trip_id}/expenses", tags=["expenses"])


@router.get("", response_model=list[ExpenseResponse])
async def get_expenses(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await expense_service.get_expenses(db, trip_id, current_user)


@router.post("", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    trip_id: str,
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await expense_service.create_expense(db, trip_id, current_user, data)


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    trip_id: str,
    expense_id: str,
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await expense_service.update_expense(db, trip_id, expense_id, current_user, data)


@router.delete("/{expense_id}", status_code=204)
async def delete_expense(
    trip_id: str,
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await expense_service.delete_expense(db, trip_id, expense_id, current_user)
