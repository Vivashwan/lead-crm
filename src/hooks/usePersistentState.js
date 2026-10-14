import { useCallback, useState } from 'react';

function read(key, defaultValue, validate) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    const value = JSON.parse(raw);
    return validate && !validate(value) ? defaultValue : value;
  } catch {
    return defaultValue; // storage blocked or corrupted JSON
  }
}

// useState mirrored to localStorage. `validate` rejects stale or tampered values.
export default function usePersistentState(key, defaultValue, validate) {
  const [value, setValue] = useState(() => read(key, defaultValue, validate));

  const setPersistent = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // storage full or blocked: keep working in memory
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, setPersistent];
}
