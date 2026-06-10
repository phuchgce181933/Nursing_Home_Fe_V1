import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMIN_LIST_PAGE_SIZE } from '../constants/adminListPage';

/**
 * Client-side pagination for filtered arrays.
 * Resets to page 1 when item count changes.
 */
export default function useClientPagination(items, pageSize = ADMIN_LIST_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const total = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [total, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const list = items ?? [];
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const resetPage = useCallback(() => setPage(1), []);

  return {
    page,
    setPage,
    totalPages,
    total,
    paginatedItems,
    resetPage,
  };
}
