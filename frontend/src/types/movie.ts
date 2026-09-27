export interface Genre {
  sk_genre_id: string;
  nome_genero: string;
}

export interface Person {
  sk_person_id: string;
  nome_pessoa: string;
  tipo_pessoa: string;
}

export interface MovieCardItem {
  sk_movie_id: string;
  id_filme: string;
  titulo: string;
  ano_lancamento: number | null;
  duracao_minutos?: number | null;
  url_poster: string | null;
  nota_media: number | null;
  total_avaliacoes?: number;
  qtd_avaliacoes?: number;
  genres?: Genre[];
}

export interface MovieDetail extends MovieCardItem {
  data_lancamento?: string | null;
  status_filme?: string | null;
  sinopse: string | null;
  url_backdrop?: string | null;
  people?: Person[];
}

export interface MovieFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  genre?: string;
}
