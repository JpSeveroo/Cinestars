import pytest
from httpx import AsyncClient

from app.movies.models import DimMovie


@pytest.mark.asyncio
async def test_get_public_profile_with_stats(
    client: AsyncClient, auth_headers: dict, sample_movie: DimMovie
):
    # Favorita o filme
    await client.put(
        f"/api/v1/movies/{sample_movie.id_filme}/status",
        headers=auth_headers,
        json={"status": "ASSISTIDO", "is_favorite": True},
    )
    # Avalia o filme
    await client.post(
        f"/api/v1/movies/{sample_movie.id_filme}/reviews",
        headers=auth_headers,
        json={"rating": 5.0, "review_text": "Incrível!"},
    )

    # Consulta perfil público (rota pública /api/v1/users/{nickname})
    res = await client.get("/api/v1/users/cinefilo_tester")
    assert res.status_code == 200
    data = res.json()

    assert data["nickname"] == "cinefilo_tester"
    assert data["stats"]["total_watched"] == 1
    assert data["stats"]["total_reviews"] == 1
    assert data["stats"]["average_user_rating"] == 5.0
    assert len(data["favorites"]) == 1
    assert data["favorites"][0]["id_filme"] == sample_movie.id_filme
    assert len(data["recent_reviews"]) == 1


@pytest.mark.asyncio
async def test_global_community_feed(
    client: AsyncClient, auth_headers: dict, sample_movie: DimMovie
):
    # Publica uma review
    await client.post(
        f"/api/v1/movies/{sample_movie.id_filme}/reviews",
        headers=auth_headers,
        json={"rating": 4.0, "review_text": "Muito divertido!"},
    )

    # Consulta feed global da comunidade (rota pública /api/v1/feed)
    res = await client.get("/api/v1/feed?page=1&per_page=10")
    assert res.status_code == 200
    feed_data = res.json()

    assert feed_data["total"] >= 1
    assert feed_data["total_pages"] >= 1
    assert feed_data["items"][0]["movie"]["id_filme"] == sample_movie.id_filme
    assert feed_data["items"][0]["user"]["nickname"] == "cinefilo_tester"