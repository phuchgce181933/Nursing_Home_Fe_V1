import { useEffect, useState } from 'react';
import { ADMIN_SEARCH_DEBOUNCE_MS } from '../constants/adminListPage';

/**
 * Debounces search input for list pages.
 * @param {object} options
 * @param {number} [options.delayMs]
 * @param {() => void} [options.onDebouncedChange] - e.g. reset page to 1
 */
export default function useDebouncedSearch({ delayMs = ADMIN_SEARCH_DEBOUNCE_MS, onDebouncedChange } = {}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      onDebouncedChange?.();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [search, delayMs, onDebouncedChange]);

  const resetSearch = () => {
    setSearch('');
    setDebouncedSearch('');
  };

  return { search, setSearch, debouncedSearch, resetSearch };
}
