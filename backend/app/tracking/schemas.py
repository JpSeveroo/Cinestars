from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.tracking.models import MovieWatchStatus


class MovieTrackingUpdate(BaseModel):
    status: MovieWatchStatus | None = None
    is_favorite: bool | None = None


class MovieTrackingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    movie_id: str
    status: MovieWatchStatus | None
    is_favorite: bool
    updated_at: datetime