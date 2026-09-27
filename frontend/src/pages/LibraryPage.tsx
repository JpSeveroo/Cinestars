import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Library,
  Film,
  CheckCircle2,
  Bookmark,
  PlayCircle,
  XCircle,
  Heart,
  Trash2,
  MoreVertical,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { MovieCard } from "@/components/shared/MovieCard";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { WatchStatus, type WatchStatusType, type TrackingResponse } from "@/types/tracking";
import type { MovieCardItem } from "@/types/movie";

type TabOption = "TODOS" | WatchStatusType | "FAVORITOS";

export const LibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabOption>("TODOS");
  const [openMenuMovieId, setOpenMenuMovieId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Consulta itens da estante pessoal
  const {
    data: libraryData,
    isLoading,
    isError,
  } = useQuery<TrackingResponse[]>({
    queryKey: ["tracking", "library", activeTab],
    queryFn: async () => {
      const params: Record<string, string | boolean> = {};

      if (activeTab === "FAVORITOS") {
        params.favorites = true;
      } else if (activeTab !== "TODOS") {
        params.status = activeTab;
      }

      const response = await api.get<TrackingResponse[]>("/movies/me/library", { params });
      return response.data;
    },
  });

  // Mutação para remover ou alterar status na estante
  const removeTrackingMutation = useMutation({
    mutationFn: async (movieId: string) => {
      const response = await api.put<TrackingResponse>(`/movies/${movieId}/status`, {
        status: null,
        is_favorite: false,
      });
      return response.data;
    },
    onSuccess: (_, movieId) => {
      toast.success("Filme removido da sua estante.");
      queryClient.invalidateQueries({ queryKey: ["tracking", "library"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.tracking.byMovie(movieId) });
      setOpenMenuMovieId(null);
    },
    onError: () => {
      toast.error("Erro ao remover filme da estante.");
    },
  });

  const items = Array.isArray(libraryData) ? libraryData : [];

  const tabs: { key: TabOption; label: string; icon: React.ReactNode }[] = [
    { key: "TODOS", label: "Todos", icon: <Film className="w-3.5 h-3.5" /> },
    { key: WatchStatus.ASSISTIDO, label: "Assistidos", icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal" /> },
    { key: WatchStatus.QUERO_ASSISTIR, label: "Quero Assistir", icon: <Bookmark className="w-3.5 h-3.5 text-gold" /> },
    { key: WatchStatus.ASSISTINDO, label: "Assistindo", icon: <PlayCircle className="w-3.5 h-3.5" /> },
    { key: WatchStatus.ABANDONEI, label: "Abandonados", icon: <XCircle className="w-3.5 h-3.5" /> },
    { key: "FAVORITOS", label: "Favoritos", icon: <Heart className="w-3.5 h-3.5 text-danger" /> },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Cabeçalho da Estante */}
      <header className="space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-text flex items-center gap-2.5">
          <Library className="w-6 h-6 text-gold" />
          <span>Minha Estante</span>
        </h1>
        <p className="text-muted text-[0.92rem]">
          Gerencie e filtre todos os filmes que você assistiu, deseja assistir ou favoritou.
        </p>
      </header>

      {/* Abas de Navegação */}
      <div className="flex items-center gap-2 border-b border-line pb-3 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium whitespace-nowrap transition-colors border select-none ${
                isActive
                  ? "bg-gold/10 border-gold text-gold font-semibold"
                  : "bg-card border-line text-muted hover:text-text hover:border-line/80"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Lista da Estante / Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton variant="poster" />
              <Skeleton variant="text" className="w-4/5" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-[10px] bg-card border border-danger/40 p-8 text-center space-y-3 max-w-md mx-auto">
          <p className="text-sm text-danger font-medium">Erro ao carregar sua estante.</p>
          <p className="text-xs text-muted">Certifique-se de que o backend FastAPI está em execução.</p>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((entry) => {
            const movieItem: MovieCardItem = {
              sk_movie_id: entry.movie?.sk_movie_id || entry.movie_id,
              id_filme: entry.movie?.id_filme || entry.movie_id,
              titulo: entry.movie?.titulo || "Filme sem título",
              ano_lancamento: entry.movie?.ano_lancamento || null,
              url_poster: entry.movie?.url_poster || null,
              nota_media: null,
            };

            const isMenuOpen = openMenuMovieId === entry.movie_id;

            return (
              <div key={entry.movie_id} className="relative group">
                <MovieCard
                  movie={movieItem}
                  badge={
                    <div className="flex items-center gap-1">
                      {entry.is_favorite && (
                        <div
                          className="w-6 h-6 rounded-full bg-black/70 backdrop-blur-sm border border-danger/60 flex items-center justify-center text-danger shadow-md"
                          title="Favorito"
                        >
                          <Heart className="w-3.5 h-3.5 fill-danger stroke-danger" />
                        </div>
                      )}
                      {entry.status === WatchStatus.ASSISTIDO && (
                        <div
                          className="w-6 h-6 rounded-full bg-black/70 backdrop-blur-sm border border-teal/60 flex items-center justify-center text-teal shadow-md"
                          title="Assistido"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-teal" />
                        </div>
                      )}
                      {entry.status === WatchStatus.QUERO_ASSISTIR && (
                        <div
                          className="w-6 h-6 rounded-full bg-black/70 backdrop-blur-sm border border-gold/60 flex items-center justify-center text-gold shadow-md"
                          title="Quero Assistir"
                        >
                          <Bookmark className="w-3.5 h-3.5 fill-gold stroke-gold" />
                        </div>
                      )}
                    </div>
                  }
                />

                {/* Botão de Menu Rápido de Contexto */}
                <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenMenuMovieId(isMenuOpen ? null : entry.movie_id);
                    }}
                    className="w-7 h-7 rounded-full bg-black/80 backdrop-blur-sm border border-line text-muted hover:text-text flex items-center justify-center"
                    aria-label="Opções do filme"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown de Ações Rápidas */}
                  {isMenuOpen && (
                    <div className="absolute left-0 mt-1 w-44 bg-card border border-line rounded-[8px] shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                      <Link
                        to={`/movies/${entry.movie_id}`}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-bg2"
                      >
                        <Film className="w-3.5 h-3.5 text-gold" />
                        <span>Ver Ficha Técnica</span>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeTrackingMutation.mutate(entry.movie_id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-danger/10 text-left font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover da Estante</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State Personalizado */
        <div className="rounded-[10px] bg-card border border-line p-12 text-center space-y-4 max-w-md mx-auto my-6">
          <div className="w-14 h-14 rounded-full bg-bg2 border border-line flex items-center justify-center text-muted mx-auto">
            <Library className="w-7 h-7 text-gold/80" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-text font-serif">Sua categoria está vazia</h2>
            <p className="text-xs text-muted leading-relaxed">
              Você ainda não adicionou nenhum filme nesta seção da sua estante. Explore nosso acervo completo e comece a registrar suas obras.
            </p>
          </div>
          <Link to="/movies">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4" />
              <span>Explorar Catálogo</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};
