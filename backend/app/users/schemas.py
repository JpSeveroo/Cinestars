from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ==========================================
# Schemas de Autenticação e Conta
# ==========================================

class UserCreate(BaseModel):
    email: EmailStr
    nickname: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=6, max_length=72, description="Limite estrito de 72 bytes do bcrypt")
    avatar_url: str | None = None
    bio: str | None = Field(default=None, max_length=500)


class UserLogin(BaseModel):
    login: str = Field(..., description="Aceita email ou nickname")
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    nickname: str
    avatar_url: str | None = None
    bio: str | None = None
    is_admin: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ==========================================
# Schemas do Perfil Público (Letterboxd Style)
# ==========================================

class ProfileMovieCard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sk_movie_id: str
    id_filme: str
    titulo: str
    ano_lancamento: int | None
    url_poster: str | None


class ProfileRecentReview(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    rating: float
    review_text: str | None
    has_spoilers: bool
    created_at: datetime
    movie: ProfileMovieCard


class ProfileStats(BaseModel):
    total_watched: int
    total_watchlist: int
    total_watching: int
    total_dropped: int
    total_reviews: int
    average_user_rating: float | None = None


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nickname: str
    bio: str | None
    avatar_url: str | None
    created_at: datetime
    stats: ProfileStats
    favorites: list[ProfileMovieCard]
    recent_reviews: list[ProfileRecentReview]