from pydantic import BaseModel
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
