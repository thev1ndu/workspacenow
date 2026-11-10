import type { ReactNode } from "react";
import {
  DataTable,
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

import { NoDataFound, TablePager, usePagedSearch } from "@workspacenow/views";

import styles from "../Flow.module.scss";

export interface PagedTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  /** Keep the cell on one line, for ids and timestamps. */
  nowrap?: boolean;
}

export interface PagedTableProps<T extends { id: string }> {
  label: string;
  items: T[];
  columns: PagedTableColumn<T>[];
  /** The searchable text of one item. */
  searchText: (item: T) => string;
  emptyMessage: string;
  searchPlaceholder?: string;
  /** Show the search toolbar; default true. */
  searchable?: boolean;
  /** Show the pager; default true. Without it every item is listed. */
  paginate?: boolean;
  pageSize?: number;
}

/** A Carbon DataTable with a search toolbar and pagination over a list that is already loaded. */
export function PagedTable<T extends { id: string }>({
  label,
  items,
  columns,
  searchText,
  emptyMessage,
  searchPlaceholder = "Search",
  searchable = true,
  paginate = true,
  pageSize = 10,
}: PagedTableProps<T>) {
  const paged = usePagedSearch(items, paginate ? pageSize : Number.MAX_SAFE_INTEGER, searchText);
  if (items.length === 0) return <NoDataFound message={emptyMessage} />;

  const byId = new Map(paged.pageItems.map((item) => [item.id, item]));
  const headers = columns.map((c) => ({ key: c.key, header: c.header }));
  const rows = paged.pageItems.map((item) => ({ id: item.id }));

  return (
    <DataTable rows={rows} headers={headers}>
      {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps, getToolbarProps }) => (
        <TableContainer aria-label={label}>
          {searchable && (
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <TableToolbarSearch
                  persistent
                  placeholder={searchPlaceholder}
                  labelText={searchPlaceholder}
                  defaultValue={paged.search}
                  onChange={(_event, value) => paged.setSearch(value ?? "")}
                />
              </TableToolbarContent>
            </TableToolbar>
          )}
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {tableHeaders.map((header) => {
                  const { key, ...props } = getHeaderProps({ header });
                  return (
                    <TableHeader key={key} {...props}>
                      {header.header}
                    </TableHeader>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => {
                const item = byId.get(row.id);
                const { key, ...props } = getRowProps({ row });
                return (
                  <TableRow key={key} {...props}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.nowrap ? styles.nowrap : undefined}>
                        {item ? column.render(item) : null}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {paged.total === 0 && <NoDataFound message="No matches for your search." />}
          {paginate && (
            <TablePager page={paged.page} totalPages={paged.totalPages} total={paged.total} pageSize={pageSize} onPageChange={paged.setPage} />
          )}
        </TableContainer>
      )}
    </DataTable>
  );
}
