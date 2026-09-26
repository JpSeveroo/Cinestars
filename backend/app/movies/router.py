from fastapi import APIRouter, Depends, Query, status

from app.movies.schemas import (
    MovieCreate,
    MovieDetailResponse,
    MovieSummaryResponse,
    MovieUpdate,
    PaginatedMoviesResponse,
    ReviewCreate,
    ReviewResponse,
)
from app.movies.service import MovieService, get_movie_service

router = APIRouter(prefix="/movies", tags=["movies"])

@router.get("", response_model=PaginatedMoviesResponse)
async def list_movies(
    page: int = Query(1, ge=1, description="Número da página (inicia em 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Quantidade de registros por página"),
    search: str | None = Query(None, min_length=1, description="Termo para pesquisa por título"),
    service: MovieService = Depends(get_movie_service),
) -> PaginatedMoviesResponse:
    movies, total = await service.list_movies(
        page=page,
        page_size=page_size,
        search=search,
    )
    return PaginatedMoviesResponse(
        items=movies,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "",
    response_model=MovieSummaryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_movie(
    movie_in: MovieCreate,
    service: MovieService = Depends(get_movie_service),
) -> MovieSummaryResponse:
    return await service.create_movie(movie_in)

@router.get(
    "/{movie_id}",
    response_model=MovieDetailResponse,
)
async def get_movie(
    movie_id: str,
    service: MovieService = Depends(get_movie_service),
) -> MovieDetailResponse:
    return await service.get_movie_by_id(movie_id)


@router.patch(
    "/{movie_id}",
    response_model=MovieSummaryResponse,
)
async def update_movie(
    movie_id: str,
    movie_in: MovieUpdate,
    service: MovieService = Depends(get_movie_service),
) -> MovieSummaryResponse:
    return await service.update_movie(movie_id, movie_in)

@router.delete(
    "/{movie_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_movie(
    movie_id: str,
    service: MovieService = Depends(get_movie_service),
) -> None:
    await service.delete_movie(movie_id)


@router.post(
    "/{movie_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_movie_review(
    movie_id: str,
    review_in: ReviewCreate,
    service: MovieService = Depends(get_movie_service),
) -> ReviewResponse:
    return await service.add_review(movie_id, review_in)