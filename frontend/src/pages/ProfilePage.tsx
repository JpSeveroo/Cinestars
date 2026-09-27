import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  MessageSquare,
  Bookmark,
  Star,
  Calendar,
  AlertCircle,
  Home,
  Plus,
  ArrowRight,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StarRating } from "@/components/shared/StarRating";
import { EditProfileModal } from "@/components/shared/EditProfileModal";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/store/authStore";
import type { PublicUserProfile, ProfileMovieCard, ProfileRecentReview } from "@/types/profile";
import type { MovieCardItem } from "@/types/movie";

export const ProfilePage: React.FC = () => {
  const { nickname } = useParams<{ nickname: string }>();
  const userNick = nickname || "";
  const { user: currentUser } = useAuthStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isOwnProfile = currentUser?.nickname?.toLowerCase() === userNick.toLowerCase();

  // Consulta o perfil público com estatísticas O(1)
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery<PublicUserProfile>({
    queryKey: queryKeys.users.profile(userNick),
    queryFn: async () => {
      const response = await api.get<PublicUserProfile>(`/users/${userNick}`);
      return response.data;
    },
    enabled: Boolean(userNick),
  });

  if (isError) {
    return (
      <div className="rounded-[10px] bg-card border border-danger/40 p-12 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-14 h-14 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-text font-serif">Cinéfilo não encontrado</h1>
          <p className="text-xs text-muted">
            O usuário "@{userNick}" não existe ou sua conta foi removida do CineStars.
          </p>
        </div>
        <Link to="/">
          <Button variant="primary" size="sm">
            <Home className="w-4 h-4" />
            <span>Voltar ao Início</span>
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse text-left">
        <div className="flex items-center gap-6 pb-6 border-b border-line">
          <Skeleton variant="circular" className="w-24 h-24" />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" className="w-48 h-8" />
            <Skeleton variant="text" className="w-32 h-4" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const stats = profile.stats;
  const favorites = ((profile.favorites || profile.favorite_movies || []) as (ProfileMovieCard | MovieCardItem)[]).slice(0, 4);
  const recentReviews = ((profile.recent_reviews || []) as ProfileRecentReview[]).slice(0, 5);

  const formattedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : "2026";

  return (
    <div className="space-y-10 text-left">
      {/* Header do Perfil */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-line text-center sm:text-left">
        {/* Avatar com borda dourada se for perfil próprio */}
        <div
          className={`w-24 h-24 rounded-full bg-card overflow-hidden flex items-center justify-center text-gold font-serif text-3xl font-semibold shadow-xl flex-shrink-0 ${
            isOwnProfile ? "border-2 border-gold" : "border border-line"
          }`}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.nickname}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{profile.nickname.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="space-y-2 flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-text tracking-tight">
                @{profile.nickname}
              </h1>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted mt-1">
                <Calendar className="w-3.5 h-3.5 text-gold/80" />
                <span>Membro desde {formattedDate}</span>
              </div>
            </div>

            {isOwnProfile && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  className="gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar Perfil</span>
                </Button>
                <Link to="/library">
                  <Button variant="ghost" size="sm">
                    <span>Minha Estante</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {profile.bio && (
            <p className="text-text-body text-[0.92rem] leading-relaxed max-w-2xl pt-1">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Grid de Estatísticas Agregadas O(1) */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Métricas Cinematográficas
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-[8px] border border-line text-center space-y-1">
            <span className="font-serif text-2xl sm:text-3xl font-semibold text-gold block leading-tight">
              {stats.total_watched}
            </span>
            <span className="text-xs text-muted flex items-center justify-center gap-1.5 font-medium">
              <Eye className="w-3.5 h-3.5 text-teal" />
              <span>Filmes Assistidos</span>
            </span>
          </div>

          <div className="bg-card p-4 rounded-[8px] border border-line text-center space-y-1">
            <span className="font-serif text-2xl sm:text-3xl font-semibold text-gold block leading-tight">
              {stats.total_reviews}
            </span>
            <span className="text-xs text-muted flex items-center justify-center gap-1.5 font-medium">
              <MessageSquare className="w-3.5 h-3.5 text-gold" />
              <span>Resenhas Escritas</span>
            </span>
          </div>

          <div className="bg-card p-4 rounded-[8px] border border-line text-center space-y-1">
            <span className="font-serif text-2xl sm:text-3xl font-semibold text-gold block leading-tight">
              {stats.total_watchlist}
            </span>
            <span className="text-xs text-muted flex items-center justify-center gap-1.5 font-medium">
              <Bookmark className="w-3.5 h-3.5 text-gold" />
              <span>Quero Assistir</span>
            </span>
          </div>

          <div className="bg-card p-4 rounded-[8px] border border-line text-center space-y-1">
            <span className="font-serif text-2xl sm:text-3xl font-semibold text-gold block leading-tight">
              {stats.average_user_rating ? `${stats.average_user_rating.toFixed(1)}★` : "—"}
            </span>
            {stats.average_user_rating && (
              <span className="text-[0.7rem] text-muted font-medium block">
                equiv. {Math.round(stats.average_user_rating * 2)} / 10
              </span>
            )}
            <span className="text-xs text-muted flex items-center justify-center gap-1.5 font-medium pt-0.5">
              <Star className="w-3.5 h-3.5 text-gold fill-gold" />
              <span>Média Pessoal</span>
            </span>
          </div>
        </div>
      </section>

      {/* Vitrine: Top 4 Filmes Favoritos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-text">Top 4 Filmes Favoritos</h2>
          <span className="text-xs text-muted">{favorites.length} de 4 selecionados</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => {
            const movie = favorites[index];

            if (movie) {
              return (
                <Link
                  key={movie.sk_movie_id}
                  to={`/movies/${movie.sk_movie_id}`}
                  className="group relative aspect-[2/3] rounded-[8px] border border-line bg-card overflow-hidden transition-all duration-200 hover:border-gold hover:shadow-xl focus:outline-none"
                  title={movie.titulo}
                >
                  {movie.url_poster ? (
                    <img
                      src={movie.url_poster}
                      alt={movie.titulo}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-bg2 text-muted">
                      <span className="text-xs font-semibold text-text line-clamp-2">{movie.titulo}</span>
                      <span className="text-[0.7rem] text-muted">{movie.ano_lancamento || "—"}</span>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs font-semibold text-text truncate">{movie.titulo}</p>
                    <p className="text-[0.7rem] text-gold">{movie.ano_lancamento}</p>
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={index}
                className="aspect-[2/3] rounded-[8px] border-2 border-dashed border-line/60 bg-bg2/50 flex flex-col items-center justify-center p-4 text-center space-y-2 select-none"
              >
                <div className="w-8 h-8 rounded-full bg-card border border-line flex items-center justify-center text-muted">
                  <Star className="w-4 h-4 stroke-muted" />
                </div>
                <span className="text-[0.75rem] text-muted font-medium">Slot Vazio #{index + 1}</span>
                {isOwnProfile && (
                  <Link to="/movies" className="text-[0.7rem] text-gold hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    <span>Favoritar</span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Seção: Últimas Avaliações Publicadas */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-text">Últimas Avaliações</h2>

        {recentReviews.length > 0 ? (
          <div className="space-y-3">
            {recentReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-[10px] bg-card border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-line/80"
              >
                <div className="flex items-center gap-3">
                  <Link
                    to={`/movies/${rev.movie.sk_movie_id}`}
                    className="w-12 h-16 rounded-[4px] border border-line bg-bg2 overflow-hidden flex-shrink-0 group"
                  >
                    {rev.movie.url_poster ? (
                      <img
                        src={rev.movie.url_poster}
                        alt={rev.movie.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[0.65rem] text-muted text-center p-1">
                        Filme
                      </div>
                    )}
                  </Link>

                  <div className="space-y-1">
                    <Link
                      to={`/movies/${rev.movie.sk_movie_id}`}
                      className="text-sm font-semibold text-text hover:text-gold transition-colors"
                    >
                      {rev.movie.titulo}{" "}
                      {rev.movie.ano_lancamento && (
                        <span className="text-muted text-xs font-normal">
                          ({rev.movie.ano_lancamento})
                        </span>
                      )}
                    </Link>

                    {rev.review_text && (
                      <p className="text-xs text-text-body line-clamp-2 max-w-xl">
                        {rev.has_spoilers
                          ? "Esta crítica contém spoilers e pode ser visualizada na página do filme."
                          : rev.review_text}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 flex-shrink-0">
                  <StarRating rating={rev.rating} scale={5} size="sm" showValue showOutOfTen />
                  <span className="text-[0.72rem] text-muted">
                    {new Date(rev.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-[10px] bg-card border border-line text-center space-y-2">
            <p className="text-sm font-semibold text-text">Nenhuma avaliação publicada ainda</p>
            <p className="text-xs text-muted">Este cinéfilo ainda não publicou avaliações no CineStars.</p>
          </div>
        )}
      </section>

      {/* Modal de Edição de Perfil */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          nickname={profile.nickname}
          initialBio={profile.bio}
          initialAvatarUrl={profile.avatar_url}
        />
      )}
    </div>
  );
};
