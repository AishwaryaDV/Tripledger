from pydantic import BaseModel
from typing import Optional


class TripCreate(BaseModel):
    name: str
    description: Optional[str] = None
    circleType: str = "trip"
    currencies: list[str] = ["USD"]
    baseCurrency: str = "USD"
    startDate: Optional[str] = None
    endDate: Optional[str] = None


class TripPatch(BaseModel):
    isSettled: Optional[bool] = None


class MemberResponse(BaseModel):
    userId: str
    displayName: str
    role: str
    avatarUrl: Optional[str] = None


class TripResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    circleType: str
    currencies: list[str]
    baseCurrency: str
    joinCode: str
    isSettled: bool
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    createdBy: str
    createdAt: Optional[str] = None
    members: list[MemberResponse] = []
