import asyncio
import csv
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.movies.models import (
    FactMoviePerformance,
    MovieReview,
    bridge_movie_company,
    bridge_movie_genre,
    bridge_movie_person,
)

BASE_DIR = Path(__file__).resolve().parent.parent
BASE_DIR_2 = BASE_DIR / "data" / "bases_atv_dev_2"


def to_int(val: str | None) -> int | None:
    if not val or not val.strip():
        return None
    try:
        return int(float(val.strip()))
    except (ValueError, OverflowError):
        return None


def to_float(val: str | None) -> float | None:
    if not val or not val.strip():
        return None
    try:
        return float(val.strip())
    except ValueError:
        return None


def to_decimal(val: str | None) -> Decimal | None:
    if not val or not val.strip():
        return None
    try:
        return Decimal(val.strip())
    except Exception:
        return None


async def seed_bridge(session: AsyncSession, table: Any, filename: str, label: str) -> None:
    """Insere dados em massa para tabelas Core (bridge) usando dicionários."""
    path = BASE_DIR_2 / filename
    with open(path, mode="r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        rows = [row for row in reader]

    if rows:
        await session.execute(insert(table), rows)
    print(f"✔️ {len(rows)} registros inseridos em {label}.")


async def seed_facts_performance(session: AsyncSession) -> None:
    path = BASE_DIR_2 / "fact_movies_performance.csv"
    with open(path, mode="r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        facts = [
            FactMoviePerformance(
                sk_movie_id=row["sk_movie_id"],
                orcamento_usd=to_decimal(row.get("orcamento_usd")),
                receita_usd=to_decimal(row.get("receita_usd")),
                lucro_usd=to_decimal(row.get("lucro_usd")) or Decimal(0),
                orcamento_brl=to_decimal(row.get("orcamento_brl")),
                receita_brl=to_decimal(row.get("receita_brl")),
                lucro_brl=to_decimal(row.get("lucro_brl")) or Decimal(0),
                popularidade=to_float(row.get("popularidade")),
                nota_tmdb=to_float(row.get("nota_tmdb")),
                qtd_tmdb=to_int(row.get("qtd_tmdb")),
                nota_imdb=to_float(row.get("nota_imdb")),
                qtd_imdb=to_int(row.get("qtd_imdb")),
            )
            for row in reader
        ]
        session.add_all(facts)
        print(f"✔️ {len(facts)} métricas de performance preparadas.")


async def seed_movies_reviews(session: AsyncSession) -> None:
    path = BASE_DIR_2 / "movies_reviews.csv"
    with open(path, mode="r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        reviews = [
            MovieReview(
                sk_movie_id=row["sk_movie_id"],
                nome=row["nome"],
                nota=float(row["nota"]),
                comentario=row["comentario"],
            )
            for row in reader
        ]
        session.add_all(reviews)
        print(f"✔️ {len(reviews)} avaliações preparadas.")


async def main() -> None:
    print("Iniciando o povoamento da etapa 2...")
    async with AsyncSessionLocal() as session:
        await seed_bridge(session, bridge_movie_genre, "bridge_movie_genre.csv", "bridge_movie_genre")
        await seed_bridge(session, bridge_movie_company, "bridge_movie_company.csv", "bridge_movie_company")
        await seed_bridge(session, bridge_movie_person, "bridge_movie_person.csv", "bridge_movie_person")
        await seed_facts_performance(session)
        await seed_movies_reviews(session)
        await session.commit()
        print("🎉 Base de dados povoada")


if __name__ == "__main__":
    asyncio.run(main())