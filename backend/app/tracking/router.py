from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.movies.repository import MovieRepository
from app.tracking.models import MovieWatchStatus, UserMovieTracking
from app.tracking.repository import TrackingRepository
from app.tracking.schemas import MovieTrackingResponse, MovieTrackingUpdate
from app.tracking.service import TrackingService
from app.users.dependencies import get_current_user
from app.users.models import User

router = APIRouter(prefix="/movies", tags=["tracking"])


def get_tracking_service(db: AsyncSession = Depends(get_db)) -> TrackingService:
    return TrackingService(TrackingRepository(db), MovieRepository(db))


@router.get("/me/library", response_model=list[MovieTrackingResponse])
async def list_my_library(
    status: MovieWatchStatus | None = Query(None, description="Filtrar por status"),
    favorites: bool = Query(False, description="Apenas favoritos"),
    current_user: User = Depends(get_current_user),
    service: TrackingService = Depends(get_tracking_service),
) -> list[UserMovieTracking]:
    return await service.list_my_library(current_user.id, status=status, favorites=favorites)


@router.put("/{movie_id}/status", response_model=MovieTrackingResponse)
async def update_movie_status(
    movie_id: str,
    payload: MovieTrackingUpdate,
    current_user: User = Depends(get_current_user),
    service: TrackingService = Depends(get_tracking_service),
) -> UserMovieTracking:
    return await service.update_movie_status(current_user.id, movie_id, payload)


@router.get("/{movie_id}/my-status", response_model=MovieTrackingResponse | None)
async def get_my_movie_status(
    movie_id: str,
    current_user: User = Depends(get_current_user),
    service: TrackingService = Depends(get_tracking_service),
) -> UserMovieTracking | None:
    return await service.get_my_status(current_user.id, movie_id)