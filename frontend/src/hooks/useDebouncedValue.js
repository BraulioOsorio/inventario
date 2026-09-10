import { useEffect, useState } from "react";

export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function searchQuery(value, minLength = 3) {
  const trimmed = value.trim();
  return trimmed.length >= minLength ? trimmed : undefined;
}
