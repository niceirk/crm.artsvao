import { useEffect, useState } from 'react';

/**
 * Hook для debounce значения
 * @param value - значение для debounce
 * @param delay - задержка в миллисекундах (по умолчанию 500мс)
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
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
