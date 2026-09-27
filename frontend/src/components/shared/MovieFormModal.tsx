import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X,
  Film,
  Calendar,
  Clock,
  User,
  Image,
  FileText,
  Check,
  AlertCircle,
  Tag,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { MovieDetail, MoviePayload } from "@/types/movie";

export interface MovieFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  movieId?: string;
  initialData?: {
    titulo?: string;
    diretor?: string | null;
    ano_lancamento?: number | null;
    duracao_minutos?: number | null;
    generos?: string[] | null;
    sinopse?: string | null;
    url_poster?: string | null;
  };
  onSuccessCallback?: (movie: MovieDetail) => void;
}

// Lista curada de gêneros principais com labels em Português
const AVAILABLE_GENRES = [
  { id: "Action", label: "Ação" },
  { id: "Adventure", label: "Aventura" },
  { id: "Animation", label: "Animação" },
  { id: "Comedy", label: "Comédia" },
  { id: "Crime", label: "Crime" },
  { id: "Documentary", label: "Documentário" },
  { id: "Drama", label: "Drama" },
  { id: "Fantasy", label: "Fantasia" },
  { id: "Horror", label: "Terror" },
  { id: "Mystery", label: "Mistério" },
  { id: "Romance", label: "Romance" },
  { id: "Science Fiction", label: "Ficção Científica" },
  { id: "Thriller", label: "Suspense" },
  { id: "Western", label: "Faroeste" },
];

