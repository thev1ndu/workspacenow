import { ArrowLeft, ArrowRight } from "@carbon/react/icons";
import { Button } from "@carbon/react";


export interface TablePagerProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** Prev/next pager for a table; renders nothing when everything fits on one page. */
export function TablePager({ page, totalPages, total, pageSize, onPageChange }: TablePagerProps) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-separator px-5 py-3">
      <p className="text-xs text-muted tabular-nums">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button kind="ghost" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ArrowLeft className="size-3.5" aria-hidden />
          Prev
        </Button>
        <span className="px-2 text-xs tabular-nums text-muted">
          Page {page} of {totalPages}
        </span>
        <Button kind="ghost" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          Next
          <ArrowRight className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
