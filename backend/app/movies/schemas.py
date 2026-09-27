import math
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, computed_field


class GenreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sk_genre_id: str
    nome_genero: str


class PersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sk_person_id: str
    nome_pessoa: str
    tipo_pessoa: str


class MovieBase(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=500)
    ano_lancamento: int | None = Field(None, ge=1888, le=2100)
    duracao_minutos: int | None = Field(None, ge=1)
    sinopse: str | None = Field(None, max_length=4000)
    url_poster: str | None = Field(None, max_length=2048)
    url_backdrop: str | None = Field(None, max_length=2048)
    diretor: str | None = Field(None, max_length=255)
    generos: list[str] | None = None
    genero: str | None = None


class MovieCreate(MovieBase):
    id_filme: str | None = Field(None, description="Identificador legível ou externo; se omitido, gerado automaticamente")
    data_lancamento: date | None = None
    status_filme: str | None = "Released"


class MovieUpdate(BaseModel):
    titulo: str | None = Field(None, min_length=1, max_length=500)
    ano_lancamento: int | None = Field(None, ge=1888, le=2100)
    duracao_minutos: int | None = Field(None, ge=1)
    sinopse: str | None = Field(None, max_length=4000)
    url_poster: str | None = Field(None, max_length=2048)
    url_backdrop: str | None = Field(None, max_length=2048)
    status_filme: str | None = None
    diretor: str | None = Field(None, max_length=255)
    generos: list[str] | None = None
    genero: str | None = None


class MovieSummaryResponse(BaseModel):
    """Modelo resumido para cards da listagem/catálogo."""
    model_config = ConfigDict(from_attributes=True)
    sk_movie_id: str
    id_filme: str
    titulo: str
    ano_lancamento: int | None
    duracao_minutos: int | None
    url_poster: str | None
    nota_media: float | None = None
    genres: list[GenreResponse] = []


class MovieDetailResponse(BaseModel):
    """Modelo completo para a página de detalhes de um filme."""
    model_config = ConfigDict(from_attributes=True)
    sk_movie_id: str
    id_filme: str
    titulo: str
    data_lancamento: date | None
    ano_lancamento: int | None
    duracao_minutos: int | None
    status_filme: str | None
    sinopse: str | None
    url_poster: str | None
    url_backdrop: str | None
    nota_media: float | None = None
    qtd_avaliacoes: int = 0
    genres: list[GenreResponse] = []
    people: list[PersonResponse] = []

    @computed_field
    def diretor(self) -> str | None:
        for p in self.people:
            if p.tipo_pessoa.lower() in ("diretor", "director"):
                return p.nome_pessoa
        return None

    @computed_field
    def generos(self) -> list[str]:
        return [g.nome_genero for g in self.genres]


class PaginatedMoviesResponse(BaseModel):
    items: list[MovieSummaryResponse]
    total: int
    page: int
    page_size: int

    @computed_field
    def total_pages(self) -> int:
        return math.ceil(self.total / self.page_size) if self.total > 0 else 0