import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Função utilitária para combinar classes condicionais do Tailwind CSS
 * evitando conflitos de especificidade.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
