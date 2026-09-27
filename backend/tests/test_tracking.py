import pytest
from httpx import AsyncClient

from app.movies.models import DimMovie


@pytest.mark.asyncio
async def test_update_movie_status_and_read(
    client: AsyncClient, auth_headers: dict, sample_movie: DimMovie
):
    # 1. Altera status usando o ID amigável '1227249'
    update_res = await client.put(
        f"/api/v1/movies/{sample_movie.id_filme}/status",
        headers=auth_headers,
        json={"status": "ASSISTINDO", "is_favorite": True},
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "ASSISTINDO"
    assert update_res.json()["is_favorite"] is True

    # 2. Consulta o status individual
    get_res = await client.get(
        f"/api/v1/movies/{sample_movie.id_filme}/my-status",
        headers=auth_headers,
    )
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "ASSISTINDO"
    assert get_res.json()["is_favorite"] is True


@pytest.mark.asyncio
async def test_filter_library(
    client: AsyncClient, auth_headers: dict, sample_movie: DimMovie
):
    # Marca como QUERO_ASSISTIR
    await client.put(
        f"/api/v1/movies/{sample_movie.id_filme}/status",
        headers=auth_headers,
        json={"status": "QUERO_ASSISTIR", "is_favorite": False},
    )

    # Filtro que deve encontrar o filme
    res_found = await client.get(
        "/api/v1/movies/me/library?status=QUERO_ASSISTIR",
        headers=auth_headers,
    )
    assert res_found.status_code == 200
    assert len(res_found.json()) == 1
    assert res_found.json()[0]["movie"]["titulo"] == sample_movie.titulo

    # Filtro que NÃO deve encontrar o filme
    res_empty = await client.get(
        "/api/v1/movies/me/library?status=ABANDONEI",
        headers=auth_headers,
    )
    assert res_empty.status_code == 200
    assert len(res_empty.json()) == 0