import type { ReactNode } from "react";
import {
  DataTable,
  InlineLoading,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from "@carbon/react";
import { NoDataFound, TablePager, usePagedSearch, type TablePagerProps } from "@workspacenow/views";

import styles from "./ResourceTable.module.scss";

export interface TableColumn<T> {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
  /** Right-aligns the column, for numbers and row actions. */
  end?: boolean;
  nowrap?: boolean;
}

export interface ResourceTableProps<T> {
  label: string;
  items: T[];
  rowKey: (item: T) => string;
  columns: TableColumn<T>[];
  emptyMessage: string;
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  /** Extra toolbar content, left of the search field. */
  toolbar?: ReactNode;
  pager?: TablePagerProps;
  /** True when a filter outside the table can empty it, so the empty state reads as "no results". */
  isFiltered?: boolean;
  /** Keeps the toolbar mounted while a server-side search or page is on its way. */
  loading?: boolean;
}

const cellClass = (column: { end?: boolean; nowrap?: boolean }) =>
  [column.end ? styles.end : "", column.nowrap ? styles.nowrap : ""].filter(Boolean).join(" ") || undefined;

/** A Carbon DataTable with an optional toolbar search and Carbon pagination; cells render from the original item. */
export function ResourceTable<T>({ label, items, rowKey, columns, emptyMessage, search, toolbar, pager, isFiltered, loading }: ResourceTableProps<T>) {
  if (items.length === 0 && !search?.value && !isFiltered && !loading) return <NoDataFound message={emptyMessage} />;
  const byId = new Map(items.map((item) => [rowKey(item), item]));
  const headers = columns.map(({ key, header }) => ({ key, header }));
  const rows = items.map((item) => ({ id: rowKey(item) }));

  return (
    <>
      <DataTable rows={rows} headers={headers}>
        {({ rows: tableRows, getTableProps, getToolbarProps }) => (
          <TableContainer aria-label={label}>
            {(search || toolbar) && (
              <TableToolbar {...getToolbarProps()} aria-label={`${label} toolbar`}>
                <TableToolbarContent>
                  {toolbar}
                  {search && (
                    <TableToolbarSearch
                      persistent
                      labelText={`Search ${label}`}
                      placeholder={search.placeholder ?? "Search"}
                      value={search.value}
                      onChange={(event) => search.onChange(typeof event === "string" ? event : event.target.value)}
                    />
                  )}
                </TableToolbarContent>
              </TableToolbar>
            )}
            <Table {...getTableProps()} aria-label={label}>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableHeader key={column.key} scope="col" className={cellClass(column)}>
                      {column.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.map((row) => {
                  const item = byId.get(row.id);
                  if (item === undefined) return null;
                  return (
                    <TableRow key={row.id} id={row.id}>
                      {columns.map((column) => (
                        <TableCell key={column.key} className={cellClass(column)}>
                          {column.cell(item)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      {items.length === 0 && (loading ? <InlineLoading description="Loading" /> : <NoDataFound message="No results match your search." />)}
      {pager && <TablePager {...pager} />}
    </>
  );
}

export type PagedTableProps<T> = Omit<ResourceTableProps<T>, "search" | "pager"> & {
  searchText: (item: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
};

/** ResourceTable over a loaded list, with client-side search and paging. */
export function PagedTable<T>({ items, searchText, searchPlaceholder, pageSize = 10, ...rest }: PagedTableProps<T>) {
  const paged = usePagedSearch(items, pageSize, searchText);
  return (
    <ResourceTable
      {...rest}
      items={paged.pageItems}
      search={{ value: paged.search, onChange: paged.setSearch, placeholder: searchPlaceholder }}
      pager={{ page: paged.page, total: paged.total, totalPages: paged.totalPages, pageSize, onPageChange: paged.setPage }}
      isFiltered={paged.total === 0 && items.length > 0}
    />
  );
}
