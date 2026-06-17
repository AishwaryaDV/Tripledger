from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services import ai_chat as chat_service

router = APIRouter(prefix="/trips/{trip_id}/ai-chat", tags=["ai-chat"])


class ChatMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    message: str
    action_type: str | None = None
    action_result: str | None = None


class HistoryMessage(BaseModel):
    id: str
    role: str
    content: str
    createdAt: str


@router.get("", response_model=list[HistoryMessage])
async def get_history(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await chat_service.get_history(db, trip_id, current_user.id)


@router.post("", response_model=ChatMessageResponse)
async def send_message(
    trip_id: str,
    body: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await chat_service.send_message(db, trip_id, current_user, body.message)


@router.delete("", status_code=204)
async def clear_history(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await chat_service.clear_history(db, trip_id, current_user.id)
