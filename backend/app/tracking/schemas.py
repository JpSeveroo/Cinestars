from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.tracking.models import MovieWatchStatus


class TrackingMovieCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sk_movie_id: str
    id_filme: str
    titulo: str
    ano_lancamento: int | None
    url_poster: str | None


class MovieTrackingUpdate(BaseModel):
    status: MovieWatchStatus | None = None
    is_favorite: bool | None = None


class MovieTrackingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    movie_id: str
    status: MovieWatchStatus | None
    is_favorite: bool
    updated_at: datetime
    movie: TrackingMovieCard