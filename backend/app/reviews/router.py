from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.movies.repository import MovieRepository
from app.reviews.models import UserReview
from app.reviews.repository import ReviewRepository
from app.reviews.schemas import (
    MovieReviewListResponse,
    PaginatedFeedResponse,
    ReviewCreate,
    ReviewResponse,
)
from app.reviews.service import ReviewService
from app.tracking.repository import TrackingRepository
from app.users.dependencies import get_current_user
from app.users.models import User

router = APIRouter(prefix="/movies", tags=["reviews"])
feed_router = APIRouter(prefix="/feed", tags=["feed"])


def get_review_service(db: AsyncSession = Depends(get_db)) -> ReviewService:
    return ReviewService(
        ReviewRepository(db),
        MovieRepository(db),
        TrackingRepository(db),
    )


@feed_router.get("", response_model=PaginatedFeedResponse)
async def get_global_feed(
    page: int = Query(1, ge=1, description="Número da página (inicia em 1)"),
    per_page: int = Query(20, ge=1, le=50, description="Quantidade por página"),
    service: ReviewService = Depends(get_review_service),
) -> PaginatedFeedResponse:
    """Feed global da comunidade com as últimas resenhas e avaliações."""
    return await service.get_feed(page=page, per_page=per_page)

@router.post("/{movie_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def post_movie_review(
    movie_id: str,
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    service: ReviewService = Depends(get_review_service),
) -> UserReview:
    """Publica ou edita a review do usuário autenticado."""
    return await service.create_or_update_review(current_user.id, movie_id, payload)


@router.get("/{movie_id}/reviews", response_model=MovieReviewListResponse)
async def get_movie_reviews(
    movie_id: str,
    page: int = Query(1, ge=1, description="Número da página"),
    per_page: int = Query(10, ge=1, le=50, description="Itens por página"),
    service: ReviewService = Depends(get_review_service),
) -> MovieReviewListResponse:
    """Lista pública e paginada de reviews da comunidade sobre o filme."""
    return await service.get_movie_reviews(movie_id, page=page, per_page=per_page)


@router.get("/{movie_id}/reviews/me", response_model=ReviewResponse | None)
async def get_my_movie_review(
    movie_id: str,
    current_user: User = Depends(get_current_user),
    service: ReviewService = Depends(get_review_service),
) -> UserReview | None:
    """Consulta a review que o usuário logado fez para o filme."""
    return await service.get_my_review(current_user.id, movie_id)


@router.delete("/{movie_id}/reviews", status_code=status.HTTP_204_NO_CONTENT)
async def delete_movie_review(
    movie_id: str,
    current_user: User = Depends(get_current_user),
    service: ReviewService = Depends(get_review_service),
) -> None:
    """Remove a review do usuário autenticado."""
    await service.delete_review(current_user.id, movie_id)