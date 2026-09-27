from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.reviews.models import UserReview


class ReviewRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_and_movie(
        self, user_id: str, movie_id: str
    ) -> UserReview | None:
        stmt = select(UserReview).where(
            UserReview.user_id == user_id,
            UserReview.movie_id == movie_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_movie(
        self, movie_id: str, page: int = 1, per_page: int = 10
    ) -> tuple[list[UserReview], int, float | None]:
        offset = (page - 1) * per_page

        stmt = (
            select(UserReview)
            .where(UserReview.movie_id == movie_id)
            .order_by(UserReview.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        items_result = await self.db.execute(stmt)
        items = list(items_result.scalars().all())

        stats_stmt = select(
            func.count(UserReview.id),
            func.avg(UserReview.rating),
        ).where(UserReview.movie_id == movie_id)
        stats_result = await self.db.execute(stats_stmt)
        total, avg_rating = stats_result.one()

        formatted_avg = round(float(avg_rating), 2) if avg_rating is not None else None
        return items, total or 0, formatted_avg

    async def upsert(
        self,
        user_id: str,
        movie_id: str,
        rating: float,
        review_text: str | None,
        has_spoilers: bool,
    ) -> UserReview:
        review = await self.get_by_user_and_movie(user_id, movie_id)

        if review is None:
            review = UserReview(
                user_id=user_id,
                movie_id=movie_id,
                rating=rating,
                review_text=review_text,
                has_spoilers=has_spoilers,
            )
            self.db.add(review)
        else:
            review.rating = rating
            review.review_text = review_text
            review.has_spoilers = has_spoilers
            review.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        return await self.get_by_user_and_movie(user_id, movie_id)

    async def delete(self, user_id: str, movie_id: str) -> bool:
        review = await self.get_by_user_and_movie(user_id, movie_id)
        if review:
            await self.db.delete(review)
            await self.db.flush()
            return True
        return False