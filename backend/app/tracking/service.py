from app.movies.exceptions import MovieNotFoundError
from app.movies.models import DimMovie
from app.movies.repository import MovieRepository
from app.tracking.models import MovieWatchStatus, UserMovieTracking
from app.tracking.repository import TrackingRepository
from app.tracking.schemas import MovieTrackingUpdate


class TrackingService:
    def __init__(
        self, repository: TrackingRepository, movie_repository: MovieRepository
    ):
        self.repository = repository
        self.movie_repository = movie_repository

    async def _get_movie_or_fail(self, movie_id: str) -> DimMovie:
        """Busca o filme tanto pelo ID amigável ('1227249') quanto pelo hash interno."""
        movie = await self.movie_repository.get_by_id(movie_id)
        if movie is None:
            raise MovieNotFoundError(movie_id)
        return movie

    async def update_movie_status(
        self, user_id: str, movie_id: str, data: MovieTrackingUpdate
    ) -> UserMovieTracking:
        # 1. Resolve o filme pelo identificador amigável da URL
        movie = await self._get_movie_or_fail(movie_id)

        # 2. Persiste usando a Surrogate Key física (sk_movie_id)
        payload_data = data.model_dump(exclude_unset=True)
        return await self.repository.upsert(
            user_id=user_id,
            movie_id=movie.sk_movie_id,
            update_data=payload_data,
        )

    async def get_my_status(
        self, user_id: str, movie_id: str
    ) -> UserMovieTracking | None:
        movie = await self._get_movie_or_fail(movie_id)
        return await self.repository.get_by_user_and_movie(
            user_id, movie.sk_movie_id
        )

    async def remove_tracking(self, user_id: str, movie_id: str) -> bool:
        movie = await self._get_movie_or_fail(movie_id)
        return await self.repository.delete(user_id, movie.sk_movie_id)

    async def list_my_library(
        self,
        user_id: str,
        status: MovieWatchStatus | None = None,
        favorites: bool = False,
    ) -> list[UserMovieTracking]:
        return await self.repository.list_by_user(
            user_id=user_id, status=status, only_favorites=favorites
        )