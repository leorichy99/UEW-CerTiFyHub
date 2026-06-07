import { useState, useMemo } from "react";

export default function usePagination(items, { pageSize = 10 } = {}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  function goToPage(p) {
    const target = Math.max(1, Math.min(p, totalPages));
    setPage(target);
  }

  return {
    page: safePage,
    setPage: goToPage,
    pageSize,
    totalPages,
    totalItems: items.length,
    paginatedItems,
  };
}
