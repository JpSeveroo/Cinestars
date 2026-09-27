from sqlalchemy.exc import IntegrityError
from app.core.security import create_access_token, get_password_hash, verify_password
from app.users.exceptions import InvalidCredentialsError, UserAlreadyExistsError, UserNotFoundError
from app.users.models import User
from app.users.repository import UserRepository
from app.users.schemas import TokenResponse, UserCreate, UserLogin, UserUpdate

class AuthService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def update_profile(self, user: User, user_update: UserUpdate) -> User:
        return await self.repository.update(
            user,
            bio=user_update.bio,
            avatar_url=user_update.avatar_url,
        )

    async def register(self, user_in: UserCreate) -> User:
        if await self.repository.get_by_email(user_in.email):
            raise UserAlreadyExistsError("Este e-mail já está cadastrado.")

        if await self.repository.get_by_nickname(user_in.nickname):
            raise UserAlreadyExistsError("Este nickname já está em uso.")

        hashed_password = get_password_hash(user_in.password)
        try:
            return await self.repository.create(user_in, hashed_password)
        except IntegrityError:
            raise UserAlreadyExistsError("Usuário já cadastrado com estes dados.")

    async def authenticate(self, credentials: UserLogin) -> TokenResponse:
        user = await self.repository.get_by_login(credentials.login)
        if not user or not verify_password(credentials.password, user.hashed_password):
            raise InvalidCredentialsError("Credenciais inválidas.")

        token = create_access_token(subject=user.id)
        return TokenResponse(access_token=token)

    async def get_public_profile(self, nickname: str) -> dict:
        user = await self.repository.get_by_nickname(nickname)
        if not user:
            raise UserNotFoundError(f"Cinéfilo com nickname '{nickname}' não foi encontrado.")

        stats = await self.repository.get_user_stats(user.id)
        favorites = await self.repository.get_top_favorites(user.id, limit=4)
        recent_reviews = await self.repository.get_recent_reviews(user.id, limit=5)

        return {
            "id": user.id,
            "nickname": user.nickname,
            "bio": user.bio,
            "avatar_url": user.avatar_url,
            "created_at": user.created_at,
            "stats": stats,
            "favorites": favorites,
            "recent_reviews": recent_reviews,
        }