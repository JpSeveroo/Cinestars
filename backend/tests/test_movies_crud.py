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
    movie_id = movie_data["sk_movie_id"]

    # 2. Leitura do filme criado
    get_res = await client.get(f"/api/v1/movies/{movie_id}")
    assert get_res.status_code == 200
    assert get_res.json()["titulo"] == "O Poderoso Chefão"

    # 3. Atualização do filme
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

    # 4. Remoção do filme
    del_res = await client.delete(
        f"/api/v1/movies/{movie_id}",
        headers=auth_headers,
    )
    assert del_res.status_code == 204

    # 5. Confirmação que não existe mais
    not_found_res = await client.get(f"/api/v1/movies/{movie_id}")
    assert not_found_res.status_code == 404
