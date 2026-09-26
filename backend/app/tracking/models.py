import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MovieWatchStatus(str, enum.Enum):
    QUERO_ASSISTIR = "QUERO_ASSISTIR"
    ASSISTINDO = "ASSISTINDO"
    ASSISTIDO = "ASSISTIDO"
    ABANDONEI = "ABANDONEI"


class UserMovieTracking(Base):
    __tablename__ = "user_movie_tracking"

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
    # Ajustado para String(64) para corresponder ao hash de dim_movies.sk_movie_id
    movie_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("dim_movies.sk_movie_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[MovieWatchStatus | None] = mapped_column(
        Enum(MovieWatchStatus, native_enum=False, length=30),
        nullable=True,
    )
    is_favorite: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "movie_id", name="uq_user_movie_tracking"),
    )