from app.movies.exceptions import MovieNotFoundError
from app.movies.models import DimMovie
from app.movies.repository import MovieRepository
from app.reviews.models import UserReview
from app.reviews.repository import ReviewRepository
from app.reviews.schemas import MovieReviewListResponse, ReviewCreate
from app.tracking.models import MovieWatchStatus
from app.tracking.repository import TrackingRepository


class ReviewNotFoundError(Exception):
    pass


class ReviewService:
    def __init__(
        self,
        repository: ReviewRepository,
        movie_repository: MovieRepository,
        tracking_repository: TrackingRepository,
    ):
        self.repository = repository
        self.movie_repository = movie_repository
        self.tracking_repository = tracking_repository

    async def _get_movie_or_fail(self, movie_id: str) -> DimMovie:
        movie = await self.movie_repository.get_by_id(movie_id)
        if movie is None:
            raise MovieNotFoundError(movie_id)
        return movie

    async def create_or_update_review(
        self, user_id: str, movie_id: str, data: ReviewCreate
    ) -> UserReview:
        movie = await self._get_movie_or_fail(movie_id)

        # Atualiza no tracking passando o dicionário exatamente como seu repositório espera
        await self.tracking_repository.upsert(
            user_id=user_id,
            movie_id=movie.sk_movie_id,
            update_data={"status": MovieWatchStatus.ASSISTIDO},
        )

        return await self.repository.upsert(
            user_id=user_id,
            movie_id=movie.sk_movie_id,
            rating=data.rating,
            review_text=data.review_text,
            has_spoilers=data.has_spoilers,
        )

    async def get_movie_reviews(
        self, movie_id: str, page: int = 1, per_page: int = 10
    ) -> MovieReviewListResponse:
        movie = await self._get_movie_or_fail(movie_id)
        items, total, avg_rating = await self.repository.list_by_movie(
            movie.sk_movie_id, page=page, per_page=per_page
        )
        return MovieReviewListResponse(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            average_community_rating=avg_rating,
        )

    async def get_my_review(
        self, user_id: str, movie_id: str
    ) -> UserReview | None:
        movie = await self._get_movie_or_fail(movie_id)
        return await self.repository.get_by_user_and_movie(user_id, movie.sk_movie_id)

    async def delete_review(self, user_id: str, movie_id: str) -> None:
        movie = await self._get_movie_or_fail(movie_id)
        deleted = await self.repository.delete(user_id, movie.sk_movie_id)
        if not deleted:
            raise ReviewNotFoundError(f"Review não encontrada para o filme {movie_id}.")