import type { ReactNode } from "react";
import { Alert, Skeleton } from "@heroui/react";
import { ApiError } from "@workspacenow/types";

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

/** Placeholder rows shaped like the lists and tables most pages load. */
export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-2.5 p-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-5 rounded-md" style={{ width: `${92 - i * 11}%` }} />
      ))}
    </div>
  );
}

/** Renders loading and error states for a query, and the children once data is present. */
export function QueryState<T>({ query, children }: { query: QueryLike<T>; children: (data: T) => ReactNode }) {
  if (query.isLoading) return <LoadingSkeleton />;
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
  if (query.data === undefined) return null;
  return <>{children(query.data)}</>;
}
