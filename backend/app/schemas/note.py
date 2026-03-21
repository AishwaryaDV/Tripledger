from pydantic import BaseModel
from typing import Optional


class NoteCreate(BaseModel):
    content: str


class NoteUpdate(BaseModel):
    content: str


class NoteResponse(BaseModel):
    id: str
    tripId: str
    authorId: str
    authorName: str
    content: str
    createdAt: str
    updatedAt: Optional[str] = None
