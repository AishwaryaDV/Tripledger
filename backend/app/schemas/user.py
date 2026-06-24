from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None
    avatar_url: str | None
    default_currency: str

    model_config = {"from_attributes": True}


class AuthMeRequest(BaseModel):
    display_name: str | None = None

class AvatarUpdateRequest(BaseModel):
    avatar_url: str | None = None

class CurrencyUpdateRequest(BaseModel):
    default_currency: str
