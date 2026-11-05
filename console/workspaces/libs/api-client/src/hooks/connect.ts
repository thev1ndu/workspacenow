import { useAuthHooks } from "@workspacenow/auth";
import type { McpServer } from "@workspacenow/types";
import * as api from "../apis/connect";
import { useApiMutation, useApiQuery } from "./react-query-notifications";

export function useListApis() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["apis"], queryFn: () => api.listApis(getToken) });
}

export function useGetApi(params: { apiId?: string }) {
  const { getToken } = useAuthHooks();
  return useApiQuery({
    queryKey: ["apis", params],
    queryFn: () => api.getApi({ apiId: params.apiId! }, getToken),
    enabled: !!params.apiId,
  });
}

export function useListApiOperations(query: { apiId?: string } = {}) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["api-operations", query], queryFn: () => api.listApiOperations(query, getToken) });
}

export function useUpdateMcpExposure() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (op) => `${op.mcp?.toolName} ${op.mcp?.enabled ? "exposed as an MCP tool" : "withdrawn from MCP"}`,
    mutationFn: ({ operationId, ...body }: { operationId: string; enabled: boolean; toolName?: string; description?: string }) =>
      api.updateMcpExposure({ operationId }, body, getToken),
  });
}

export function useInvokeApiOperation() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    showSuccess: false,
    mutationFn: ({ operationId, input }: { operationId: string; input: Record<string, unknown> }) =>
      api.invokeApiOperation({ operationId }, { input }, getToken),
  });
}

export function useListMcpTools() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["mcp-tools"], queryFn: () => api.listMcpTools(getToken) });
}

export function useListMcpServers() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["mcp-servers"], queryFn: () => api.listMcpServers(getToken) });
}

export function useRegisterMcpServer() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "register", target: "MCP server" },
    mutationFn: (body: { name: string; url: string; auth: McpServer["auth"] }) => api.registerMcpServer(body, getToken),
  });
}

export function useListIntegrations() {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["integrations"], queryFn: () => api.listIntegrations(getToken) });
}

export function useTestIntegration() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (i) => (i.status === "connected" ? `${i.name} is reachable` : `${i.name} is failing`),
    successSeverity: (i) => (i.status === "connected" ? "success" : "error"),
    mutationFn: (integrationId: string) => api.testIntegration({ integrationId }, getToken),
  });
}
