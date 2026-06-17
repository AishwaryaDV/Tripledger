from sqlalchemy import String, Boolean, Numeric, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Settlement(Base):
    __tablename__ = "settlements"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    trip_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    from_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    to_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    method: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_partial: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmed_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
