import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "genre" | "spoiler" | "gold" | "status" | "muted";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = "genre",
  size = "md",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-colors select-none";

  const variants = {
    // Gêneros cinematográficos: cor teal (#4fb3a2), fundo translúcido, raio tipo chip (20px)
    genre:
      "text-teal bg-teal/10 border border-teal/25 rounded-pill hover:bg-teal/15",
    // Spoiler e avisos críticos: raio 10px, cor danger (#d9765a)
    spoiler:
      "text-danger bg-danger/10 border border-danger/30 rounded-[10px] uppercase font-semibold tracking-wider",
    // Destaque ou status ativo: cor gold (#e8b44c)
    gold:
      "text-gold bg-gold/10 border border-gold/30 rounded-pill",
    // Status neutro ou de exibição
    status:
      "text-text bg-card border border-line rounded-pill",
    // Metadados discretos
    muted:
      "text-muted bg-bg2 border border-line/60 rounded-[8px]",
  };

  const sizes = {
    sm: "text-[0.72rem] px-2 py-0.5 gap-1",
    md: "text-[0.78rem] px-2.5 py-1 gap-1.5",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
};
