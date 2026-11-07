import { useEffect, useMemo, useRef, useState } from "react";

export interface PagedSearch<T> {
  search: string;
  setSearch: (value: string) => void;
  page: number;
  setPage: (page: number) => void;
  total: number;
  totalPages: number;
  pageItems: T[];
  pageSize: number;
}

/**
 * Client-side search + pagination over a loaded list. `text` extracts the searchable
 * string from an item; typing resets to page 1.
 */
export function usePagedSearch<T>(items: T[] | undefined, pageSize: number, text: (item: T) => string): PagedSearch<T> {
  const [search, setSearchState] = useState("");
  const [page, setPage] = useState(1);
  const textRef = useRef(text);
  textRef.current = text;
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const all = items ?? [];
    if (!q) return all;
    return all.filter((item) => textRef.current(item).toLowerCase().includes(q));
  }, [items, q]);
  const { page: safePage, totalPages, start, end } = usePagination(filtered.length, pageSize, page, setPage);
  return {
    search,
    setSearch: (value) => {
      setSearchState(value);
      setPage(1);
    },
    page: safePage,
    setPage,
    total: filtered.length,
    totalPages,
    pageItems: filtered.slice(start, end),
    pageSize,
  };
}

export interface Pagination {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  start: number;
  end: number;
}

/** Pure pagination over `total` items: the page is clamped into range and start/end bound the slice. */
export function usePagination(total: number, pageSize: number, page: number, setPage: (page: number) => void): Pagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { page: safePage, setPage, totalPages, start, end: Math.min(total, start + pageSize) };
}

/** Debounced copy of a value, for search-as-you-type. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
