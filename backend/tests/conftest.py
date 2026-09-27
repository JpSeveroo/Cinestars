from collections.abc import AsyncGenerator
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.movies.models import DimMovie

# Importa todos os modelos para o SQLAlchemy registrar todas as tabelas em Base.metadata
import app.movies.models  # noqa: F401
import app.reviews.models  # noqa: F401
import app.tracking.models  # noqa: F401
import app.users.models  # noqa: F401

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(autouse=True)
async def setup_database():
    """Cria todas as tabelas antes de cada teste e limpa após o término."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Fornece uma sessão assíncrona isolada para manipular dados de fixtures."""
    async with TestingSessionLocal() as session:
        yield session


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Cliente HTTP de teste que intercepta requisições e usa o banco em memória."""
    app = create_app()

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def sample_movie(db_session: AsyncSession) -> DimMovie:
    """Cria um filme inicial no banco em memória para servir de cobaia nos testes."""
    movie = DimMovie(
        sk_movie_id="hash_teste_indiana_jones_123456",
        id_filme="1227249",
        titulo="Indiana Jones de Teste",
        ano_lancamento=1981,
    )
    db_session.add(movie)
    await db_session.commit()
    await db_session.refresh(movie)
    return movie


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    """Registra um usuário padrão, faz login e devolve os headers prontos com Bearer Token."""
    register_payload = {
        "email": "tester@example.com",
        "nickname": "cinefilo_tester",
        "password": "senha_segura_123",
        "bio": "Testador oficial do CineStars",
    }
    await client.post("/api/v1/auth/register", json=register_payload)

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"login": "cinefilo_tester", "password": "senha_segura_123"},
    )
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}