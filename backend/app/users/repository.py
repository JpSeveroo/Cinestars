from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.models import User
from app.users.schemas import UserCreate


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_nickname(self, nickname: str) -> User | None:
        result = await self.db.execute(select(User).where(User.nickname == nickname))
        return result.scalar_one_or_none()

    async def get_by_login(self, identifier: str) -> User | None:
        """Busca o usuário por email OU nickname."""
        stmt = select(User).where(
            or_(User.email == identifier, User.nickname == identifier)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, user_in: UserCreate, hashed_password: str) -> User:
        user = User(
            email=user_in.email,
            nickname=user_in.nickname,
            hashed_password=hashed_password,
            avatar_url=user_in.avatar_url,
            bio=user_in.bio,
            is_admin=False,
        )
        self.db.add(user)
        await self.db.flush()
        return user