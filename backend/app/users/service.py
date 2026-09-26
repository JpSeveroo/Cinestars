from sqlalchemy.exc import IntegrityError
from app.core.security import create_access_token, get_password_hash, verify_password
from app.users.exceptions import InvalidCredentialsError, UserAlreadyExistsError
from app.users.models import User
from app.users.repository import UserRepository
from app.users.schemas import TokenResponse, UserCreate, UserLogin

class AuthService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

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