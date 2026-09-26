from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field
import math
from pydantic import BaseModel, computed_field

"""
    Basicamente aqui a gente trata o oque a api vai exibir de cada entidade, 
    eu diria que seria os DTO do JAVA mas com a sintaxe do python, resumindo
    temos que fazer um para cada
"""

class GenreResponse(BaseModel):
    # Permite ler dentro do proprio modelo ORM
    model_config = ConfigDict(from_attributes=True)

    sk_genre_id: str
    nome_genero: str

class PersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sk_person_id: str
    nome_pessoa: str
    tipo_pessoa: str

class ReviewCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=120, description="Nome de quem avaliou")
    nota: float = Field(..., ge=0, le=10, description="Nota de 0 a 10")
    comentario: str = Field(..., min_length=3, max_length=4000, description="Texto da resenha")


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sk_movie_review_id: str
    nome: str
    nota: float
    comentario: str
    created_at: datetime

class MovieBase(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=500)
    ano_lancamento: int | None = Field(None, ge=1888, le=2100)
    duracao_minutos: int | None = Field(None, ge=1)
    sinopse: str | None = Field(None, max_length=4000)
    url_poster: str | None = Field(None, max_length=2048)
    url_backdrop: str | None = Field(None, max_length=2048)


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
    reviews: list[ReviewResponse] = []

class PaginatedMoviesResponse(BaseModel):
    items: list[MovieSummaryResponse]
    total: int
    page: int
    page_size: int

    @computed_field
    def total_pages(self) -> int:
        return math.ceil(self.total / self.page_size) if self.total > 0 else 0