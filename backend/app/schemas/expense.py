from pydantic import BaseModel, field_validator
from typing import Optional


class ExpenseSplitInput(BaseModel):
    userId: str
    amountOwed: float
    shareValue: Optional[float] = None


class ExpenseCreate(BaseModel):
    paidBy: str
    title: str
    amount: float

    @field_validator('amount')
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('amount must be greater than 0')
        return v
    currency: str = "USD"
    amountBase: float
    exchangeRate: float = 1.0
    category: str = "other"
    splitType: str = "equal"
    splits: list[ExpenseSplitInput]
    expenseDate: str
    notes: Optional[str] = None


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
