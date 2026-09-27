from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ReviewAuthorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nickname: str
    avatar_url: str | None = None


class ReviewCreate(BaseModel):
    rating: float = Field(..., ge=0.5, le=5.0, description="Nota de 0.5 a 5.0 estrelas")
    review_text: str | None = Field(default=None, max_length=5000)
    has_spoilers: bool = False

    @field_validator("rating")
    @classmethod
    def validate_half_star_increments(cls, v: float) -> float:
        if (v * 2) % 1 != 0:
            raise ValueError("A nota deve ser em incrementos de 0.5 estrela (ex: 3.0, 3.5, 4.0).")
        return v


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    movie_id: str
    rating: float
    review_text: str | None
    has_spoilers: bool
    created_at: datetime
    updated_at: datetime
    user: ReviewAuthorResponse


class MovieReviewListResponse(BaseModel):
    items: list[ReviewResponse]
    total: int
    page: int
    per_page: int
    average_community_rating: float | None