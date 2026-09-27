import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Film, Search, X, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { MovieCard } from "@/components/shared/MovieCard";
import { GenreSelect } from "@/components/shared/GenreSelect";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { PaginatedResponse } from "@/types/common";
import type { MovieCardItem } from "@/types/movie";

export const CatalogPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 18;

  // Debounce de 400ms para evitar chamadas de API a cada digitação
  const debouncedSearch = useDebounce(searchTerm.trim(), 400);

  // Reinicia para a página 1 ao alterar a busca ou gênero
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedGenre]);

  // Query com TanStack Query
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<PaginatedResponse<MovieCardItem>>({
    queryKey: queryKeys.movies.list({
      page,
      page_size: pageSize,
      search: debouncedSearch || undefined,
      genre: selectedGenre || undefined,
    }),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<MovieCardItem>>("/movies", {
        params: {
          page,
          page_size: pageSize,
          search: debouncedSearch || undefined,
          genre: selectedGenre || undefined,
        },
      });
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const movies = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSelectedGenre("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <header className="space-y-2">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-text flex items-center gap-2.5">
          <Film className="w-6 h-6 text-gold" />
          <span>Catálogo de Filmes</span>
        </h1>
        <p className="text-muted text-[0.92rem]">
          Explore mais de 95 mil obras cinematográficas do acervo com notas e críticas da comunidade.
        </p>
      </header>

      {/* Controles: Busca e Filtro com Dropdown Customizado */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Barra de Pesquisa e Dropdown de Gênero */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:max-w-2xl">
            <div className="flex-1">
              <Input
                id="movie-search"
                placeholder="Buscar filme por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-muted" />}
                rightIcon={
                  searchTerm ? (
                     <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="text-muted hover:text-text p-1 transition-colors"
                      aria-label="Limpar campo de pesquisa"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null
                }
              />
            </div>

            <GenreSelect
              value={selectedGenre}
              onChange={(val) => setSelectedGenre(val)}
            />
          </div>

          {/* Indicador de Quantidade e Loading Sutil */}
          <div className="flex items-center gap-2 text-xs text-muted self-end md:self-center">
            {isFetching && (
              <span className="inline-flex items-center gap-1.5 text-gold animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Atualizando...
              </span>
            )}
            {!isLoading && (
              <span>
                Exibindo <b className="text-text font-semibold">{movies.length}</b> de{" "}
                <b className="text-text font-semibold">{total.toLocaleString("pt-BR")}</b> filmes
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Estado de Erro na Conexão com API */}
      {isError && (
        <div className="rounded-[10px] bg-card border border-danger/40 p-8 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-text">Erro ao carregar o catálogo</h2>
            <p className="text-xs text-muted">
              {error instanceof Error
                ? error.message
                : "Não foi possível sincronizar o catálogo com o servidor FastAPI."}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar novamente</span>
          </Button>
        </div>
      )}

      {/* Grade de Filmes / Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: pageSize }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton variant="poster" />
              <Skeleton variant="text" className="w-4/5" />
              <Skeleton variant="text" className="w-2/5 h-3" />
            </div>
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <MovieCard key={movie.sk_movie_id} movie={movie} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-[10px] bg-card border border-line p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-bg2 border border-line flex items-center justify-center text-muted mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-text">Nenhum filme encontrado</h2>
            <p className="text-xs text-muted">
              {debouncedSearch
                ? `Não encontramos resultados correspondentes a "${debouncedSearch}".`
                : "Não há filmes cadastrados para o filtro selecionado."}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleClearSearch}>
            <span>Limpar filtros de busca</span>
          </Button>
        </div>
      )}

      {/* Barra de Paginação */}
      {!isLoading && totalPages > 1 && (
        <div className="pt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted">
            Página <b className="text-text">{page}</b> de <b className="text-text">{totalPages.toLocaleString("pt-BR")}</b>
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => handlePageChange(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </Button>

            {/* Marcadores Rápidos */}
            <div className="hidden sm:flex items-center gap-1 px-2 text-xs text-muted">
              <span className="px-2 py-1 rounded-[6px] bg-gold/10 text-gold font-semibold border border-gold/30">
                {page}
              </span>
              <span>/</span>
              <span>{totalPages}</span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => handlePageChange(page + 1)}
            >
              <span>Próxima</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
