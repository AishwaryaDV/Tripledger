from pydantic import BaseModel, field_validator
from typing import Optional


class BalanceResponse(BaseModel):
    userId: str
    displayName: str
    netAmount: float


class SettlementSuggestionResponse(BaseModel):
    fromUserId: str
    toUserId: str
    amount: float
    currency: str


class SettlementCreate(BaseModel):
    fromUserId: str
    toUserId: str
    amount: float
    currency: str
    method: Optional[str] = None
    isPartial: bool = False

    @field_validator('amount')
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError('amount must be greater than 0')
        if v > 99_999_999:
            raise ValueError('amount cannot exceed 99,999,999')
        return v


class SettlementResponse(BaseModel):
    id: str
    tripId: str
    fromUserId: str
    toUserId: str
    amount: float
    currency: str
    method: Optional[str] = None
    isPartial: bool
    confirmedAt: Optional[str] = None
