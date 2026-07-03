from pydantic import BaseModel, field_validator
from typing import Literal, Optional

VALID_CATEGORIES = {'food', 'transport', 'accommodation', 'activities', 'other'}
VALID_SPLIT_TYPES = {'equal', 'exact', 'percentage', 'shares'}


class ExpenseSplitInput(BaseModel):
    userId: str
    amountOwed: float
    shareValue: Optional[float] = None


class ExpenseCreate(BaseModel):
    paidBy: str
    title: str
    amount: float
    currency: str = "USD"
    amountBase: float
    exchangeRate: float = 1.0
    category: str = "other"
    splitType: str = "equal"
    splits: list[ExpenseSplitInput]
    expenseDate: str
    notes: Optional[str] = None

    @field_validator('amount')
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('amount must be greater than 0')
        return v

    @field_validator('category')
    @classmethod
    def category_must_be_valid(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f'category must be one of {sorted(VALID_CATEGORIES)}')
        return v

    @field_validator('splitType')
    @classmethod
    def split_type_must_be_valid(cls, v: str) -> str:
        if v not in VALID_SPLIT_TYPES:
            raise ValueError(f'splitType must be one of {sorted(VALID_SPLIT_TYPES)}')
        return v

    @field_validator('expenseDate')
    @classmethod
    def expense_date_must_be_iso(cls, v: str) -> str:
        from datetime import date as _date
        try:
            _date.fromisoformat(v)
        except ValueError:
            raise ValueError('expenseDate must be a valid ISO date (YYYY-MM-DD)')
        return v


class ExpenseSplitResponse(BaseModel):
    userId: str
    amountOwed: float
    shareValue: Optional[float] = None
    isSettled: bool


class ExpenseResponse(BaseModel):
    id: str
    tripId: str
    paidBy: str
    title: str
    amount: float
    currency: str
    amountBase: float
    exchangeRate: float
    category: str
    splitType: str
    splits: list[ExpenseSplitResponse] = []
    receiptUrl: Optional[str] = None
    expenseDate: str
    notes: Optional[str] = None
    createdAt: Optional[str] = None
