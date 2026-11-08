import { useAuthHooks } from "@workspacenow/auth";
import * as api from "../apis/audit";
import { useApiQuery } from "./react-query-notifications";

export function useListAudit(query: api.AuditQuery = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["audit", query], queryFn: () => api.listAudit(query, getToken) });
}

export function useListTraces(query: { q?: string; limit?: number; offset?: number } = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["traces", query], queryFn: () => api.listTraces(query, getToken) });
}

export function useGetTrace(params: { traceId?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["traces", params],
    queryFn: () => api.getTrace({ traceId: params.traceId! }, getToken),
    enabled: !!params.traceId,
  });
}

export function useListErrorGroups(query: { q?: string; serviceName?: string; limit?: number; offset?: number } = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["errors", query], queryFn: () => api.listErrorGroups(query, getToken) });
}

export function useListObservedServices() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["observed-services"], queryFn: () => api.listObservedServices(getToken) });
}
