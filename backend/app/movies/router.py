from fastapi import APIRouter, Depends, Query, status

from app.movies.schemas import (
    MovieCreate,
    MovieDetailResponse,
    MovieUpdate,
    PaginatedMoviesResponse,
)
from app.movies.service import MovieService, get_movie_service
from app.users.dependencies import get_current_user
from app.users.models import User

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


@router.post("", response_model=MovieDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_movie(
    payload: MovieCreate,
    current_user: User = Depends(get_current_user),
    service: MovieService = Depends(get_movie_service),
) -> MovieDetailResponse:
    """Cadastra um novo filme no catálogo."""
    return await service.create_movie(payload, created_by_user_id=current_user.id)


@router.get(
    "/{movie_id}",
    response_model=MovieDetailResponse,
)
async def get_movie(
    movie_id: str,
    service: MovieService = Depends(get_movie_service),
) -> MovieDetailResponse:
    return await service.get_movie_by_id(movie_id)


@router.put("/{movie_id}", response_model=MovieDetailResponse)
async def update_movie(
    movie_id: str,
    payload: MovieUpdate,
    current_user: User = Depends(get_current_user),
    service: MovieService = Depends(get_movie_service),
) -> MovieDetailResponse:
    """Atualiza metadados de um filme existente."""
    return await service.update_movie(movie_id, payload, current_user_id=current_user.id)


@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_movie(
    movie_id: str,
    current_user: User = Depends(get_current_user),
    service: MovieService = Depends(get_movie_service),
) -> None:
    """Remove um filme do catálogo."""
    await service.delete_movie(movie_id, current_user_id=current_user.id)
