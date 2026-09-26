from collections.abc import Sequence

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db

from app.movies.exceptions import MovieNotFoundError
from app.movies.models import DimMovie, MovieReview
from app.movies.repository import MovieRepository, ReviewRepository
from app.movies.schemas import MovieCreate, MovieUpdate, ReviewCreate


class MovieService:

    def __init__(
        self,
        movie_repo: MovieRepository,
        review_repo: ReviewRepository,
    ) -> None:
        self.movie_repo = movie_repo
        self.review_repo = review_repo

    async def list_movies(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> tuple[Sequence[DimMovie], int]:
        skip = (page - 1) * page_size
        return await self.movie_repo.get_paginated(
            skip=skip,
            limit=page_size,
            search=search,
        )

    async def get_movie_by_id(self, movie_id: str) -> DimMovie:
        movie = await self.movie_repo.get_by_id(movie_id)
        if not movie:
            raise MovieNotFoundError(movie_id)
        return movie

    async def create_movie(self, movie_in: MovieCreate) -> DimMovie:
        return await self.movie_repo.create(movie_in)

    async def update_movie(
        self, movie_id: str, movie_in: MovieUpdate
    ) -> DimMovie:
        movie = await self.get_movie_by_id(movie_id)
        return await self.movie_repo.update(movie, movie_in)

    async def delete_movie(self, movie_id: str) -> None:
        movie = await self.get_movie_by_id(movie_id)
        await self.movie_repo.delete(movie)

    async def add_review(
        self, movie_id: str, review_in: ReviewCreate
    ) -> MovieReview:
        movie = await self.get_movie_by_id(movie_id)
        return await self.review_repo.create_and_sync_metrics(
            movie_sk_id=movie.sk_movie_id,
            review_in=review_in,
        )

def get_movie_service(db: AsyncSession = Depends(get_db)) -> MovieService:
    return MovieService(
        movie_repo=MovieRepository(db),
        review_repo=ReviewRepository(db),
    )