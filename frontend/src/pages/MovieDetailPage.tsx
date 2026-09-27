import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Film,
  ArrowLeft,
  Clock,
  Calendar,
  AlertCircle,
  Eye,
  EyeOff,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StarRating } from "@/components/shared/StarRating";
import { TrackingActions } from "@/components/shared/TrackingActions";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { MovieDetail } from "@/types/movie";
import type { MovieReviewListResponse, ReviewItem } from "@/types/review";

export const MovieDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const movieId = id || "";
  const [reviewsPage, setReviewsPage] = useState(1);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  // 1. Consulta dos detalhes do filme
  const {
    data: movie,
    isLoading: isLoadingMovie,
    isError: isErrorMovie,
  } = useQuery<MovieDetail>({
    queryKey: queryKeys.movies.detail(movieId),
    queryFn: async () => {
      const response = await api.get<MovieDetail>(`/movies/${movieId}`);
      return response.data;
    },
    enabled: Boolean(movieId),
  });

  // 2. Consulta das avaliações da comunidade
  const {
    data: reviewsData,
    isLoading: isLoadingReviews,
  } = useQuery<MovieReviewListResponse>({
    queryKey: ["reviews", "movie", movieId, reviewsPage],
    queryFn: async () => {
      const response = await api.get<MovieReviewListResponse>(`/movies/${movieId}/reviews`, {
        params: {
          page: reviewsPage,
          per_page: 10,
        },
      });
      return response.data;
    },
    enabled: Boolean(movieId),
  });

  const toggleSpoiler = (reviewId: string) => {
    setRevealedSpoilers((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  if (isErrorMovie) {
    return (
      <div className="rounded-[10px] bg-card border border-danger/40 p-12 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-14 h-14 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-text font-serif">Filme não encontrado</h2>
          <p className="text-xs text-muted">
            A obra que você tentou acessar não foi localizada no catálogo do CineStars.
          </p>
        </div>
        <Link to="/movies">
          <Button variant="primary" size="sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Catálogo</span>
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoadingMovie) {
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton variant="text" className="w-32 h-6" />
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <Skeleton variant="poster" className="w-full md:w-64 max-w-[280px]" />
          <div className="flex-1 space-y-4 w-full">
            <Skeleton variant="text" className="w-3/4 h-10" />
            <Skeleton variant="text" className="w-1/3 h-5" />
            <Skeleton variant="text" className="w-full h-24" />
            <Skeleton variant="rectangular" className="w-full h-14" />
          </div>
        </div>
      </div>
    );
  }

  if (!movie) return null;

  const reviews = reviewsData?.items || [];
  const totalReviews = reviewsData?.total || 0;
  const directors = movie.people?.filter((p) => p.tipo_pessoa.toLowerCase() === "director") || [];
  const actors = movie.people?.filter((p) => p.tipo_pessoa.toLowerCase() === "actor").slice(0, 5) || [];

  return (
    <div className="space-y-10">
      {/* Botão Voltar */}
      <div>
        <Link
          to="/movies"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Catálogo</span>
        </Link>
      </div>

      {/* Backdrop Opcional */}
      {movie.url_backdrop && (
        <div className="relative -mt-6 -mx-4 sm:-mx-6 h-48 sm:h-72 overflow-hidden rounded-b-[12px] border-b border-line">
          <img
            src={movie.url_backdrop}
            alt={`Cena de ${movie.titulo}`}
            className="w-full h-full object-cover opacity-25 filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
        </div>
      )}

      {/* Cabeçalho da Ficha Técnica */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Pôster */}
        <div className="w-48 sm:w-64 flex-shrink-0 mx-auto md:mx-0">
          <div className="aspect-[2/3] w-full rounded-[8px] border border-line bg-card overflow-hidden shadow-2xl">
            {movie.url_poster ? (
              <img
                src={movie.url_poster}
                alt={`Pôster de ${movie.titulo}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-bg2 text-line">
                <Film className="w-12 h-12 stroke-line" />
                <span className="text-xs text-muted mt-2 text-center">{movie.titulo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Informações Principais */}
        <div className="flex-1 space-y-5 text-left w-full">
          <div className="space-y-1.5">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-text leading-tight">
              {movie.titulo}{" "}
              {movie.ano_lancamento && (
                <span className="text-muted font-normal text-2xl sm:text-3xl">
                  ({movie.ano_lancamento})
                </span>
              )}
            </h1>

            {/* Metadados: Duração, Data e Direção */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
              {movie.duracao_minutos && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gold" />
                  <span>{movie.duracao_minutos} min</span>
                </div>
              )}
              {movie.data_lancamento && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted" />
                  <span>{new Date(movie.data_lancamento).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              {directors.length > 0 && (
                <div>
                  <span className="text-muted/70">Direção: </span>
                  <span className="text-text font-medium">
                    {directors.map((d) => d.nome_pessoa).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Gêneros */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {movie.genres.map((g) => (
                <Badge key={g.sk_genre_id} variant="genre" size="sm">
                  {g.nome_genero}
                </Badge>
              ))}
            </div>
          )}

          {/* Placar de Avaliação da Comunidade */}
          <div className="flex items-center gap-3 p-3.5 rounded-[8px] bg-bg2 border border-line w-fit">
            <div className="text-center pr-3 border-r border-line">
              <span className="font-serif text-2xl font-semibold text-gold block leading-none">
                {movie.nota_media ? (movie.nota_media / 2).toFixed(1) : "—"}
              </span>
              <span className="text-[0.7rem] text-muted block mt-1">escala 5★</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <StarRating
                  rating={movie.nota_media || 0}
                  scale={10}
                  size="md"
                />
                <span className="text-xs font-medium text-text">
                  {movie.nota_media ? `${movie.nota_media.toFixed(1)} / 10` : "Sem notas"}
                </span>
              </div>
              <p className="text-[0.72rem] text-muted">
                Baseado em <b className="text-text">{movie.qtd_avaliacoes || 0}</b> avaliações da comunidade
              </p>
            </div>
          </div>

          {/* Sinopse */}
          {movie.sinopse && (
            <div className="space-y-1.5 pt-1">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Sinopse
              </h2>
              <p className="text-text-body text-[0.92rem] leading-relaxed max-w-[60ch]">
                {movie.sinopse}
              </p>
            </div>
          )}

          {/* Elenco Principal */}
          {actors.length > 0 && (
            <div className="space-y-1 pt-1">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Elenco em destaque
              </h2>
              <p className="text-xs text-text-body">
                {actors.map((a) => a.nome_pessoa).join(" • ")}
              </p>
            </div>
          )}

          {/* Ações de Tracking do Usuário */}
          <div className="pt-2">
            <TrackingActions movieId={movie.sk_movie_id} movieTitle={movie.titulo} />
          </div>
        </div>
      </div>

      {/* Divisor */}
      <div className="border-t border-line" />

      {/* Seção de Resenhas da Comunidade */}
      <section className="space-y-6 text-left">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-text flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gold" />
              <span>Resenhas da Comunidade</span>
            </h2>
            <p className="text-xs text-muted">
              Opiniões e diários de cinéfilos sobre esta obra.
            </p>
          </div>
          <span className="text-xs text-muted">
            Total: <b className="text-text">{totalReviews}</b>
          </span>
        </div>

        {isLoadingReviews ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-[8px] bg-card border border-line space-y-2">
                <Skeleton variant="text" className="w-1/4 h-4" />
                <Skeleton variant="text" className="w-full h-12" />
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review: ReviewItem) => {
              const isSpoiled = review.has_spoilers;
              const isRevealed = Boolean(revealedSpoilers[review.id]);

              return (
                <article
                  key={review.id}
                  className="p-5 rounded-[10px] bg-card border border-line space-y-3 transition-colors hover:border-line/80"
                >
                  {/* Cabeçalho da Review */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      {review.user.avatar_url ? (
                        <img
                          src={review.user.avatar_url}
                          alt={review.user.nickname}
                          className="w-8 h-8 rounded-full object-cover border border-gold/40"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-bg2 border border-line text-gold flex items-center justify-center font-serif text-xs font-semibold">
                          {review.user.nickname.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <Link
                          to={`/users/${review.user.nickname}`}
                          className="text-xs font-semibold text-text hover:text-gold transition-colors"
                        >
                          @{review.user.nickname}
                        </Link>
                        <span className="text-[0.72rem] text-muted block">
                          {new Date(review.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} scale={5} size="sm" showValue />
                      {isSpoiled && (
                        <Badge variant="spoiler" size="sm">
                          Spoiler
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Texto da Resenha com suporte a Spoiler Blur */}
                  {review.review_text && (
                    <div className="space-y-2">
                      {isSpoiled && !isRevealed ? (
                        <div className="p-3 rounded-[8px] bg-bg2 border border-line/60 flex items-center justify-between">
                          <span className="text-xs text-muted italic">
                            Esta resenha contém detalhes da trama ocultados por spoiler.
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSpoiler(review.id)}
                            className="text-xs text-gold hover:text-gold/80"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Revelar resenha</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <p className="text-text-body text-[0.88rem] leading-relaxed whitespace-pre-line">
                            {review.review_text}
                          </p>
                          {isSpoiled && isRevealed && (
                            <button
                              type="button"
                              onClick={() => toggleSpoiler(review.id)}
                              className="text-[0.75rem] text-muted hover:text-text flex items-center gap-1 mt-2 transition-colors"
                            >
                              <EyeOff className="w-3 h-3" />
                              <span>Ocultar novamente</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {/* Paginação das Resenhas */}
            {reviewsData && reviewsData.total_pages > 1 && (
              <div className="pt-4 flex items-center justify-between border-t border-line text-xs text-muted">
                <span>
                  Página <b>{reviewsPage}</b> de <b>{reviewsData.total_pages}</b>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={reviewsPage <= 1}
                    onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={reviewsPage >= reviewsData.total_pages}
                    onClick={() => setReviewsPage((p) => p + 1)}
                  >
                    <span>Próxima</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 rounded-[10px] bg-card border border-line text-center space-y-2 max-w-lg mx-auto">
            <MessageSquare className="w-8 h-8 text-muted mx-auto" />
            <p className="text-sm font-semibold text-text">Nenhuma resenha ainda</p>
            <p className="text-xs text-muted">
              Seja o primeiro a escrever uma crítica e compartilhar seus pensamentos sobre esta obra.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
