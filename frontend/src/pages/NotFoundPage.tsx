import React from "react";
import { Link } from "react-router-dom";
import { Film, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-5 py-12">
      <div className="w-16 h-16 rounded-full bg-card border border-line flex items-center justify-center text-gold">
        <Film className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="font-serif text-4xl font-semibold text-text">404</h1>
        <h2 className="text-xl font-medium text-text">Página não encontrada</h2>
        <p className="text-muted text-sm max-w-md">
          A cena que você tentou acessar foi cortada na edição ou não existe neste rolo de filme.
        </p>
      </div>

      <Link to="/">
        <Button variant="primary">
          <Home className="w-4 h-4" />
          <span>Voltar ao Início</span>
        </Button>
      </Link>
    </div>
  );
};
