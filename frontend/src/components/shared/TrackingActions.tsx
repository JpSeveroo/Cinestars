import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Bookmark, PlayCircle, XCircle, Heart, Star, LogIn } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { ReviewModal } from "./ReviewModal";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { queryKeys } from "@/lib/queryKeys";
import { WatchStatus, type WatchStatusType, type TrackingResponse } from "@/types/tracking";
import type { ReviewItem } from "@/types/review";

export interface TrackingActionsProps {
  movieId: string;
  movieTitle: string;
  className?: string;
}

export const TrackingActions: React.FC<TrackingActionsProps> = ({
  movieId,
  movieTitle,
  className,
}) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Consulta o status de tracking do usuário logado para este filme
  const { data: trackingData, isLoading: isLoadingTracking } = useQuery<TrackingResponse | null>({
    queryKey: queryKeys.tracking.byMovie(movieId),
    queryFn: async () => {
      if (!isAuthenticated) return null;
      try {
        const response = await api.get<TrackingResponse | null>(`/movies/${movieId}/my-status`);
        return response.data;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
  });

  // Consulta se o usuário já avaliou o filme
  const { data: myReview } = useQuery<ReviewItem | null>({
    queryKey: ["reviews", "movie", movieId, "me"],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      try {
        const response = await api.get<ReviewItem | null>(`/movies/${movieId}/reviews/me`);
        return response.data;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
  });

  // Mutação para atualizar tracking (status ou favorito)
  const trackingMutation = useMutation({
    mutationFn: async (payload: { status?: WatchStatusType | null; is_favorite?: boolean }) => {
      const response = await api.put<TrackingResponse>(`/movies/${movieId}/status`, payload);
      return response.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.tracking.byMovie(movieId), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.tracking.byMovie(movieId) });
      queryClient.invalidateQueries({ queryKey: ["tracking", "library"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(movieId) });

      if (updated.status === WatchStatus.ASSISTIDO) {
        toast.success(`"${movieTitle}" marcado como assistido!`);
      } else if (updated.status === WatchStatus.QUERO_ASSISTIR) {
        toast.success(`"${movieTitle}" adicionado à sua lista de interesse!`);
      } else if (updated.status === WatchStatus.ASSISTINDO) {
        toast.success(`"${movieTitle}" marcado como assistindo!`);
      } else if (updated.status === WatchStatus.ABANDONEI) {
        toast.success(`"${movieTitle}" marcado como abandonado.`);
      } else if (updated.is_favorite && !trackingData?.is_favorite) {
        toast.success(`"${movieTitle}" adicionado aos favoritos!`);
      } else {
        toast.info("Status de acompanhamento atualizado.");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar status do filme.");
    },
  });

  const isWatched = trackingData?.status === WatchStatus.ASSISTIDO;
  const isWantToWatch = trackingData?.status === WatchStatus.QUERO_ASSISTIR;
  const isWatching = trackingData?.status === WatchStatus.ASSISTINDO;
  const isAbandoned = trackingData?.status === WatchStatus.ABANDONEI;
  const isFavorite = Boolean(trackingData?.is_favorite);

  const handleToggleStatus = (targetStatus: WatchStatusType) => {
    trackingMutation.mutate({
      status: trackingData?.status === targetStatus ? null : targetStatus,
      is_favorite: isFavorite,
    });
  };

  const handleToggleFavorite = () => {
    trackingMutation.mutate({
      status: trackingData?.status || null,
      is_favorite: !isFavorite,
    });
  };

  // Se o usuário não estiver logado, exibe banner convidativo
  if (!isAuthenticated) {
    return (
      <div className={`p-5 rounded-[10px] bg-card border border-line space-y-3 text-center sm:text-left ${className}`}>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-text">Sua Estante Pessoal</p>
          <p className="text-xs text-muted">
            Faça login para marcar este filme como assistido, adicionar aos favoritos ou escrever uma crítica.
          </p>
        </div>
        <Link to="/login" state={{ from: location }}>
          <Button variant="primary" size="sm" className="w-full sm:w-auto">
            <LogIn className="w-4 h-4" />
            <span>Fazer Login para Interagir</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 4 Status Reais da Obra */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Assistido */}
        <button
          type="button"
          disabled={isLoadingTracking || trackingMutation.isPending}
          onClick={() => handleToggleStatus(WatchStatus.ASSISTIDO)}
          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-[8px] border text-xs font-semibold transition-all select-none ${
            isWatched
              ? "bg-teal/15 border-teal text-teal shadow-sm"
              : "bg-card border-line text-muted hover:text-text hover:border-muted hover:bg-[#252a3a]"
          }`}
        >
          <CheckCircle2 className={`w-4 h-4 ${isWatched ? "stroke-teal" : "stroke-current"}`} />
          <span>{isWatched ? "Assistido" : "Assistido"}</span>
        </button>

        {/* Quero Assistir */}
        <button
          type="button"
          disabled={isLoadingTracking || trackingMutation.isPending}
          onClick={() => handleToggleStatus(WatchStatus.QUERO_ASSISTIR)}
          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-[8px] border text-xs font-semibold transition-all select-none ${
            isWantToWatch
              ? "bg-gold/15 border-gold text-gold shadow-sm"
              : "bg-card border-line text-muted hover:text-text hover:border-muted hover:bg-[#252a3a]"
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isWantToWatch ? "stroke-gold fill-gold" : "stroke-current"}`} />
          <span>{isWantToWatch ? "Na Lista" : "Quero Assistir"}</span>
        </button>

        {/* Assistindo */}
        <button
          type="button"
          disabled={isLoadingTracking || trackingMutation.isPending}
          onClick={() => handleToggleStatus(WatchStatus.ASSISTINDO)}
          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-[8px] border text-xs font-semibold transition-all select-none ${
            isWatching
              ? "bg-sky-500/15 border-sky-400 text-sky-400 shadow-sm"
              : "bg-card border-line text-muted hover:text-text hover:border-muted hover:bg-[#252a3a]"
          }`}
        >
          <PlayCircle className={`w-4 h-4 ${isWatching ? "stroke-sky-400" : "stroke-current"}`} />
          <span>{isWatching ? "Assistindo" : "Assistindo"}</span>
        </button>

        {/* Abandonei */}
        <button
          type="button"
          disabled={isLoadingTracking || trackingMutation.isPending}
          onClick={() => handleToggleStatus(WatchStatus.ABANDONEI)}
          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-[8px] border text-xs font-semibold transition-all select-none ${
            isAbandoned
              ? "bg-orange-500/15 border-orange-400 text-orange-400 shadow-sm"
              : "bg-card border-line text-muted hover:text-text hover:border-muted hover:bg-[#252a3a]"
          }`}
        >
          <XCircle className={`w-4 h-4 ${isAbandoned ? "stroke-orange-400" : "stroke-current"}`} />
          <span>{isAbandoned ? "Abandonado" : "Abandonei"}</span>
        </button>
      </div>

      {/* Ações Complementares: Favorito e Avaliar */}
      <div className="grid grid-cols-2 gap-2">
        {/* Botão Favorito */}
        <button
          type="button"
          disabled={isLoadingTracking || trackingMutation.isPending}
          onClick={handleToggleFavorite}
          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-[8px] border text-xs font-semibold transition-all select-none ${
            isFavorite
              ? "bg-danger/15 border-danger text-danger shadow-sm"
              : "bg-card border-line text-muted hover:text-text hover:border-muted hover:bg-[#252a3a]"
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? "stroke-danger fill-danger" : "stroke-current"}`} />
          <span>{isFavorite ? "Favorito" : "Favoritar"}</span>
        </button>

        {/* Botão Avaliar / Resenha */}
        <button
          type="button"
          onClick={() => setIsReviewModalOpen(true)}
          className="flex items-center justify-center gap-1.5 p-2.5 rounded-[8px] border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 text-xs font-semibold transition-all select-none"
        >
          <Star className="w-4 h-4 stroke-gold fill-gold" />
          <span>{myReview ? `Avaliado (${myReview.rating}★)` : "Avaliar"}</span>
        </button>
      </div>

      {/* Modal de Avaliação */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        movieId={movieId}
        movieTitle={movieTitle}
        initialRating={myReview?.rating || 3.5}
        initialText={myReview?.review_text || ""}
        initialSpoilers={myReview?.has_spoilers || false}
      />
    </div>
  );
};
