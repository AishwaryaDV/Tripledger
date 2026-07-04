from datetime import date as _date
from pydantic import BaseModel, field_validator, model_validator
from typing import Optional

# Must match the circle_type ENUM in the DB — invalid values would 500 at insert
VALID_CIRCLE_TYPES = {"trip", "personal", "household", "event"}


class TripCreate(BaseModel):
    name: str
    description: Optional[str] = None
    circleType: str = "trip"
    currencies: list[str] = ["USD"]
    baseCurrency: str = "USD"
    startDate: Optional[str] = None
    endDate: Optional[str] = None

    @field_validator('name')
    @classmethod
    def name_must_be_sane(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('name must not be empty')
        if len(v) > 100:
            raise ValueError('name must be 100 characters or fewer')
        return v

    @field_validator('description')
    @classmethod
    def description_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 500:
            raise ValueError('description must be 500 characters or fewer')
        return v

    @field_validator('circleType')
    @classmethod
    def circle_type_must_be_valid(cls, v: str) -> str:
        if v not in VALID_CIRCLE_TYPES:
            raise ValueError(f'circleType must be one of {sorted(VALID_CIRCLE_TYPES)}')
        return v

    @field_validator('currencies')
    @classmethod
    def currencies_must_be_valid(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError('at least one currency is required')
        if len(v) > 3:
            raise ValueError('a circle can have at most 3 currencies')
        cleaned = []
        for code in v:
            code = code.strip().upper()
            if len(code) != 3 or not code.isalpha():
                raise ValueError(f'"{code}" is not a valid 3-letter currency code')
            if code not in cleaned:
                cleaned.append(code)
        return cleaned

    @field_validator('baseCurrency')
    @classmethod
    def base_currency_must_be_valid(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) != 3 or not v.isalpha():
            raise ValueError('baseCurrency must be a 3-letter currency code')
        return v

    @field_validator('startDate', 'endDate')
    @classmethod
    def dates_must_be_iso(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        try:
            _date.fromisoformat(v)
        except ValueError:
            raise ValueError('dates must be valid ISO dates (YYYY-MM-DD)')
        return v

    @model_validator(mode='after')
    def cross_field_checks(self) -> 'TripCreate':
        if self.baseCurrency not in self.currencies:
            raise ValueError('baseCurrency must be one of the circle currencies')
        if self.startDate and self.endDate and self.endDate < self.startDate:
            raise ValueError('endDate cannot be before startDate')
        return self


class TripPatch(BaseModel):
    isSettled: Optional[bool] = None
    # Acknowledge-and-proceed flag: settle even with outstanding payments
    force: bool = False


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
