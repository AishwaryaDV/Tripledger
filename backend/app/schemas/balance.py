from pydantic import BaseModel, field_validator, model_validator
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

    @field_validator('currency')
    @classmethod
    def currency_must_be_valid(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) != 3 or not v.isalpha():
            raise ValueError('currency must be a 3-letter currency code')
        return v

    @model_validator(mode='after')
    def no_self_settlement(self) -> 'SettlementCreate':
        if self.fromUserId == self.toUserId:
            raise ValueError('payer and recipient cannot be the same person')
        return self


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
