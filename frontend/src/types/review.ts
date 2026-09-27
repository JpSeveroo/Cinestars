export interface ReviewAuthor {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

export interface ReviewItem {
  id: string;
  movie_id: string;
  rating: number; // Intervalos de 0.5 (0.5 a 5.0)
  review_text: string | null;
  has_spoilers: boolean;
  created_at: string;
  updated_at: string;
  user: ReviewAuthor;
}

export interface MovieReviewListResponse {
  items: ReviewItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  average_community_rating: number | null;
}

export interface FeedMovieCard {
  sk_movie_id: string;
  id_filme: string;
  titulo: string;
  ano_lancamento: number | null;
  url_poster: string | null;
}

export interface FeedItemResponse {
  id: string;
  rating: number;
  review_text: string | null;
  has_spoilers: boolean;
  created_at: string;
  user: ReviewAuthor;
  movie: FeedMovieCard;
}

export interface PaginatedFeedResponse {
  items: FeedItemResponse[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CreateReviewPayload {
  rating: number; // Validação: 0.5 <= rating <= 5.0 e rating % 0.5 === 0
  review_text?: string | null;
  has_spoilers?: boolean;
}
