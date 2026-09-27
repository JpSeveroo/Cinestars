export const WatchStatus = {
  QUERO_ASSISTIR: "QUERO_ASSISTIR",
  ASSISTINDO: "ASSISTINDO",
  ASSISTIDO: "ASSISTIDO",
  ABANDONEI: "ABANDONEI",
} as const;

export type WatchStatusType = typeof WatchStatus[keyof typeof WatchStatus];

export interface TrackingMovieCard {
  sk_movie_id: string;
  id_filme: string;
  titulo: string;
  ano_lancamento: number | null;
  url_poster: string | null;
}

export interface UpdateTrackingPayload {
  status?: WatchStatusType | null;
  is_favorite?: boolean | null;
}

export interface TrackingResponse {
  movie_id: string;
  status: WatchStatusType | null;
  is_favorite: boolean;
  updated_at: string;
  movie?: TrackingMovieCard;
}

export interface LibraryFilterParams {
  status?: WatchStatusType;
  favorites?: boolean;
}
