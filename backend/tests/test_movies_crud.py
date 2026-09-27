import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_movie_lifecycle(client: AsyncClient, auth_headers: dict):
    # 1. Criação do filme
    payload = {
        "titulo": "O Poderoso Chefão",
        "diretor": "Francis Ford Coppola",
        "ano_lancamento": 1972,
        "generos": ["Crime", "Drama"],
        "sinopse": "O patriarca idoso de uma dinastia do crime organizado transfere o controle de seu império clandestino para seu filho relutante.",
        "url_poster": "https://image.tmdb.org/t/p/w500/godfather.jpg",
    }
    create_res = await client.post(
        "/api/v1/movies",
        headers=auth_headers,
        json=payload,
    )
    assert create_res.status_code == 201
    movie_data = create_res.json()
    assert movie_data["titulo"] == "O Poderoso Chefão"
    assert movie_data["ano_lancamento"] == 1972
    assert movie_data["diretor"] == "Francis Ford Coppola"
    assert "Crime" in movie_data["generos"]
    assert movie_data["created_by_user_id"] is not None
    movie_id = movie_data["sk_movie_id"]

    # 2. Leitura do filme criado
    get_res = await client.get(f"/api/v1/movies/{movie_id}")
    assert get_res.status_code == 200
    assert get_res.json()["titulo"] == "O Poderoso Chefão"
    assert get_res.json()["created_by_user_id"] == movie_data["created_by_user_id"]

    # 3. Atualização do filme pelo proprietário
    update_payload = {
        "titulo": "O Poderoso Chefão - Versão Restaurada",
        "ano_lancamento": 1972,
        "diretor": "Francis Ford Coppola",
        "generos": ["Crime", "Drama", "Clássico"],
    }
    put_res = await client.put(
        f"/api/v1/movies/{movie_id}",
        headers=auth_headers,
        json=update_payload,
    )
    assert put_res.status_code == 200
    assert put_res.json()["titulo"] == "O Poderoso Chefão - Versão Restaurada"
    assert "Clássico" in put_res.json()["generos"]

    # 4. Remoção do filme pelo proprietário
    del_res = await client.delete(
        f"/api/v1/movies/{movie_id}",
        headers=auth_headers,
    )
    assert del_res.status_code == 204

    # 5. Confirmação que não existe mais
    not_found_res = await client.get(f"/api/v1/movies/{movie_id}")
    assert not_found_res.status_code == 404


@pytest.mark.asyncio
async def test_movie_ownership_restrictions(client: AsyncClient, auth_headers: dict, sample_movie):
    # Cadastra filme com o usuário 1
    create_res = await client.post(
        "/api/v1/movies",
        headers=auth_headers,
        json={"titulo": "Filme Privado do Usuário 1", "ano_lancamento": 2020},
    )
    assert create_res.status_code == 201
    movie_id = create_res.json()["sk_movie_id"]

    # Registra e loga um segundo usuário
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "hacker@example.com",
            "nickname": "invasor",
            "password": "senha_invasor_123",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"login": "invasor", "password": "senha_invasor_123"},
    )
    other_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Tentativa de atualizar filme de outro usuário deve dar 403 Forbidden
    put_other = await client.put(
        f"/api/v1/movies/{movie_id}",
        headers=other_headers,
        json={"titulo": "Tentativa Hacker de Renomear"},
    )
    assert put_other.status_code == 403
    assert "Você não tem permissão" in put_other.json()["detail"]

    # Tentativa de excluir filme de outro usuário deve dar 403 Forbidden
    del_other = await client.delete(
        f"/api/v1/movies/{movie_id}",
        headers=other_headers,
    )
    assert del_other.status_code == 403
    assert "Você não tem permissão" in del_other.json()["detail"]

    # Tentativa de editar/excluir filme legado do acervo (sem created_by_user_id) deve dar 403
    put_legacy = await client.put(
        f"/api/v1/movies/{sample_movie.sk_movie_id}",
        headers=auth_headers,
        json={"titulo": "Tentativa de Alterar Obra Legada"},
    )
    assert put_legacy.status_code == 403

    del_legacy = await client.delete(
        f"/api/v1/movies/{sample_movie.sk_movie_id}",
        headers=auth_headers,
    )
    assert del_legacy.status_code == 403
