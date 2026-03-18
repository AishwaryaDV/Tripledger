from sqlalchemy import String, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # Supabase auth UUID stored as text
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    default_currency: Mapped[str] = mapped_column(String(3), default="USD")
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
