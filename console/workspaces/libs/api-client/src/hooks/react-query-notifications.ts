import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useSnackBar, type Severity } from "@workspacenow/views";
import { ApiError } from "@workspacenow/types";

export type MutationAction =
  | "apply"
  | "approve"
  | "create"
  | "deploy"
  | "invoke"
  | "register"
  | "reject"
  | "release"
  | "reset"
  | "run"
  | "test"
  | "update";

const SUCCESS_VERB_MAP: Record<MutationAction, string> = {
  apply: "applied",
  approve: "approved",
  create: "created",
  deploy: "deployed",
  invoke: "completed",
  register: "registered",
  reject: "rejected",
  release: "released",
  reset: "reset",
  run: "started",
  test: "tested",
  update: "updated",
};

type ApiMutationOptions<TData, TVariables> = UseMutationOptions<TData, unknown, TVariables> & {
  action?: { verb: MutationAction; target: string };
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  showSuccess?: boolean;
  /** Severity of the success message when the response reports a bad outcome, e.g. a failed connection test. */
  successSeverity?: (data: TData, variables: TVariables) => Severity;
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function useApiQuery<TData, TQueryKey extends QueryKey = QueryKey>(
  options: UseQueryOptions<TData, unknown, TData, TQueryKey>,
) {
  return useQuery(options);
}

/**
 * Mutations change shared platform state (events start workflows, every call is audited),
 * so a settled mutation refreshes every query, and its outcome is reported in a snackbar.
 */
export function useApiMutation<TData, TVariables>({
  action,
  successMessage,
  showSuccess = true,
  successSeverity,
  onSuccess,
  onError,
  onSettled,
  ...options
}: ApiMutationOptions<TData, TVariables>) {
  const { pushSnackBar } = useSnackBar();
  const queryClient = useQueryClient();
  return useMutation<TData, unknown, TVariables>({
    ...options,
    onSuccess: (data, variables, context, mutation) => {
      if (showSuccess) {
        const message =
          typeof successMessage === "function"
            ? successMessage(data, variables)
            : successMessage ?? (action ? `${capitalize(action.target)} ${SUCCESS_VERB_MAP[action.verb]}` : undefined);
        if (message) pushSnackBar(message, successSeverity?.(data, variables) ?? "success");
      }
      return onSuccess?.(data, variables, context, mutation);
    },
    onError: (error, variables, context, mutation) => {
      const denied = error instanceof ApiError && error.status === 403;
      pushSnackBar(
        error instanceof Error ? `${denied ? "Denied: " : ""}${error.message}` : "Request failed",
        denied ? "warning" : "error",
      );
      return onError?.(error, variables, context, mutation);
    },
    onSettled: (data, error, variables, context, mutation) => {
      void queryClient.invalidateQueries();
      return onSettled?.(data, error, variables, context, mutation);
    },
  });
}
