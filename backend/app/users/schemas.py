from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ==========================================
# Schemas de Autenticação e Conta
# ==========================================

class UserCreate(BaseModel):
    email: EmailStr
    nickname: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=6, max_length=72, description="Limite estrito de 72 bytes do bcrypt")
    avatar_url: str | None = Field(default=None, max_length=500)
    bio: str | None = Field(default=None, max_length=500)


class UserLogin(BaseModel):
    login: str = Field(..., description="Aceita email ou nickname")
    password: str


class UserUpdate(BaseModel):
    bio: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = Field(default=None, max_length=500)

    @field_validator("bio", "avatar_url", mode="before")
    @classmethod
    def sanitize_empty_strings(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            trimmed = v.strip()
            return trimmed if trimmed else None
        return v


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
    total_watched: int = 0
    total_watchlist: int = 0
    total_watching: int = 0
    total_dropped: int = 0
    total_favorites: int = 0
    total_reviews: int = 0
    average_user_rating: float | None = None
    media_pessoal: float | None = None


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nickname: str
    bio: str | None = None
    avatar_url: str | None = None
    created_at: datetime
    stats: ProfileStats
    favorites: list[ProfileMovieCard] = []
    favorite_movies: list[ProfileMovieCard] = []
    recent_reviews: list[ProfileRecentReview] = []