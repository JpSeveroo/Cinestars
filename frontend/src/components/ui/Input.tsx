import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, leftIcon, rightIcon, hint, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[0.82rem] font-medium text-muted flex items-center justify-between"
          >
            <span>{label}</span>
            {hint && <span className="text-[0.75rem] text-muted/70">{hint}</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 flex items-center justify-center text-muted pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full bg-bg2 text-text text-[0.92rem] rounded-[8px] border border-line py-[10px] px-3 transition-colors",
              "placeholder:text-muted/60",
              "focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-bg",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              error && "border-danger focus:ring-danger",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center justify-center text-muted">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <span className="text-[0.78rem] text-danger font-medium transition-all">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
