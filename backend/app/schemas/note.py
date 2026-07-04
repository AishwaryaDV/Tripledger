from pydantic import BaseModel, field_validator
from typing import Optional


class NoteCreate(BaseModel):
    content: str

    @field_validator('content')
    @classmethod
    def content_must_be_sane(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Note cannot be empty')
        if len(v) > 250:
            raise ValueError('Note cannot exceed 250 characters')
        return v


class NoteUpdate(BaseModel):
    content: str

    @field_validator('content')
    @classmethod
    def content_must_be_sane(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Note cannot be empty')
        if len(v) > 250:
            raise ValueError('Note cannot exceed 250 characters')
        return v


class NoteResponse(BaseModel):
    id: str
    tripId: str
    authorId: str
    authorName: str
    content: str
    createdAt: str
    updatedAt: Optional[str] = None
