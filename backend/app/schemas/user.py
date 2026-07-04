from pydantic import BaseModel, field_validator


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None
    avatar_url: str | None
    default_currency: str

    model_config = {"from_attributes": True}


class AuthMeRequest(BaseModel):
    display_name: str | None = None

    @field_validator('display_name')
    @classmethod
    def display_name_sane(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            # whitespace-only → treat as "not provided" rather than storing blanks
            return None
        if len(v) > 50:
            raise ValueError('display_name must be 50 characters or fewer')
        return v

class AvatarUpdateRequest(BaseModel):
    avatar_url: str | None = None

class CurrencyUpdateRequest(BaseModel):
    default_currency: str
