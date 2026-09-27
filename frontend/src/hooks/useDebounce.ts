import { useState, useEffect } from "react";

/**
 * Hook para atrasar a atualização de um valor (debounce)
 * Útil para campos de pesquisa e inputs reativos.
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
