import { useAuthHooks } from "@workspacenow/auth";
import * as api from "../apis/audit";
import { useApiQuery } from "./react-query-notifications";

export function useListAudit(query: api.AuditQuery = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["audit", query], queryFn: () => api.listAudit(query, getToken) });
}

export function useListTraces() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["traces"], queryFn: () => api.listTraces(getToken) });
}

export function useGetTrace(params: { traceId?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["traces", params],
    queryFn: () => api.getTrace({ traceId: params.traceId! }, getToken),
    enabled: !!params.traceId,
  });
}
