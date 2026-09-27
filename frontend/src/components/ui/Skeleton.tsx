import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rectangular" | "circular" | "poster" | "text";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "rectangular",
  ...props
}) => {
  const variants = {
    rectangular: "rounded-[8px]",
    circular: "rounded-full",
    poster: "aspect-[2/3] rounded-[8px]",
    text: "h-4 rounded-[4px] w-full",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-card/80 border border-line/40",
        variants[variant],
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
};
