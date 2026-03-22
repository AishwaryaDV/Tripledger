from sqlalchemy import String, Text, Boolean, Date, TIMESTAMP, Numeric, ForeignKey, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    trip_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    paid_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    amount_base: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    exchange_rate: Mapped[float] = mapped_column(Numeric(18, 8), default=1.0)
    category: Mapped[str] = mapped_column(
        SAEnum("food", "transport", "accommodation", "activities", "other", name="expense_category", create_type=False),
        default="other",
    )
    split_type: Mapped[str] = mapped_column(
        SAEnum("equal", "exact", "percentage", "shares", name="split_type", create_type=False),
        default="equal",
    )
    receipt_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    expense_date: Mapped[str] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    splits: Mapped[list["ExpenseSplit"]] = relationship("ExpenseSplit", back_populates="expense", lazy="selectin", cascade="all, delete-orphan")


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    expense_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    amount_owed: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    share_value: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    is_settled: Mapped[bool] = mapped_column(Boolean, default=False)

    expense: Mapped["Expense"] = relationship("Expense", back_populates="splits")
