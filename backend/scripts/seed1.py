import asyncio
import csv
from datetime import date
from pathlib import Path

from app.db.session import AsyncSessionLocal
from app.movies.models import DimCompany, DimGenre, DimMovie, DimPerson, DimReview

def to_int(value: str | None) -> int | None:
    return int(value) if value and value.strip() else None


def to_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value and value.strip() else None

def to_float (value: str | None) -> float | None:
    return float(value) if value and value.strip() else None

BASE_DIR = Path(__file__).resolve().parent.parent
BASE_DIR_1 = BASE_DIR / "data" / "bases_atv_dev1"

async def seed_genres(session):
    path = BASE_DIR_1 / "dim_genres.csv"
    with open(path, mode="r", encoding="utf-8") as arquivo:
        reader = csv.DictReader (arquivo)
        genres = [
            DimGenre(
                sk_genre_id=row["sk_genre_id"],
                nome_genero=row["nome_genero"],
            )
            for row in reader
        ]
        session.add_all(genres)
        print(f"✔️ {len(genres)} generos preparados.")

async def seed_movies(session):
    path = BASE_DIR_1 / "dim_movies.csv"
    with open(path, mode="r",encoding="utf-8") as arquivo:
        reader = csv.DictReader (arquivo)
        movies = [
            DimMovie(
                sk_movie_id = row["sk_movie_id"],
                id_filme = to_int(row["id_filme"]),
                titulo = row["titulo"],
                data_lancamento = to_date(row["data_lancamento"]),
                ano_lancamento = to_int(row["ano_lancamento"]),
                duracao_minutos = to_int(row["duracao_minutos"]),
                status_filme = row["status_filme"],
                sinopse = row["sinopse"],
                url_poster = row["url_poster"],
                url_backdrop = row["url_backdrop"],
            )
            for row in reader
        ]
    session.add_all(movies)
    print(f"✔️ {len(movies)} filmes preparados.")

async def seed_people(session):
    path = BASE_DIR_1/"dim_people.csv"
    with open(path,mode="r",encoding="utf-8") as arquivo:
        reader = csv.DictReader(arquivo)
        people = [
            DimPerson(
                nome_pessoa = row["nome_pessoa"],
                tipo_pessoa = row["tipo_pessoa"],
                sk_person_id = row["sk_person_id"]
            )
            for row in reader
        ]
    session.add_all(people)
    print(f"✔️ {len(people)} pessoas preparadas.")

async def seed_reviews(session):
    path = BASE_DIR_1/ "dim_reviews.csv" 
    with open(path,mode="r",encoding="utf-8") as arquivo:
        reader = csv.DictReader(arquivo)
        reviews = [
            DimReview(
                sk_review_id = row["sk_review_id"],
                sk_movie_id = row["sk_movie_id"],
                qtd_avaliacoes_usuarios = to_int(row["qtd_avaliacoes_usuarios"]),
                nota_media_usuarios = to_float(row["nota_media_usuarios"]),
            )
            for row in reader
        ]
    session.add_all(reviews)
    print(f"✔️ {len(reviews)} avaliações preparadas.")

async def seed_companies(session):
    path = BASE_DIR_1/ "dim_companies.csv"

    with open (path, mode = "r", encoding="utf-8") as arquivo:
        reader = csv.DictReader(arquivo)
        companies = [
            DimCompany(
                nome_produtora = row["nome_produtora"],
                sk_company_id = row["sk_company_id"],
            )
            for row in reader
        ]
    session.add_all(companies)
    print(f"✔️ {len(companies)} companhias preparadas.")

async def main() -> None:
    print("Iniciando o povoamento da base de dados...")
    async with AsyncSessionLocal() as session:
        await seed_genres(session)
        await seed_movies(session)
        await seed_people(session)
        await seed_reviews(session)
        await seed_companies(session)
        await session.commit()
        print("🎉 Base de dados povoada")


if __name__ == "__main__":
    asyncio.run(main())