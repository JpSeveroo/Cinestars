from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.users.dependencies import get_current_user
from app.users.exceptions import (
    InvalidCredentialsError,
    UserAlreadyExistsError,
    UserNotFoundError,
)
from app.users.models import User
from app.users.repository import UserRepository
from app.users.schemas import (
    TokenResponse,
    UserCreate,
    UserLogin,
    UserProfileResponse,
    UserResponse,
)
from app.users.service import AuthService

auth_router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    repository = UserRepository(db)
    return AuthService(repository)

@auth_router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    service: AuthService = Depends(get_auth_service),
) -> User:
    try:
        return await service.register(user_in)
    except UserAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@auth_router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    try:
        return await service.authenticate(credentials)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))


@auth_router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user

@users_router.get("/{nickname}", response_model=UserProfileResponse)
async def get_user_profile(
    nickname: str,
    service: AuthService = Depends(get_auth_service),
) -> dict:
    try:
        return await service.get_public_profile(nickname)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


router = auth_router