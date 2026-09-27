import type { MovieCardItem } from "./movie";

export interface ProfileMovieCard {
  sk_movie_id: string;
  id_filme: string;
  titulo: string;
  ano_lancamento: number | null;
  url_poster: string | null;
}

export interface ProfileRecentReview {
  id: string;
  rating: number;
  review_text: string | null;
  has_spoilers: boolean;
  created_at: string;
  movie: ProfileMovieCard;
}

export interface ProfileStats {
  total_watched: number;
  total_watchlist: number;
  total_watching: number;
  total_dropped: number;
  total_reviews: number;
  average_user_rating: number | null;
  media_pessoal?: number | null;
  total_favorites?: number;
}

export interface PublicUserProfile {
  id: string;
  nickname: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  stats: ProfileStats;
  favorites: (ProfileMovieCard | MovieCardItem)[];
  favorite_movies?: (ProfileMovieCard | MovieCardItem)[];
  recent_reviews: ProfileRecentReview[];
}
