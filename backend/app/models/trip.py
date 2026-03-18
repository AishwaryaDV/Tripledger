from sqlalchemy import String, Text, Boolean, Date, TIMESTAMP, ForeignKey, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY, UUID

from app.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    circle_type: Mapped[str] = mapped_column(
        SAEnum("trip", "personal", "household", "event", name="circle_type", create_type=False),
        default="trip",
    )
    currencies: Mapped[list] = mapped_column(ARRAY(String(3)), default=list)
    base_currency: Mapped[str] = mapped_column(String(3), default="USD")
    join_code: Mapped[str] = mapped_column(String(6), unique=True, nullable=False)
    is_settled: Mapped[bool] = mapped_column(Boolean, default=False)
    start_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    members: Mapped[list["TripMember"]] = relationship("TripMember", back_populates="trip", lazy="selectin")


class TripMember(Base):
    __tablename__ = "trip_members"

    trip_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("trips.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    display_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(
        SAEnum("owner", "member", "viewer", name="member_role", create_type=False),
        default="member",
    )
    joined_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    trip: Mapped["Trip"] = relationship("Trip", back_populates="members")
