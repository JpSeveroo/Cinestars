from app.db.base import Base
from app.movies import models  # noqa: F401  Registra os modelos ORM.
import app.users.models  # noqa: F401
import app.tracking.models  # noqa: F401
import app.reviews.models  # noqa: F401


def test_movie_schema_registers_expected_tables() -> None:
    expected_tables = {
        # Tabelas analíticas do catálogo
        "bridge_movie_company",
        "bridge_movie_genre",
        "bridge_movie_person",
        "dim_companies",
        "dim_genres",
        "dim_movies",
        "dim_people",
        "dim_reviews",
        "fact_movies_performance",
        "movie_reviews",
        # Tabelas da plataforma social
        "users",
        "user_movie_tracking",
        "user_reviews",
    }

    assert set(Base.metadata.tables) == expected_tables
    assert "idioma_original" not in Base.metadata.tables["dim_movies"].columns


def test_movie_review_columns_match_shared_csv() -> None:
    table = Base.metadata.tables["movie_reviews"]

    assert {"sk_movie_review_id", "sk_movie_id", "nome", "nota", "comentario"} <= set(
        table.columns.keys()
    )
    assert table.primary_key.columns.keys() == ["sk_movie_review_id"]