from sqlalchemy import String, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    trip_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    author_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(String(250), nullable=False)
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at: Mapped[str | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
