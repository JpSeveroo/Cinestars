from collections.abc import Sequence

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.movies.models import DimMovie, DimReview, MovieReview
from app.movies.schemas import MovieCreate, MovieUpdate, ReviewCreate


class MovieRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_paginated(
        self,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
    ) -> tuple[Sequence[DimMovie], int]:
        """Retorna filmes com carregamento antecipado de géneros e resumo de notas."""

        count_stmt = select(func.count(DimMovie.sk_movie_id))
        stmt = (
            select(DimMovie)
            .options(
                selectinload(DimMovie.genres),
                selectinload(DimMovie.reviews_summary),
            )
            .order_by(DimMovie.ano_lancamento.desc().nullslast(), DimMovie.titulo.asc())
        )

        if search:
            escaped_search = (
                search.strip()
                .replace("\\", "\\\\")
                .replace("%", r"\%")
                .replace("_", r"\_")
            )
            search_filter = DimMovie.titulo.ilike(f"%{escaped_search}%")
            count_stmt = count_stmt.where(search_filter)
            stmt = stmt.where(search_filter)

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        movies = result.scalars().all()

        return movies, total

    async def get_by_id(self, movie_id: str) -> DimMovie | None:
        """Carrega o filme e todas as entidades associadas sem consultas fragmentadas."""

        stmt = (
            select(DimMovie)
            .where(
                or_(
                    DimMovie.sk_movie_id == movie_id,
                    DimMovie.id_filme == movie_id,
                )
            )
            .options(
                selectinload(DimMovie.genres),
                selectinload(DimMovie.people),
                selectinload(DimMovie.reviews),
                selectinload(DimMovie.reviews_summary),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, movie_in: MovieCreate) -> DimMovie:
        db_movie = DimMovie(
            id_filme=movie_in.id_filme,
            titulo=movie_in.titulo,
            data_lancamento=movie_in.data_lancamento,
            ano_lancamento=movie_in.ano_lancamento,
            duracao_minutos=movie_in.duracao_minutos,
            status_filme=movie_in.status_filme,
            sinopse=movie_in.sinopse,
            url_poster=movie_in.url_poster,
            url_backdrop=movie_in.url_backdrop,
        )
        self.db.add(db_movie)
        await self.db.flush()
        return db_movie

    async def update(self, db_movie: DimMovie, movie_in: MovieUpdate) -> DimMovie:
        update_data = movie_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_movie, field, value)

        await self.db.flush()
        return db_movie

    async def delete(self, db_movie: DimMovie) -> None:
        await self.db.delete(db_movie)
        await self.db.flush()


class ReviewRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_and_sync_metrics(
        self,
        movie_sk_id: str,
        review_in: ReviewCreate,
    ) -> MovieReview:
        """Insere a avaliação e sincroniza a nota média e quantidade na tabela DimReview."""

        # 1. Cria a avaliação individual
        db_review = MovieReview(
            sk_movie_id=movie_sk_id,
            nome=review_in.nome or "Administrador",
            nota=review_in.nota,
            comentario=review_in.comentario,
        )
        self.db.add(db_review)
        await self.db.flush()

        stats_stmt = select(
            func.count(MovieReview.sk_movie_review_id),
            func.avg(MovieReview.nota),
        ).where(MovieReview.sk_movie_id == movie_sk_id)

        stats_res = await self.db.execute(stats_stmt)
        total_reviews, avg_rating = stats_res.one()

        review_summary_stmt = select(DimReview).where(
            DimReview.sk_movie_id == movie_sk_id
        )
        summary_res = await self.db.execute(review_summary_stmt)
        summary = summary_res.scalar_one_or_none()

        if not summary:
            summary = DimReview(sk_movie_id=movie_sk_id)
            self.db.add(summary)

        summary.qtd_avaliacoes_usuarios = total_reviews
        summary.nota_media_usuarios = round(float(avg_rating), 2) if avg_rating else None

        await self.db.flush()
        return db_review