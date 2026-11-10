import { Pagination } from "@carbon/react";

export interface TablePagerProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Offer a page-size choice; without it the size is fixed. */
  pageSizes?: number[];
  onPageSizeChange?: (pageSize: number) => void;
}

/** Carbon pagination for a table; renders nothing when there is nothing to page. */
export function TablePager({ page, total, pageSize, onPageChange, pageSizes, onPageSizeChange }: TablePagerProps) {
  if (total === 0) return null;
  return (
    <Pagination
      page={page}
      pageSize={pageSize}
      pageSizes={pageSizes ?? [pageSize]}
      pageSizeInputDisabled={!pageSizes || !onPageSizeChange}
      totalItems={total}
      onChange={({ page: nextPage, pageSize: nextSize }) => {
        if (nextSize !== pageSize) onPageSizeChange?.(nextSize);
        else onPageChange(nextPage);
      }}
    />
  );
}
