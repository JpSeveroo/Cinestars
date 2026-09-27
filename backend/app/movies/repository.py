import uuid
from collections.abc import Sequence

from sqlalchemy import func, or_, select, insert, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.movies.models import (
    DimGenre,
    DimMovie,
    DimPerson,
    bridge_movie_genre,
    bridge_movie_person,
)
from app.movies.schemas import MovieCreate, MovieUpdate


class MovieRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_paginated(
        self,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        genre: str | None = None,
    ) -> tuple[Sequence[DimMovie], int]:
        """Retorna filmes com carregamento antecipado de gêneros e resumo de notas."""
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
            search_filter = DimMovie.titulo.ilike(f"%{escaped_search}%", escape="\\")
            count_stmt = count_stmt.where(search_filter)
            stmt = stmt.where(search_filter)

        if genre:
            genre_filter = DimMovie.genres.any(func.lower(DimGenre.nome_genero) == genre.strip().lower())
            count_stmt = count_stmt.where(genre_filter)
            stmt = stmt.where(genre_filter)

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
                selectinload(DimMovie.reviews_summary),
            )
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, movie_in: MovieCreate) -> DimMovie:
        id_filme = movie_in.id_filme
        if not id_filme:
            id_filme = f"movie_{uuid.uuid4().hex[:10]}"

        db_movie = DimMovie(
            id_filme=id_filme,
            titulo=movie_in.titulo,
            data_lancamento=movie_in.data_lancamento,
            ano_lancamento=movie_in.ano_lancamento,
            duracao_minutos=movie_in.duracao_minutos,
            status_filme=movie_in.status_filme or "Released",
            sinopse=movie_in.sinopse,
            url_poster=movie_in.url_poster,
            url_backdrop=movie_in.url_backdrop,
        )
        self.db.add(db_movie)
        await self.db.flush()

        # Trata diretor
        if movie_in.diretor:
            clean_diretor = movie_in.diretor.strip()
            if clean_diretor:
                person_stmt = select(DimPerson).where(
                    DimPerson.nome_pessoa == clean_diretor,
                    DimPerson.tipo_pessoa == "Diretor",
                )
                res = await self.db.execute(person_stmt)
                person = res.scalar_one_or_none()
                if not person:
                    person = DimPerson(
                        nome_pessoa=clean_diretor,
                        tipo_pessoa="Diretor",
                    )
                    self.db.add(person)
                    await self.db.flush()

                await self.db.execute(
                    insert(bridge_movie_person).values(
                        sk_movie_id=db_movie.sk_movie_id,
                        sk_person_id=person.sk_person_id,
                    )
                )

        # Trata gêneros
        genre_names: list[str] = []
        if movie_in.generos:
            genre_names.extend(movie_in.generos)
        if getattr(movie_in, "genero", None):
            genre_names.append(movie_in.genero)

        for g_name in genre_names:
            clean_g = g_name.strip()
            if clean_g:
                genre_stmt = select(DimGenre).where(func.lower(DimGenre.nome_genero) == clean_g.lower())
                res = await self.db.execute(genre_stmt)
                genre_obj = res.scalar_one_or_none()
                if not genre_obj:
                    genre_obj = DimGenre(nome_genero=clean_g)
                    self.db.add(genre_obj)
                    await self.db.flush()

                chk = select(bridge_movie_genre).where(
                    bridge_movie_genre.c.sk_movie_id == db_movie.sk_movie_id,
                    bridge_movie_genre.c.sk_genre_id == genre_obj.sk_genre_id,
                )
                if not (await self.db.execute(chk)).first():
                    await self.db.execute(
                        insert(bridge_movie_genre).values(
                            sk_movie_id=db_movie.sk_movie_id,
                            sk_genre_id=genre_obj.sk_genre_id,
                        )
                    )

        movie_id = str(db_movie.sk_movie_id)
        await self.db.commit()
        return await self.get_by_id(movie_id)

    async def update(self, db_movie: DimMovie, movie_in: MovieUpdate) -> DimMovie:
        update_data = movie_in.model_dump(exclude_unset=True)

        movie_fields = [
            "titulo", "ano_lancamento", "duracao_minutos", "sinopse",
            "url_poster", "url_backdrop", "status_filme"
        ]
        for field in movie_fields:
            if field in update_data:
                setattr(db_movie, field, update_data[field])

        # Se diretor foi atualizado
        if "diretor" in update_data:
            diretor_nome = update_data["diretor"]
            del_dir_stmt = delete(bridge_movie_person).where(
                bridge_movie_person.c.sk_movie_id == db_movie.sk_movie_id,
                bridge_movie_person.c.sk_person_id.in_(
                    select(DimPerson.sk_person_id).where(DimPerson.tipo_pessoa == "Diretor")
                ),
            )
            await self.db.execute(del_dir_stmt)

            if diretor_nome and diretor_nome.strip():
                clean_diretor = diretor_nome.strip()
                person_stmt = select(DimPerson).where(
                    DimPerson.nome_pessoa == clean_diretor,
                    DimPerson.tipo_pessoa == "Diretor",
                )
                res = await self.db.execute(person_stmt)
                person = res.scalar_one_or_none()
                if not person:
                    person = DimPerson(
                        nome_pessoa=clean_diretor,
                        tipo_pessoa="Diretor",
                    )
                    self.db.add(person)
                    await self.db.flush()

                await self.db.execute(
                    insert(bridge_movie_person).values(
                        sk_movie_id=db_movie.sk_movie_id,
                        sk_person_id=person.sk_person_id,
                    )
                )

        # Se gêneros foram atualizados
        genre_list = None
        if "generos" in update_data:
            genre_list = update_data["generos"] or []
        elif "genero" in update_data and update_data["genero"]:
            genre_list = [update_data["genero"]]

        if genre_list is not None:
            del_gen_stmt = delete(bridge_movie_genre).where(
                bridge_movie_genre.c.sk_movie_id == db_movie.sk_movie_id
            )
            await self.db.execute(del_gen_stmt)

            for g_name in genre_list:
                clean_g = g_name.strip()
                if clean_g:
                    genre_stmt = select(DimGenre).where(func.lower(DimGenre.nome_genero) == clean_g.lower())
                    res = await self.db.execute(genre_stmt)
                    genre_obj = res.scalar_one_or_none()
                    if not genre_obj:
                        genre_obj = DimGenre(nome_genero=clean_g)
                        self.db.add(genre_obj)
                        await self.db.flush()

                    chk = select(bridge_movie_genre).where(
                        bridge_movie_genre.c.sk_movie_id == db_movie.sk_movie_id,
                        bridge_movie_genre.c.sk_genre_id == genre_obj.sk_genre_id,
                    )
                    if not (await self.db.execute(chk)).first():
                        await self.db.execute(
                            insert(bridge_movie_genre).values(
                                sk_movie_id=db_movie.sk_movie_id,
                                sk_genre_id=genre_obj.sk_genre_id,
                            )
                        )

        movie_id = str(db_movie.sk_movie_id)
        self.db.add(db_movie)
        await self.db.commit()
        return await self.get_by_id(movie_id)

    async def delete(self, db_movie: DimMovie) -> None:
        await self.db.delete(db_movie)
        await self.db.commit()