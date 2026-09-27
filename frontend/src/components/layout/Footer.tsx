import React from "react";
import { Link } from "react-router-dom";
import { Star, Film } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-line bg-bg2/80 mt-auto py-10">
      <div className="max-w-container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-line/60">
          {/* Logo e Missão */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-[6px] bg-card border border-line flex items-center justify-center text-gold">
                <Star className="w-3.5 h-3.5 fill-gold stroke-gold" />
              </div>
              <span className="font-serif text-[1.25rem] font-semibold text-text">
                Cine<span className="text-gold">Stars</span>
              </span>
            </Link>
            <p className="text-[0.82rem] text-muted max-w-sm text-center md:text-left">
              Acompanhe seus filmes favoritos, crie sua estante de obras assistidas e compartilhe críticas com cinéfilos.
            </p>
          </div>

          {/* Navegação Rápida */}
          <div className="flex items-center gap-6 text-[0.85rem] text-muted">
            <Link to="/movies" className="hover:text-text transition-colors flex items-center gap-1.5">
              <Film className="w-4 h-4 text-gold" />
              <span>Catálogo</span>
            </Link>
            <Link to="/library" className="hover:text-text transition-colors">
              Minha Estante
            </Link>
            <Link to="/login" className="hover:text-text transition-colors">
              Entrar
            </Link>
            <Link to="/register" className="hover:text-text transition-colors">
              Criar Conta
            </Link>
          </div>
        </div>

        {/* Rodapé de Créditos e Direitos */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[0.78rem] text-muted/70">
          <p>
            © {new Date().getFullYear()} CineStars. Feito para entusiastas da sétima arte.
          </p>
          <div className="flex items-center gap-2">
            <span>Desenvolvido com React, TypeScript & FastAPI</span>
            <span className="text-line">•</span>
            <span className="text-gold/80">CineStars</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
