import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  DataTable,
  Table,
  TableBatchAction,
  TableBatchActions,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from "@carbon/react";
import { NoDataFound, QueryState, TablePager, TableSkeleton, usePagedSearch } from "@workspacenow/views";

import styles from "../control.module.scss";

export interface ControlColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
}

/** Search and paging owned by the caller, for tables whose rows come from a paged API. */
export interface ServerPaging {
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface BatchAction<T> {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onAction: (rows: T[]) => void;
}

interface ControlTableProps<T> {
  label: string;
  rows: T[];
  rowId: (row: T) => string;
  columns: ControlColumn<T>[];
  emptyMessage: string;
  loading?: boolean;
  error?: unknown;
  /** Client-side search over the loaded rows; omit it (and `server`) for a table without a search field. */
  searchText?: (row: T) => string;
  searchLabel?: string;
  server?: ServerPaging;
  /** Client-side page size choices; the first is the default unless `defaultPageSize` is given. */
  pageSizes?: number[];
  defaultPageSize?: number;
  /** Set false to show every row without a pager. */
  paginate?: boolean;
  toolbarActions?: ReactNode;
  batchAction?: BatchAction<T>;
  rowTone?: (row: T) => "error" | "selected" | undefined;
}

const DEFAULT_PAGE_SIZES = [10, 25, 50];

/** A Carbon DataTable with toolbar search, optional batch actions and pagination, shared by every table in the control workspace. */
export function ControlTable<T>({
  label,
  rows,
  rowId,
  columns,
  emptyMessage,
  loading,
  error,
  searchText,
  searchLabel,
  server,
  pageSizes = DEFAULT_PAGE_SIZES,
  defaultPageSize,
  paginate = true,
  toolbarActions,
  batchAction,
  rowTone,
}: ControlTableProps<T>) {
  const [pageSize, setPageSize] = useState(defaultPageSize ?? pageSizes[0] ?? 10);
  const paged = usePagedSearch(rows, pageSize, searchText ?? (() => ""));
  const visible = server ? rows : paged.pageItems;
  const byId = useMemo(() => new Map(visible.map((row) => [rowId(row), row])), [visible, rowId]);
  const tableRows = useMemo(() => visible.map((row) => ({ id: rowId(row) })), [visible, rowId]);
  const headers = useMemo(() => columns.map((c) => ({ key: c.key, header: c.header })), [columns]);

  const hasSearch = !!server || !!searchText;
  const hasToolbar = hasSearch || !!batchAction || !!toolbarActions;
  const searchValue = server ? server.search : paged.search;
  const setSearch = server ? server.onSearchChange : paged.setSearch;
  const searching = searchValue.trim().length > 0;

  return (
    <DataTable rows={tableRows} headers={headers}>
      {({ getHeaderProps, getRowProps, getTableProps, getToolbarProps, getBatchActionProps, getSelectionProps, selectedRows }) => {
        const batch = getBatchActionProps();
        const selectedSources = selectedRows.map((r) => byId.get(r.id)).filter((r): r is T => r !== undefined);
        return (
          <>
            <TableContainer>
              {hasToolbar && (
                <TableToolbar {...getToolbarProps()}>
                  {batchAction && (
                    <TableBatchActions {...batch}>
                      <TableBatchAction
                        renderIcon={batchAction.icon}
                        onClick={() => {
                          batchAction.onAction(selectedSources);
                          batch.onCancel();
                        }}
                      >
                        {batchAction.label}
                      </TableBatchAction>
                    </TableBatchActions>
                  )}
                  <TableToolbarContent>
                    {hasSearch && (
                      <TableToolbarSearch
                        persistent
                        labelText={searchLabel ?? "Search"}
                        placeholder={searchLabel ?? "Search"}
                        value={searchValue}
                        onChange={(event) => setSearch(typeof event === "string" ? "" : event.target.value)}
                        onClear={() => setSearch("")}
                      />
                    )}
                    {toolbarActions}
                  </TableToolbarContent>
                </TableToolbar>
              )}
              <QueryState query={{ data: visible, isLoading: !!loading, error }} skeleton={<TableSkeleton columns={columns.length} />}>
                {(items) =>
                  items.length === 0 ? (
                    <NoDataFound message={searching ? "No results match your search." : emptyMessage} />
                  ) : (
                    <Table {...getTableProps()} aria-label={label}>
                      <TableHead>
                        <TableRow>
                          {batchAction && <TableSelectAll {...getSelectionProps()} />}
                          {columns.map((column) => {
                            const { key, ...headerProps } = getHeaderProps({ header: { key: column.key, header: column.header } });
                            return (
                              <TableHeader key={key} {...headerProps}>
                                {column.header}
                              </TableHeader>
                            );
                          })}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tableRows.map((row) => {
                          const source = byId.get(row.id);
                          if (!source) return null;
                          const tone = rowTone?.(source);
                          const { key, ...rowProps } = getRowProps({ row: { id: row.id, cells: [] } });
                          return (
                            <TableRow key={key} {...rowProps} className={tone === "error" ? styles.rowError : tone === "selected" ? styles.rowSelected : undefined}>
                              {batchAction && <TableSelectRow {...getSelectionProps({ row: { id: row.id, cells: [] } })} />}
                              {columns.map((column) => (
                                <TableCell key={column.key}>{column.cell(source)}</TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )
                }
              </QueryState>
            </TableContainer>
            {server ? (
              <TablePager
                page={server.page}
                totalPages={Math.max(1, Math.ceil(server.total / server.pageSize))}
                total={server.total}
                pageSize={server.pageSize}
                onPageChange={server.onPageChange}
              />
            ) : (
              paginate && (
                <TablePager
                  page={paged.page}
                  totalPages={paged.totalPages}
                  total={paged.total}
                  pageSize={pageSize}
                  onPageChange={paged.setPage}
                  pageSizes={pageSizes}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    paged.setPage(1);
                  }}
                />
              )
            )}
          </>
        );
      }}
    </DataTable>
  );
}