export const MovieFormModal: React.FC<MovieFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  movieId,
  initialData,
  onSuccessCallback,
}) => {
  const [titulo, setTitulo] = useState("");
  const [diretor, setDiretor] = useState("");
  const [ano, setAno] = useState<string>("");
  const [duracao, setDuracao] = useState<string>("");
  const [sinopse, setSinopse] = useState("");
  const [urlPoster, setUrlPoster] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [posterError, setPosterError] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialData) {
        setTitulo(initialData.titulo || "");
        setDiretor(initialData.diretor || "");
        setAno(initialData.ano_lancamento ? String(initialData.ano_lancamento) : "");
        setDuracao(initialData.duracao_minutos ? String(initialData.duracao_minutos) : "");
        setSinopse(initialData.sinopse || "");
        setUrlPoster(initialData.url_poster || "");
        setSelectedGenres(initialData.generos || []);
      } else {
        setTitulo("");
        setDiretor("");
        setAno(String(new Date().getFullYear()));
        setDuracao("");
        setSinopse("");
        setUrlPoster("");
        setSelectedGenres([]);
      }
      setPosterError(false);
    }
  }, [isOpen, mode, initialData]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    );
  };

  const mutation = useMutation({
    mutationFn: async (payload: MoviePayload) => {
      if (mode === "create") {
        const response = await api.post<MovieDetail>("/movies", payload);
        return response.data;
      } else {
        const response = await api.put<MovieDetail>(`/movies/${movieId}`, payload);
        return response.data;
      }
    },
    onSuccess: (data) => {
      // Invalida catálogo e detalhe
      queryClient.invalidateQueries({ queryKey: ["movies"] });
      if (movieId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(movieId) });
      }

      toast.success(
        mode === "create" ? "Filme cadastrado com sucesso!" : "Filme atualizado com sucesso!"
      );

      if (onSuccessCallback) {
        onSuccessCallback(data);
      }
      onClose();
    },
    onError: (error: any) => {
      let message = "Erro ao salvar filme. Verifique os dados e tente novamente.";
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === "string") {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.map((d: any) => d.msg || d.message).join(", ");
        }
      }
      toast.error(message);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitle = titulo.trim();
    if (!cleanTitle) {
      toast.error("O título do filme é obrigatório.");
      return;
    }

    const parsedYear = ano.trim() ? parseInt(ano.trim(), 10) : null;
    if (parsedYear !== null && (isNaN(parsedYear) || parsedYear < 1888 || parsedYear > 2100)) {
      toast.error("Informe um ano de lançamento válido (entre 1888 e 2100).");
      return;
    }

    const parsedDuration = duracao.trim() ? parseInt(duracao.trim(), 10) : null;
    if (parsedDuration !== null && (isNaN(parsedDuration) || parsedDuration <= 0)) {
      toast.error("A duração deve ser um número inteiro positivo de minutos.");
      return;
    }

    const payload: MoviePayload = {
      titulo: cleanTitle,
      diretor: diretor.trim() || null,
      ano_lancamento: parsedYear,
      duracao_minutos: parsedDuration,
      generos: selectedGenres.length > 0 ? selectedGenres : null,
      sinopse: sinopse.trim() || null,
      url_poster: urlPoster.trim() || null,
    };

    mutation.mutate(payload);
  };

  const hasPoster = Boolean(urlPoster.trim()) && !posterError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="relative w-full max-w-xl bg-card border border-line rounded-[12px] shadow-2xl p-6 sm:p-7 space-y-6 text-left my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="movie-form-modal-title"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2.5 text-text">
            <Film className="w-5 h-5 text-gold" />
            <h2 id="movie-form-modal-title" className="font-serif text-lg sm:text-xl font-semibold">
              {mode === "create" ? "Cadastrar Novo Filme" : "Editar Filme"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-text p-1 rounded-[6px] hover:bg-bg2 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Linha 1: Título */}
          <Input
            id="movie-title-input"
            label="Título da Obra *"
            placeholder="Ex: Oppenheimer, Interestelar, Central do Brasil"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            disabled={mutation.isPending}
            required
            leftIcon={<Film className="w-4 h-4 text-muted" />}
          />

          {/* Linha 2: Diretor e Ano */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="movie-director-input"
              label="Direção"
              placeholder="Ex: Christopher Nolan"
              value={diretor}
              onChange={(e) => setDiretor(e.target.value)}
              disabled={mutation.isPending}
              leftIcon={<User className="w-4 h-4 text-muted" />}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                id="movie-year-input"
                label="Ano"
                type="number"
                placeholder="2024"
                min={1888}
                max={2100}
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                disabled={mutation.isPending}
                leftIcon={<Calendar className="w-4 h-4 text-muted" />}
              />

              <Input
                id="movie-duration-input"
                label="Duração (min)"
                type="number"
                placeholder="120"
                min={1}
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                disabled={mutation.isPending}
                leftIcon={<Clock className="w-4 h-4 text-muted" />}
              />
            </div>
          </div>

          {/* Linha 3: Seleção de Gêneros */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-body flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-gold" />
              <span>Gêneros Cinematográficos</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-[8px] bg-bg2 border border-line max-h-32 overflow-y-auto">
              {AVAILABLE_GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => toggleGenre(genre.id)}
                    disabled={mutation.isPending}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-gold text-bg font-semibold shadow-sm scale-105"
                        : "bg-card text-muted hover:text-text border border-line"
                    }`}
                  >
                    {genre.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linha 4: URL do Pôster e Preview */}
          <div className="space-y-2">
            <Input
              id="movie-poster-input"
              label="URL do Pôster (Opcional)"
              placeholder="https://image.tmdb.org/t/p/w500/..."
              hint="Link direto para imagem (JPG, PNG, WebP)"
              value={urlPoster}
              onChange={(e) => {
                setUrlPoster(e.target.value);
                setPosterError(false);
              }}
              disabled={mutation.isPending}
              leftIcon={<Image className="w-4 h-4 text-muted" />}
            />

            {Boolean(urlPoster.trim()) && (
              <div className="flex items-center gap-3 p-3 rounded-[8px] bg-bg2 border border-line">
                <div className="w-12 h-16 rounded-[4px] border border-line bg-card overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {hasPoster ? (
                    <img
                      src={urlPoster.trim()}
                      alt="Pré-visualização do pôster"
                      onError={() => setPosterError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-danger" />
                  )}
                </div>
                <div className="text-xs text-muted">
                  <span className="text-text font-medium block">Pré-visualização do Pôster</span>
                  <span className={posterError ? "text-danger" : ""}>
                    {posterError
                      ? "URL inacessível ou imagem inválida."
                      : "A capa será exibida assim no catálogo e na ficha técnica."}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Linha 5: Sinopse */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted">
              <label htmlFor="movie-synopsis-input" className="font-medium text-text-body">
                Sinopse da Obra
              </label>
              <span>{sinopse.length}/4000</span>
            </div>
            <div className="relative flex items-center w-full">
              <div className="absolute left-3 top-3 text-muted pointer-events-none">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                id="movie-synopsis-input"
                rows={3}
                maxLength={4000}
                value={sinopse}
                onChange={(e) => setSinopse(e.target.value)}
                disabled={mutation.isPending}
                placeholder="Descreva a premissa dramática e temática do filme..."
                className="w-full bg-bg2 text-text text-[0.92rem] rounded-[8px] border border-line py-[10px] pl-9 pr-3 transition-colors placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-bg resize-none"
              />
            </div>
          </div>

          {/* Ações do Formulário */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={mutation.isPending}
              className="gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{mode === "create" ? "Cadastrar Filme" : "Salvar Alterações"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
