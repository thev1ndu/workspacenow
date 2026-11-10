import type { ReactNode } from "react";
import { Alert } from "@heroui/react";
import { ApiError } from "@workspacenow/types";
import { TableSkeleton } from "./Skeletons";
import { NoDataFound } from "./NoDataFound";

interface QueryLike<T> {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

/** Marks a placeholder as loading for assistive technology. */
export function Loading({ children }: { children: ReactNode }) {
  return (
    <div aria-busy="true" aria-label="Loading" role="status">
      {children}
    </div>
  );
}

/**
 * Renders loading and error states for a query, and the children once data is present. While loading
 * it shows `skeleton`, which should match the shape of the children; a flush table is the default.
 * A query that never ran (disabled for a missing id) shows `empty` instead of leaving a blank area.
 */
export function QueryState<T>({ query, skeleton, empty, children }: { query: QueryLike<T>; skeleton?: ReactNode; empty?: ReactNode; children: (data: T) => ReactNode }) {
  if (query.isLoading) return <Loading>{skeleton ?? <TableSkeleton />}</Loading>;
  if (query.error) {
    const forbidden = query.error instanceof ApiError && query.error.status === 403;
    return (
      <div className="p-4">
        <Alert status={forbidden ? "warning" : "danger"}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{forbidden ? "You don't have access to this" : "Couldn't load this"}</Alert.Title>
            <Alert.Description>{errorMessage(query.error)}</Alert.Description>
          </Alert.Content>
        </Alert>
      </div>
    );
  }
  if (query.data === undefined) return <>{empty ?? <NoDataFound message="Nothing to show here." />}</>;
  return <>{children(query.data)}</>;
}
