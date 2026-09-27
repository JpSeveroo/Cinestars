from fastapi import APIRouter, Depends, Query

from app.movies.schemas import (
    MovieDetailResponse,
    PaginatedMoviesResponse,
)
from app.movies.service import MovieService, get_movie_service

router = APIRouter(prefix="/movies", tags=["movies"])


@router.get("", response_model=PaginatedMoviesResponse)
async def list_movies(
    page: int = Query(1, ge=1, description="Número da página (inicia em 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Quantidade de registros por página"),
    search: str | None = Query(None, min_length=1, description="Termo para pesquisa por título"),
    genre: str | None = Query(None, description="Filtro opcional por gênero"),
    service: MovieService = Depends(get_movie_service),
) -> PaginatedMoviesResponse:
    movies, total = await service.list_movies(
        page=page,
        page_size=page_size,
        search=search,
        genre=genre,
    )
    return PaginatedMoviesResponse(
        items=movies,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{movie_id}",
    response_model=MovieDetailResponse,
)
async def get_movie(
    movie_id: str,
    service: MovieService = Depends(get_movie_service),
) -> MovieDetailResponse:
    return await service.get_movie_by_id(movie_id)
