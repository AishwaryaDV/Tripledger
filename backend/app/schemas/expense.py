from pydantic import BaseModel, field_validator
from typing import Literal, Optional

VALID_CATEGORIES = {'food', 'transport', 'accommodation', 'activities', 'other'}
VALID_SPLIT_TYPES = {'equal', 'exact', 'percentage', 'shares'}

# Numeric(12,4) columns overflow above this — reject early with a clean 422
MAX_AMOUNT = 99_999_999


class ExpenseSplitInput(BaseModel):
    userId: str
    amountOwed: float
    shareValue: Optional[float] = None

    @field_validator('amountOwed')
    @classmethod
    def amount_owed_must_be_sane(cls, v: float) -> float:
        if v < 0:
            raise ValueError('amountOwed cannot be negative')
        if v > MAX_AMOUNT:
            raise ValueError(f'amountOwed cannot exceed {MAX_AMOUNT:,}')
        return v


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

    @field_validator('amount', 'amountBase')
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('amount must be greater than 0')
        if v > MAX_AMOUNT:
            raise ValueError(f'amount cannot exceed {MAX_AMOUNT:,}')
        return v

    @field_validator('exchangeRate')
    @classmethod
    def exchange_rate_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('exchangeRate must be greater than 0')
        if v > 1_000_000:
            raise ValueError('exchangeRate is out of range')
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
