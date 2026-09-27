import pytest
from httpx import AsyncClient

from app.movies.models import DimMovie


@pytest.mark.asyncio
async def test_create_review_and_auto_mark_watched(
    client: AsyncClient, auth_headers: dict, sample_movie: DimMovie
):
    # 1. Publica review com nota de 4.5 estrelas
    review_payload = {
        "rating": 4.5,
        "review_text": "Filme formidável, aventura pura!",
        "has_spoilers": False,
    }
    create_res = await client.post(
        f"/api/v1/movies/{sample_movie.id_filme}/reviews",
        headers=auth_headers,
        json=review_payload,
    )
    assert create_res.status_code == 201
    data = create_res.json()
    assert data["rating"] == 4.5
    assert data["user"]["nickname"] == "cinefilo_tester"

    # 2. Valida a regra de negócio do Letterboxd: o filme virou ASSISTIDO automaticamente
    tracking_res = await client.get(
        f"/api/v1/movies/{sample_movie.id_filme}/my-status",
        headers=auth_headers,
    )
    assert tracking_res.status_code == 200
    assert tracking_res.json()["status"] == "ASSISTIDO"


@pytest.mark.asyncio
async def test_review_validation_half_star(
    client: AsyncClient, auth_headers: dict, sample_movie: DimMovie
):
    # Nota inválida (4.3 não é múltiplo de 0.5)
    invalid_payload = {
        "rating": 4.3,
        "review_text": "Nota fora do padrão",
    }
    response = await client.post(
        f"/api/v1/movies/{sample_movie.id_filme}/reviews",
        headers=auth_headers,
        json=invalid_payload,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_delete_review_lifecycle(
    client: AsyncClient, auth_headers: dict, sample_movie: DimMovie
):
    # Cria review
    await client.post(
        f"/api/v1/movies/{sample_movie.id_filme}/reviews",
        headers=auth_headers,
        json={"rating": 5.0, "review_text": "Obra-prima!"},
    )

    # Deleta com sucesso (204 No Content)
    del_res = await client.delete(
        f"/api/v1/movies/{sample_movie.id_filme}/reviews",
        headers=auth_headers,
    )
    assert del_res.status_code == 204

    # Deletar novamente deve retornar 404
    del_again = await client.delete(
        f"/api/v1/movies/{sample_movie.id_filme}/reviews",
        headers=auth_headers,
    )
    assert del_again.status_code == 404