import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-[8px] transition-all focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variants = {
      // Primário: fundo --gold (#e8b44c), texto escuro #1a1508 (NUNCA branco sobre dourado), sem borda
      primary: "bg-gold text-[#1a1508] hover:bg-[#dfa637] active:bg-[#d09627] shadow-sm",
      // Secundário / Ghost: fundo transparente, borda 1px solid var(--line), texto --text
      secondary: "bg-card text-text border border-line hover:border-muted hover:bg-[#252a3a]",
      ghost: "bg-transparent text-text border border-line hover:bg-card hover:border-line/80",
      outline: "bg-transparent border border-gold/60 text-gold hover:bg-gold/10 hover:border-gold",
      danger: "bg-danger text-white hover:bg-[#c9664c] active:bg-[#b8573f]",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-[0.92rem] px-4 py-[10px] gap-2",
      lg: "text-base px-5 py-3 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
