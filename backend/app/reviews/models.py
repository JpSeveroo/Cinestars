import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.users.models import User 


class UserReview(Base):
    __tablename__ = "user_reviews"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    movie_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("dim_movies.sk_movie_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    review_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    has_spoilers: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped[User] = relationship(lazy="selectin")

    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_user_movie_review"),
    )