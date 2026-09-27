from typing import Any
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.movies.models import DimMovie
from app.reviews.models import UserReview
from app.tracking.models import MovieWatchStatus, UserMovieTracking
from app.users.models import User
from app.users.schemas import UserCreate


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- Métodos de Identidade & Autenticação ---

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_nickname(self, nickname: str) -> User | None:
        result = await self.db.execute(select(User).where(User.nickname == nickname))
        return result.scalar_one_or_none()

    async def get_by_login(self, identifier: str) -> User | None:
        """Busca o usuário por email OU nickname (login flexível)."""
        stmt = select(User).where(
            or_(User.email == identifier, User.nickname == identifier)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, user_in: UserCreate, hashed_password: str) -> User:
        user = User(
            email=user_in.email,
            nickname=user_in.nickname,
            hashed_password=hashed_password,
            avatar_url=user_in.avatar_url,
            bio=user_in.bio,
            is_admin=False,
        )
        self.db.add(user)
        await self.db.flush()
        return user

    # --- Métodos de Leitura do Perfil Público (Letterboxd Style) ---

    async def get_user_stats(self, user_id: str) -> dict[str, Any]:
        """Agrega todas as contagens e a média do usuário em apenas 2 queries otimizadas."""
        # 1. Todos os status do tracking consolidados em uma única query
        tracking_stmt = select(
            func.count(case((UserMovieTracking.status == MovieWatchStatus.ASSISTIDO, 1))).label("watched"),
            func.count(case((UserMovieTracking.status == MovieWatchStatus.QUERO_ASSISTIR, 1))).label("watchlist"),
            func.count(case((UserMovieTracking.status == MovieWatchStatus.ASSISTINDO, 1))).label("watching"),
            func.count(case((UserMovieTracking.status == MovieWatchStatus.ABANDONEI, 1))).label("dropped"),
        ).where(UserMovieTracking.user_id == user_id)

        tracking_res = await self.db.execute(tracking_stmt)
        watched, watchlist, watching, dropped = tracking_res.one()

        # 2. Total de reviews e nota média atribuída pelo usuário em uma só query
        reviews_stmt = select(
            func.count(UserReview.id),
            func.avg(UserReview.rating),
        ).where(UserReview.user_id == user_id)

        reviews_res = await self.db.execute(reviews_stmt)
        total_reviews, avg_rating = reviews_res.one()

        return {
            "total_watched": watched or 0,
            "total_watchlist": watchlist or 0,
            "total_watching": watching or 0,
            "total_dropped": dropped or 0,
            "total_reviews": total_reviews or 0,
            "average_user_rating": round(float(avg_rating), 2) if avg_rating is not None else None,
        }

    async def get_top_favorites(self, user_id: str, limit: int = 4) -> list[DimMovie]:
        """Retorna os até 4 filmes marcados como favoritos pelo usuário."""
        stmt = (
            select(DimMovie)
            .join(UserMovieTracking, UserMovieTracking.movie_id == DimMovie.sk_movie_id)
            .where(
                UserMovieTracking.user_id == user_id,
                UserMovieTracking.is_favorite.is_(True),
            )
            .order_by(UserMovieTracking.updated_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_recent_reviews(self, user_id: str, limit: int = 5) -> list[dict[str, Any]]:
        """Retorna as últimas resenhas do cinéfilo acompanhadas dos dados do filme."""
        stmt = (
            select(UserReview, DimMovie)
            .join(DimMovie, DimMovie.sk_movie_id == UserReview.movie_id)
            .where(UserReview.user_id == user_id)
            .order_by(UserReview.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)

        recent = []
        for review, movie in result.all():
            recent.append({
                "id": review.id,
                "rating": review.rating,
                "review_text": review.review_text,
                "has_spoilers": review.has_spoilers,
                "created_at": review.created_at,
                "movie": movie,
            })
        return recent