from pydantic import BaseModel, field_validator
from typing import Optional


class TripCreate(BaseModel):
    name: str

    @field_validator('name')
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('name must not be empty')
        return v
    description: Optional[str] = None
    circleType: str = "trip"
    currencies: list[str] = ["USD"]
    baseCurrency: str = "USD"
    startDate: Optional[str] = None
    endDate: Optional[str] = None


class TripPatch(BaseModel):
    isSettled: Optional[bool] = None


class TripJoinRequest(BaseModel):
    joinCode: str

    @field_validator('joinCode')
    @classmethod
    def join_code_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('joinCode must not be empty')
        return v


class TripPreviewResponse(BaseModel):
    """Public (unauthenticated) invite-screen preview — deliberately excludes
    member user IDs and other internals; joining requires the code anyway."""
    id: str
    name: str
    description: Optional[str] = None
    circleType: str
    currencies: list[str]
    baseCurrency: str
    joinCode: str
    isSettled: bool
    memberCount: int
    memberNames: list[str] = []


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
