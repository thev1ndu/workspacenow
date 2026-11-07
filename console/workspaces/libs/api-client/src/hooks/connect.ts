import { useAuthHooks } from "@workspacenow/auth";
import type { IntegrationInput, McpServer } from "@workspacenow/types";
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

export function useCreateIntegration() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "create", target: "integration" },
    mutationFn: (body: IntegrationInput) => api.createIntegration(body, getToken),
  });
}

export function useUpdateIntegration() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "update", target: "integration" },
    mutationFn: ({ integrationId, body }: { integrationId: string; body: IntegrationInput }) => api.updateIntegration({ integrationId }, body, getToken),
  });
}

export function useListSecrets(prefix?: string) {
  const { getToken } = useAuthHooks();
  return useApiQuery({ queryKey: ["secrets", prefix ?? ""], queryFn: () => api.listSecrets({ prefix }, getToken) });
}

export function useReadSecret() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    action: { verb: "read", target: "secret" },
    showSuccess: false,
    mutationFn: (path: string) => api.readSecret({ path }, getToken),
  });
}

export function useTestIntegration() {
  const { getToken } = useAuthHooks();
  return useApiMutation({
    successMessage: (i) => (i.status === "connected" ? `${i.name} is reachable` : `${i.name} is failing`),
    successSeverity: (i) => (i.status === "connected" ? "success" : "error"),
    mutationFn: (integrationId: string) => api.testIntegration({ integrationId }, getToken),
  });
}
