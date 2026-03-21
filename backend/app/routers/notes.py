from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.note import NoteCreate, NoteUpdate, NoteResponse
from app.services import notes as note_service

router = APIRouter(prefix="/trips/{trip_id}/notes", tags=["notes"])


@router.get("", response_model=list[NoteResponse])
async def get_notes(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await note_service.get_notes(db, trip_id, current_user)


@router.post("", response_model=NoteResponse, status_code=201)
async def create_note(
    trip_id: str,
    data: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await note_service.create_note(db, trip_id, current_user, data)


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    trip_id: str,
    note_id: str,
    data: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await note_service.update_note(db, trip_id, note_id, current_user, data)


@router.delete("/{note_id}", status_code=204)
async def delete_note(
    trip_id: str,
    note_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await note_service.delete_note(db, trip_id, note_id, current_user)
