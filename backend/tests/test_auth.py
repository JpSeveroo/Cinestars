import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient):
    payload = {
        "email": "cinestars_fan@example.com",
        "nickname": "cinefilo_alpha",
        "password": "senha_segura_123",
        "bio": "Amante de cinema clássico",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["email"] == payload["email"]
    assert data["nickname"] == payload["nickname"]
    assert data["bio"] == payload["bio"]
    assert "id" in data
    assert "password" not in data  # Garante que hash/senha nunca vazam na resposta


@pytest.mark.asyncio
async def test_register_duplicate_email_or_nickname(client: AsyncClient):
    payload = {
        "email": "repetido@example.com",
        "nickname": "repetido",
        "password": "senha_segura_123",
    }
    first_res = await client.post("/api/v1/auth/register", json=payload)
    assert first_res.status_code == 201

    # Tentativa com os mesmos dados deve estourar 409 Conflict
    second_res = await client.post("/api/v1/auth/register", json=payload)
    assert second_res.status_code == 409


@pytest.mark.asyncio
async def test_hybrid_login(client: AsyncClient):
    # Registra o usuário
    payload = {
        "email": "hybrid@example.com",
        "nickname": "hybrid_user",
        "password": "senha_segura_123",
    }
    await client.post("/api/v1/auth/register", json=payload)

    # 1. Login por Nickname
    login_by_nick = await client.post(
        "/api/v1/auth/login",
        json={"login": "hybrid_user", "password": "senha_segura_123"},
    )
    assert login_by_nick.status_code == 200
    assert "access_token" in login_by_nick.json()

    # 2. Login por E-mail
    login_by_email = await client.post(
        "/api/v1/auth/login",
        json={"login": "hybrid@example.com", "password": "senha_segura_123"},
    )
    assert login_by_email.status_code == 200
    assert "access_token" in login_by_email.json()


@pytest.mark.asyncio
async def test_get_current_user_me(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["nickname"] == "cinefilo_tester"


@pytest.mark.asyncio
async def test_register_avatar_url_max_length_validation(client: AsyncClient):
    payload = {
        "email": "avatar_overflow@example.com",
        "nickname": "overflow_user",
        "password": "senha_segura_123",
        "avatar_url": "https://example.com/" + "a" * 500,
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422