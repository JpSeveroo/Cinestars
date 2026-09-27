import { MovieFilterParams } from "@/types/movie";

export const queryKeys = {
  movies: {
    all: ["movies"] as const,
    list: (filters: MovieFilterParams) => ["movies", "list", filters] as const,
    detail: (movieId: string | number) => ["movies", "detail", movieId] as const,
  },
  tracking: {
    all: ["tracking"] as const,
    byMovie: (movieId: string | number) => ["tracking", "movie", movieId] as const,
    library: (filters: Record<string, unknown>) => ["tracking", "library", filters] as const,
  },
  reviews: {
    all: ["reviews"] as const,
    byMovie: (movieId: string | number, page: number) => ["reviews", "movie", movieId, page] as const,
    feed: (page: number) => ["reviews", "feed", page] as const,
  },
  users: {
    profile: (nickname: string) => ["users", "profile", nickname] as const,
  },
};
