import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException

from app.models.note import Note
from app.models.trip import TripMember
from app.models.user import User
from app.schemas.note import NoteCreate, NoteUpdate, NoteResponse


async def _check_membership(db: AsyncSession, trip_id: str, user_id: str) -> None:
    result = await db.execute(
        select(TripMember).where(
            TripMember.trip_id == trip_id,
            TripMember.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this trip")


def _get_author_name(member: TripMember | None, user: User) -> str:
    if member and member.display_name:
        return member.display_name
    return user.display_name or user.email


def _build_response(note: Note, author_name: str) -> NoteResponse:
    return NoteResponse(
        id=note.id,
        tripId=note.trip_id,
        authorId=note.author_id,
        authorName=author_name,
        content=note.content,
        createdAt=str(note.created_at),
        updatedAt=str(note.updated_at) if note.updated_at else None,
    )


async def get_notes(db: AsyncSession, trip_id: str, current_user: User) -> list[NoteResponse]:
    await _check_membership(db, trip_id, current_user.id)

    result = await db.execute(
        select(Note).where(Note.trip_id == trip_id).order_by(Note.created_at.desc())
    )
    notes = result.scalars().all()

    # Fetch all member display names for this trip in one query
    member_result = await db.execute(
        select(TripMember).where(TripMember.trip_id == trip_id)
    )
    members = {m.user_id: m for m in member_result.scalars().all()}

    # Fetch all authors
    author_ids = list({n.author_id for n in notes})
    user_result = await db.execute(select(User).where(User.id.in_(author_ids)))
    users = {u.id: u for u in user_result.scalars().all()}

    responses = []
    for note in notes:
        member = members.get(note.author_id)
        user = users.get(note.author_id)
        author_name = _get_author_name(member, user) if user else note.author_id
        responses.append(_build_response(note, author_name))

    return responses


async def create_note(
    db: AsyncSession, trip_id: str, current_user: User, data: NoteCreate
) -> NoteResponse:
    await _check_membership(db, trip_id, current_user.id)

    note = Note(
        id=str(uuid.uuid4()),
        trip_id=trip_id,
        author_id=current_user.id,
        content=data.content,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    member_result = await db.execute(
        select(TripMember).where(
            TripMember.trip_id == trip_id,
            TripMember.user_id == current_user.id,
        )
    )
    member = member_result.scalar_one_or_none()
    author_name = _get_author_name(member, current_user)

    return _build_response(note, author_name)


async def update_note(
    db: AsyncSession, trip_id: str, note_id: str, current_user: User, data: NoteUpdate
) -> NoteResponse:
    await _check_membership(db, trip_id, current_user.id)

    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.trip_id == trip_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own notes")

    note.content = data.content
    note.updated_at = func.now()
    await db.commit()
    await db.refresh(note)

    member_result = await db.execute(
        select(TripMember).where(
            TripMember.trip_id == trip_id,
            TripMember.user_id == current_user.id,
        )
    )
    member = member_result.scalar_one_or_none()
    author_name = _get_author_name(member, current_user)

    return _build_response(note, author_name)


async def delete_note(
    db: AsyncSession, trip_id: str, note_id: str, current_user: User
) -> None:
    await _check_membership(db, trip_id, current_user.id)

    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.trip_id == trip_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own notes")

    await db.delete(note)
    await db.commit()
