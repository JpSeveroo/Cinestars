import React, { useState } from "react";
import { Link } from "react-router-dom";
import { StarRating } from "./StarRating";
import { cn } from "@/lib/utils";
import type { MovieCardItem } from "@/types/movie";

export interface MovieCardProps {
  movie: MovieCardItem;
  className?: string;
  badge?: React.ReactNode;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, className, badge }) => {
  const [imageError, setImageError] = useState(false);

  const hasPoster = Boolean(movie.url_poster) && !imageError;

  return (
    <Link
      to={`/movies/${movie.sk_movie_id}`}
      className={cn("group flex flex-col gap-2 text-left focus:outline-none", className)}
      title={movie.titulo}
    >
      {/* Contêiner do Pôster (Proporção 2:3 estrita) */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[8px] border border-line bg-card transition-all duration-200 group-hover:border-gold group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)] group-focus:ring-2 group-focus:ring-gold">
        {hasPoster ? (
          <img
            src={movie.url_poster!}
            alt={`Pôster do filme ${movie.titulo}`}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          /* Placeholder de Claquete Cinematográfica em SVG conforme Design System */
          <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-bg2 text-line group-hover:text-gold transition-colors">
            <svg
              className="w-10 h-10 stroke-current transition-colors"
              viewBox="0 0 34 34"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {/* Corpo da claquete */}
              <rect x="3" y="11" width="28" height="20" rx="3" />
              {/* Barra superior com dentes característicos */}
              <path d="M3 11L31 11" />
              <path d="M3 5L31 5L31 11L3 11Z" />
              <path d="M9 5L7 11" />
              <path d="M16 5L14 11" />
              <path d="M23 5L21 11" />
              <path d="M30 5L28 11" />
            </svg>
            <span className="text-[0.72rem] text-muted/60 text-center mt-2.5 font-medium px-1 line-clamp-2">
              {movie.titulo}
            </span>
          </div>
        )}

        {/* Badge sobreposto opcional (ex: status ou favorito da estante) */}
        {badge && <div className="absolute top-2 right-2 z-10">{badge}</div>}
      </div>

      {/* Metadados do Filme */}
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[0.85rem] font-semibold text-text truncate group-hover:text-gold transition-colors">
          {movie.titulo}
        </h3>

        <div className="flex items-center justify-between text-[0.78rem] text-muted">
          <span>{movie.ano_lancamento || "—"}</span>
          {movie.nota_media ? (
            <div className="flex items-center gap-1">
              <StarRating rating={movie.nota_media} scale={10} size="sm" />
              <span className="text-[0.72rem] text-gold font-medium">
                {movie.nota_media.toFixed(1)}
              </span>
            </div>
          ) : (
            <span className="text-[0.72rem] text-muted/60">Sem nota</span>
          )}
        </div>
      </div>
    </Link>
  );
};
