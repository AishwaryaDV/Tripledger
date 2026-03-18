from pydantic import BaseModel
from typing import Optional


class TripCreate(BaseModel):
    name: str
    description: Optional[str] = None
    circle_type: str = "trip"
    currencies: list[str] = ["USD"]
    base_currency: str = "USD"
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class MemberResponse(BaseModel):
    userId: str
    displayName: str
    role: str

    class Config:
        from_attributes = True


class TripResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    circle_type: str
    currencies: list[str]
    base_currency: str
    join_code: str
    is_settled: bool
    start_date: Optional[str]
    end_date: Optional[str]
    created_by: str
    members: list[MemberResponse] = []

    class Config:
        from_attributes = True


class TripPreview(BaseModel):
    id: str
    name: str
    circle_type: str
    member_count: int
