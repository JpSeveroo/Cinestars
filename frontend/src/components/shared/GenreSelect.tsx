import React, { useState, useRef, useEffect } from "react";
import { Filter, ChevronDown, Check } from "lucide-react";

export interface GenreOption {
  label: string;
  value: string;
}

export const GENRE_OPTIONS: GenreOption[] = [
  { label: "Todos os Gêneros", value: "" },
  { label: "Ação", value: "Action" },
  { label: "Aventura", value: "Adventure" },
  { label: "Animação", value: "Animation" },
  { label: "Comédia", value: "Comedy" },
  { label: "Crime", value: "Crime" },
  { label: "Documentário", value: "Documentary" },
  { label: "Drama", value: "Drama" },
  { label: "Família", value: "Family" },
  { label: "Fantasia", value: "Fantasy" },
  { label: "Faroeste", value: "Western" },
  { label: "Ficção Científica", value: "Science Fiction" },
  { label: "Guerra", value: "War" },
  { label: "História", value: "History" },
  { label: "Mistério", value: "Mystery" },
  { label: "Música", value: "Music" },
  { label: "Romance", value: "Romance" },
  { label: "Terror", value: "Horror" },
  { label: "Thriller", value: "Thriller" },
  { label: "Filme para TV", value: "Tv Movie" },
];

export interface GenreSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const GenreSelect: React.FC<GenreSelectProps> = ({
  value,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    GENRE_OPTIONS.find((opt) => opt.value === value) || GENRE_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Botão Gatilho do Dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Filtrar por gênero"
        className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-[8px] border text-xs font-medium transition-all select-none min-w-[190px] ${
          isOpen
            ? "border-gold ring-2 ring-gold/20 bg-card text-text shadow-lg"
            : value
            ? "border-gold/60 bg-gold/10 text-gold shadow-sm"
            : "border-line bg-card text-text-body hover:border-muted hover:text-text hover:bg-bg2"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Filter className={`w-3.5 h-3.5 flex-shrink-0 ${value ? "text-gold" : "text-muted"}`} />
          <span className="truncate">
            {value ? `Gênero: ${selectedOption.label}` : "Gênero: Todos"}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180 text-gold" : ""
          }`}
        />
      </button>

      {/* Menu Dropdown Flutuante com Scroll */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Lista de gêneros cinematográficos"
          className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-60 max-h-64 overflow-y-auto rounded-[10px] bg-card/95 backdrop-blur-md border border-line shadow-2xl p-1.5 space-y-0.5 z-40 animate-in fade-in zoom-in-95 duration-150 focus:outline-none scrollbar-thin"
        >
          {GENRE_OPTIONS.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value || "all"}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-2 rounded-[6px] text-xs font-medium flex items-center justify-between transition-colors select-none ${
                  isSelected
                    ? "bg-gold/15 text-gold font-semibold"
                    : "text-text-body hover:bg-bg2 hover:text-text"
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-gold flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
