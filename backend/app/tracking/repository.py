from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.tracking.models import MovieWatchStatus, UserMovieTracking


class TrackingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_and_movie(
        self, user_id: str, movie_id: str
    ) -> UserMovieTracking | None:
        stmt = select(UserMovieTracking).where(
            UserMovieTracking.user_id == user_id,
            UserMovieTracking.movie_id == movie_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_user(
        self,
        user_id: str,
        status: MovieWatchStatus | None = None,
        only_favorites: bool = False,
    ) -> list[UserMovieTracking]:
        stmt = select(UserMovieTracking).where(UserMovieTracking.user_id == user_id)
        if status:
            stmt = stmt.where(UserMovieTracking.status == status)
        if only_favorites:
            stmt = stmt.where(UserMovieTracking.is_favorite.is_(True))

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def upsert(
        self,
        user_id: str,
        movie_id: str,
        update_data: dict,
    ) -> UserMovieTracking:
        tracking = await self.get_by_user_and_movie(user_id, movie_id)

        if tracking is None:
            tracking = UserMovieTracking(
                user_id=user_id,
                movie_id=movie_id,
                status=update_data.get("status"),
                is_favorite=update_data.get("is_favorite", False),
            )
            self.db.add(tracking)
        else:
            if "status" in update_data:
                tracking.status = update_data["status"]
            if "is_favorite" in update_data:
                tracking.is_favorite = update_data["is_favorite"]
            tracking.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        return await self.get_by_user_and_movie(user_id, movie_id)

    async def delete(self, user_id: str, movie_id: str) -> bool:
        tracking = await self.get_by_user_and_movie(user_id, movie_id)
        if tracking:
            await self.db.delete(tracking)
            await self.db.flush()
            return True
        return False