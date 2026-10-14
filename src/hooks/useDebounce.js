import { useEffect, useState } from 'react';
import { SEARCH_DEBOUNCE_MS } from '../constants/leads';

export default function useDebounce(value, delay = SEARCH_DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
