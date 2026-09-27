import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, CheckCircle2, AlertTriangle, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { StarRating } from "./StarRating";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { CreateReviewPayload, ReviewItem } from "@/types/review";

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieId: string;
  movieTitle: string;
  initialRating?: number;
  initialText?: string;
  initialSpoilers?: boolean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  movieId,
  movieTitle,
  initialRating = 3.5,
  initialText = "",
  initialSpoilers = false,
}) => {
  const [rating, setRating] = useState<number>(initialRating);
  const [reviewText, setReviewText] = useState<string>(initialText);
  const [hasSpoilers, setHasSpoilers] = useState<boolean>(initialSpoilers);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setRating(initialRating || 3.5);
      setReviewText(initialText || "");
      setHasSpoilers(initialSpoilers || false);
    }
  }, [isOpen, initialRating, initialText, initialSpoilers]);

  const reviewMutation = useMutation({
    mutationFn: async (payload: CreateReviewPayload) => {
      const response = await api.post<ReviewItem>(`/movies/${movieId}/reviews`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Sua avaliação foi publicada com sucesso!");
      // Invalidação das queries conforme Seção 6 do 03_API_CONTRACTS_AND_STATE.md
      queryClient.invalidateQueries({ queryKey: ["reviews", "movie", movieId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.tracking.byMovie(movieId) });
      queryClient.invalidateQueries({ queryKey: ["tracking", "library"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(movieId) });
      onClose();
    },
    onError: (err: unknown) => {
      const errorMsg = "Não foi possível registrar sua avaliação. Tente novamente.";
      toast.error(errorMsg);
      console.error(err);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 0.5 || rating > 5.0) {
      toast.error("Por favor, selecione uma nota entre 0.5 e 5.0 estrelas.");
      return;
    }

    reviewMutation.mutate({
      rating,
      review_text: reviewText.trim() ? reviewText.trim() : null,
      has_spoilers: hasSpoilers,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-card border border-line rounded-[10px] shadow-2xl p-6 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-text">
            <MessageSquare className="w-5 h-5 text-gold" />
            <h2 id="modal-title" className="font-serif text-lg sm:text-xl font-semibold truncate max-w-sm">
              Avaliar <span className="text-gold">{movieTitle}</span>
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
          {/* Seletor Interativo de Estrelas (0.5 a 5.0) */}
          <div className="flex flex-col items-center justify-center p-4 bg-bg2 rounded-[8px] border border-line/60 space-y-2">
            <span className="text-xs font-medium text-muted">Sua Nota:</span>
            <div className="flex items-center gap-3">
              <StarRating
                rating={rating}
                interactive
                size="lg"
                onChange={(newRating) => setRating(newRating)}
              />
              <span className="font-serif text-xl font-semibold text-gold min-w-[3rem] text-center">
                {rating.toFixed(1)}
              </span>
            </div>
            <span className="text-[0.72rem] text-muted/60">
              Passe o mouse na metade esquerda ou direita da estrela para notas fracionadas
            </span>
          </div>

          {/* Campo de Resenha Opcional */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between text-xs text-muted">
              <label htmlFor="review-text" className="font-medium">
                Resenha ou Diário (Opcional)
              </label>
              <span>{reviewText.length}/5000</span>
            </div>
            <textarea
              id="review-text"
              rows={4}
              maxLength={5000}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="O que você achou desta obra? Compartilhe seus pensamentos cinematográficos..."
              className="w-full bg-bg2 text-text text-[0.92rem] rounded-[8px] border border-line p-3 placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-bg resize-none"
            />
          </div>

          {/* Opção de Spoilers */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="spoilers-checkbox"
              checked={hasSpoilers}
              onChange={(e) => setHasSpoilers(e.target.checked)}
              className="rounded border-line bg-bg2 text-gold focus:ring-gold focus:ring-offset-bg h-4 w-4 cursor-pointer"
            />
            <label
              htmlFor="spoilers-checkbox"
              className="text-xs text-muted select-none cursor-pointer flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-danger" />
              <span>Esta resenha contém spoilers da trama</span>
            </label>
          </div>

          {/* Aviso da Regra Letterboxd Auto-Watched */}
          <div className="p-3 rounded-[8px] bg-gold/10 border border-gold/20 flex items-start gap-2.5 text-xs text-text-body">
            <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
            <p>
              Ao publicar sua avaliação, este filme será automaticamente marcado como{" "}
              <b className="text-gold font-semibold">Assistido</b> na sua estante pessoal.
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={reviewMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={reviewMutation.isPending}
            >
              Publicar avaliação
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
