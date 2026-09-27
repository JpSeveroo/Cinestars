import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Film,
  Sparkles,
  BookOpen,
  Star,
  ArrowRight,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { MovieCard } from "@/components/shared/MovieCard";
import { StarRating } from "@/components/shared/StarRating";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { PaginatedResponse } from "@/types/common";
import type { MovieCardItem } from "@/types/movie";
import type { PaginatedFeedResponse, FeedItemResponse } from "@/types/review";

export const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const [feedPage, setFeedPage] = useState(1);

  // 1. Filmes em Destaque (6 primeiros filmes com pôster)
  const { data: featuredData, isLoading: isLoadingFeatured } = useQuery<
    PaginatedResponse<MovieCardItem>
  >({
    queryKey: ["movies", "featured"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<MovieCardItem>>("/movies", {
        params: { page: 1, page_size: 6 },
      });
      return response.data;
    },
  });

  // 2. Feed Global da Comunidade (Timeline de Resenhas)
  const {
    data: feedData,
    isLoading: isLoadingFeed,
    isFetching: isFetchingFeed,
  } = useQuery<PaginatedFeedResponse>({
    queryKey: ["reviews", "feed", feedPage],
    queryFn: async () => {
      const response = await api.get<PaginatedFeedResponse>("/reviews/community/feed", {
        params: { page: feedPage, per_page: 8 },
      });
      return response.data;
    },
  });

  const featuredMovies = featuredData?.items || [];
  const feedItems = feedData?.items || [];
  const totalPages = feedData?.total_pages || 1;

  return (
    <div className="space-y-12 py-2 text-left">
      {/* 1. Hero Section Cinematográfica */}
      <section className="relative overflow-hidden rounded-[12px] bg-gradient-to-b from-card/90 via-card/50 to-transparent border border-line p-8 sm:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
        <div className="max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-gold/10 border border-gold/30 text-gold text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>A rede social para amantes da sétima arte</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-text leading-tight">
            Registre o que assistiu. <br />
            <span className="text-gold">Compartilhe sua paixão.</span>
          </h1>

          <p className="text-text-body text-[0.95rem] leading-relaxed max-w-lg">
            Avalie com meias estrelas, escreva diários sem spoilers, monte sua estante personalizada e conecte-se com cinéfilos em um ambiente elegante e imersivo.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 justify-center md:justify-start">
            <Link to="/movies">
              <Button variant="primary" size="md">
                <Film className="w-4 h-4" />
                <span>Explorar Catálogo</span>
              </Button>
            </Link>

            {!isAuthenticated ? (
              <Link to="/register">
                <Button variant="ghost" size="md">
                  <span>Criar Minha Conta</span>
                </Button>
              </Link>
            ) : (
              <Link to="/library">
                <Button variant="ghost" size="md">
                  <BookOpen className="w-4 h-4 text-gold" />
                  <span>Minha Estante (@{user?.nickname})</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Card Visual de Marquise à Direita */}
        <div className="hidden lg:flex items-center justify-center p-2">
          <div className="relative w-64 h-80 rounded-[10px] bg-bg2 border border-line flex flex-col items-center justify-center gap-3 p-6 text-center shadow-2xl group hover:border-gold/50 transition-colors">
            <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center text-gold">
              <Star className="w-7 h-7 fill-gold" />
            </div>
            <p className="font-serif text-xl font-semibold text-text">CineStars</p>
            <p className="text-xs text-muted leading-relaxed">
              Mais de <b className="text-text font-semibold">95 mil filmes</b> catalogados para você registrar cada cena da sua jornada cinéfila.
            </p>
            <div className="w-full pt-2 border-t border-line/60 flex items-center justify-center gap-1">
              <StarRating rating={5} scale={5} size="sm" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Destaques do Catálogo (Linha Horizontal) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="space-y-0.5">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-text flex items-center gap-2">
              <Film className="w-5 h-5 text-gold" />
              <span>Filmes em Destaque</span>
            </h2>
            <p className="text-xs text-muted">
              Obras populares e aclamadas disponíveis para acompanhamento.
            </p>
          </div>

          <Link
            to="/movies"
            className="text-xs font-semibold text-gold hover:underline inline-flex items-center gap-1 transition-colors"
          >
            <span>Ver catálogo completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Grid de 6 Destaques */}
        {isLoadingFeatured ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton variant="poster" />
                <Skeleton variant="text" className="w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {featuredMovies.map((movie) => (
              <MovieCard key={movie.sk_movie_id} movie={movie} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Timeline da Comunidade (Feed Global CineStars) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="space-y-0.5">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-text flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gold" />
              <span>Atividade Recente da Comunidade</span>
            </h2>
            <p className="text-xs text-muted">
              Críticas, diários e notas compartilhadas pelos membros do CineStars.
            </p>
          </div>
        </div>

        {isLoadingFeed ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5 rounded-[10px] bg-card border border-line space-y-3">
                <Skeleton variant="text" className="w-1/4 h-4" />
                <Skeleton variant="text" className="w-full h-12" />
              </div>
            ))}
          </div>
        ) : feedItems.length > 0 ? (
          <div className="space-y-4">
            {feedItems.map((item: FeedItemResponse) => {
              return (
                <article
                  key={item.id}
                  className="p-5 rounded-[10px] bg-card border border-line space-y-4 transition-colors hover:border-line/80"
                >
                  {/* Cabeçalho da Atividade */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Autor */}
                    <div className="flex items-center gap-3">
                      {item.user.avatar_url ? (
                        <img
                          src={item.user.avatar_url}
                          alt={item.user.nickname}
                          className="w-9 h-9 rounded-full object-cover border border-gold/40"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-bg2 border border-line text-gold flex items-center justify-center font-serif text-sm font-semibold">
                          {item.user.nickname.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/users/${item.user.nickname}`}
                            className="text-xs font-semibold text-text hover:text-gold transition-colors"
                          >
                            @{item.user.nickname}
                          </Link>
                          <span className="text-xs text-muted">avaliou</span>
                        </div>
                        <span className="text-[0.72rem] text-muted">
                          {new Date(item.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Nota */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <StarRating rating={item.rating} scale={5} size="sm" showValue showOutOfTen />
                    </div>
                  </div>

                  {/* Conteúdo: Pôster Mini + Resenha */}
                  <div className="flex items-start gap-4 pt-1">
                    <Link
                      to={`/movies/${item.movie.sk_movie_id}`}
                      className="w-14 h-20 rounded-[6px] border border-line bg-bg2 overflow-hidden flex-shrink-0 group"
                      title={item.movie.titulo}
                    >
                      {item.movie.url_poster ? (
                        <img
                          src={item.movie.url_poster}
                          alt={item.movie.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-1 text-[0.65rem] text-muted text-center">
                          <Film className="w-4 h-4 text-line" />
                        </div>
                      )}
                    </Link>

                    <div className="space-y-1.5 flex-1">
                      <Link
                        to={`/movies/${item.movie.sk_movie_id}`}
                        className="text-sm font-semibold text-text hover:text-gold transition-colors inline-block"
                      >
                        {item.movie.titulo}{" "}
                        {item.movie.ano_lancamento && (
                          <span className="text-muted font-normal text-xs">
                            ({item.movie.ano_lancamento})
                          </span>
                        )}
                      </Link>

                      {item.review_text && (
                        <p className="text-text-body text-[0.88rem] leading-relaxed whitespace-pre-line">
                          {item.review_text}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Paginação do Feed */}
            {totalPages > 1 && (
              <div className="pt-4 flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={feedPage >= totalPages || isFetchingFeed}
                  onClick={() => setFeedPage((p) => p + 1)}
                  className="gap-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>Carregar mais avaliações</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-10 rounded-[10px] bg-card border border-line text-center space-y-3 max-w-md mx-auto">
            <MessageSquare className="w-8 h-8 text-muted mx-auto" />
            <h3 className="text-sm font-semibold text-text">Nenhuma resenha recente</h3>
            <p className="text-xs text-muted leading-relaxed">
              A comunidade ainda não registrou novas avaliações. Acesse o catálogo e seja o primeiro a escrever uma crítica!
            </p>
            <Link to="/movies">
              <Button variant="primary" size="sm">
                <span>Explorar Filmes</span>
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};
