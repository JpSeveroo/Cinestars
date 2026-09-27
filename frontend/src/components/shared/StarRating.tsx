import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StarRatingProps {
  rating: number; // Nota (ex: 3.5 em base 5, ou 7.0 em base 10)
  maxStars?: number; // Padrão 5 estrelas
  scale?: 5 | 10; // Se escala 10, converte automaticamente para 5 estrelas
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  showOutOfTen?: boolean; // Exibe também a equivalência sobre 10
  onChange?: (newRating: number) => void;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  scale = 5,
  interactive = false,
  size = "md",
  showValue = false,
  showOutOfTen = false,
  onChange,
  className,
}) => {
  // Normaliza o valor para escala de 5 estrelas
  const normalizedValue = scale === 10 ? rating / 2 : rating;
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : normalizedValue;

  const starSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  const handleMouseMove = (starIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    const calculated = starIndex + (isHalf ? 0.5 : 1.0);
    setHoverRating(calculated);
  };

  const handleClick = (starIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onChange) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    const calculated = starIndex + (isHalf ? 0.5 : 1.0);
    onChange(calculated);
  };

  return (
    <div
      className={cn("inline-flex items-center gap-1.5 select-none", className)}
      onMouseLeave={() => interactive && setHoverRating(null)}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }).map((_, index) => {
          const diff = displayRating - index;
          const isFull = diff >= 1;
          const isHalf = diff > 0 && diff < 1;

          return (
            <div
              key={index}
              className={cn(
                "relative flex items-center justify-center transition-transform",
                interactive && "cursor-pointer hover:scale-110 p-0.5"
              )}
              onMouseMove={(e) => handleMouseMove(index, e)}
              onClick={(e) => handleClick(index, e)}
            >
              {/* Estrela de fundo vazia (linha / cinza) */}
              <Star
                className={cn(starSizes[size], "text-line stroke-line fill-none")}
                strokeWidth={1.8}
              />

              {/* Estrela totalmente preenchida */}
              {isFull && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Star
                    className={cn(starSizes[size], "text-gold stroke-gold fill-gold")}
                    strokeWidth={1.8}
                  />
                </div>
              )}

              {/* Meia estrela preenchida */}
              {isHalf && (
                <div
                  className="absolute inset-0 flex items-center overflow-hidden pointer-events-none"
                  style={{ width: "50%" }}
                >
                  <Star
                    className={cn(starSizes[size], "text-gold stroke-gold fill-gold")}
                    strokeWidth={1.8}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showValue && (
        <span className="text-[0.78rem] font-medium text-gold ml-1">
          {displayRating > 0
            ? showOutOfTen
              ? `${displayRating.toFixed(1)}★ (${Math.round(displayRating * 2)}/10)`
              : scale === 10 && hoverRating === null
              ? `${rating.toFixed(1)}`
              : `${displayRating.toFixed(1)}★`
            : "—"}
        </span>
      )}
    </div>
  );
};
